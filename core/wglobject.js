function WGLObject(o) {

    var o = o || {},
        _events = {};

    this.getOptions = function(){ return o; };
    
    this.addListener = function(name, func, object) {
        if (_events[name] === undefined)
            _events[name] = [];
//        console.log(name, func);
        _events[name].push({ func : func, obj : object});
    };

    this.getEvent = function(name) {
        return _events[name];
    };


    if (o.events !== undefined) {
        for (var e in o.events) {
            this.addListener(e, o.events[e], o.object);
        }
    }
}

WGLObject.prototype.raiseEvent = function() {
    var args = Array.prototype.slice.call(arguments),
        functions = this.getEvent(args.shift()) || [];
    args.unshift(this);
    for (var e in functions) {
        if (typeof(functions[e].func) === "function")
            functions[e].func.apply(functions[e].obj, args);
    }
};
/**
 * 
 * @param {Array} functions list of functions to synchronize with callback
 * @param {Function} callback - run after all functions are done
 */
WGLObject.prototype.sync = function() {
    var args = Array.prototype.slice.call(arguments),
            functions = args.shift(),
            callbackFunc = args.shift(),
            _this = this;

    if (functions.length === 0){
        return callbackFunc.apply(this);
    }
    var internalCallback = new function() {
//           console.log(functions.length, this._called);
        var _called = 0;
        this.run = function() {
            _called++;
            if (functions.length == _called) {
                callbackFunc.apply(_this);
            }
        };
    };
    args.unshift(internalCallback.run);
    args.unshift(this);
    for (var e in functions) {
        if (typeof(functions[e]) === "function")
            functions[e].apply(null, args);
        else if (typeof(functions[e] ) === "object")
            functions[e].func.apply(functions[e].obj, args);
    }
};

WGLObject.prototype.raiseSyncEvent = function(name, callback) {
    var args = Array.prototype.slice.call(arguments),
            functions = this.getEvent(args.shift()) || [];
    args.unshift(functions);
    WGLObject.prototype.sync.apply(this, args);
};

WGLObject.prototype.assignModules = function(list){
    this._modules = {};
    for(var m in list){
        var className = list[m],
            options = {object : this};
        if(typeof(list[m]) === "object"){
            className = list[m].class;
            options = extend(options, list[m]);
        } 
        this._modules[m] = new className(options);
        this._modules[m].listenObject();
    }
};

WGLObject.prototype.getModuleByClass = function(className){
    for(var m in this._modules){
        if(this._modules[m] instanceof className) return this._modules[m];
    }
    return null;
}

function WGLModule(options){
    WGLObject.call(this, options);
    
   
    var options = this.getOptions(),
        object = options.object;
    
    this.getObject = function( ){ return object; };
}

WGLModule.prototype = new WGLObject;
WGLModule.prototype.constructor = WGLModule;

WGLModule.prototype.listenObject = function(){
    for(var p in this){
        if( typeof(this[p]) !== "function" || p.indexOf("event") !== 0) continue;
        var eventName = p.replace("event", "").lcfirst();
        this.getObject().addListener(eventName, this[p], this);
    }
};
