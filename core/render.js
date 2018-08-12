/**
 *
 * @param opts
 * @constructor
 */
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
    this.initRenderMode(gl);

    if(this.getConfig().renderToFrame)
        this.frameInit();
}

Render.prototype.initRenderMode = function(gl){
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
}

Render.prototype.initWindow = function(w, h){
    var w = w || this.getWidth(),
        h = h || this.getHeight(),
        r = w/h;

    this.getGL().viewport(0, 0, this.getGL().drawingBufferWidth, this.getGL().drawingBufferHeight );

    this.raiseEvent("afterWindowInited");
}

Render.prototype.frameOn = function(){
    var gl = this.getGL();
    gl.bindFramebuffer( gl.FRAMEBUFFER,  this.buffer );

    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        console.log("Framebuffer is not ready");
};

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
                gl.deleteTexture(frames[f].instance);
            frames[f].instance = this.bufferTextureInit(frames[f] );
        }
    }
    gl.bindFramebuffer( gl.FRAMEBUFFER,  null );
}

Render.prototype.bufferRenderInit = function(info){
//    console.log(info);
    var gl = this.getGL(),
        info = info || {},
        render = info.render || gl.DEPTH_COMPONENT16,
        frame = info.frame || gl.DEPTH_ATTACHMENT,
        renderbuffer = gl.createRenderbuffer(),
        width = this.getWidth(),
        height = this.getHeight();

    gl.bindRenderbuffer( gl.RENDERBUFFER, renderbuffer );
    gl.renderbufferStorage( gl.RENDERBUFFER, render, width, height );
    gl.framebufferRenderbuffer( gl.FRAMEBUFFER, frame, gl.RENDERBUFFER, renderbuffer );
    gl.bindRenderbuffer( gl.RENDERBUFFER, null);

    return renderbuffer;
}

Render.prototype.bufferTextureInit = function(info){

    var gl = this.getGL(),
        info = info || {},
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
    if(Math.isPowOf(2, width) && Math.isPowOf(2, height)){
        minFilter = gl.LINEAR_MIPMAP_NEAREST;
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, sceneTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D,null);

    return sceneTexture;
}

/**
 * Main method of render. It will clear scene, prepare buffers, and call
 * every object to be rendered via processElement method
 */
Render.prototype.process = function(){
    if(this.getConfig().renderToFrame)
        this.frameOn();


    var gl = this.getGL(),
        data = this.getData(),
        c = this.getConfig();
    gl.useProgram(this.getProgram().instance);
    this.raiseEvent("beforeProcess");

    this.preProcess();

    this.raiseEvent("beforeDrawElements");

    for(var k in data){
        if( !this.raiseEvent("beforeDrawElement", k) )
            continue;

        data[k].modelMatrix = mat4.create();
        mat4.identity(data[k].modelMatrix);

        if(data[k].translate !== undefined && vec3.length(data[k].translate) !== 0 )
            mat4.translate(data[k].modelMatrix, data[k].modelMatrix, data[k].translate);
        if(data[k].rotate !== undefined && vec3.length(data[k].rotate) !== 0){
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[0]), [1.0,.0,.0]);
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[1]), [.0,1.0,.0]);
            mat4.rotate(data[k].modelMatrix, radians( data[k].rotate[2]), [0.0,.0,1.0]);
        }
        this.processElement(data[k]);

        this.raiseEvent("afterDrawElement", k);
    }

    this.raiseEvent("afterDrawElements");

    if(this.getConfig().renderToFrame )
        this.frameOff();
};

Render.prototype.preProcess = function(){

    var gl = this.getGL(),
        c = this.getConfig();

    gl.clearColor.apply(gl, c["bgColor"]);

    var clear = 0;

    this.getConfig().clear.forEach(function(e){clear |= e;});
    gl.clear( clear );

};

Render.prototype.processElement = function(data){
    var vertex = this.getVShader(),
        gl = this.getGL();

    this.raiseEvent("beforeProcessElement", data);
    gl.enableVertexAttribArray(vertex.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, data.vertices);
    gl.vertexAttribPointer(vertex.position, data.verticesPerItem, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.indices);
    gl.drawElements(data.getRenderMode(gl),  data.totalItems, gl.UNSIGNED_SHORT, 0);
    this.raiseEvent("afterProcessElement", data);
};



function Render2D(opts){
    Render.call(this, opts);
};

Render2D.prototype = new Render;
Render2D.prototype.constructor = Render2D;

function Render3D(opts){

    Render.call(this, opts);

    opts.lookAt = opts.lookAt || {position : [.0,0.0, 10.0], lookPoint:[.0,.0,.0], up : [.0, 1.0, .0]};

    this.modelViewMatrix = null;
    this.projectionMatrix = null;
};

Render3D.prototype = new Render;
Render3D.prototype.constructor = Render3D;

Render3D.prototype.initWindow = function(w, h){
    var w = w || this.getWidth(),
        h = h || this.getHeight(),
        r = w/h;
    var sceneView = this.getConfig().sceneView = this.getConfig().sceneView || {
        type :  "perspective",
        angle : 45,
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
};


Render3D.prototype.preProcess = function(){

    Render.prototype.preProcess.call(this);

    var lookAt = this.getConfig().lookAt;
    this.modelViewMatrix.manipulate("identity");
    if(typeof lookAt !== "function")
        this.modelViewMatrix.manipulate("lookAt", lookAt.position, lookAt.lookPoint, lookAt.up);
    else
        lookAt(this.modelViewMatrix);

};

Render3D.prototype.setMatrixUniforms = function(modelMatrix){
    var vertex = this.getVShader(),
        gl = this.getGL();

    if(this.getConfig().sceneView !== undefined){
        gl.uniformMatrix4fv(vertex.projectionMatrix, false, this.projectionMatrix.getMatrix());
        gl.uniformMatrix4fv(vertex.modelViewMatrix, false, this.modelViewMatrix.getMatrix());
    }
    gl.uniformMatrix4fv(vertex.modelMatrix, false, modelMatrix);

};

Render3D.prototype.processElement = function(data){

    this.setMatrixUniforms(data.modelMatrix);

    Render.prototype.processElement.call( this, data );

};