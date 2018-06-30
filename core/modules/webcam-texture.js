/* 
 * Module will control texture for scene objects,
 * Use complex shaders for case if you want that module work properly,
 *  it will automatically insert shaders variables.
 *
 *
 * Note! It should run under https protocol otherwise. Chrome will through an error
 *
 *  @example
 *  //in data section
 *  data: [
 *      new Shape({
 *           "texture":[
  *              {
  *               src : WEBCAM_TEXTURE
  *               }
 *           ]
 *      })
 *  ],
 *  modules : [
 *  {
 *    "class" : Texture,
 *    "modules": [
 *        {
 *              "class" : WebCamTexture,
 *              "webCamBtn" : "#camera-trig" //you need a button. Otherwise chrome will give you error on devices.
 *          }
 *      ]
 *    }
 * ]
 *
 */

var WEBCAM_TEXTURE = "__webcam";

function WebCamTexture(options){
    WGLModule.call(this, options);

    var webCamBtn = options.webCamBtn,
        self = this;

    this.videoTag = null;

    document.querySelector(webCamBtn).addEventListener("click", function(){
        if(!self.videoTag)
        {
            console.log("Oops! It's seems like video tag is not ready yet");
            return;
        }

        self.videoTag.play();
    });
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
    this.videoTag.width = document.getElementById(wgl.getEl()).width;
    this.videoTag.height = document.getElementById(wgl.getEl()).height;

    this.videoTag.style.display = "none";
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

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
    return object;
};


WebCamTexture.prototype.eventBeforeLoadTexture = function(object, index, data, out){
    var self = this,
        resource = self.getObject().getObject().gl.createTexture(),
        wgl = self.getObject().getObject(),
        update = function(){

            data.src =  self.initTexture(wgl.gl, self.videoTag, resource);
        };


    if(data.src !== WEBCAM_TEXTURE) return true;

    this.initWebCamTexture(wgl);

    this.videoTag.addEventListener("playing", function(e){
        update();
        out();
    }, true);

    wgl.addListener("beforeRenderProcess", function(){
        update();
    });

    return false;
};

