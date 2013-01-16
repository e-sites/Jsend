/** 
 * Delaying the actual XHR by simply overriding the .dispatch() method and calling .xhr() in a setTimeout 
 * 
 * @usage  JSend().delay(2000).dispatch(); 
 * 
 * @param {number} ms delay in milliseconds 
 * @return {object} 
 */ 
JSend.prototype.delay = function (ms) { 
    this.dispatch = function () { 
        setTimeout(this.xhr, ms); 
        return this; 
    } 
    return this; 
};