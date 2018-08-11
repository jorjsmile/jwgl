function Shape(info){
    var info = info || {},
        renderMode = info.renderMode || "triangles";
    this.vertices = [];
    this.normals = [];
    this.textures = [];
    this.indices = [];
    this.verticesPerItem = 0;
    this.normalsPerItem = 0;
    this.texturesPerItem = 0;
    this.totalItems = 0;
    for(var i in info)
        this[i] = info[i];
    
    this.getRenderMode = function(gl){
        return {
                "triangles" : gl.TRIANGLES,
                "points" : gl.POINTS,
                "lines" : gl.LINES
            }[renderMode];
    };
    this.setRenderMode = function(m){
        renderMode = m;
    };
}


/**
 * NOT working right
 */
Shape.prototype.calcNormals = function(){
    for( var i = 0; i < this.indices.length; i+=3){
        var p0 = this.indices[i];
        var p1 = this.indices[i+1];
        var p2 = this.indices[i+2];
        var v1 = vec3.create([
                    this.vertices[p1*3]-this.vertices[p0*3],
                     this.vertices[p1*3+1] - this.vertices[p0*3+1],
                     this.vertices[p1*3+2] - this.vertices[p0*3+2]
                 ]);
        var v2 = vec3.create([
                    this.vertices[p2*3]-this.vertices[p0*3],
                     this.vertices[p2*3+1] - this.vertices[p0*3+1],
                     this.vertices[p2*3+2] - this.vertices[p0*3+2]
                 ]);
//        console.log(v1, v2);
        var normal = vec3.normalize(vec3.cross(v2, v1));
//        console.log(normal);

        var points = [p0, p1, p2];
        for(var point in points){
            var p = points[point];
            var n = vec3.normalize([
                                (this.normals[p*3]||0) + normal[0],
                                (this.normals[p*3+1]||0) + normal[1],
                                (this.normals[p*3+2]||0) + normal[2]
                                ]);
            this.normals[p*3] = n[0];
            this.normals[p*3+1] = n[1];
            this.normals[p*3+2] = n[2];
            
        }
    }
}

function Points(p, info){
    info.renderMode = "points";
    Shape.call(this, info);
    for(var i in p){
        var vertex = p[i].vertex || [.0,.0,.0],
            normal = p[i].normal || [.0,.0,.0],
            texture = p[i].texture || [.0,.0],
            index = p[i].index || 0;
        this.vertices.push( vertex[0], vertex[1], vertex[2] );
        this.normals.push( normal[0], normal[1], normal[2] );
        this.textures.push( texture[0], texture[1] );
        this.indices.push( index );
    }
    
}

