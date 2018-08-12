function Control(options){
    WGLModule.call(this,options);
    
    var restrictedColors = options.restrictedColors || [],
        currentImage = null,
        selectedIndex = -1,
        programIndex = options.program || "main",
        boundingColor = options.boundingColor || [.5, .5, .5, 1.0],
        c = this.getOptions();
    
    c.translate = c.translate === undefined? false : {};
    if(c.translate){
        c.translate.colors = c.translate.colors || {
            xAxis : [1.0, .0, .0, 1.0],
            yAxis : [.0, 1.0, .0, 1.0],
            zAxis : [.0, .0, 1.0, 1.0]
        };
    }
    c.renderBG = c.renderBG || [1.0, 1.0, 1.0, 1.0];
    
    this.getProgramIndex = function(){ return programIndex; };
    this.getBoundingColor = function(){ return boundingColor; };
    this.getRestrictedColors = function(){ return restrictedColors;  };
    this.setRestrictedColor = function(color){ 
        
        if(typeof color === "object"){
            var id = this.isRestrictedColor(color);
            if(id === false) return false;
            
            restrictedColors.push(id);
            return true;            
        }
        
        if(typeof color === "number" && !this.isRestrictedColorID(color)){
//            console.log(color);
            restrictedColors.push(color);
            return true;
        }
        return false;
    };
    this.getIdFromColor = function(color){ return color[0]+color[1]*256+color[2]*65536; };
    this.isRestrictedColor = function(color){ 
        var id = this.getIdFromColor(color);
        return restrictedColors.indexOf(id) !== -1? false : id;  
    };
    this.isRestrictedColorID = function(colorID){ return restrictedColors.indexOf(colorID) !== -1; };
    this.initCurrentImage = function(w,h){ currentImage = new Uint8Array( w * h * 4 ); };
    this.getCurrentImage = function(){ return currentImage; };
    this.setCurrentImage = function(image){ currentImage = image; };
    this.getSelectedIndex =  function() { return selectedIndex; };
    this.setSelectedIndex = function(i){ selectedIndex = i; };
    this.toRGB = function(c){ return [c[0]*255, c[1]*255, c[2]*255];};
    
    this.programIndex = "control";
    if(typeof c.translate === "object"){
        this.setRestrictedColor(this.toRGB(c.translate.colors.xAxis));
        this.setRestrictedColor(this.toRGB(c.translate.colors.yAxis));
        this.setRestrictedColor(this.toRGB(c.translate.colors.zAxis));
    }
        
    this.setRestrictedColor( this.toRGB(c.renderBG) );
}

Control.prototype = new WGLModule;
Control.prototype.constructor = Control;

Control.prototype.eventBeforeInitRenders = function(object){
    var renders = object.getRender(),
        gl = object.gl,
        _this = this,
        o = this.getOptions();
    
    renders["controlRender"] = {
        class : controlRender,
        programIndex : this.programIndex,        
        loop : false,
        bgColor : o.renderBG,
        clear : [gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT],
        renderToFrame :true,
        frames : [
            {
                type : "renderbuffer",
                render : gl.RGBA4,
                frame : gl.COLOR_ATTACHMENT0
            },
            {
                type : "renderbuffer",
                render : gl.DEPTH_COMPONENT16,
                frame : gl.DEPTH_ATTACHMENT
            }
        ],
        events : {
            beforeDrawElement : function(object, i){
                var e = object.getData()[i],
                    gl = object.getGL(),
                    fShader = object.getFShader();
            
                if(e.colorID !== undefined)
                    gl.uniform4f(fShader.color, e.colorID[0]/255, e.colorID[1]/255, e.colorID[2]/255, e.colorID[3]);
                

            },
            afterDrawElements : function( object ){
               _this.afterDrawElements(object);
                var gl = object.getGL(),
                    image = _this.getCurrentImage();
                gl.readPixels(0, 0, object.getWidth(), object.getHeight(), gl.RGBA, gl.UNSIGNED_BYTE, image);
            }
        },
        object : this
    };
};

