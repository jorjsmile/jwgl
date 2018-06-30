function Zoom(o){
    WGLModule.call(this, o);    
    
    
    var maxZoomIn = o.maxZoomIn || -.8,
        maxZoomOut = o.maxZoomOut || 0.0,    
        step = o.step || 0.05,
        programs = o.programs || ["main"],
        currentZoom = 0;
    this.getPrograms = function(){
        return programs;
    };
    
    this.zoomIn = function(){
        if(currentZoom <= maxZoomIn) return;
        currentZoom -= step;
    };
    
    this.zoomOut = function(){
        if(currentZoom >= maxZoomOut) return;
        currentZoom += step;        
    };
    
    this.applyZoom = function(render){
        var lookAt = render.getConfig().lookAt;
            
        if(render.zoomLookAt === undefined)
            render.zoomLookAt = extend({}, lookAt);
            
        var up = [Math.abs(render.zoomLookAt.up[0]),Math.abs(render.zoomLookAt.up[1]),Math.abs(render.zoomLookAt.up[2])],
            position = render.zoomLookAt.position;
        
        if( 
                (up[0] < up[1] && up[2] < up[1]) ||
                (up[1] < up[0] && up[2] < up[0])
            ) //y - up axis or x - up axis
        {
            var zoomAmount = position[2]*currentZoom;            
            lookAt.position = [position[0], position[1], position[2]+zoomAmount];
        }else if( up[0] < up[2] && up[1] < up[2]  ) //z - up axis
        {
            var zoomAmount = position[1]*currentZoom;            
            lookAt.position = [position[0], position[1]+zoomAmount, position[2]];            
        }
        
    };
    
//    this.removeZoom = function(render){
//        
//    };
}

Zoom.prototype = new WGLModule();
Zoom.prototype.constructor = Zoom;

Zoom.prototype.eventBeforeInit = function(){
    var o = this.getObject(),
        el = document.getElementById(o.getEl()),
        _this = this;
    
    addEvent(el, "mousewheel", function(e){
        if(e.wheelDelta > 0)
            _this.zoomIn();
        else
            _this.zoomOut();
        e.preventDefault();
    });
};



Zoom.prototype.eventAfterInitRenders = function(object){
    var renders = object.getRender();
    for(var r in renders){
        if(renders[r].moduleZoom === false) continue;
        console.log(renders[r].getOptions().programName);
        if(!inArray(this.getPrograms(), renders[r].getOptions().programName)) continue;
        
        renders[r].addListener("initGL", this.enableGLStates);
        renders[r].addListener("beforeProcess", this.applyZoom);
//        renders[r].addListener("beforeDrawElement", this.applyRotation);
//        renders[r].addListener("afterDrawElements", this.removeZoom);
    }
};

Zoom.prototype.enableGLStates = function(render){
    var gl = render.getGL();
    if(!gl.isEnabled(gl.DEPTH_TEST)){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
    }

    render.getConfig().clear.push ( render.getGL().DEPTH_BUFFER_BIT );
};


