/**
 * Module will insert light into your scene,
 * if you use shaders wrotten by yourself you should calculate light amount by yourself too
 * 
 * If you are using complex shaders, it will insert required code to implement light effect in your shader
 *
 * @param options.lights.position array [x,y,z]. Default [.0, 20.0, 0.0]
 * @param options.lights.ambient array [r,g,b]. Default [.5, .5, .5]
 * @param options.lights.diffuse array [r,g,b]. Default [.3, .3, .3]
 * @param options.lights.specular array [r,g,b]. Default [.9, .9, .9]
 * @param options.lightNumber number of light. [1-5]
 */

function Light(options){
    var options = options  || {};
    WGLModule.call(this, options);
    
    //names of programs that must contain light
    var programIndecies = options.programIndecies || ["main"]
    options.lightNumber = Math.min(Math.max(options.lightNumber||0, options.lights.length), 5);
    options.lights = options.lights;

    var _default =
        {
            position : [.0, 0.0, 0.0],
            ambient : [.5, .5, .5],
            diffuse : [.3, .3, .3],
            specular : [.9, .9, .9]
        }
    ;

    this.getProgramIndecies = function(){ return programIndecies; };
    this.getOptions = function(){ return options; };
    this.getDefault = function(off) { return _default[off] || _default; };
    
}

Light.prototype = new WGLModule;
Light.prototype.constructor = Light;

Light.prototype.eventBeforeLoadShaders = function(object, programIndex, vertex, fragment){
    if(!inArray(this.getProgramIndecies(), programIndex)) return;
    this.setVertexVariables(vertex);
    this.setFragmentVariables(fragment);
};

Light.prototype.eventAfterInitRenders = function(object){
    var renders = object.getRender(),
        programIndecies = this.getProgramIndecies();
    for(var r in renders){
        if(!inArray(programIndecies, renders[r].getConfig().programIndex)) continue;
        renders[r].addListener("beforeDrawElements", this.beforeDrawElements, this);
        renders[r].addListener("beforeProcessElement", this.beforeProcessElement, this);        
    }
};

Light.prototype.eventAfterInitRenderElement = function(object, data){
    var element = data;
    element.material = element.material || {};
    element.material.ambient = element.material.ambient || [.3, .3, .3];
    element.material.diffuse = element.material.diffuse || [.3, .3, .3];
    element.material.specular = element.material.specular || [1.0, 1.0, 1.0];
    element.material.shininess = element.material.shininess || 30;
    element.material.transparency = element.material.transparency || 1.0;
    element.normals = object.registerBuffer(new Float32Array(element.normals), object.gl.ARRAY_BUFFER);
//    object.registerBuffer({
//            offset:index, name : "normals",
//            data : new Float32Array(element.normals),
//            type : object.gl.ARRAY_BUFFER
//        });
};

Light.prototype.beforeProcessElement = function(object, data){
    if(!inArray(this.getProgramIndecies(), object.getConfig().programIndex)) return ;

    var normalMatrix = mat4.create(),
        normalTransposed = mat4.create(),
        gl = object.getGL(),
        vertex = object.getVShader(),
        fragment = object.getFShader(),
        normalMat3 = mat3.create();
//    console.log(data);
//    mat4.multiply(   data.modelMatrix, object.modelViewMatrix.getMatrix(),    normalMatrix );
    mat4.invert( normalMatrix,  object.modelViewMatrix.getMatrix() );
    mat4.transpose(normalTransposed, normalMatrix);

    mat3.fromMat4(normalMat3, normalTransposed);
    gl.uniformMatrix3fv(vertex.normalMatrix, false, normalMat3);

//    console.log(fragment);
    gl.uniform3fv(fragment.uMaterial.ambient, data.material.ambient);
    gl.uniform3fv(fragment.uMaterial.specular, data.material.specular);
    gl.uniform3fv(fragment.uMaterial.diffuse, data.material.diffuse);
    gl.uniform1f(fragment.uMaterial.shininess, data.material.shininess);
    gl.uniform1f(fragment.uMaterial.transparency, data.material.transparency);
    
    if(data.normalsPerItem !== 0){
        gl.bindBuffer(gl.ARRAY_BUFFER, data.normals);
        gl.enableVertexAttribArray(vertex.normal);
        gl.vertexAttribPointer(vertex.normal, data.normalsPerItem, gl.FLOAT, false, 0, 0);
    }
}