Control.prototype.eventBeforeLoadShaders = function(object, programIndex, vertex, fragment){
//    console.log(this.getProgramIndex() === programName);
    if( this.getProgramIndex() !== programIndex ) return;
    this.setFragmentVariables(fragment);
}

Control.prototype.eventAfterInitRenders = function(object){
    var render = object.getRenderByProgram(this.getProgramIndex());
    render.addListener("afterProcessElement", this.afterProcessElement, this);        
    render.addListener("afterDrawElements", this.afterDrawElements, this);        
};

Control.prototype.eventBeforeInitRenderElement = function(object, data){
    var element = data;
    
    element.verticesInfo = {
                    x: {max: -Number.MAX_VALUE, min: Number.MAX_VALUE},
                    y: {max: -Number.MAX_VALUE, min: Number.MAX_VALUE},
                    z: {max: -Number.MAX_VALUE, min: Number.MAX_VALUE}
                };
    for( var e = 0; e < element.vertices.length; e+=3 ){
        var x =  element.vertices[e],
            y =  element.vertices[e+1],
            z =  element.vertices[e+2];
        element.verticesInfo.x.max = Math.max(element.verticesInfo.x.max, x);
        element.verticesInfo.x.min = Math.min(element.verticesInfo.x.min, x);
        element.verticesInfo.y.max = Math.max(element.verticesInfo.y.max, y);
        element.verticesInfo.y.min = Math.min(element.verticesInfo.y.min, y);
        element.verticesInfo.z.max = Math.max(element.verticesInfo.z.max, x);
        element.verticesInfo.z.min = Math.min(element.verticesInfo.z.min, x);
    }
    
};

Control.prototype.eventAfterInitRenderElement = function(object, data){
    
    var element = data,
        c = -1;

    if(element.moduleControl === false) return ;
    
    while( !this.setRestrictedColor(++c) );
    element.colorID = [
        c%256,
        parseInt(c/256)%256,
        parseInt(c/65526)%256,
        1.0
    ];
};

Control.prototype.eventBeforeInit = function(object){
    var el = document.getElementById(object.getEl()),
        _this = this,
        programs = object.getPrograms(),
        o = this.getOptions();

    this.initCurrentImage(el.width, el.height);

    programs[this.programIndex] = {
        "name" : "Control",
        shaders : {
            vertex : {
                class : controlVertexSH
            },
            fragment : {
                class : controlFragmentSH
            }
        }
    };
    addEvent(el, "mousedown", function(e){
         if(e.which === 1 )
            _this.selectObject(e, el);
    });
    
   
   
    if(o.translate ){
        
        addEvent( el, "mousedown", function(e){
           
            if(e.which === 1){
                o.translate.start = e;
            }
         });
         addEvent(el, "mousemove", function(e){
              var sI = _this.getSelectedIndex();
              if(e.which == 1 && o.translate.start !== undefined && o.translate.move){
                        var dX  = Math.abs(e.clientX -  o.translate.start.clientX),
                        dY  = Math.abs(e.clientY -  o.translate.start.clientY),
                        dT = dX > dY? e.clientX -  o.translate.start.clientX
                                :   o.translate.start.clientY - e.clientY,
                        k = dX > dY? el.width/10 : el.height/10,
                        t = {xAxis : 0, yAxis : 1, zAxis : 2},
                        selectedObject = _this.getObject().data[sI];
                
                   selectedObject.translate[t[o.translate.move]] += dT/k;
                   o.translate.start = e;
                }
         });
         addEvent(el, "mouseup", function(e){
                if(e.which == 1){
                    if(o.translate.start)
                        object.getRender("controlRender").process();

                    o.translate.start = false;
                }
                
         });

         addEvent( el, "mouseout", function(){
            if(o.translate.start){
                if(o.translate.start)
                        object.getRender("controlRender").process();

                o.translate.start = false;
            }
            
        });

         if(o.translateTrigger){
            var handler = document.getElementById(o.translateTrigger);
            handler.onchange = function(e){
                _this.activateTranslate(handler.checked);
            }
        }
    }
    
   
    if(Rotate !== undefined){
        var rotateM = object.getModuleByClass(Rotate);
        if(object._modules !== undefined && rotateM !== null){
            var refreshFrame = function(o, info){
                object.getRender("controlRender").process();
            };
            rotateM.addListener("mouseUp",refreshFrame, this);
            rotateM.addListener("mouseOut",refreshFrame, this);
        }
    }
};


