/**
 *  Module will create shadow just from one directional point light, so keep it in mind
 *  
 * @param {type} options
 * @returns {Shadow}
 */
function Shadow(options){
    WGLModule.call(this, options);
    
    var programName = options.programName || "main",
        sceneView = options.sceneView || {type:"perspective", angle: 60, nearPlane:1.0, farPlane: 100.0 };

    this.getProgramName = function(){ return programName; };
    this.getSceneView = function(){ return sceneView; };
    this.setSceneView = function(sV){ sceneView = sV; };
    this.programIndex = "shadow";
};

Shadow.prototype = new WGLModule;
Shadow.prototype.constructor = Shadow;

Shadow.prototype.getLightLookAt = function(){
    var lookVector = [.0 - this.lightPosition[0], .0 - this.lightPosition[1], .0 - this.lightPosition[2]],
        up = [.0, 1.0, .0],
        e = .0001;

    if(lookVector[0] < e && lookVector[2] < e){
        if(lookVector[1] > 0)
            up = [.0, .0, -1.0];
        else
            up = [.0, .0, 1.0];
    }
    
    return {
        position : this.lightPosition,
        lookPoint : [.0, .0, .0],
        up : up
    };
};

Shadow.prototype.eventBeforeInitRenders = function(object){
    var renders = object.getRender(),
        gl = object.gl,
        _this = this,
        o = this.getOptions();
     
    this.lightPosition = this.getObject().getModuleByClass(Light).getOptions().lights[0].position;
    
    renders["shadowRender"] = {
        class : Render3D,
        order : -1,
        programIndex : this.programIndex,        
        lookAt : this.getLightLookAt(),
        loop : true,
        bgColor : [.0, .0, .0, 1.0],
        clear : [gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT],
        renderToFrame :true,
        sceneView : this.getSceneView(),
        frames : [
            {
                type : "texturebuffer"
            },
            {
                type : "renderbuffer",
                render : gl.DEPTH_COMPONENT16,
                frame : gl.DEPTH_ATTACHMENT
            }
        ],
        events : {
            "afterProcessElement" : function(object, data){
//                console.log(1);iewMatrix = mat4.create(
                data.lightViewMatrix = mat4.create(object.modelViewMatrix.getMatrix());
            }
        },
        object : this
    };
};

Shadow.prototype.eventAfterInitRenders = function(object){
    var render = object.getRenderByProgram(this.getProgramName());
    render.addListener("beforeProcessElement", this.beforeProcessElement, this);
};

Shadow.prototype.beforeProcessElement = function(object, data){
    var textureModule = this.getObject().getModuleByClass(Texture),
        texture = this.getObject().getRenderByProgram("shadow").getConfig().frames[0].instance,
        gl = object.getGL(),
        vertex = object.getVShader();

    textureModule.bindTexture(object, "shadowTexture", texture);
    gl.uniformMatrix4fv(vertex.lightMatrix, false, data.lightViewMatrix);
};


Shadow.prototype.eventBeforeInit = function(object){
    if(
            Light===undefined || this.getObject().getModuleByClass(Rotate) === null &&
            Texture===undefined || this.getObject().getModuleByClass(Texture) === null
    )
        throw "Light and Texture Module is required";
    
    var programs = object.getPrograms(),
        renders = object.getRender(),//returns only configs of the render
        sceneView = {},
        prName = this.getProgramName();
       

    /** get renders sceneView */
    if(renders.length === undefined && typeof(renders) === "object")
        sceneView = renders.sceneView !== undefined? renders.sceneView : null;
    else if(renders.length !== undefined){
        for(var r in renders){
            if(renders[r].programName === prName || renders[r].programIndex === prName)
                sceneView = renders[r].sceneView !== undefined? renders[r].sceneView : null;
        }
    }
    
    sceneView = sceneView || this.getSceneView();
    this.setSceneView(sceneView);
    
    programs[this.programIndex] = {
        "name" : "Control",
        shaders : {
            vertex : {
                class : shadowVertexSH
            },
            fragment : {
                class : shadowFragmentSH,
                linearDepthConst : this.getLinearDepthConst(sceneView)
            }
        }
    };
}

Shadow.prototype.eventBeforeLoadShaders = function(object, programName, vertex, fragment){
    if( this.getProgramName() !== programName ) return;
    this.setVertexVariables(vertex);
    this.setFragmentVariables(fragment);
};

