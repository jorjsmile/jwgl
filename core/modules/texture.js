/**
 * Module will control texture for scene objects,
 * Use complex shaders for case if you want that module work properly,
 *  it will automatically insert shaders variables.
 *
 *  @example
 *  //in data section
 *  data: [
 *      new Shape({
 *           "texture": {
 *                   url : "path/to/your/texture.png"
 *               }
 *      })
 *  ]
 *
 *  @events beforeLoadTexture,afterLoadTexture
 */

function Texture(options){
    WGLModule.call(this, options);
    
    var perObject = options.perObject || 5,
        mixingMethod = options.mixingMode || "*",
        programNames = options.programNames || ["main"],
        flipY = true;
    ;

    this.getPerObject = function(){
        return perObject;
    };
    
    this.getProgramNames = function(){ return programNames; };

    
    this.getMixingMethod = function (){ return mixingMethod; };

    // this.

    this.getFlipY = function() { return flipY};

    this._default = null;//default texture that will be bounded to each object
    this._maxTexCount = 0; // max texture from all objects. That flag will load that amount of default textures
}

Texture.prototype = new WGLModule;
Texture.prototype.constructor = Texture;

Texture.prototype.eventAfterInitRenderData = function(object, callback){
    var _this = this,
        loadTexture =  function(oIndex, texture, onload){
            var image = new Image();
            image.onload = function(){
                texture.src = _this.initTexture(object.gl, image);
                onload();
            };
            image.onerror = function(){
                texture = null;
                console.log("File not found");
            };
            image.src = texture.url;
        },
        syncStack = [
            function(_self, syncOut){
                /**
                 * Beginning from Chrome v. 50+. Debug gives error
                 * telling that at least one texture should be loaded
                 * This is why we will load a white sample 1x1
                 */
                _this.initDefaultTexture(object.gl);
                syncOut();
            }
        ];

    /**
     * Texture Initializations
     */
    object.gl.pixelStorei(object.gl.UNPACK_FLIP_Y_WEBGL, this.getFlipY());

    for(var o in object.data){
        if(object.data[o].texture === undefined) continue;

        if(typeof(object.data[o].texture.push) !== "function")
            object.data[o].texture = [object.data[o].texture];
        for(var t in object.data[o].texture){
                (function(i, j){
                    var src = object.data[i].texture[j];

                        syncStack.push(function(__self, syncOut){
                            if(_this.raiseEvent("beforeLoadTexture", i, src, syncOut) )
                                loadTexture(i, src, syncOut );
                        });

                    _this.raiseEvent("afterLoadTexture", i, src)
                })(o, t);
        }
    }
    if(syncStack.length !== 0){
        this.sync(syncStack, callback);
    }
    else{
        callback();
    }

};

Texture.prototype.initMaxTexCount = function(object) {
    var data = object.getOptions().data;
    for(var o in data ) {
        if (data[o].texture === undefined) continue;
        this._maxTexCount = this._maxTexCount > data[o].texture.length ?
            this._maxTexCount :
            data[o].texture.length;
    }
};

Texture.prototype.eventAfterInitRenders = function(object){
    if(this._maxTexCount == 0) return ;

    var renders = object.getRender(),
        programNames = this.getProgramNames();
        
    for(var r in renders){
        if(!inArray(programNames, renders[r].getConfig().programName)) return;
        renders[r].addListener("beforeProcessElement", this.beforeProcessElement, this);      
        renders[r].addListener("afterProcessElement", this.afterProcessElement, this);           
    }
};

Texture.prototype.eventAfterInitRenderElement = function(object, data){
    if(this._maxTexCount == 0) return ;

//    if(!inArray(this.getProgramNames(), object.getConfig().programName)) return;
    data.textures = object.registerBuffer(new Float32Array(data.textures), object.gl.ARRAY_BUFFER);    
};

