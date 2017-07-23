extend( Parser.prototype.formatHelper, {
                                dae : {
                                    read : function(fileObject, file){
                                        return fileObject.readAsText(file);
                                    },
                                    parser : DaeFormat
                                }
                            });

function DaeFormat(file, options){
    Format.call(this, file, options); 
}

DaeFormat.prototype = new Format;
DaeFormat.prototype.constructor = DaeFormat;

DaeFormat.prototype.process = function(){
    var result = {},
        file = this.getFile();
    file.content = file.content.toXml();
    
    var scenes = this.getScenes();
   
    if( inArray(this.getOptions(), "geometry") ){
        result.geometry = this.getGeometry();
        this.applyRootScene(scenes, result.geometry);
    }
    
    
    
    return result;
};
/**
 * skipping Node:type=JOINT, Evaluate_scene, 
 *          transformation_elements:matrix,lookat,skew,scale
 * @returns {undefined}
 */
DaeFormat.prototype.getScenes = function(){
     var colladaDOC = this.getFile().content,
         scenes = colladaDOC.getElementsByTagName("visual_scene"),
         result = [];
 
     for (var s = 0; s < scenes.length; s++){
         var instance = {
                name : scenes[s].getAttribute("name") || "",
                id : scenes[s].getAttribute("id") || "",
                nodes : []
            },
            xmlNodes = scenes[s].getElementsByTagName("node");
         
         for(var n=0; n < xmlNodes.length; n++){
             if(xmlNodes[n].getAttribute("type") !== "NODE") continue;
             
             var node = {
                 id : xmlNodes[n].getAttribute("id"),
                 name : xmlNodes[n].getAttribute("name")
             };
             //get rotations
             var rotates = xmlNodes[n].getElementsByTagName("rotate"),
                 translates = xmlNodes[n].getElementsByTagName("translate");
             node.rotate = [];
             node.translate = [];
             for(var r=0; r < rotates.length; r++){
                 var rotateValue = this.extractArray(rotates[r], "float");
                 node.rotate[0] = rotateValue[0]!==0? rotateValue[3]*rotateValue[0] : node.rotate[0]||0,
                 node.rotate[1] = rotateValue[1]!==0? rotateValue[3]*rotateValue[1] : node.rotate[1]||0,
                 node.rotate[2] = rotateValue[2]!==0? rotateValue[3]*rotateValue[2] : node.rotate[2]||0;
             }
             
             for(var t=0; t < translates.length; t++){
                 var translateValue = this.extractArray(translates[t], "float");                 
                 node.translate[0] = (node.translate[0]||0)+translateValue[0];
                 node.translate[1] = (node.translate[1]||0)+translateValue[1];
                 node.translate[2] = (node.translate[2]||0)+translateValue[2];
             }
             instance.nodes.push(node);
         }
         
         result.push(instance);
     }
     return result;
};

/**
 * parse only meshes, 
 * skip spline
 * todo: get info of splines
 */
DaeFormat.prototype.getGeometry = function(){
    var colladaDOC = this.getFile().content,
        geometries = colladaDOC.getElementsByTagName("geometry"),
        objects = [],
        results = {};
        
    for(var g = 0; g < geometries.length; g++){
        var id = geometries[g].getAttribute("id") || g,
            name = geometries[g].getAttribute("name") || "";
        if(geometries[g].getElementsByTagName("mesh").length !== 0){
            results[id] = results[id] || this.readMesh(geometries[g].getElementsByTagName("mesh")[0]); 
        }
        else if(geometries[g].getElementsByTagName("convex_mesh").length !== 0){
            var cm = geometries[g].getElementsByTagName("convex_mesh")[0],
                gid = cm.getAttribute("convex_hull_of"); //geometry id refference
            if(gid !== null)
                results[id] = results[gid] || this.readMesh(colladaDOC.getElementById(gid).getElementsByTagName("convex_mesh")[0]); 
            else
                results[id] = results[id] || this.readMesh(geometries[g].getElementsByTagName("convex_mesh")[0]);
        }
        for(var r in results[id]){
            results[id][r].parserInfo = {
                id : id,
                name : name,
                file : { type : this.getFile().type, name : this.getFile().filename }
            };
        }
        objects.push.apply(objects, results[id]);
    }
    return objects;
};

