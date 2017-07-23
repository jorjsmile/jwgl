

function GaussianBlurFilter(info){
    Filter.call(this, info);
    
    var r = info.R || 10,
        hStep = info.hStep || 1/1024,
        vStep = info.vStep || 1/768; // blur radius
    
    this.getR = function(){
        return r;
    };
    this.getHStep = function(){
        return hStep;
    }
    this.getVStep = function(){
        return vStep;
    }
    
}

GaussianBlurFilter.prototype = new Filter();
GaussianBlurFilter.prototype.constructor = GaussianBlurFilter;

GaussianBlurFilter.prototype.eventBeforeInit = function(object){
    var jwgl = object;
    if(!(jwgl instanceof jWGL)) {
        throw "Inappropriate parent call";
    }
    
    var ps = object.getPrograms(),
        rs = object.getRender();
    
    ps["gaussianVBlurProgram"] = this.getProgram("gaussianVBlurProgram",GaussianVBlurFragmentShader);
    ps["gaussianHBlurProgram"] = this.getProgram("gaussianHBlurProgram",GaussianHBlurFragmentShader);
    rs["gaussianRender"] = this.getRender();
};  

GaussianBlurFilter.prototype.getRender = function(){
    
}

GaussianBlurFilter.prototype.getProgram = function(name, shaderClass){
    return {
        name : name,
        shaders : {
            "vertex" : GaussianBlurVertexShader,
            "fragment" :{
                class : shaderClass,
                distribution : this.getDistribution(),
                const : name === "gaussianHBlurProgram"? this.getHStep() : this.getVStep()
            }
        }
    }
}

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
    config.source = "attribute vec3 position;\n\
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
GaussianBlurVertexShader.prototype.constructor = new GaussianBlurVertexShader;
/*=Vertical Blur Fragment Shader=*/
function GaussianVBlurFragmentShader(config){
    Shader.call(this, config);  
    var dist = config.distribution,
        c = config.const;
    
    config.source = " precision highp float;\n\
                    varying vec2 vTex;\n\
                   uniform sampler2D texel;\n\
                   float k["+dist.length+"];\n\
                   const float pixelDiff="+c+";\n\
                   void main(){\n";
    
    for( var i = 0; i < dist.length; i++)
        config.source += "k["+i+"]="+dist[i]+";\n";

    config.source += "vec4 color = vec4(.0, .0, .0, 0.0);\n\
                for(int i = -"+parseInt(dist.length/2)+"; i <= "+parseInt(dist.length/2)+"; i++)\n\
                    color += texture2D(texel, vec2(vTex[0]+float(i)*pixelDiff, vTex[1]))*k["+parseInt(dist.length/2)+"+i];\n\
                gl_FragColor =  color;\n\
            }\n\
            ";
}

GaussianVBlurFragmentShader.prototype = new Shader();
GaussianVBlurFragmentShader.prototype.constructor = new GaussianVBlurFragmentShader;

/*=Horizontal Blur Fragment Shader=*/
function GaussianHBlurFragmentShader(config){
    Shader.call(this, config);  
    var dist = config.distribution,
        c  = config.const;
    
    config.source = " precision highp float;\n\
                    varying vec2 vTex;\n\
                   uniform sampler2D texel;\n\
                   float k["+dist.length+"];\n\
                   const float pixelDiff="+c+";\n\
                   void main(){\n";
    
    for( var i = 0; i < dist.length; i++)
        config.source += "k["+i+"]="+dist[i]+";\n";

    config.source += "vec4 color = vec4(.0, .0, .0, 0.0);\n\
                for(int i = -"+parseInt(dist.length/2)+"; i <= "+parseInt(dist.length/2)+"; i++)\n\
                    color += texture2D(texel, vec2(vTex[0], vTex[1]+float(i)*pixelDiff ))*k["+parseInt(dist.length/2)+"+i];\n\
                gl_FragColor =  color;\n\
            }\n\
            ";
}

GaussianHBlurFragmentShader.prototype = new Shader();
GaussianHBlurFragmentShader.prototype.constructor = new GaussianHBlurFragmentShader;
/*----------------------------------------------------------------------------*/