Control.prototype.afterDrawElements = function(object){
    var selected = this.getSelectedIndex();
    if(selected === -1) return;

    var data = object.getData()[selected];
    
    var o = this.getOptions(),        
        attributes = [        
            object.getGL(),
            object.getVShader(),
            object.getFShader(),
            {},
            {
                d : data,
                o : object
            }
    ];
    
     if(o.translate !== undefined && o.translate.active){   
        object.modelViewMatrix.setMatrix( o.translate.modelViewMatrix.getMatrix() );
       
        var tools = this.getTranslateTools(data.verticesInfo),
            gl = object.getGL();
        gl.disable(gl.DEPTH_TEST);
        for(var t in tools){
            attributes[3] = tools[t];
            this.renderElement.apply(this, attributes);
        }
        gl.enable(gl.DEPTH_TEST);
    }
};

Control.prototype.afterProcessElement = function(object, data){
//    console.log(2);
    if(!data.selected) return;
    
    var o = this.getOptions(),
        attributes = [        
            object.getGL(),
            object.getVShader(),
            object.getFShader(),
            this.getBoundingBox(data),
            {
                d : data,
                o : object
            }
    ];    

    o.translate.modelViewMatrix = new Matrix( { matrix:object.modelViewMatrix.getMatrix() } );
    this.renderElement.apply(this, attributes); 
};

Control.prototype.getTranslateTools = function(info){
    
    var o = this.getOptions();
    if(o.translate.objects === undefined){
            var ps = {
                        xCenter : info.x.max/2, // fifth of x range
                        zCenter : (info.z.max + info.z.min)/2, // fifth of x range
                        yCenter : (info.y.max + info.y.min)/2, // fifth of x range      
                        length : Math.min(
                                          Math.abs(info.x.max),
                                          Math.abs(info.z.max),
                                          Math.abs(info.y.max)
                                        )
                    },
            sc = 2,
            cR = 0.12,
            pR = cR*2,
            pL = 0.5,
            sp = sc*1.5-pL/2,
            wgl = this.getObject(),
            gl = wgl.gl,
            tools = [
                    new Cylinder(cR, ps.length*sc, 2, 10, {
                        rotate:[.0, .0, 90.0],
                        translate:[ps.xCenter+ps.length/2, ps.yCenter, ps.zCenter],
                        ControlColor : o.translate.colors.xAxis
                    }),                                                                                    //    \  X 
                    new Pyramid(pL, pR, 10, {                                                              //    / Axis
                        rotate:[.0, .0, -90 ],                                                             //   /
                        translate:[ps.xCenter+ps.length*1.5, ps.yCenter, ps.zCenter],
                        ControlColor : o.translate.colors.xAxis
                    }),
                    new Cylinder(cR, ps.length*sc, 2, 10, {
                        translate:[0, ps.yCenter+ps.length, ps.zCenter],
                        ControlColor : o.translate.colors.yAxis
                    }),                                                                                         //   \  Y 
                    new Pyramid(pL, pR, 10, {                                                                   //   / Axis
                        translate:[0, ps.yCenter+ps.length*2, ps.zCenter],
                        ControlColor : o.translate.colors.yAxis
                    }),                                                                                        //
                    new Cylinder(cR, ps.length*sc, 2, 10, {
                        rotate:[-90, .0, .0],    
                        translate:[0, 0, ps.zCenter+ps.length],
                        ControlColor : o.translate.colors.zAxis
                    }),                                                                                         // \  Z
                    new Pyramid(pL, pR, 10, {
                        rotate:[90, .0, .0 ], 
                        translate:[0, 0, ps.zCenter+ps.length*2],
                        ControlColor : o.translate.colors.zAxis
                    })
                 ];
        o.translate.objects = [];         
        for(var t in tools){
            o.translate.objects[t] = tools[t];
            o.translate.objects[t].vertices = wgl.registerBuffer(new Float32Array(tools[t].vertices), gl.ARRAY_BUFFER);
            o.translate.objects[t].indices = wgl.registerBuffer(new Uint16Array(tools[t].indices), gl.ELEMENT_ARRAY_BUFFER );            
            o.translate.objects[t].normals = wgl.registerBuffer(new Float32Array(tools[t].normals), gl.ARRAY_BUFFER);
            o.translate.objects[t].textures = wgl.registerBuffer(new Float32Array(tools[t].textures), gl.ARRAY_BUFFER);
        }        
    }
    return o.translate.objects;
};