DaeFormat.prototype.applyRootScene = function(scenes, geometry){
    var rootScene = this.getFile().content.getElementsByTagName("scene");    
    if(rootScene.length === 0) return;    
    var visualScene = rootScene[0].getElementsByTagName("instance_visual_scene")[0];    
    if(visualScene.length === 0) return;
    
    var sceneId = visualScene.getAttribute("url").replace(/^\#/, ""),
        sc = null,
        geometryObjects = {};
    
    for(var s in scenes)
        if(scenes[s].id === sceneId)
            sc = scenes[s];
    //
    for(var g in geometry){
        geometryObjects[geometry[g].parserInfo.name] = geometryObjects[geometry[g].parserInfo.name] || [];
        geometryObjects[geometry[g].parserInfo.name].push(geometry[g]);
    }
    
    for(var n in sc.nodes){
        var objects = geometryObjects[sc.nodes[n].name];
        for(var o in objects){
            if(sc.nodes[n].translate.length !== 0)
                objects[o].translate = sc.nodes[n].translate;
            
            if(sc.nodes[n].rotate.length !== 0)
                objects[o].rotate = sc.nodes[n].rotate;
        }
    }   
};
/***
 * is omited:  TANGENT, BINORMAL, TEXTANGENT, TEXBINORMAL, 
 *      polygons
 * 
 * @param {type} mesh
 * @returns {Array}
 */
DaeFormat.prototype.readMesh = function(mesh){
    var primitives = [ "lines", "linestrips", "polylist", "triangles", "trifans", "tristrips"], // 
        semantics = { VERTEX : "vertices", NORMAL : "normals", TEXCOORD : "textures", COLOR : "colors"},
        strides = {"vertices": 3, "normals":3, "color":3, "textures":2},
        data = {},
        objects = [];
    for(var p in primitives){
        var xmlObjectList = mesh.getElementsByTagName(primitives[p]);
        if(!xmlObjectList || xmlObjectList.length === 0) continue;
        
        for(var xc = 0; xc < xmlObjectList.length; xc++){
            
        
            var xmlObject = xmlObjectList[xc],
                object = new Shape(),
                offsets = {},
                maxOffset = function(){
                    var _max = Number.MIN_VALUE;
                    for(var o in offsets) if(_max < offsets[o]) _max = offsets[o];
                    return _max;
                };

            
            //extract data
            for(var i = 0; i < xmlObject.getElementsByTagName("input").length; i++ ){
                var input = xmlObject.getElementsByTagName("input")[i],
                    index = semantics[input.getAttribute("semantic")] || input.getAttribute("semantic").toLowerCase,
                    source = this.getInputSource(mesh, input);

                strides[index] = parseInt(source.getElementsByTagName("accessor")[0].getAttribute("stride"));
                offsets[index] = parseInt(input.getAttribute("offset"));
                object[index] = data[index] = data[index] || this.readArraySource(source);
            }
            object.indices = this.extractArray(xmlObject.getElementsByTagName("p")[0], "int");

            //triangulate potential not triangle primitives
            if( primitives[p] === "polylist" ){
                var verticesPerElement = this.extractArray(xmlObject.getElementsByTagName("vcount")[0], "int"),
                    newIndices = [],
                    primitiveNr = 0,
                    vOffset = maxOffset(); //vertex offset includes normals, textures and etc.
                for(var v = 0; v < verticesPerElement.length; v++){
                    
                    var primitiveVerts = verticesPerElement[v];
                    if(primitiveVerts === 3) 
                        newIndices.push(
                            object.indices[primitiveNr],
                            object.indices[primitiveNr+1],
                            object.indices[primitiveNr+2]
                        );
                    else if(primitiveVerts > 3){                    
                        for(var v = 0; v < primitiveVerts-2; v++){
                            newIndices.push(
                                    object.indices[primitiveNr],
                                    object.indices[primitiveNr+v*2+1],
                                    object.indices[primitiveNr+(v+1)*2]                        
                            );
                        }
                    }
                    
                    primitiveNr += primitiveVerts*vOffset;
                }
            }
    //        
            //reindex element
            var reindexedObject = this.reindexShape(object, {
                offsets : offsets, 
                semantics : semantics,
                strides : strides,
                data : data,
                maxOffset : maxOffset()
            });

            if(primitives[p] === "lines"){                
                reindexedObject.setRenderMode("lines");
                             
            }else{
                reindexedObject.setRenderMode("triangles");        
            }
            reindexedObject.verticesPerItem = 3;
            reindexedObject.texturesPerItem = 2;
            reindexedObject.normalsPerItem = 3;
            reindexedObject.totalItems = reindexedObject.indices.length;
            reindexedObject.normals = reindexedObject.normals.length!==0? reindexedObject.normals :
                                      new Array(reindexedObject.totalItems*3);
            reindexedObject.textures = reindexedObject.textures.length!==0? reindexedObject.textures :
                                      new Array(reindexedObject.totalItems*2);
            objects.push(reindexedObject);
        }

    }
    
    return objects;
};

DaeFormat.prototype.getInputSource = function(doc, input){
    var source = input.getAttribute("source").replace("#", "").prefix("[id='").suffix("']");
    return doc.querySelector(source) === null || doc.querySelector(source).getElementsByTagName("input").length === 0?
            doc.querySelector(source) :
            this.getInputSource(doc, doc.querySelector(source).getElementsByTagName("input")[0]);
}

DaeFormat.prototype.reindexShape = function(shape, info){
    var indexed = [],
        reindexedObject = new Shape(),
        increment = info.maxOffset+1;
//        console.log(shape.indices.length, increment);
        for( var i=0; i < shape.indices.length; i+=increment ){
            var vertex = {
                },
                strIndex = [];
                
            for(var s in info.semantics){
                var si = info.semantics[s], //semantic index 
                    so = info.offsets[si], //semantic offset
                    ss = info.strides[si], //semantic stride
                    index = shape.indices[i+so]*ss;
                if(info.data[si] === undefined) continue;
                vertex[si] = [];
                //vertices - get 3 values (sc),
                //normals - get 3 normals 
                //textures - get 2 textures ... etc.
                for(var sc = 0; sc < ss; sc ++) //get values using stride counter
                {
                    strIndex.push(info.data[si][index+sc]+"");
                    vertex[si][sc] = info.data[si][index+sc];
                }
            }
            strIndex = strIndex.join("|");
            var indice = indexed.indexOf(strIndex);
            if(indice === -1){ //not found such point
                for(var v in vertex){
                    if(reindexedObject[v]===undefined) reindexedObject[v] = [];
                    reindexedObject[v].push.apply(reindexedObject[v], vertex[v]);
                }
                reindexedObject.indices.push(indexed.length);
                indexed.push(strIndex);
            }
            else //found
                reindexedObject.indices.push(indice);                
        }
        return reindexedObject;
};

DaeFormat.prototype.extractArray = function(data, type){
    var recast = function(el){
        return type==="int" || type==="bool"? parseInt(el) :
               type==="float"? parseFloat(el) : el;
    };
    return data.childNodes[0].nodeValue.replace(/\n\r\t/g, "").split(" ").map(recast);
};

DaeFormat.prototype.readArraySource = function(source){
    for(var tag in source.children){
        var tagName = source.children[tag].tagName.toLowerCase();
        if(tagName.indexOf("_array") === -1) continue;
        var type = tagName.substr(0, tagName.indexOf("_array"));
        return this.extractArray(source.children[tag], type); 
    }
    return [];
};