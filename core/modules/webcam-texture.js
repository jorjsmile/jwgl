/* 
 * Module will control texture for scene objects,
 * Use complex shaders for case if you want that module work properly,
 *  it will automatically insert shaders variables.
 *
 *  @example
 *  //in data section
 *  data: [
 *      new Shape({
 *           "texture": {
 *                   url : "path/to/your/texture.png"
 *               }
 *      })
 *  ]
 */

var WEBCAM_TEXTURE = "__webcam";

function WebCamTexture(options){
    WGLModule.call(this, options);
}

WebCamTexture.prototype = new WGLModule;
WebCamTexture.prototype.constructor = WebCamTexture;

WebCamTexture.prototype.initWebCamTexture = function(object){
    var self=this,
        onVideo = function(stream){ self.onVideo(stream); },
        onError = function(){ self.onError(); };


    this.videoTag = document.createElement("video");
    this.videoTag.id = "video-texture-el";
    this.videoTag.autoPlay = true;
    this.videoTag.width = 300;
    this.videoTag.height = 300;
    document.getElementsByTagName("body")[0].appendChild(this.videoTag);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

    if (navigator.getUserMedia)
        navigator.getUserMedia({video: true}, onVideo, onError);
};

WebCamTexture.prototype.onVideo = function(stream){
    this.videoTag.src = window.URL.createObjectURL(stream);
};

WebCamTexture.prototype.onError = function(e) {
    console.error(e);
};

WebCamTexture.prototype.initTexture = function(gl, image, object){

    gl.bindTexture(gl.TEXTURE_2D, object);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return object;
};


WebCamTexture.prototype.eventBeforeLoadTexture = function(object, index, data, out){
    var self = this,
        resource = self.getObject().getObject().gl.createTexture(),
        update = function(){
             var wgl = self.getObject().getObject();//,
                // resource = data.src instanceof Number? data.src : false;

            data.src =  self.initTexture(wgl.gl, self.videoTag, resource);
        };


    if(data.src !== WEBCAM_TEXTURE) return true;

    this.initWebCamTexture();

    this.videoTag.addEventListener("playing", function(e){
        update();
        out();
    }, true);

    wgl.addListener("beforeRenderProcess", function(){
        update();
    });

    // this.videoTag.addEventListener("ended", function() {
    //     self.videoTag.currentTime = 0;
    //     self.videoTag.play();
    // }, true);

    this.videoTag.play();

    return false;
};