Texture.prototype.bindTexture = function(object, variable, texture){
    var gl = object.getGL(),
        fragment = object.getFShader();

    object.textureCount = object.textureCount || 0;

    gl.uniform1i(fragment[variable], object.textureCount );
    gl.activeTexture(gl.TEXTURE0 + object.textureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    object.textureCount ++;
};

Texture.prototype.beforeProcessElement = function(object, data){
    if(!inArray(this.getProgramNames(), object.getProgram().name)) return;

    object.textureCount = object.textureCount || 0;
    var gl = object.getGL(),
        fragment = object.getFShader(),
        vertex = object.getVShader(),
        getTexture = function(n){
            return data.texture === undefined || data.texture[n] === undefined? null : data.texture[n].src;
        };

    for(var t=0; t < this._maxTexCount; t++)
    {

        var tex = getTexture(t);

        if( !this.raiseEvent("beforeApplyTexture", t, tex, object, data ) )
            tex=false;


        if( tex ){
            gl.uniform1i(fragment.textureLoaded[t], 1);
            gl.uniform1i(fragment.textureSource[t], t );
            gl.activeTexture(gl.TEXTURE0 + object.textureCount );
            gl.bindTexture(gl.TEXTURE_2D, data.texture[t].src);
        }
        else{
            gl.uniform1i(fragment.textureLoaded[t], 0);
            gl.uniform1i(fragment.textureSource[t], t );
            gl.activeTexture( gl.TEXTURE0 + object.textureCount );
            gl.bindTexture(gl.TEXTURE_2D, this._default);
            // gl.uniform1i(fragment.textureLoaded[t], 0);
        }
        object.textureCount ++;
        this.raiseEvent("afterApplyTexture", t, tex, object, data);
    }

    if(data.texturesPerItem !== 0){
        gl.bindBuffer(gl.ARRAY_BUFFER, data.textures);
        gl.enableVertexAttribArray(vertex.texture);
        gl.vertexAttribPointer(vertex.texture, data.texturesPerItem, gl.FLOAT, false, 0, 0);
    }

    return true;
};


Texture.prototype.afterProcessElement = function(object, data){
//    console.log(1);
    if(!inArray(this.getProgramNames(), object.getConfig().programName)) return;

    var gl = object.getGL();

    while(object.textureCount > 0){
        gl.activeTexture(gl.TEXTURE0 + --object.textureCount);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
};

Texture.prototype.initDefaultTexture = function(gl){
    var object = gl.createTexture(),
        white = new Uint8Array([255,255,255,255]);
    gl.bindTexture(gl.TEXTURE_2D, object);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, white);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
    return this._default = object;
};

Texture.prototype.initTexture = function(gl, image, texture){
    
    var object = texture || gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, object);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    if( Math.isPowOf(2, image.width) && Math.isPowOf(2, image.height)){

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    else{
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return object;
};

Texture.prototype.eventBeforeLoadShaders = function(object, programName, vertex, fragment){

    this.initMaxTexCount(object);

    if(this._maxTexCount == 0) return ;


    if(!inArray(this.getProgramNames(), programName)) return;

    this.setVertexVariables(vertex);
    this.setFragmentVariables(fragment);
};

Texture.prototype.setVertexVariables = function(shader){
    if(!(shader instanceof CompositeShader)) return;
    shader.setVariable("texture", {location:"attribute", type:"vec2"});
    shader.setVariable("vTexture", {location:"varying", type:"vec2"});
    var main = shader.getFunction("main");
    
    main.expressions = main.expressions || [];
    main.expressions.push(
            new Expression({elements :[ "texture" ], operator:"*", prefix : "vTexture = ", suffix: ";"})
        );
};

Texture.prototype.setFragmentVariables = function(shader){
    if(!(shader instanceof CompositeShader)) return;

    shader.setDefines("MAX_TEXTURES", this.getPerObject());
    shader.setVariable("vTexture", {location:"varying", type:"vec2"});
    shader.setVariable("textureSource", {location:"uniform", type:"sampler2D", array: "MAX_TEXTURES"});
    shader.setVariable("textureLoaded", {location:"uniform", type:"int", array: "MAX_TEXTURES"});

    var mainFunc = shader.getFunctions()["main"],
        mM = this.getMixingMethod(),
        start = mM == "*"? "vec4(1.0, 1.0, 1.0, 1.0)" : "vec4(.0, .0, .0, .0)";
    mainFunc.expressions = mainFunc.expressions || [];
    mainFunc.expressions.push("\
                            vec4 textureAmount = "+start+";\n\
                            \
                            for(int i = 0; i < MAX_TEXTURES; i++)\n\
                                if(textureLoaded[i] == 1 )\n\
                                    textureAmount "+mM+"=  texture2D(textureSource[i], vTexture );\n\
            ");
    shader.setColorExpression("textureAmount");
}