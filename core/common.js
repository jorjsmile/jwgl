/**
 * extends one object with another
 * @param {object} Object1
 * @param {object} Object2
 * @returns {object}
 */
function extend(Object1, Object2){
    var o1 = Object1, 
        o2 = Object2;
//    console.log(Object2); 
    for(var i in o2){
        if(o1[i]==undefined){
//            console.log(i);
//            console.log(JSON.stringify(o2));
            o1[i] = o2[i];
        }
        else if(typeof(o1[i]) == "object" && typeof(o1[i])==typeof(o2[i]) ){
            o1[i] = extend(o1[i], o2[i]);
        }
    }
    
    if(arguments.length > 2){
        var args = Array.prototype.slice.call(arguments, 2);
        args.unshift(o1);
        extend.apply(null, args);
    }
    
    return o1;
}

/**
 * replace properties of one object with properties of another
 * @param {object} Object1
 * @param {object} Object2
 * @returns {object}
 */
function replace(Object1, Object2){
    var o1 = Object1, 
        o2 = Object2;
    
    for(var i in o2){
        if(o1[i]==undefined)
            o1[i] = o2[i];
        else if(typeof(o1[i]) == "object" && typeof(o1[i])==typeof(o2[i]) ){
            o1[i] = replace(o1[i], o2[i]);
        }else{
            o1[i] = o2[i];
        }
    }
    
    if(arguments.length > 2){
        var args = Array.prototype.slice.call(arguments, 2);
        args.unshift(o1);
        replace.apply(null, args);
    }
    
    return o1;
}

/**
 * 
 * @param {type} url -where to send request
 * @param {Function} callback - callback function on success
 * @param {Object} options - available options
 *                  <br/>type : "GET" | "POST",
 *                  <br/>data - data to send
 *                  <br/>dataType - type of the expected data in response
 * @returns {undefined}
 */
function ajax(url, callback, options){
    var request = new XMLHttpRequest(),
        options = options || {},
        type = options.type || "GET";

    request.responseType = options.dataType || "";
    request.onreadystatechange = function(){
        if(request.readyState == 4 && request.status == 200)
            callback(request.response);
        else if(request.readyState == 4)
            console.log(request.status + " " + request.statusText);
    }
    request.open(type, url, true);
    request.send(options.data||null);
}


function require(className, callback){
//    if(typeof(className)=="")
        
}


String.prototype.ucfirst = function(){ 
    return this.replace(/^\w/, function(m){
                        return m.toUpperCase();
                    } );
}


String.prototype.lcfirst = function(){ 
    return this.replace(/^\w/, function(m){
                        return m.toLowerCase();
                    } );
}

String.prototype.suffix = function(str){
    return this == ""? this : this+str;
}

String.prototype.prefix = function(str){
    return this == ""? this : str+this;
}

String.prototype.toXml = function(str){
    
    if (window.DOMParser) {     
        return ( new window.DOMParser() ).parseFromString(this, "text/xml");
    } 
    else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        return xmlDoc.loadXML(this);       
    } 
    else {
        return null; 
    }
};

/**
 * 
 * @param {Array} ar where to find
 * @param {Mixed} n what to find
 * @returns {Boolean}
 */
function inArray(ar, n){  
    return ar.indexOf(n)!== -1;
}

/*converts from grades to radians*/
function radians(angle){
    var M_PI = 3.1415926535897;
        return angle/180*M_PI;
}

function grades(radians){
    return radians*180/Math.PI;
}

function addEvent(el, event, handler){
    if(document.addEventListener){
        el.addEventListener(event, handler, false);
    }
    else{
        el.attachEvent("on"+event, handler);
    }
}

Math.isPowOf = function(grade, numb){
    if(grade == undefined || numb == undefined){
        console.log("Grade or Number is null");
        return;
    }
    var n  = numb,
        v = 1;
    if(n === 1) return 0;
    if(grade === 2) return (n&(n-1))===0;

    //get real grade
    var r = Math.log(numb)/Math.log(grade);
    
    return Math.round(r)-r === 0;
};

Math.gaussDist = function(q, x){
    var q2 = 2*q*q,
        k = 1/Math.sqrt(Math.PI * q2);

    return k*Math.pow(Math.E, -Math.pow(q-x, 2)/q2);
    
}