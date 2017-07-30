/**
 * Note it's a simple wrapper for gl-matrix library
 * It brings event system to gl-matrix, so u can snap matrix manipulation
 *
 * @param options
 * @constructor
 */

function Matrix( options ){
    WGLObject.call(this, options);
    var o = options || {},
        m = o.matrix || mat4.create();
    
    this.getMatrix = function (){ return m; };    
    this.setMatrix = function (m2){ 
        this.raiseEvent("beforeManipulate");
        m = m2; 
        this.raiseEvent("afterManipulate", m);
    };
    
    this.isEqual = function(m2){
        if( !(m2 instanceof Matrix) || m2.length !== 16 )
            return false;
        
        var c = m2 instanceof Matrix? m2.getMatrix() : m2;
        
        return (
                m[0] === c[0] &&
                m[1] === c[1] &&
                m[2] === c[2] &&
                m[3] === c[3] &&
                m[4] === c[4] &&
                m[5] === c[5] &&
                m[6] === c[6] &&
                m[7] === c[7] &&
                m[8] === c[8] &&
                m[9] === c[9] &&
                m[10] === c[10] &&
                m[11] === c[11] &&
                m[12] === c[12] &&
                m[13] === c[13] &&
                m[14] === c[14] &&
                m[15] === c[15]
            );
    };
    
    this.manipulate = function(event){
        if(mat4[event] === undefined)
            throw "Object Matrix has no such method `"+event+"`";
        
//        console.log(event);
        this.raiseEvent("beforeManipulate");
        var args = Array.prototype.slice.call(arguments);
        args.shift(); // remove name of the function
        args.unshift(m);
        mat4[event].apply(this, args);
//        console.log(m);
        this.raiseEvent("afterManipulate", m);
    };
}

Matrix.prototype = new WGLObject;
Matrix.prototype.constructor = Matrix;