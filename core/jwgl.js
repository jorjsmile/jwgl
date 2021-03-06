/**
 * 
 * @param {element} el
 * @param {Object} options
 * @returns {jWGL}
 *
 * @example
 * wgl = new jWGL("camera", {
                programs : {
                    "main" : {
                        name : "Main",
                        shaders : {
                            vertex : ComplexVertexShader,
                            fragment : ComplexFragmentShader
                        }
                    }
                },
                render : {
                    "main":{
                        class : Render3D,
                        programIndex : "main",
                    }
                },
                data : [
                ],
                modules : {}
            });

 wgl.init();
 *
 * @startuml
 * jWGL : -options;
 * @enduml
 */
function jWGL(el, options){
    var options = options || {};
    WGLObject.call(this, options);
    
    /************************* Private properties ************************/
    var el,
        debugLibrary = options.debugLibrary || "lib/webgl.debug.js",
        canvasOptions = extend({
                            premultipliedAlpha : false
                        }, options["canvas"] || {}),
        programs = options.programs || { }, //program or programs that will be inited
        defaultProgram = options["defaultProgram"] || "main",
        render = options.render || Render3D,
        _this = this;


    
    /************************** Private methods **************************/
    
    var linkProgram = function(gl, program){
//        console.log(program.name+" - link ");
        if(gl.getAttachedShaders(program.instance).length != 2) return ;
                
        gl.linkProgram(program.instance);
        if( !gl.getProgramParameter(program.instance, gl.LINK_STATUS) )
            throw "Program "+program.name||''+" link failed. " + gl.getProgramInfoLog(program.instance);

        gl.validateProgram(program.instance);
        if( !gl.getProgramParameter(program.instance, gl.VALIDATE_STATUS) )
            throw "Program "+program.name+" validate failed. " + gl.getProgramInfoLog(program.instance);
        
        
        program.shaders.vertex.instance.initProgramVariables();
        program.shaders.fragment.instance.initProgramVariables();
        _this.raiseEvent("afterShadersInit", program.shaders.vertex, program.shaders.fragment);        
    }
    /**
     * initialize all shader programs with theirs variables
     */
    var initPrograms = function(callback, gl){
        var syncList = [];
        
        for(var i in programs){
            programs[i].instance = gl.createProgram();
            if(     programs[i].shaders.vertex == undefined ||
                    programs[i].shaders.fragment == undefined 
                ){ 
                console.log("Program `"+i+"` doesn't have required shaders");
            }
            else{
                  var vertexClass = programs[i].shaders.vertex.class || Shader;
                  var fragmentClass = programs[i].shaders.fragment.class || Shader;
//                  console.log(vertexClass, fragmentClass);
                  programs[i].shaders.vertex.instance = new vertexClass(
                          extend(programs[i].shaders.vertex, {
                                gl : gl,
                                program : programs[i],
                                type : gl.VERTEX_SHADER
                          }));
                  
                  programs[i].shaders.fragment.instance = new fragmentClass(
                          extend(programs[i].shaders.fragment, {
                                gl : gl,
                                program : programs[i],
                                type : gl.FRAGMENT_SHADER
                          }));
                 _this.raiseEvent("beforeLoadShaders", i, 
                            programs[i].shaders.vertex.instance,
                            programs[i].shaders.fragment.instance);
                            
                 (function(a){
                    programs[a].shaders.vertex.instance.addListener("afterShaderAttached", 
                                    function(o){                                        
                                        linkProgram( gl, programs[a]);   
                                    });
                    programs[a].shaders.fragment.instance.addListener("afterShaderAttached", 
                                    function(o){                                        
                                        linkProgram( gl, programs[a]);   
                                    });
                    syncList.push( function(o, c){ console.log('vertex',a); programs[a].shaders.vertex.instance.loadShader(c); },
                                   function(o, c){ console.log('fragment',a);programs[a].shaders.fragment.instance.loadShader(c); } ) ;
                 })(i);
             }             
        }     
        
        _this.sync(syncList, callback);
    }

    var initRenderData = function(callback, gl){        
         for(var i in options.data){
            _this.data[i] = _this.initRenderElement(gl, options.data[i]);
        }        
        _this.raiseSyncEvent("afterInitRenderData", callback);
    };
    
    var initRender = function(callback){
        
        var config = {
            el : el,
            gl : _this.gl//,
            // data : _this.data
        };
        
        if(typeof(render) != "object"){
            var r = render;
            render = {
                defaultProgram : {
                    class : r,
                    programIndex : defaultProgram
                }
            };
        }
        _this.raiseEvent("beforeInitRenders");

        var renders = {};
        for(var r in render){

            var c = extend({}, render[r], config, {
                    program : _this.getProgram(render[r].programIndex)
                }),
                rClass = render[r].class;

            if(c.data === undefined)
                c.data = _this.data;


            renders[r] = new rClass(c);
        }
        
        render = renders;
        _this.raiseEvent("afterInitRenders");
        callback.call(_this);
    }
    /************************** Public methods **************************/
    this.getDebugLibrary = function(){ return debugLibrary; };
    this.getDefaultProgram = function() { return programs[defaultProgram]; };
    this.getPrograms = function(){ return programs; };
    this.getEl = function(){ return el; };
    this.addRenderData = function(data){
        var d = data instanceof Shape? [data] : data;
        for(var o in d)
        {
            var i = _this.data.length;
            _this.data[i] = initRenderElement(this.gl, d[o]);            

        }
    };
    this.createDataBuffers = function(data){
        data.vertices = _this.registerBuffer(new Float32Array(data.vertices), this.gl.ARRAY_BUFFER);
        data.indices = _this.registerBuffer(new Uint16Array(data.indices), this.gl.ELEMENT_ARRAY_BUFFER );
        return data;
    },
    this.clearData = function(){ 
        while(this.data.length > 0) this.data.shift();
    };
    this.getRender = function(name){ 
            if(name===undefined) return render;
            else return render[name];
    };
    this.getRenderByProgram = function(name){
        for(var r in render) if(render[r].getProgram().name === name) return render[r];
        return false;
    };
    this.init = function(){    
        this.raiseEvent("beforeInit");
        //initialization
        this.sync([
            function(object, callback) { initPrograms(callback, _this.gl); },
            function(object, callback) { initRenderData(callback, _this.gl); }],
            function() { 
                _this.raiseEvent("afterInit");
                initRender(_this.run); 
            } );
        
    };
    this.initRenderElement = function(gl, data){
        // console.log(data);
        _this.raiseEvent("beforeInitRenderElement", data);
        _this.createDataBuffers(data);
        _this.raiseEvent("afterInitRenderElement", data);

        return data;
    };


    this.ticksLimit = options.ticksLimit || -1;
    this.data = [];
    this.gl = {};
    //for now there is now other way to determine version of working webgl,
    //so we will populate it with as initialize webgl context
    this.glVersion = "";
    /*************** Init WEBGL *************/
    if( !el )
        throw "Choose an element!";
    
    var canvas = document.getElementById(el);
    
    if( !canvas ) 
        console.log("Element was not found");
    
    try{            
        this.gl =  // canvas.getContext(this.glVersion='webgl2', canvasOptions) || //current ui-debuggers don't see that context
                   canvas.getContext(this.glVersion='webgl', canvasOptions) ||
                   canvas.getContext(this.glVersion='experimental-webgl', canvasOptions);
    }
    catch( e ){
        console.log( e );
        throw e;
    }
        
    if( !this.gl )
            throw "Couldn't initialize webgl";

    // canvas.addEventListener("webglcontextlost", function(event) {
    //     event.preventDefault();
    // }, false);
    //
    // canvas.addEventListener(
    //     "webglcontextrestored", function(){
    //         // _this.init();
    //         _this.run();
    //     }, false);
    /*************** Init WEBGL *************/    
}

