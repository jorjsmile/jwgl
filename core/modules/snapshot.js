function Snapshot(options) {    
    WGLModule.call(this, options);
    
    var programs = options.program || ["main"];
    var keyCodes = options.keyCodes || { 
            "snapAll" : [16, 83, 65]
    };
    var toImage = options.toImage || true;
    
    this.getPrograms = function(){ return programs; };
    this.getOptions = function(){ return options; };
    this.getToImage = function(){ return toImage; };
    
    this.getKeyCodes = function(){ return keyCodes;};
    this.setKeyCode = function(name, code){ keyCodes[name] = code; };
    this.snap = null;
    this.shots = {};
    this.snapedPrograms = [];
}

Snapshot.prototype = new WGLModule;
Snapshot.prototype.constructor = Snapshot;


Snapshot.prototype.eventBeforeInit = function(object){
    var el = document.getElementById(object.getEl()),
        isEqualArrays = function(a, b){
            if( a.length != b.length ) return false;
            var isEqual = true;
            for(var i in a) isEqual = inArray(b, a[i]);
            return isEqual;
        },
        _this = this;
    this.isPushed = [];
    
    el.onkeydown = function(e){
        if(_this.isPushed.indexOf(e.ketCode) === -1)
            _this.isPushed.push(e.keyCode);
        var keyCodes  = _this.getKeyCodes();
        for(var kC in keyCodes){
            if(isEqualArrays(keyCodes[kC], _this.isPushed)){
                _this.snap = kC;
                _this.snapFrames();
            }
        }            
    }
    
    el.onkeyup = function(e){
        _this.isPushed.splice(_this.isPushed.indexOf(e.keyCode), 1);
    }
}

Snapshot.prototype.eventAfterInitRenders = function(object){
    var programs = this.getPrograms();

    for(var p in programs){
        var render = object.getRenderByProgram(programs[p]);
        if(render === false) continue;
        render.addListener("afterDrawElements", this.snapPicture, this);
        this.setKeyCode(programs[p], [16, 83, 49+parseInt(p)]);
    }
}

Snapshot.prototype.snapPicture = function(object){
    
    var programName = object.getConfig().programName,
        gl = object.getGL();
        
    if(this.couldSnap(programName)){
        console.log(programName);
        var w = gl.drawingBufferWidth,
            h = gl.drawingBufferHeight,
            buffer = new Uint8Array(w*h*4),
            tempcanvas = document.createElement("canvas");
            tempcanvas.width = w,
            tempcanvas.height = h;

        var context = tempcanvas.getContext("2d"),
            contextData = context.getImageData(0, 0, w, h);
        gl.readPixels(0,0,w,h,gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        for(var i = 0; i < contextData.data.length; i++){
            var points = w * 4,
                currentLine =  parseInt(i / points),
                bottom = (h-currentLine),
                nr = i%points,
                offset = bottom * points;
            contextData.data[offset + nr] = buffer[i];
        }
        context.putImageData(contextData, 0, 0);
        
        
        this.shots[programName] = tempcanvas.toDataURL("image/png");
        if(this.getToImage() )
            this.displayImage(programName);
        
        this.lookForSnaps(programName);
    }
        
};

Snapshot.prototype.couldSnap = function(index){
    
    return inArray([index, "snapAll"], this.snap ) &&             
            this.snapedPrograms.indexOf(index) === -1 &&
            inArray(this.getPrograms(), index);
};

Snapshot.prototype.lookForSnaps = function(index){
    if(this.snap === "snapAll"){
        var programs = this.getPrograms();
        if(this.snapedPrograms.length === programs.length){
            this.snapedPrograms = [];
            this.snap = null;
        }
           
        this.snapedPrograms.push(index);
    }
    else if(this.snap === index){
            this.snap = null;
            this.snapedPrograms = [];
    }
    
};

Snapshot.prototype.snapFrames = function(){
    var object= this.getObject(),
        renders = object.getRender();

    for(var r in renders){
        var rC = renders[r].getConfig();
        if(rC.loop === false || rC.renderToFrame){
            object.activateProgram(rC.programName);
            if(rC.renderToFrame)
                renders[r].frameOn();
            this.snapPicture(renders[r]);
            if(rC.renderToFrame)
                renders[r].frameOff();
        }
    }
};

Snapshot.prototype.displayImage = function(index){
    var img = document.getElementById("snapshot-"+index);
    if(img === null){
        img = new Image();
        img.id = "snapshot-"+index;
    }
    img.src = this.shots[index];
    
    document.getElementsByTagName("body")[0].appendChild(img);
}