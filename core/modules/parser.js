function Parser( o ){
    WGLModule.call(this, o);
    
    var object = this.getObject(),
        parsersList = o.parsers || ["dae"],
        fileInput = o.fileInput || object.getEl(),
        parseStatusEl = o.parseStatus || "div",
        instructions = o.instructions || ["geometry"], 
        history = {},
        displayHistory = o.displayHistory || false;

    this.getParsersList = function(){ return parsersList; };
    this.getFileInput = function(){ return fileInput; };
    this.getInstructions = function(){ return instructions; };
    this.getParseStatusEl = function(){ return parseStatusEl; };
    this.setParseStatusEl = function(el){ parseStatusEl = el; };
    this.getDisplayHistory = function(){ return displayHistory; };
    this.getHistory = function(name){ 
        if(name !== undefined)
            return history[name];
        else
            return history;
    };
    this.setHistory = function(name, doc){ history[name] = doc;  };
    this.displayHistoryFunc = o.displayHistoryFunc || this.internalDisplayHistoryFunc;
    
    
    this.fileInfo = null;
    
}

Parser.prototype = new WGLModule;
Parser.prototype.constructor = Parser;


Parser.prototype.setRenderObjects = function(renderObjects){
    this.getObject().addRenderData(renderObjects);
};

Parser.prototype.showGeometryEl = function(show, object){
       
    var file = object.getAttribute("file"),
        el = object.getAttribute("nr"),
        id = object.getAttribute("id"),
        geometry = this.getHistory(file)["geometry"][el];
    
    if(show){
        this.getObject().data.push(geometry);
    }
    else{
        var data = this.getObject().data,
            index = null;
        
        for(var d=0; d < data.length;d++){
            if(data[d].parserInfo === undefined ) continue;
            if(data[d].parserInfo.file.name === file &&
               data[d].parserInfo.htmlID === id)
               index = d;
        }
        if(index === null ) return ;
        
        var part1 = data.slice(0, index),
            part2 = data.slice(index+1);
        this.getObject().clearData();
        Array.prototype.push.apply(this.getObject().data , part1);
        Array.prototype.push.apply(this.getObject().data , part2);
    }
//    console.log(this.getObject().data);
    
};

Parser.prototype.internalDisplayHistoryFunc = function(file, newParsed){
    var fieldsetEl = document.createElement("fieldset"),
        legendEl = document.createElement("legend"),
        dl = document.createElement("dl"),
        instructs = this.getInstructions(),
        loadHistoryEl = document.createElement("button"),
        appendHistoryEl =document.createElement("button"),
        _this = this,
        activateAllCheckboxes = function(status){
            var checkboxList = dl.getElementsByTagName("input");
            for(var c=0; c < checkboxList.length; c ++)
                if(checkboxList[c].type === 'checkbox') checkboxList[c].checked = status;
        };
    
    dl.style['max-height'] = '300px';
    dl.style.overflow = 'auto';
    legendEl.innerHTML = "File: " + file.filename + "." + file.type;
    loadHistoryEl.innerHTML = "Load Session";
    appendHistoryEl.innerHTML = "Append Session";
    
    addEvent(loadHistoryEl, "click", function(){
        _this.applyHistory(file.filename, true);
        activateAllCheckboxes(true);
        
    });    
    
    addEvent(appendHistoryEl, "click", function(){
        _this.applyHistory(file.filename, false);
        activateAllCheckboxes(true);
    });
    
    if(inArray(instructs, "geometry")){
        var dt = document.createElement("dt"),            
            dd = document.createElement("dd"),
            ul = document.createElement("ul");
        dt.innerHTML = "Geometry";
        for(var o in newParsed["geometry"]){            
            var li = document.createElement("li"),
                elCheckbox = document.createElement("input");
            elCheckbox.type="checkbox";
            elCheckbox.checked = "checked";
            newParsed["geometry"][o].parserInfo.htmlID = elCheckbox.id = "parsed_object_"+o;
            elCheckbox.setAttribute("file", file.filename);
            elCheckbox.setAttribute("nr", o);
            
            addEvent(elCheckbox, "change", function(e){ 
                _this.showGeometryEl(this.checked, this);
            });
            
            li.innerHTML = newParsed["geometry"][o]["parserInfo"].name;
            li.appendChild(elCheckbox);
            ul.appendChild(li);
        }
        dl.appendChild(dt);
        dd.appendChild(ul);
        dl.appendChild(dd);        
    }
    

    
    fieldsetEl.appendChild(legendEl);
    fieldsetEl.appendChild(loadHistoryEl);
    fieldsetEl.appendChild(appendHistoryEl);
    fieldsetEl.appendChild(dl);
    document.getElementById("parser-history-container").appendChild(fieldsetEl);
};

Parser.prototype.applyHistory = function(name, clearPrevious){
    var h = this.getHistory(name),
        data = this.getObject().data;
    
    if(clearPrevious)
        this.getObject().clearData();
    
    data.push.apply(data, h["geometry"]);
};

Parser.prototype.loadHistory = function(name){
    var h = this.getHistory(name);
    
    if(this.getDisplayHistory())
        this.displayHistoryFunc.call(this, this.fileInfo, h);
    this.getObject().clearData();
    
    this.setRenderObjects(h["geometry"]);
};