Light.prototype.beforeDrawElements = function(object){
//    console.log(object.getConfig());
    if(!inArray(this.getProgramIndecies(), object.getConfig().programIndex)) return ;
    
    var lights = this.getOptions().lights || [],
        count = this.getOptions().lightNumber,
        fragment = object.getFShader(),
        gl = object.getGL(),
        modelViewMatrix=object.modelViewMatrix.getMatrix();


    for(var c = 0; c < count; c ++){
        var l =  lights[c] || {},
            ambient = l.ambient || this.getDefault("ambient"),
            diffuse = l.diffuse || this.getDefault("diffuse"),
            specular = l.specular || this.getDefault("specular"),
            position = l.position || this.getDefault("position"),
            global = l.global || false,
            staticLight = vec3.create();

        if(!global)
            vec3.transformMat4(staticLight, position, modelViewMatrix);
        else
            staticLight = position;

//        position = mat4.multiplyVec3(object.modelViewMatrix, position);
//        console.log(position);
        gl.uniform3fv(fragment.uLight[c].ambient, ambient);
        gl.uniform3fv(fragment.uLight[c].diffuse, diffuse);
        gl.uniform3fv(fragment.uLight[c].specular, specular);
        gl.uniform3fv(fragment.uLight[c].position, staticLight);
    }
};

Light.prototype.setVertexVariables = function(shader){
    if(!(shader instanceof CompositeShader)) return;
    shader.setVariable("normal", {location:"attribute", type:"vec3"});
    shader.setVariable("normalMatrix", {location:"uniform", type:"mat3"});
    shader.setVariable("vNormal", {location:"varying", type:"vec3"});
    shader.setVariable("vPosition", {location:"varying", type:"vec3"});
    var expressions = shader.getFunction("main").expressions || [];
    expressions.push(
            new Expression({elements :[ "modelViewPosition"], prefix : "vPosition = ", suffix: ";", cast : "vec3"}),
            new Expression({elements :[ "normalMatrix", "normal" ], operator:"*", prefix : "vNormal = ", suffix: ";"})
        );
}

Light.prototype.setFragmentVariables = function(shader){
    if(!(shader instanceof CompositeShader)) return;

    shader.setStructure("light", {
        variables : {
            "ambient" : {"type" : "vec3"},
            "diffuse" : {"type" : "vec3"},
            "specular" : {"type" : "vec3"},
            "position" : {type : "vec3"}
        }
    });
    shader.setStructure("material", {
        variables : {
            "ambient" : {"type" : "vec3"},
            "diffuse" : {"type" : "vec3"},
            "specular" : {"type" : "vec3"},
            "shininess" : {"type" : "float"},
            "transparency" : {"type" : "float"}
        }
    });
    shader.setDefines("LIGHT_COUNT", this.getOptions().lightNumber);
    shader.setVariable("uMaterial", {location:"uniform", type:"material"});
    shader.setVariable("uLight", {location:"uniform", type:"light", array:"LIGHT_COUNT"});
    shader.setVariable("vNormal", {location:"varying", type:"vec3"});
    shader.setVariable("vPosition", {location:"varying", type:"vec3"});
    shader.setFunction("lightColor", {
        returnType : "vec4",
        inParams : {
            "l" : {"type":"light"},
            "m" : {"type":"material"}
        },
        variables : {
            "n" : { "type" : "vec3", "defaultValue" : "normalize(vNormal)" },
            "s" : { "type" : "vec3", "defaultValue" : "normalize(l.position-vPosition)" },
            "v" : { "type" : "vec3", "defaultValue" : "normalize(-vPosition)" },
            "r" : { "type" : "vec3", "defaultValue" : "reflect(-s, n)" }
        },
        returnExpr : new Expression({
            "elements" : ["vec4(l.ambient*m.ambient +\n\
                                l.diffuse*m.diffuse*max(dot(s,n),.0 ) +\n\
                                l.specular*m.specular* pow( max( dot(r,v), 0.0 ), m.shininess )\n\
                            , m.transparency)"]
        })
    });
    var mainFunc = shader.getFunctions()["main"];
    mainFunc.expressions = mainFunc.expressions || [];
    mainFunc.expressions.push("\
                            vec4 lightAmount = vec4(.0, .0, .0, .0);\n\
                            for(int i = 0; i < LIGHT_COUNT; i++)\n\
                                lightAmount+=lightColor(uLight[i], uMaterial);\n\
            ");
    shader.setColorExpression("lightAmount");
}