Points.prototype = new Shape();
Points.prototype.constructor = Points;

 function BoundingBox(edges, info){  
        info = info || {};
        info.renderMode = "lines";
        Shape.call(this, info);
        var l = info.length || 5,
            o = info.offset || 3;
       
        var bounding = {
            length : (edges.x.max - edges.x.min)/l, // fifth of x range
            width : (edges.z.max - edges.z.min)/l, // fifth of y range
            height : (edges.y.max - edges.y.min)/l // fifth of z range                    
        }
        
        edges.x.max += bounding.length/o;
        edges.x.min -= bounding.length/o;
        edges.y.max += bounding.height/o;
        edges.y.min -= bounding.height/o;
        edges.z.max += bounding.width/o;
        edges.z.min -= bounding.width/o;

        this.vertices = [
            //back-bottom-left
            edges.x.min, edges.y.min, edges.z.min,
            edges.x.min+bounding.length, edges.y.min, edges.z.min,
            edges.x.min, edges.y.min+bounding.height, edges.z.min,
            edges.x.min, edges.y.min, edges.z.min+bounding.width,

            //front-bottom-left
            edges.x.min, edges.y.min, edges.z.max,
            edges.x.min + bounding.length, edges.y.min, edges.z.max,
            edges.x.min, edges.y.min + bounding.height, edges.z.max,
            edges.x.min, edges.y.min, edges.z.max - bounding.width,

            //back-top-left
            edges.x.min, edges.y.max, edges.z.min,
            edges.x.min + bounding.length, edges.y.max, edges.z.min,
            edges.x.min, edges.y.max - bounding.height, edges.z.min,
            edges.x.min, edges.y.max, edges.z.min+bounding.width,

            //front-top-left
            edges.x.min, edges.y.max, edges.z.max,
            edges.x.min + bounding.length, edges.y.max, edges.z.max,
            edges.x.min, edges.y.max - bounding.height, edges.z.max,
            edges.x.min, edges.y.max, edges.z.max - bounding.width,

            //back-bottom-right
            edges.x.max, edges.y.min, edges.z.min,
            edges.x.max - bounding.length, edges.y.min, edges.z.min,
            edges.x.max, edges.y.min+bounding.height, edges.z.min,
            edges.x.max, edges.y.min, edges.z.min+bounding.width,

            //front-bottom-right
            edges.x.max, edges.y.min, edges.z.max,
            edges.x.max - bounding.length, edges.y.min, edges.z.max,
            edges.x.max, edges.y.min+bounding.height, edges.z.max,
            edges.x.max, edges.y.min, edges.z.max - bounding.width,

            //back-top-right
            edges.x.max, edges.y.max, edges.z.min,
            edges.x.max - bounding.length, edges.y.max, edges.z.min,
            edges.x.max, edges.y.max - bounding.height, edges.z.min,
            edges.x.max, edges.y.max, edges.z.min + bounding.width,

            //front-top-right
            edges.x.max, edges.y.max, edges.z.max,
            edges.x.max - bounding.length, edges.y.max, edges.z.max,
            edges.x.max, edges.y.max - bounding.height, edges.z.max,
            edges.x.max, edges.y.max, edges.z.max - bounding.width

        ];

        
        this.normals = new Array(96);
        this.textures = new Array(64);
        this.indices = [
            0, 1, 0, 2, 0, 3,        //back-bottom-left
            4, 5, 4, 6, 4, 7,        //front-bottom-left
            8, 9, 8, 10, 8, 11,      //back-top-left
            12, 13, 12, 14, 12, 15,  //front-top-left
            16, 17, 16, 18, 16, 19,  //back-bottom-right
            20, 21, 20, 22, 20, 23,  //front-top-right
            24, 25, 24, 26, 24, 27,  //back-bottom-right
            28, 29, 28, 30, 28, 31   //front-top-right
        ];   
        this.verticesPerItem = 3;
        this.texturesPerItem = 2;
        this.normalsPerItem = 3;
        this.totalItems = 48;
}


BoundingBox.prototype = new Shape();
BoundingBox.prototype.constructor = BoundingBox;

function Plane(w, h, segments, sections, info){
    Shape.call(this, info);
    
    segments = segments || 5;
    sections = sections || 5;
    w = w || 3;
    h = h || w;
    
    var xStep = w/sections,
        yStep = h/segments,
        startX = -w/ 2,
        startY = -h/2;
    for( var i = 0; i < (segments+1)*(sections+1); i++){        
        var x = startX + i%(sections+1)*xStep;
        var y = startY + parseInt(i/(sections+1))*yStep;
        this.vertices.push( x, y, .0 );
        this.normals.push( .0, .0, 1.0 );
        this.textures.push( (x-startX)/w,  (h+y+startY)/h );

        if(i < (segments)*(sections+1) && (i+1)%(sections+1) != 0){
//            var currSeg = i*(sections+1);
            var counter = i%(sections+1);
            var nextSeg = (parseInt(i/(sections+1))+1)*(sections+1);
            this.indices.push(
                nextSeg+counter,i+1,i,
                nextSeg+counter,nextSeg+counter+1,  i+1
            );
            }

    }
    this.verticesPerItem = 3;
    this.texturesPerItem = 2;
    this.normalsPerItem = 3;
    this.totalItems = this.indices.length;
    // console.log(this.indices);
    // console.log(this.vertices);
    // console.log(this.textures);
}

Plane.prototype = new Shape();
Plane.prototype.constructor = Plane;