Parser.prototype.eventBeforeInit = function(object){
    var object = this.getObject(),
        fileInput = this.getFileInput(),
        elInput = document.getElementById(fileInput),
        renderEl = document.getElementById(object.getEl()),
        _this = this;

    if(elInput === null){
        var input = document.createElement("input");

        input.type = "file";
        input.id = fileInput;
       
        renderEl.parentNode.insertBefore(input, renderEl.nextSibling);
        elInput = input;
    }
    
    if(elInput.tagName.toLowerCase() === "input"){
        elInput.onchange = function(e){
            _this.getFileInfo(e.target.files[0]);
        }; 
    }
    
    if(object.getEl() === fileInput){
        this.addDragDropListener(elInput);
    }    
    
    if(typeof(this.getParseStatusEl()) === "string"){
        var parseEl = this.getParseStatusEl(),
            newEl = document.createElement(this.getParseStatusEl());
        newEl.id = "parser-status";
        renderEl.parentNode.insertBefore(newEl, renderEl.nextSibling);
        this.setParseStatusEl(newEl);
    }
    
    if(this.getDisplayHistory () === true && this.displayHistoryFunc === this.internalDisplayHistoryFunc){
        var el = object.getEl(),
            newEl = document.createElement("div"),
            titleEl = document.createElement("h4"),
            clearCanvas = document.createElement("button");
    
        addEvent(clearCanvas, "click", function(){
            _this.getObject().clearData();
            var checkboxList = newEl.getElementsByTagName("input");
            for(var c=0; c < checkboxList.length; c ++)
                if(checkboxList[c].type === 'checkbox')
                    checkboxList[c].checked = false;
        });
        clearCanvas.innerHTML = "Clear Canvas";
        newEl.id = "parser-history-container";
        newEl.style.width = "400px";
        titleEl.innerHTML = "Parsed documents";
        newEl.appendChild(titleEl);
        newEl.appendChild(clearCanvas);
        
        renderEl.parentNode.insertBefore(newEl, renderEl.nextSibling);
        
    }
    
};

Parser.prototype.addDragDropListener = function(el){
    var _this = this;
    addEvent(el, "dragover", function(e){
            e.preventDefault();
        });
    addEvent(el, "dragenter", function(e){
            e.preventDefault();
        });
    addEvent(el, "drop", function(e){
        _this.getParseStatusEl().innerHTML = "";
        try{
            _this.getFileInfo(e.dataTransfer.files[0]);
        }catch(e){
            _this.getParseStatusEl().innerHTML = e;
//            console.log(e);
        }
        e.preventDefault();        
    });   
};

Parser.prototype.getFileInfo = function(file) {
    var fR = new FileReader(),
        _this = this;
//        this.dropedFiles = [];
//        for( var f = 0; f < files.length; f++ ){

//            this.dropedFiles[f] = new FileReader();
    var info = {
        filename: file.name.substr(0, file.name.indexOf(".")),
        type: file.name.substr(file.name.indexOf(".") + 1).toLowerCase()
    };
    if ( !inArray(this.getParsersList(), info.type.toLowerCase()) ) { //&& fileToParseNr 
        throw "File of type "+info.type.toLowerCase()+" couldn't be parsed";
    }

//            if( _this.canParse[info.type.toLowerCase()] ){
//            fileToParseNr ++;
    this.fileInfo = info;
    
    try {
        this.formatHelper[info.type].read(fR, file);
    } catch(e){
        throw "Unknown parser for this file";
    }
    
    fR.onload = function(e) {
        _this.fileInfo.content = e.srcElement === undefined? e.originalTarget.result : e.srcElement.result;
        var doc = _this.processFormat();
        doc["geometry"] = _this.normalizeGeometry(doc["geometry"]); //make all objects had points not higher than [-1.0, 1.0] via x,y,z
        _this.setHistory(_this.fileInfo.filename, doc);
        _this.loadHistory(_this.fileInfo.filename);
//        console.log(objects["geometry"]);
//        _this.getObject().addRenderData(doc["geometry"]);
//        console.log(objects);
    };
//            }
};

Parser.prototype.normalizeGeometry = function(o){
    var min  = Number.MAX_VALUE,
        max = Number.MIN_VALUE;

    for(var v in o){
        var oMin = Math.min.apply(Math, o[v].vertices),
            oMax = Math.max.apply(Math, o[v].vertices);
        min = Math.min(min, oMin);
        max = Math.max(max, oMax);
    }
    
    var k = Math.abs(min) > max? Math.abs(min) : max;
    for(var v in o){
        o[v].vertices = o[v].vertices.map(function(el){ return el/k; });
        if(o[v].translate!==undefined)
            o[v].translate = [
                                o[v].translate[0]/k, 
                                o[v].translate[1]/k, 
                                o[v].translate[2]/k
                            ];
    }
    return o;
};

Parser.prototype.formatHelper = {};

Parser.prototype.processFormat = function(){
    try{        
        var formatParser = this.formatHelper[this.fileInfo.type].parser;
    }
    catch(e){
        throw "Unknown parser for this file";
    }
    
    if( !formatParser ) return false;
         
    return (new formatParser(this.fileInfo, this.getInstructions())).process();
};


function Format(file, options){
    WGLObject.call(this, options);
    var file = file;    
    
    this.getFile = function(){ return file; };
}

Format.prototype = new WGLObject;
Format.prototype.constructor = Format;

/**
 * 
 * @returns List of Shape objects
 */
Format.prototype.process = function(){    
    //should be realized in childs
    throw "Function is abstract. You should implement it in your class";
};