Shadow.prototype.setVertexVariables = function (shader){
    shader.setVariable("lightMatrix", {location:"uniform", type : "mat4"});
    shader.setVariable("vLightModel", {location:"varying", type : "vec4"});
    shader.setVariable("vLightView", {location:"varying", type : "vec4"});
    var main = shader.getFunctions()["main"];
    main.expressions = main.expressions || [];
    main.expressions.push("\n\
                           vLightModel = lightMatrix*modelPosition;\n\
                           mat4 bias = mat4(0.5, 0.0, 0.0, 0.0, \n\
                                            0.0, 0.5, 0.0, 0.0, \n\
                                            0.0, 0.0, 0.5, 0.0,\n\
                                            0.5, 0.5, 0.5, 1.0);\n\
                           vLightView = bias * projectionMatrix * lightMatrix * modelPosition;\n\
");
};

Shadow.prototype.getLinearDepthConst = function(sceneView){
    var far,near;
    if(sceneView.type === "perspective"){
        far = sceneView.farPlane;
        near = sceneView.nearPlane;
    }
    else{
        far = Math.max(sceneView.positiveZ - sceneView.negativeZ, sceneView.positiveZ +  sceneView.negativeZ);
        near = Math.max(1.0, sceneView.negativeZ);
    }
    
    return 1.0/(far-near);
};

Shadow.prototype.setFragmentVariables = function(shader){
    shader.setVariable("vLightModel", {location:"varying", type : "vec4"});
    shader.setVariable("vLightView", {location:"varying", type : "vec4"});
    shader.setVariable("shadowTexture", {location:"uniform", type : "sampler2D"});
    shader.setVariable("LinearDepthConstant", {type : "float", "const" : true, defaultValue: this.getLinearDepthConst(this.getSceneView())});
    shader.setFunction("unpack", {
        returnType : "float",
        inParams : {
            "colour" : {"type":"vec4"}
        },
        variables : {
            "bitShifts" : { "type" : "vec4", "defaultValue" : "vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0)", "const":true }
        },
        returnExpr : new Expression({
            "elements" : ["dot(colour, bitShifts)"]
        })
    });
    var mainFunc = shader.getFunctions()["main"];
    mainFunc.expressions = mainFunc.expressions || [];
    mainFunc.expressions.push("\
                            vec3 depth = vLightView.xyz / vLightView.w; \n\
                            depth.z = length(vLightModel) * LinearDepthConstant; \n\
                            \n\
                            float shadowDepth = unpack(texture2D(shadowTexture, depth.xy)); \n\
                            vec4 shadow = vec4(1.0, 1.0, 1.0 ,1.0); \n\
                            if ( depth.z*.96 - shadowDepth > .01 ) \n\
                                shadow = vec4(.5, .5, .5, 1.0);\n\
            ");
//    shader.clearColor();
    shader.setColorExpression("shadow");
};

function shadowFragmentSH(options) {    
    Shader.call(this, options);
    
    var config = this.getConfig(),
        linearDepthConst = options.linearDepthConst;

       
    
    config.source = "precision mediump float; \n\
                    \n\
                    varying vec4 vPosition;\n\
                    const float LinearDepthConstant = "+linearDepthConst+" ;\n\
                    \n\
                    vec4 pack (float depth)\n\
                    {\n\
                        const vec4 bias = vec4(1.0 / 255.0,\n\
                                    1.0 / 255.0,\n\
                                    1.0 / 255.0,\n\
                                    0.0);\n\
                        \n\
                        float r = depth;\n\
                        float g = fract(r * 255.0);\n\
                        float b = fract(g * 255.0);\n\
                        float a = fract(b * 255.0);\n\
                        vec4 colour = vec4(r, g, b, a);\n\
                        \n\
                        return colour - (colour.yzww * bias);\n\
                    }\n\
                    \n\
                    void main() {\n\
                       float linearDepth = length(vPosition) * LinearDepthConstant;\n\
                        \n\
                        // pack value into 32-bit RGBA texture\n\
                        gl_FragColor = pack(linearDepth);\n\
                    } ";
}

shadowFragmentSH.prototype = new Shader;
shadowFragmentSH.prototype.constructor = shadowFragmentSH;

function shadowVertexSH(options) {    
    Shader.call(this, options);
    
    var config = this.getConfig();
    config.source = "attribute vec3 position; \n\
                    uniform mat4 modelMatrix;\n\
                    uniform mat4 modelViewMatrix;\n\
                    uniform mat4 projectionMatrix;\n\
                    varying vec4 vPosition;\n\
                    \n\
                    void main( ) \n\
                    {\n\
                        vec4 modelProjection = modelViewMatrix * modelMatrix * vec4(position, 1.0);\n\
                        gl_Position = projectionMatrix * modelProjection;\n\
                        \n\
                        vPosition = modelProjection;\n\
                    }\
                    ";
}

shadowVertexSH.prototype = new Shader;
shadowVertexSH.prototype.constructor = shadowVertexSH;