function Cube(scale, info){
    Shape.call(this, info);
    scale = scale || 1.0;
    
    
    this.vertices = [
            //front
            -scale, -scale, scale,
            scale, -scale, scale,
            -scale, scale, scale,
            scale, scale, scale,

            //back
            scale, scale, -scale,
            -scale, scale, -scale,
            scale, -scale, -scale,
            -scale, -scale, -scale,

            // //top
            -scale, scale, -scale,
            scale, scale, -scale,
            -scale, scale, scale,
            scale, scale, scale,

            //
            // //bottom
            scale, -scale, scale,
            -scale, -scale, scale,
            scale, -scale, -scale,
            -scale, -scale, -scale,
            //
            // //left
            -scale, -scale, -scale,
            -scale, scale, -scale,
            -scale, -scale, scale,
            -scale, scale, scale,
            //
            // //right
            scale, scale, scale,
            scale, -scale, scale,
            scale, scale, -scale,
            scale, -scale, -scale
        ];
    this.verticesPerItem = 3;
    
    this.normals = [
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            
            0.0, 1.0, .0,
            0.0, 1.0, .0,
            0.0, 1.0, .0,
            0.0, 1.0, .0,
            
            0.0, -1.0, .0,
            0.0, -1.0, .0,
            0.0, -1.0, .0,
            0.0, -1.0, .0,
            
            -1.0, .0, .0,
            -1.0, .0, .0,
            -1.0, .0, .0,
            -1.0, .0, .0,
            
            1.0, .0, .0,
            1.0, .0, .0,
            1.0, .0, .0,
            1.0, .0, .0
        ];
    this.normalsPerItem = 3;

    this.textures = [
        0, 0, 1, 0, 0, 1, 1, 1,
        0, 1, 1, 1, 0, 0, 1, 0,
        0, 1, 1, 1, 0, 0, 1, 0,
        1, 1, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 1, 1,
        0, 1, 0, 0, 1, 1, 1, 0
    ];
    this.texturesPerItem = 2;
    
    this.indices = [
            0, 2, 1, 1, 2, 3, //front
            4, 5, 6, 6, 5, 7,  //back
            8, 9, 10, 10, 9, 11,  //top
            12,14,13,13,14,15,  //bottom
            16,17,18,18,17,19,  //left
            20,22,21,21,22,23  //rigth
        ];
    this.totalItems = 36;//6;
    
}

Cube.prototype = new Shape();
Cube.prototype.constructor = Cube;

function Pyramid(H, R, sections, info){
    /**
     * @todo: recalc normals
     */
    Shape.call(this, info);
    H = H || 2;
    sections = sections || 30;
    sections = Math.max(sections, 3); //minimum sides for pyramid is 3
    R = R || 2;
    
    this.vertices.push(
            .0, 0, .0
                );
    this.normals.push(
            .0, -1.0, .0
        );
    this.textures.push(
            .5, 1.0
        );
            
    for(var j = 0, teta = 0; j < sections; j ++, teta += 2*Math.PI/sections ){
        
        this.vertices.push ( 
                .0, H, .0,                              //  \  for
                R*Math.sin(teta), 0, R*Math.cos(teta),  //  / side 
                R*Math.sin(teta), 0, R*Math.cos(teta)  // for bottom
        );
        var sideNormal = vec3.normalize([Math.sin(teta), .0, Math.cos(teta)]);
        var pointNormal = vec3.normalize([Math.sin(teta), Math.tan(R/H), Math.cos(teta)]);
        
        this.normals.push(                
                pointNormal[0], pointNormal[1], pointNormal[2],
                sideNormal[0], sideNormal[1], sideNormal[2],
                .0, -1.0, .0
        );
//        console.log(sideNormal);
        this.textures.push(
                .5, .0,
                j/sections, H/(H+R),
                .5, 1.0           
        ); 
        //side
        this.indices.push( 
                 3*((j+1)%sections) + 2, 3*j + 2, 3*j + 1 
                );
                    
        //bottom
        this.indices.push( (3*j+2)+1, 3*((j+1)%sections)+2+1, 0 );    
    }       
//    this.calcNormals();

    this.verticesPerItem = 3;
    this.normalsPerItem = 3;
    this.texturesPerItem = 2;
    this.totalItems = this.indices.length;
}

Pyramid.prototype = new Shape();
Pyramid.prototype.constructor = Pyramid;

function Sphere(r, segments, sections, info){
    Shape.call(this, info);
    
    r = r || 3;
    segments = segments || 25;
    sections = sections || segments;
    
    var incSeg = Math.PI/segments;
    var incSec = 2*Math.PI/sections;
    
    this.vertices = [];
    this.indices = [],
    this.normals = [];
    this.verticesPerItem = 3;
    this.normalsPerItem = 3;
    this.texturesPerItem = 2;
    
    for(var i = 0,teta = 0; i <= segments; teta+=incSeg, i++){ //exclude first and last point        
            var y = Math.cos(teta);
        for(var fi = 0, j = 0; j <= sections; fi += incSec, j++){
            var p =  Math.sin(teta); //polar coord
            var x = p*Math.cos(fi);
            var z = p*Math.sin(fi);
            //verticies
            this.vertices.push(r*x, r*y, r*z);      
            //normals
            this.normals.push(x,y,z);
            //textures
            this.textures.push( sections-j/sections, i/segments );
            
            //indicies
            if( i < segments && j < sections){
                var currSeg = i*(sections+1);
                var nextSeg = (i+1)*(sections+1);
                this.indices.push(
                     nextSeg+j+1, currSeg+j+1, currSeg+j,
                     nextSeg+j+1,  currSeg+j, nextSeg+j
                );
            }
        }
        
    }    
    this.totalItems = this.indices.length;
}

