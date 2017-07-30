function Render(opts){
    var options = opts || {};
    WGLObject.call(this, options);

    var program = options.program,
        gl = options.gl,
        el = options.el;

    if( document.getElementById(el) !== null){
        options.width = parseFloat(options.width || document.getElementById(el).width);
        options.height = parseFloat(options.height || document.getElementById(el).height);
    }
    options.lookAt = options.lookAt || {position : [.0,0.0, 10.0], lookPoint:[.0,.0,.0], up : [.0, 1.0, .0]};
    options.bgColor = options.bgColor || [1.0, 1.0, 1.0, 1.0];
    options.loop = options.loop!==undefined?  options.loop : true;
    if( gl !== undefined )
        options.clear = [gl.COLOR_BUFFER_BIT];
    
    this.getConfig = function() { return options; };
    this.getWidth = function(){ return options.width; };
    this.getHeight = function(){ return options.height; };
    this.getProgram = function(){ return program; };
    this.getEL = function(){ return el; };
    this.getGL = function(){ return gl; };
    this.getData = function() { return options.data; };
    this.getVShader = function(){ return program.vertex; };
    this.getFShader = function(){ return program.fragment; };
}

Render.prototype = new WGLObject;
Render.prototype.constructor = Render;

Render.prototype.init = function(){    
    this.initGL();
}

Render.prototype.initGL = function(){
    var gl = this.getGL();   
    
//    gl.frontFace(gl.CW);
    this.raiseEvent("initGL");
    this.initWindow();

    if(this.getConfig().renderToFrame)
        this.frameInit();
}

Render.prototype.initWindow = function(w,h){
    var w = w || this.getWidth(),
        h = h || this.getHeight(),
        r = w/h;
    var sceneView = this.getConfig().sceneView = this.getConfig().sceneView || {
        type :  "perspective", 
        angle : 60,
        nearPlane : 1.0,
        farPlane : 100.0
    };
    this.projectionMatrix = this.projectionMatrix || new Matrix();
    this.modelViewMatrix = this.modelViewMatrix || new Matrix();
    this.getConfig().sceneView = sceneView;
    
    this.getGL().viewport(0, 0, this.getGL().drawingBufferWidth, this.getGL().drawingBufferHeight );
    if(sceneView.type !== undefined){
        this.projectionMatrix.manipulate("identity");
//        mat4.identity(this.projectionMatrix);
 
        if(sceneView.type === "perspective")
            this.projectionMatrix.manipulate("perspective", sceneView.angle, r,sceneView.nearPlane,sceneView.farPlane);

        else if(sceneView.type === "ortho")
            this.projectionMatrix.manipulate("ortho",
                        sceneView.negativeX, sceneView.positiveX,
                        sceneView.negativeY, sceneView.positiveY,
                        sceneView.negativeZ, sceneView.positiveZ                        
            );
 
    }
    this.raiseEvent("afterWindowInited");
}

Render.prototype.frameOn = function(){
    var gl = this.getGL();
    gl.bindFramebuffer( gl.FRAMEBUFFER,  this.buffer );
    
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        console.log("Framebuffer is not ready");
}

Render.prototype.clearFrame = function(){
    for(var f in this.config.frames){
        if(this.config.frames[f].type == "renderbuffer"){
            this.gl.deleteRenderbuffer(this.frames[f]);
        }
        else{
            //free memory from texture
            //this.gl.deleteTexture(this.frames[f]);
        }
        this.frames[f]= null;
    }
}

Render.prototype.frameOff = function(){
    this.getGL().bindFramebuffer(this.getGL().FRAMEBUFFER, null);
}