Control.prototype.getBoundingBox = function(e){
    if(e.boundingBox === undefined){
        var o = this.getObject(),
            edges = e.verticesInfo;
    
       e.boundingBox =  new BoundingBox(edges);
       e.boundingBox.vertices = o.registerBuffer(new Float32Array(e.boundingBox.vertices), o.gl.ARRAY_BUFFER);
       e.boundingBox.indices = o.registerBuffer(new Uint16Array(e.boundingBox.indices), o.gl.ELEMENT_ARRAY_BUFFER);
       e.boundingBox.normals = o.registerBuffer(new Float32Array(e.boundingBox.normals), o.gl.ARRAY_BUFFER);
       e.boundingBox.textures = o.registerBuffer(new Float32Array(e.boundingBox.textures), o.gl.ARRAY_BUFFER);
       e.boundingBox.ControlColor = this.getBoundingColor();
    }
    
    return e.boundingBox;
};

Control.prototype.renderElement = function(gl, vertex, fragment, d, info){
    gl.bindBuffer(gl.ARRAY_BUFFER, d.vertices);
    gl.enableVertexAttribArray(vertex.position);
    gl.vertexAttribPointer(vertex.position, d.verticesPerItem, gl.FLOAT, false, 0, 0);

    if(Light !== undefined 
            && this.getObject().getModuleByClass(Light)!== null 
            && vertex.normal !== undefined
        ){
        gl.bindBuffer(gl.ARRAY_BUFFER, d.normals);
        gl.enableVertexAttribArray(vertex.normal);
        gl.vertexAttribPointer(vertex.normal, d.normalsPerItem, gl.FLOAT, false, 0, 0);
    }
    
    if(Texture !== undefined 
        && this.getObject().getModuleByClass(Texture)!== null 
        && vertex.texture !== undefined
        ){
        gl.bindBuffer(gl.ARRAY_BUFFER, d.textures);
        gl.enableVertexAttribArray(vertex.texture);
        gl.vertexAttribPointer(vertex.texture, d.texturesPerItem, gl.FLOAT, false, 0, 0);
    }
    var modelMatrix = mat4.create(info.d.modelMatrix);
    if(d.translate !== undefined)
        mat4.translate(modelMatrix, d.translate, modelMatrix);
    
    if(d.rotate !== undefined){        
        mat4.rotate(modelMatrix, radians(d.rotate[0]), [1.0,.0,.0]);
        mat4.rotate(modelMatrix, radians(d.rotate[1]), [.0,1.0,.0]);
        mat4.rotate(modelMatrix, radians(d.rotate[2]), [0.0,.0,1.0]);
    }
    
    info.o.setMatrixUniforms(modelMatrix);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, d.indices);
    gl.uniform1i(fragment.isControl, true);
    gl.uniform4fv(fragment.ControlColor, d.ControlColor);
    gl.drawElements(d.getRenderMode(gl),  d.totalItems, gl.UNSIGNED_SHORT, 0);
    gl.uniform1i(fragment.isControl, false);
}