Sphere.prototype = new Shape();
Sphere.prototype.constructor = Sphere;

function Torus(R, r, segments, sections, info){
    /**
     * @todo: recalc normals
     */
    info = info || {};
    Shape.call(this, info);
    
    R = R || 3;
    r = r || 1;
    segments = segments || 30;
    sections = sections || segments;
    var incSeg = 2*Math.PI/segments;
    var incSec = 2*Math.PI/sections;
    var wide = (R-r)/2;
    
    
    for(var i = 0, teta=0; i <= segments; i++, teta += incSeg){
        
        for(var j = 0, fi = 0; j <= sections; j ++, fi += incSec)
        {
            var y = R*Math.cos(teta)+r*Math.cos(fi)*Math.cos(teta);
            var x = R*Math.sin(teta)+r*Math.cos(fi)*Math.sin(teta);
            var z = r*Math.sin(fi);
            //vertices
            this.vertices.push(x, y, z);
            //normals
            var normal = [x, y, z];//vec3.normalize();
            this.normals.push(normal[0], normal[1], normal[2]);
            
            //textures
            this.textures.push(i/segments, j/sections);
            //indicies
            if( i < segments && j < sections){
                var currSeg = i*(sections+1);
                var nextSeg = (i+1)*(sections+1);
                this.indices.push(
                     nextSeg+j+1, currSeg+j+1, currSeg+j,
                     nextSeg+j+1,  currSeg+j, nextSeg+j
                );
            }
        }
    }
}

Torus.prototype = new Shape();
Torus.prototype.constructor = Torus;

function Cylinder(R, H, segments, sections, info){
    Shape.call(this, info);
    R = R || 1;
    H = H || 4;
    segments = segments || 3;
    segments = Math.max(segments, 2);
    sections = sections || 20;
    this.vertices.push(
            .0, H/2, .0,
            .0, -H/2, .0
                );
    this.normals.push(
            .0, 1.0, .0,
            .0, -1.0, .0
        );
    this.textures.push(
            .5, .0,
            .5, 1.0
        );
            
    for(var j = 0, teta = 0; j < sections; j ++, teta += 2*Math.PI/sections ){
        
        this.vertices.push ( 
                R*Math.sin(teta), H/2, R*Math.cos(teta),  // even is top 
                R*Math.sin(teta), -H/2, R*Math.cos(teta)  // odd it bottom
        );
        this.normals.push(
                .0, 1.0, .0,
                .0, -1.0, .0
        );                  
        this.textures.push(
                .5, .0, 
                .5, 1.0           
        ); 
            
        this.indices.push(  2*((j+1)%sections) + 2, 2*j + 2,  0 );
        this.indices.push( (2*j+1)+2, 2*((j+1)%sections)+1 + 2 , 1 );
    
    }
    var indOffset = this.vertices.length/3;

    for(var i = 0; i < segments; i++ ){
        for(j = 0, teta = 0; j < sections; j ++, teta += 2*Math.PI/sections ){
            var x = Math.sin(teta);
            var z = Math.cos(teta);
            var level = H/2 - i*H/(segments-1);
                 
            this.vertices.push(
                    R*x, level, R*z);

            var n = vec3.create();
            vec3.normalize(n, [x, .0, z]);
            this.normals.push(n[0], n[1], n[2]);
            var yTex = i==0 || i == segments-1? R/(H+2*R) : (i*H/(H+2*R))/segments;
            this.textures.push(j/sections, yTex );                   
            
            if(j < sections){
                this.indices.push(
                    j+indOffset, (j+1)%sections + indOffset, i*sections+j+indOffset,
                    i*sections+(j+1)%sections+indOffset, i*sections+j+indOffset,  (j + 1)%sections + indOffset 
                );
            }
        }
    }
    
    this.verticesPerItem = 3;
    this.normalsPerItem = 3;
    this.texturesPerItem = 2;
    this.totalItems = this.indices.length;
}

Cylinder.prototype = new Shape();
Cylinder.prototype.constructor = Cylinder;