jWGL.prototype = new WGLObject;
jWGL.prototype.constructor = jWGL;

/**
 * Initializwe debuging of the extWG, it's possible to configure WebGLDebugUtils
 * @see explore khronos
 */
jWGL.prototype.initDebug = function(){
    var obj = this;
    var script = document.createElement("script");
    script.src = this.getDebugLibrary();
    script.type = "text/javascript";
    script.onload = function(){
        obj.gl = WebGLDebugUtils.makeDebugContext(obj.gl,
                     function(err, funcName, args){
                         throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
                     },
                     function logGLCall(functionName, args) {
                        console.log("gl." + functionName + "(" +
                        WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
                     }
                 );
    }
    document.getElementsByTagName("body")[0].appendChild(script);

}


/**
 * use required program
 * @param programIndex, name of the program to use, if it's null default one will be activated
 */
// jWGL.prototype.activateProgram = function(programIndex){
//     var p = this.getProgram(programIndex);
//
//     if(p == undefined)
//         throw "Program "+programIndex+" doesn't exists";
//     else
//         this.gl.useProgram(p.instance);
// }

/**
 * get program by name if name is null returns default program
 * @param {String} programIndex
 * @return {Shape}
 */
jWGL.prototype.getProgram = function(programIndex){
    return programIndex == undefined? this.getPrograms()[this.getDefaultProgram()] : this.getPrograms()[programIndex];
}

/**
 * @param data
 * @param type
 */
jWGL.prototype.registerBuffer = function(data, type){    
    var b = this.gl.createBuffer();
    this.gl.bindBuffer(type, b);    
    this.gl.bufferData(type, data, this.gl.STATIC_DRAW);
    return b;
};

jWGL.prototype.run = function(){
    this.raiseEvent("beforeRun");
    var renders = this.getRender(),
        rendersOrder = [];


    for(var r in renders){
        var c = renders[r].getConfig();
        // this.activateProgram(c.programIndex);
        rendersOrder.push({ name : r, o : c.order||0 });
        renders[r].init();
//        renders[r].process();
    }
    this.rendersOrder = rendersOrder.sort(function(a,b){ return a.o > b.o; });
    this.loopFunc();
}


jWGL.prototype.loopFunc = function(){
    this.ticks = this.ticks || 0;
    var _this = this,
        renders = this.getRender();
    window.requestAnimationFrame(function(){
        // console.log(_this.ticks);
        for(var r in _this.rendersOrder){
            var render = renders[_this.rendersOrder[r]["name"]];
            // console.log(r, _this.rendersOrder[r]["name"]);
            if( render.getConfig().loop ){
                _this.raiseEvent("beforeRenderProcess", render);
                render.process();
                _this.raiseEvent("afterRenderProcess", render);
            }
        }
        ++_this.ticks;
        if(_this.ticksLimit !== -1 && _this.ticksLimit < _this.ticks)
            return;
        else
            _this.loopFunc();

    }, _this.getEl());
};