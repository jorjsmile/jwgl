/**
 * Class will represent instance of a shader ( vertex or fragmental ),
 * It contain useful functions (loading, attaching to program, extracting variable and etc.)
 * 
 * @param {Object} config - object to adjust Shader, could contain
 *      
 *             <br><b>events</b> - <i>optional</i> - events that will be assigned to associtaed calls
 *             <br><b>program</b> - <i>required</i> - program which will contain this shader, it's an object,
 *                                                          specification of him @see jwgl
 *             <br><b>gl</b> - <i>required</i> - instance of gl rendering context
 *             <br><b>type</b> - <i>required</i> - type of the shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 *             <br><b>source</b> - <i>optional</i> - source of the shader
 *             <br><b>url</b> - <i>optional</i> - source of the shader that is contained following this url
 *              
 * @returns {Shader}
 */
function Shader(config){
    var _config = config || {};
    WGLObject.call(this, _config);
    this.getConfig = function(){ return _config; }
    this.getGL = function(){ return _config.gl; }
    this.getProgram = function(){ return _config.program; }   
}

Shader.prototype = new WGLObject();
Shader.prototype.constructor = Shader;

/**
 * create, compile and assign shaders to the program by given programName, after all assigns linkProgram
 * @param {String} programName name of the program which is query for his shaders
 */
Shader.prototype.init = function(){
        console.log(this.getConfig().source);

    var gl = this.getGL(),
        program = this.getProgram(),
        shader = gl.createShader(this.getConfig().type);

    gl.shaderSource(shader, this.getConfig().source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
    }

    gl.attachShader(program.instance, shader);
 
    this.raiseEvent("afterShaderAttached");
}

/**
 * set variable to project Shape using shader source
 * @param {Array} shaders, from source of each will be searched variables
 * @param {String} programName name of the program that will keep all variables
 */
Shader.prototype.initProgramVariables = function(){
    var vars = this.getConfig().source.match(/(attribute|uniform).*;/gm),
        programShaderName = this.getConfig().type == this.getGL().VERTEX_SHADER? "vertex" : "fragment",
        program = this.getProgram();
    program[programShaderName] = {};
    for(var v in vars){            
        var vInfo = vars[v].trim().match(/(attribute|uniform) ([^ ]+) ([^;]+)/),
            index = vInfo[3].replace(/\[[0-9a-zA-Z\_]+\]/,'');
    
        program[programShaderName][index] = {};
        program[programShaderName][index] =
            this.attachShaderVariable({name : vInfo[3],
                                  parsed : '',
                                  type:vInfo[2],
                                  qualifier : vInfo[1]});
    }
}
/**
 * Delegates from shader source defined structures
 * @returns {Array|@exp;_config@pro;structures}
 */
