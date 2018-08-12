

function GaussianBlurFilter(info){
    WGLModule.call(this, info);
    
    var r = info.R || 10,
        srcRender = info.render,
        srcProgram = info.programIndex,
        _self = this;

    this.getR = function(){
        return r;
    };
    this.getHStep = function(){
        return 1/_self.getObject().gl.drawingBufferWidth;
    };
    this.getVStep = function(){
        return 1/_self.getObject().gl.drawingBufferWidth;
    };

    this.getSourceProgram =  function(){ return srcProgram; };
}

GaussianBlurFilter.prototype = new WGLModule();
GaussianBlurFilter.prototype.constructor = GaussianBlurFilter;

GaussianBlurFilter.prototype.eventBeforeInit = function(){
    var jwgl = this.getObject();
    if(!(jwgl instanceof jWGL)) {
        throw "Inappropriate parent call";
    }

    var ps = jwgl.getPrograms(),
        rs = jwgl.getRender();


    this.initPrograms(ps);
    this.initRenders(rs);
};

GaussianBlurFilter.prototype.initPrograms = function(programs){
    programs["gaussianVBlurProgram"] = this.getProgram("gaussianVBlurProgram", GaussianVBlurFragmentShader);
    programs["gaussianHBlurProgram"] = this.getProgram("gaussianHBlurProgram",GaussianHBlurFragmentShader);

};

GaussianBlurFilter.prototype.initRenders = function(renders){
    var srcProgram = this.getSourceProgram(),
        srcRender = srcRender? renders[srcRender] : {},
        frames = function(){ return [
            {
                type : "texturebuffer"
            },
            {
                type : "renderbuffer"
            }
        ]};

    renders["_gaussSrc"] = extend({
        renderToFrame : true,
        order : -1.0,
        frames : frames(),
        programIndex: srcProgram
    }, srcRender, {
        class : Render2D
    });

    renders["_gaussVRender"] = {
        "class" : Render2D,
        "programIndex" : "gaussianVBlurProgram",
        "renderToFrame" : true,
        "order" : -.9,
        frames : frames(),
        "events" : {
            "beforeDrawElement" : this.beforeDrawGaussRender()("_gaussVRender")
        }
    };

    //HBlur
    renders["_gaussHRender"] = {
        "class": Render2D,
        "programIndex": "gaussianHBlurProgram",
        "renderToFrame": true,
        "order" : -.8,
        frames : frames(),
        "events" : {
            "beforeDrawElement" : this.beforeDrawGaussRender()("_gaussHRender")
        }
    };
};

GaussianBlurFilter.prototype.getPreviousRenderTexture = function(current){
    switch(current){
        case '_gaussVRender' :
            //get src render texture
            return this.getObject().getRender("_gaussSrc").getConfig().frames[0].instance;
        case '_gaussHRender' :
            //get gaussVRender texture
            return this.getObject().getRender("_gaussVRender").getConfig().frames[0].instance;
        default :
            //get gaussHRender
            return this.getObject().getRender("_gaussHRender").getConfig().frames[0].instance;
    }
};

GaussianBlurFilter.prototype.getResultTexture = function(){
    return this.getPreviousRenderTexture();
};

GaussianBlurFilter.prototype.beforeDrawGaussRender = function(){
    var _that = this;
    return function( renderName ){
        return function(object, data){
            var texture = _that.getPreviousRenderTexture(renderName),
                textureModule = _that.getObject().getModuleByClass(Texture);

            textureModule.bindTexture(object, "blur", texture);
            return true;
        };
    }
};

GaussianBlurFilter.prototype.getProgram = function(name, fragmentShader){
    return {
        "shaders" : {
            "vertex" : {
                "class": GaussianBlurVertexShader
            },
            "fragment" :{
                "class" : fragmentShader,
                distribution : this.getDistribution(),
                "const" : name === "gaussianHBlurProgram"? this.getHStep() : this.getVStep()
            }
        }
    }
};

GaussianBlurFilter.prototype.getDistribution = function(){
    var r = this.getR(),
        dist = [],
        sum = 0;
    //calc distribution
    for(var i = 0; i <= r; i++){
        var p = Math.gaussDist(r/2, i);
        dist.push(p);
        sum += p;        
    }
    for(var i in dist){
        dist[i] /= sum;
    }

    return dist;
};


/******************************************************************************/
/***************************Gaussian blur shaders******************************/
/******************************************************************************/
/*=Vertex Shader=*/
function GaussianBlurVertexShader(config){
    Shader.call(this, config);
    var c = this.getConfig();

    c.source = "attribute vec3 position;\n\
                    attribute vec2 textures;\n\
                    \n\
                    varying vec2 vTex;\n\
                    \n\
                    void main(){\n\
                        vTex = textures;\n\
                        gl_Position = vec4(position, 1.0);\n\
                    }";
}

GaussianBlurVertexShader.prototype = new Shader();
GaussianBlurVertexShader.prototype.constructor =  GaussianBlurVertexShader;
/*=Vertical Blur Fragment Shader=*/
function GaussianVBlurFragmentShader(config){
    Shader.call(this, config);

    var
        conf = this.getConfig(),
        dist = conf.distribution,
        c = conf.const;

    if(!dist)
        return;

    conf.source = " precision highp float;\n\
                    varying vec2 vTex;\n\
                   uniform sampler2D blur;\n\
                   float k["+dist.length+"];\n\
                   const float pixelDiff="+c+";\n\
                   void main(){\n";
    
    for( var i = 0; i < dist.length; i++)
        conf.source += "k["+i+"]="+dist[i]+";\n";

    conf.source += "vec4 color = vec4(.0, .0, .0, 0.0);\n\
                for(int i = -"+parseInt(dist.length/2)+"; i <= "+parseInt(dist.length/2)+"; i++)\n\
                    color += texture2D(blur, vec2(vTex[0]+float(i)*pixelDiff, vTex[1]))*k["+parseInt(dist.length/2)+"+i];\n\
                gl_FragColor =  color;\n\
            }\n\
            ";
}

GaussianVBlurFragmentShader.prototype = new Shader();
GaussianVBlurFragmentShader.prototype.constructor = GaussianVBlurFragmentShader;

/*=Horizontal Blur Fragment Shader=*/
function GaussianHBlurFragmentShader(config){
    Shader.call(this, config);
    var
        conf = this.getConfig(),
        dist = conf.distribution,
        c = conf.const;

    if(!dist)
        return;

    conf.source = " precision highp float;\n\
                    varying vec2 vTex;\n\
                   uniform sampler2D blur;\n\
                   float k["+dist.length+"];\n\
                   const float pixelDiff="+c+";\n\
                   void main(){\n";
    
    for( var i = 0; i < dist.length; i++)
        conf.source += "k["+i+"]="+dist[i]+";\n";

    conf.source += "vec4 color = vec4(.0, .0, .0, 0.0);\n\
                for(int i = -"+parseInt(dist.length/2)+"; i <= "+parseInt(dist.length/2)+"; i++)\n\
                    color += texture2D(blur, vec2(vTex[0], vTex[1]+float(i)*pixelDiff ))*k["+parseInt(dist.length/2)+"+i];\n\
                gl_FragColor =  color;\n\
            }\n\
            ";
}

GaussianHBlurFragmentShader.prototype = new Shader();
GaussianHBlurFragmentShader.prototype.constructor = GaussianHBlurFragmentShader;
/*----------------------------------------------------------------------------*/

