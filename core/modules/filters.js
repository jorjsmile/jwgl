/**
 * 
 * @param {Object} info
 * @returns {Filter}
 */

function Filter(info){
    WGLModule.call(this, info);
}

Filter.prototype = new WGLModule;
Filter.prototype.constructor = Filter;