Shader.prototype.getStructures = function (){
    var _config = this.getConfig();
    if(_config.structures != undefined) return _config.structures;
    
    var structs = this.getConfig().source.match(/struct [^\{]+\{[^\}]+\}/gm);

    if(structs==null || structs.length == 0)
        return [];

    var structVars = {};
    for(var s in structs){
        var name = structs[s].match(/struct ([^\{]+){/)[1];
        var vars = structs[s]
                    .substr(structs[s].indexOf("{")+1, structs[s].lastIndexOf(";")-structs[s].indexOf("{")-1 )
                    .replace(/[\n\r]+/g, "")
                    .trim()
                    .split(";");

        structVars[name] = {};            

        for(var v in vars){
            var vType = vars[v].trim().match(/^(.*) /)[1];
            var vName = vars[v].trim().match(/ (.*)$/)[1]; 
            structVars[name][vName] = vType;
        }
    }

    return _config.structures = structVars;
}

/**
 * Delegates from source define statements
 * @returns {@exp;_config@pro;defines}
 */
Shader.prototype.getDefines = function(){
    var _config = this.getConfig();
    if(_config.defines != undefined) return _config.defines;
    var defines = this.getConfig().source.match(/\#define .*\n/gm);
    var defs = {};
    for(var d in defines){
        var name = defines[d].match(/\s(.*?)\s/)[1];
        var value = defines[d].match(/\s(.*?)\n/)[1];
        defines[name] = value;
    }
    return _config.defines = defs;
}
/**
 * Attach variables of shader to a program
 * 
 * @param {type} e
 */
Shader.prototype.attachShaderVariable = function( e ){
        var obj,
            structures = this.getStructures(),
            defines = this.getDefines(),
            gl = this.getGL(),
            program = this.getProgram();
//        console.log(e.name, e.type, e.parsed);
        if( e.name.indexOf("[") != -1 ){
            obj = {}; //it's an Shape
            var index = e.name.match(/\[([0-9A-Za-z\_]+)\]/)[1],
                length = 0;
                if(isNaN(index))
                    length = parseInt(defines[index]);
                else
                    length = parseInt(index); 
            e.name = e.name.substr(0, e.name.indexOf("[")); //currently will be processed
            
            for(var i = 0; i < length;  i++ ){
                obj[i] = {};
                var v = extend({}, e);
                    v.type = e.type,
                    v.parsed = e.parsed + e.name +"["+i+"]",
                    v.name = '',
                    v.index = i;
                obj[i] = this.attachShaderVariable( v );
            }
        }else if(structures[e.type] != undefined  ){
            obj = {};            
            for(var s in structures[e.type]){
                var v = extend({}, e);
                    v.parsed = e.parsed + e.name+".",
                    v.name = s,
                    v.type = structures[e.type][s];
                var index = s.indexOf("[")!=-1? s.substr(0, s.indexOf("[")) : s;
                obj[index] = {};
                obj[index] = this.attachShaderVariable( v );
            }
        }
        else{
            
            var name = e.parsed+ e.name;
            switch (e.qualifier){
                case "attribute" :
                    
                    obj = gl.getAttribLocation(program.instance, name);
//                    if(isPointer)
//                        gl.enableVertexAttribArray(obj);
                    
                    break;
                case "uniform":
                    obj = gl.getUniformLocation(program.instance, name);
                    break;
                default :break;
            }
        }
//        console.log(name, obj);
        return obj;
}

Shader.prototype.loadShader = function(callback){
    if(this.getConfig().url!= undefined){
        var _this = this;
        ajax(this.getConfig().url, function(source){
           _this.getConfig().source = source;
           _this.init();
           callback();
        });
    }
    else if (this.getConfig().source != undefined){        
        this.init();
        callback();
    }
        
}

function CompositeShader(options){
    var options = options || {};
    Shader.call(this, options);
    var variables = options.variables || {}, 
        structures = options.structures || {},
        defines = options.defines || {}, 
        prototypes = options.prototypes || {  },
        functions = options.functions || {
            "main" : {
                returnType : "void"
            }
        },
        _this = this;
    
    
    var checkLocation = function(location){
        if(
                location == undefined || location == "uniform" ||
                location == "attribute" || location == "varying"
            ) return true;
        return false;
    }
    
    var checkType = function(type){
        if(type == undefined) return false;
        var types = ["void", "bool", "int", "uint", 
                    "float",
                    "vec2", "vec3", "vec4", 
                    "bvec2", "bvec3", "bvec4", 
                    "ivec2", "ivec3", "ivec4", 
                    "uvec2", "uvec3", "uvec4", 
                    "mat2", "mat3", "mat4",
                    "sampler1D","sampler2D","sampler3D"
                ];
        if(inArray(types, type)) return true;
        if(structures[type] != undefined) return true;
        
        return false;
    }
    
    var checkVariable = function(info){
        return checkLocation(info["location"]) && checkType(info["type"]);
    }
    
    this.getVariables = function(){ return variables; };
    this.getAttachedStructures = function(){ return structures; };
    this.getDefines = function(){ return defines; };
    this.getFunctions = function(){ return functions; };
    this.getFunction = function(name){ return functions[name]; };
    this.getPrototypes = function(){ return prototypes; };
    
    /***
     * @param {String} name
     * @param {Object} info - clarify variable
     *          <br><b>const</b> - is variable constant
     *          <br><b>location</b> - location of the variable (uniform | variable | attribute)
     *          <br><b>type</b> - [required] - type of variable @see GLSL es for additional information
     *          <br><b>array</b> - length of the array, if it is not set assumed the variable is not an array
     *          <br><b>defaultValue</b> - default value of the variable
     * @returns {CompositeShader}
     */
    this.setVariable = function(name, info){
        
        if( !(info instanceof Expression) && (!checkVariable(info) || variables[name] !== undefined)) return;
        variables[name] = info;
        return _this;
    }
    
    this.setStructure = function(name, info){
        if(structures[name] !== undefined) return;
        
        structures[name] = {};
        structures[name]["variables"] = {};
        for(var v in info.variables )
            if(checkVariable(info.variables[v]))
                structures[name]["variables"][v] = info.variables[v];
        
        return _this;
    }
    
    this.setDefines = function(name, expr){
        if(defines[name] !== undefined) return false;
        defines[name] = expr;
        return _this;
    }
    
    this.setFunction = function(name, info){
        if( 
            functions[name] != undefined || !checkType(info.returnType)
        )
            return false;
        
        functions[name] = info;
        var __variables = {};
        
        for(var v in info.variables)
            if(checkVariable(info.variables[v])) 
                __variables[v] = info.variables[v];
        
        functions[name]["variables"] = __variables;
        
        
        var __inParams = {};
        
        for(var v in info.inParams)
            if(checkVariable(info.inParams[v])) 
                __inParams[v] = info.inParams[v];
        
        functions[name]["inParams"] = __inParams;
        
        if(info.setPrototype)
            prototypes[name] = info.returnType+" "+name+"( "+ this.renderVariables(info.inParams, ", ") + " )";
        
        return _this;
    }
    

}

CompositeShader.prototype = new Shader;
CompositeShader.prototype.constructor = CompositeShader;

CompositeShader.prototype.loadShader = function(callback){
    this.buildSource();
    this.init();
    callback();
};

CompositeShader.prototype.renderVariables = function(variables, delimiter){
    var _vars = [];
    for(var v in variables){
        if(!(variables[v] instanceof Expression))
            variables[v].name = v;

        _vars.push(this.renderVariable(variables[v]));
    }
    return _vars.join(delimiter);
};

CompositeShader.prototype.renderVariable = function(variable){
    if(variable instanceof Expression)
        return variable.renderExpression();

    if(variable.type == undefined) 
        throw "Variable require type";
    var array = variable.array != undefined? "["+variable.array+"]" : "",
        defaultValue = variable.defaultValue !== undefined?  " = " + variable.defaultValue : "",
        constant = variable.const != undefined? "const" : "";
   
    return (
            (constant || "") + " " +
            (variable.location || "") + " " +
            variable.type + " " +
            variable.name + 
            array + 
            defaultValue).replace(/\ +$/, "");    
}

CompositeShader.prototype.renderStructure = function(structure){
     return "struct " + structure.name + "{\n\t "+this.renderVariables(structure.variables, ";\n\t").suffix(";")+" \n}";
}

CompositeShader.prototype.renderStructures = function(structures){
    var output = [];
    for(var s in structures){
        structures[s].name = s;
        output.push(this.renderStructure(structures[s]));
    }
    
   return output.join(";\n").suffix(";\n");
}

CompositeShader.prototype.renderDefines  = function(defines){
    var output = [];
    for(var d in defines ) 
        output.push("#define "+d+" "+defines[d]);
    return output.join("\n").suffix("\n");
}

CompositeShader.prototype.renderPrototypes  = function(prototypes){
    var output = [];
    for(var p in prototypes ) 
        output.push(prototypes[p]);
    return output.join(";\n").suffix(";\n");
}

CompositeShader.prototype.renderFunction = function(info){
    var returnExpr = info.returnType != "void"? "return " + info.returnExpr : "",
        expressions = typeof(info.expressions) == "string" || info.expressions == undefined? info.expressions || "" : info.expressions.join("\n\t"),
        variables = this.renderVariables(info.variables, ";\n\t");
  
    return  info.returnType + " " + info.name + 
                                 "(" + this.renderVariables(info.inParams, ", ") + "){ \n\t" +
                                 variables.suffix(";\n\t")+
                                 expressions.suffix("\n\t") +
                                 returnExpr.suffix(";\n") +
                                 "}\n";
}

CompositeShader.prototype.renderFunctions = function(functions){
    var output = [];
    for(var f in functions){
        functions[f].name = f;
        output.unshift(this.renderFunction(functions[f]));
    }
    return output.join("\n").suffix("\n");
}

CompositeShader.prototype.buildSource = function(){
    var variables = this.getVariables(),
        defines = this.getDefines(),
        structures = this.getAttachedStructures(),
        functions = this.getFunctions(),
        prototypes = this.getPrototypes();

    this.getConfig().source =  this.renderDefines(defines) + "\n" + 
           this.renderStructures(structures).suffix("\n\n") +
           this.renderPrototypes(prototypes).suffix("\n\n") +
           this.renderVariables(variables, ";\n").suffix(";\n\n") +
           this.renderFunctions(functions);
}
//CompositeShader.prototype.add

function Expression(e){
    var _expr = e || {
        elements : [],
        operator : "*",
        cast : ""
    },
        _this = this;
    
    this.getExpr = function (){ return _expr; };
    this.setExpr = function (_e){ _expr = _e; return _this; };
}


Expression.prototype = new Object();
Expression.prototype.construct = Expression;

Expression.prototype.toString = function(){
    return this.renderExpression();
}

Expression.prototype.renderExpression = function(){
    var _e = this.getExpr();
    if(typeof(_e) == "string" || _e.elements == undefined)
        return _e;
    
    if(_e.elements.length == 0)
        return "";
    
    var expr = typeof(_e.elements) == "object"? _e.elements.join(_e.operator) : _e.elements,
        prefix = _e.prefix == undefined ? "" : _e.prefix,
        suffix = _e.suffix == undefined ? "" : _e.suffix;
   
    expr = "(" + expr + ")";   
    return ((_e.cast||"") + expr ).prefix(prefix).suffix(suffix);
}

function VertexCompositeShader(options){
    var options = options || {};
    CompositeShader.call(this, options);    
    
    var GL_POSITION = options.position || [], GL_POINTSIZE = options.pointsize || [],
            _this = this;
    
    this.setPositionExpression = function(expr){
        GL_POSITION.push(expr);
        return _this;
    }
    
    this.getPosition = function (){
        return GL_POSITION;
    }
    
    this.setPointSizeExpression = function(expr){
        GL_POINTSIZE.push(expr);
    }
    
    this.getPointSize = function(){
        return GL_POINTSIZE;
    }
}

VertexCompositeShader.prototype = new CompositeShader;
VertexCompositeShader.prototype.constructor = VertexCompositeShader;

VertexCompositeShader.prototype.isReady = function(){
    return this.getPosition().length;
};

VertexCompositeShader.prototype.buildSource = function(){
    var expression = this.getFunction("main").expressions || [],
        position = new Expression({elements:this.getPosition() || [], suffix : ";", prefix : "gl_Position = "}),
        pointSize = new Expression({elements:this.getPointSize() || [], suffix : ";", prefix : "gl_PointSize = "});

    
    expression.push(position,pointSize);
    this.getFunction("main").expressions = expression;
    
    CompositeShader.prototype.buildSource.call(this);
}

function FragmentCompositeShader(options){
    var options = options || {};
    CompositeShader.call(this, options);    
    
    var GL_COLOR = options.color || [], 
        precision = options.precision || {type:"float", value:"highp"},    
        _this = this;
    
    this.setColorExpression = function(expr){
        GL_COLOR.push(expr);
        return _this;
    }
    
    this.clearColor = function(color){
        var c = color || [1.0, 1.0, 1.0, 1.0];
        c = c.join(",");
        GL_COLOR = ["vec4("+c+")"];
    }
    
    this.getColor = function (){
        return GL_COLOR;
    }
    
    this.setPrecision = function(o) { precision = o; return _this; };
    this.getPrecision = function() { return precision; };
}

FragmentCompositeShader.prototype = new CompositeShader;
FragmentCompositeShader.prototype.constructor = FragmentCompositeShader;

FragmentCompositeShader.prototype.isReady = function(){
    return this.getColor().length;
};

FragmentCompositeShader.prototype.renderPrecision = function(){
    var precision = this.getPrecision();
    if(!precision.type || !precision.value) return;
    
    return "precision " + precision.value + " " +   precision.type +";";
}

FragmentCompositeShader.prototype.buildSource = function(){
    var expression = this.getFunction("main").expressions || [],
        color = new Expression({elements : this.getColor(), "prefix" : "gl_FragColor = ", "suffix" : ";", operator : "*"});

    expression.push(color);   
    this.getFunction("main").expressions = expression;
    CompositeShader.prototype.buildSource.call(this);
    this.getConfig().source = this.renderPrecision() + "\n" + this.getConfig().source;
}

/*-------------------------------------------------------------------*/
/*|                                                                 |*/
/*|                      Predefined Shaders                         |*/
/*|                     Used for quick start                        |*/
/*|                                                                 |*/
/*-------------------------------------------------------------------*/

var SimpleVertexShader = {
        class : Shader,
        url : "../lib/shaders/vertex.vsh"
    },
    SimpleFragmentShader = {
        class : Shader,
        url : "../lib/shaders/fragment.fsh"
    },
    ComplexVertexShader = function() {
        return {
            class: VertexCompositeShader,
            variables: {
                "position": {
                    location: "attribute",
                    type: "vec3"
                },
            },
            position: [
                new Expression({
                    elements: ["vec4(position, 1.0)"]
                })
            ]
        }
    },
    ComplexFragmentShader = function(){
        return {
            class : FragmentCompositeShader,
            color : [new Expression({ elements:"vec4(1.0, 1.0, 1.0, 1.0)" })]
        };
    },
    ComplexVertexShader3D = function(){
        return {
            class: VertexCompositeShader,
            variables: {
                "projectionMatrix" : {
                    location : "uniform",
                    type : "mat4"
                },
                "modelViewMatrix" : {
                    location : "uniform",
                    type : "mat4"
                },
                "modelMatrix" : {
                    location : "uniform",
                    type : "mat4"
                },
                "position": {
                    location: "attribute",
                    type: "vec3"
                },
            },
            functions : {
                "main" : {
                    "returnType" : "void",
                    "expressions" : [
                        new Expression({elements:["modelMatrix", "vec4(position, 1.0)"], suffix : ";", prefix : "vec4 modelPosition = ", "operator" : "*"}),
                        new Expression({elements:["modelViewMatrix", "modelPosition"], suffix : ";", prefix : "vec4 modelViewPosition = ", "operator" : "*"}),
                    ]
                }
            },
            position : [
                new Expression({
                        elements : ["projectionMatrix", "modelViewPosition" ],
                        operator :"*"
                    })
            ]
        }
    };