Control.prototype.setFragmentVariables = function(shader){
    shader.setVariable("isControl", {location:"uniform", type:"bool"});
    shader.setVariable("ControlColor", {location:"uniform", type:"vec4"});
    var main = shader.getFunctions()["main"];
    main.expressions = main.expressions || [];
    main.expressions.unshift("\n\
                        if(isControl){ gl_FragColor = ControlColor; return; }\n\
");
};

Control.prototype.selectObject = function(e, el){
    var width =  el.width,
        height = el.height,
        cssWidth = el.clientWidth,
        cssHeight = el.clientHeight,
        resolutionRatioX = parseFloat( width ) / parseFloat( cssWidth ),
        resolutionRatioY = parseFloat( height ) / parseFloat( cssHeight ),
        xy = [e.offsetX, height - e.offsetY, 0.0],
        xyIndex = parseInt(xy[0]*resolutionRatioX + xy[1]*resolutionRatioY*parseFloat( width )) * 4,
        image = this.getCurrentImage(),
        pixels = [image[xyIndex],
                    image[xyIndex+1],
                    image[xyIndex+2],
                    image[xyIndex+3]];

    if( this.isToolSelected(pixels) ) return;

    var data = this.getObject().data;
    this.setSelectedIndex(-1);
    for(var i in data){
        if(
            data[i].colorID !== undefined &&
            data[i].colorID[0] == pixels[0]              //red component
            &&  data[i].colorID[1] == pixels[1] //green component
            && data[i].colorID[2] == pixels[2]  //blue component
            ){
                data[i].selected = true;           
                this.setSelectedIndex(i);
//                console.log(i);
//                this.scene.data[i].material.diffuse = [0.97, 0.97, 0.97, 1.0];
            }
        else{
            data[i].selected = false;
//            this.scene.data[i].material = defaultMaterial;
        }
    }
}

Control.prototype.activateTranslate = function(s){    
    this.getOptions().translate.active = s;
    this.getObject().getRender("controlRender").process();
};

Control.prototype.isToolSelected = function(pixels){
    
    var o = this.getOptions();
    if(o.translate && o.translate.active)
        for(var c in o.translate.colors){
            if( 
                o.translate.colors[c][0] == pixels[0]/255 &&
                o.translate.colors[c][1] == pixels[1]/255 &&
                o.translate.colors[c][2] == pixels[2]/255 &&
                o.translate.colors[c][3] == pixels[3]/255
                ){
                        o.translate.move = c;
                        return true;
                }
        }
                
    return false;
}

function controlVertexSH(options) {    
    Shader.call(this, options);
    var config = this.getConfig();
    config.source = "\n\
            attribute vec3 position; \n\
            uniform mat4 modelMatrix;\n\
            uniform mat4 modelViewMatrix;\n\
            uniform mat4 projectionMatrix;\n\
            void main( )\n\
            {\n\
                gl_Position =  projectionMatrix * modelViewMatrix * modelMatrix * vec4(position, 1.0);\n\
            }\n\
            ";
}

controlVertexSH.prototype = new Shader;
controlVertexSH.prototype.constructor = controlVertexSH;

function controlFragmentSH(options) {    
    Shader.call(this, options);
    
    var config = this.getConfig();
    config.source = "precision mediump float;\n\
                     uniform vec4 color;\n\
                     uniform bool isControl;\n\
                     uniform vec4 ControlColor;\n\
                     void main( )\n\
                     {\n\
                        if(isControl){ gl_FragColor = ControlColor; return; }\n\
                        \n\
                        gl_FragColor = vec4(color);\n\
                     } ";
}

controlFragmentSH.prototype = new Shader;
controlFragmentSH.prototype.constructor = controlFragmentSH;

function controlRender(options){
    Render3D.call(this, options);
}

controlRender.prototype = new Render3D;
controlRender.prototype.constructor = controlRender;

controlRender.prototype.processElement = function(data){
    if(data.colorID === undefined) return;
    Render3D.prototype.processElement.call(this, data);
}