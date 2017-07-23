function Rotate(options){
    WGLModule.call(this, options);
    
    var _this = this,
        rModelViewMatrix = mat4.create(),
        modelViewMatrix = mat4.create();
    
    this.prepareRotation = function(render){
        modelViewMatrix = mat4.create(render.modelViewMatrix.getMatrix());
        rModelViewMatrix = mat4.create(render.modelViewMatrix.getMatrix());
//        console.log(_this.xAngle, _this.yAngle);
        _this.makeRotation(rModelViewMatrix);
        _this.raiseEvent("afterPrepareRotation");
    }
    
    this.makeRotation = function(m){
        mat4.rotate(m, _this.xAngle, [1.0, .0, .0]);
        mat4.rotate(m, _this.yAngle, [.0, 1.0, .0]);        
    }
    
    this.applyRotation = function(render, index){
        var object = render.getData()[index];
        if(object.moduleRotate === false) return;
        render.modelViewMatrix.setMatrix(rModelViewMatrix);        
        _this.raiseEvent("afterApplyRotation");
    }
    
    this.clearRotation = function(render){
        render.modelViewMatrix.setMatrix(modelViewMatrix);
        _this.raiseEvent("afterClearRotation");
    }
}

Rotate.prototype = new WGLModule();
Rotate.prototype.constructor = Rotate;

Rotate.prototype.eventBeforeInit = function(object){
    var el = document.getElementById(object.getEl()),
        _this = this,
        start = null;

        this.xAngle = this.xAngle || 0;
        this.yAngle = this.yAngle || 0;
        
     addEvent(el, "mousedown", function(e){
        if(e.which == 3){
            start = {
                rotating : true,
                x : e.screenX,
                y : e.screenY
            }
        }
     });
     addEvent(el, "mousemove", function(e){
          if(start != null && start.rotating){
                _this.yAngle += (e.screenX - start.x)*(Math.PI/parseFloat(el.width));
                _this.xAngle += (e.screenY - start.y)*(Math.PI/parseFloat(el.height));
                start.x = e.screenX;
                start.y = e.screenY;
                _this.raiseEvent("mouseMove", start);
            }
     });
     addEvent(el, "mouseup", function(e){
            if(e.which == 3){
                _this.raiseEvent("mouseUp", start);
                start.rotating = false;
            }
        });
    
     addEvent(el, "mouseout", function(){
        if(start){
            _this.raiseEvent("mouseOut", start);
            start.rotating = false;
        }
    });
    
     el.oncontextmenu= function (){return false;};

};

Rotate.prototype.eventAfterInitRenders = function(object){
    var renders = object.getRender();
//    console.log(renders);
    for(var r in renders){
        if(renders[r].moduleRotate === false) continue;
        renders[r].addListener("initGL", this.enableGLStates);
        renders[r].addListener("beforeDrawElements", this.prepareRotation);
        renders[r].addListener("beforeDrawElement", this.applyRotation);
        renders[r].addListener("afterDrawElements", this.clearRotation);
    }
};

Rotate.prototype.enableGLStates = function(render){
    var gl = render.getGL();
    if(!gl.isEnabled(gl.DEPTH_TEST)){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
    }
    
    if(!gl.isEnabled(gl.CULL_FACE)){        
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
    }
    
    render.getConfig().clear.push ( render.getGL().DEPTH_BUFFER_BIT );
};