Render.prototype.frameInit = function(){
    var gl = this.getGL();
    
    if(this.buffer === null || this.buffer === undefined){
        this.buffer = gl.createFramebuffer();
    }
    
    gl.bindFramebuffer( gl.FRAMEBUFFER,  this.buffer );
     var frames = this.getConfig().frames || [{
        type : "renderbuffer",
        frame : gl.COLOR_ATTACHMENT0,
        render : gl.RGBA4
    }];

    for(var f in frames ){
        if(frames[f].type === "renderbuffer")
            frames[f].instance = this.bufferRenderInit(frames[f]);
        else{
            if(frames[f].instance instanceof WebGLTexture)
                gl.deleteTexture(frames[f]);
            frames[f].instance = this.bufferTextureInit(frames[f] );
        }
    }
    gl.bindFramebuffer( gl.FRAMEBUFFER,  null );
}
//
Render.prototype.bufferRenderInit = function(info){
//    console.log(info);
    var gl = this.getGL(),
        render = info.render || gl.RGBA4,
        frame = info.frame || gl.COLOR_ATTACHMENT0,
        renderbuffer = gl.createRenderbuffer(),
        width = this.getWidth(),
        height = this.getHeight();

    gl.bindRenderbuffer( gl.RENDERBUFFER, renderbuffer );
    gl.renderbufferStorage( gl.RENDERBUFFER, render, width, height );
    gl.framebufferRenderbuffer( gl.FRAMEBUFFER, frame, gl.RENDERBUFFER, renderbuffer );
    
    return renderbuffer;
}
//
Render.prototype.bufferTextureInit = function(info){

    var gl = this.getGL(),
        attachment = info.render || gl.COLOR_ATTACHMENT0,
        format = info.format || gl.RGBA,
        pixel_type = info.pixel_type || gl.UNSIGNED_BYTE,
        width = this.getWidth(),
        height = this.getHeight(),
        minFilter = info.minFilter || gl.LINEAR,
        magFilter = info.maxFilter || gl.LINEAR;
    var sceneTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D,sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format,  width, height, 0, format, pixel_type, null);
    if(!Math.isPowOf(2, width) || !Math.isPowOf(2, height)){
//        console.log(11);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        minFilter = gl.NEAREST;
        magFilter = gl.NEAREST;
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, sceneTexture, 0);


    return sceneTexture;
}
//

//
Render.prototype.process = function(){
    if(this.getConfig().renderToFrame)
        this.frameOn();

      
    var gl = this.getGL(),
        data = this.getData(),
        c = this.getConfig();
    gl.useProgram(this.getProgram().instance);
    this.raiseEvent("beforeProcess");    
    
    
    gl.clearColor.apply(gl, c["bgColor"]);
    
    var clear = 0;
    this.getConfig().clear.forEach(function(e){clear |= e;});    
    gl.clear( clear );

    if(window.startCount && (!window.zoomCount || window.zoomCount < 3)){
        console.log(this.getConfig().lookAt);
        console.log(this.getConfig());
        window.zoomCount = window.zoomCount+1 || 0;
    }
    var lookAt = this.getConfig().lookAt;
    this.modelViewMatrix.manipulate("identity");
//    mat4.identity(this.modelViewMatrix);   
    this.modelViewMatrix.manipulate("lookAt",lookAt.position, lookAt.lookPoint, lookAt.up);
//    mat4.lookAt(lookAt.position, lookAt.lookPoint, lookAt.up,  this.modelViewMatrix);
    
    this.raiseEvent("beforeDrawElements");
//    console.log(data);
    for(var k in data){
        this.raiseEvent("beforeDrawElement", k);
        
        data[k].modelMatrix = mat4.create();
        mat4.identity(data[k].modelMatrix);
       
        if(data[k].translate !== undefined && vec3.length(data[k].translate) !== 0 )
            mat4.translate(data[k].modelMatrix, data[k].translate);
        if(data[k].rotate !== undefined && vec3.length(data[k].rotate) !== 0){
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[0]), [1.0,.0,.0]);
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[1]), [.0,1.0,.0]);
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[2]), [0.0,.0,1.0]);
        }
        this.processElement(data[k]);

        this.raiseEvent("afterDrawElement", k);
    }

    this.raiseEvent("afterDrawElements");

//    console.log(this.modelViewMatrix.getMatrix());
    if(this.getConfig().renderToFrame )
        this.frameOff();
};


Render.prototype.processElement = function(data){    
    var vertex = this.getVShader(),
        gl = this.getGL();
    
    this.raiseEvent("beforeProcessElement", data);
    gl.enableVertexAttribArray(vertex.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, data.vertices);
    gl.vertexAttribPointer(vertex.position, data.verticesPerItem, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.indices);
    this.setMatrixUniforms(data.modelMatrix);
    gl.drawElements(data.getRenderMode(gl),  data.totalItems, gl.UNSIGNED_SHORT, 0);
    this.raiseEvent("afterProcessElement", data);
}
//
Render.prototype.setMatrixUniforms = function(modelMatrix){
    var vertex = this.getVShader(),
        gl = this.getGL();

    if(this.getConfig().sceneView !== undefined){
        gl.uniformMatrix4fv(vertex.projectionMatrix, false, this.projectionMatrix.getMatrix());
        gl.uniformMatrix4fv(vertex.modelViewMatrix, false, this.modelViewMatrix.getMatrix());
    }
    gl.uniformMatrix4fv(vertex.modelMatrix, false, modelMatrix);
//    console.log(this.projectionMatrix);
}