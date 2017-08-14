/*globals BasePlugin */
/*
    HelloWorld
    This is an empty plugin!!
*/
var HelloWorld = function (factory, owner) {
    /* 
        Each plugin is passed two arguments on construction:
            1 - > Factory: The factory that built this plugin
            2 - > Owner: The SubFactory that this plugin is registered too (if given)
    */

    // This attaches the base plugin items to the Object
    BasePlugin.call(this, factory, owner);

    /* USER MODIFIABLE BEGIN */
    // Only modify between this line and the end of the object!
    var node = this.context.createGain();
    var gain_parameter = this.parameters.createNumberParameter("gain", 0, -12, 12);
    gain_parameter.translate = function (v) {
        return 20.0 * Math.log10(v);
    };
    gain_parameter.update = function (v) {
        return Math.pow(10, v / 20.0);
    };
    gain_parameter.bindToAudioParam(node.gain)
    this.addInput(node);
    this.addOutput(node);
    /* USER MODIFIABLE END */
};

// Also update the prototype function here!
HelloWorld.prototype = Object.create(BasePlugin.prototype);
HelloWorld.prototype.constructor = HelloWorld;
HelloWorld.prototype.name = "HelloWorld";
HelloWorld.prototype.version = "1.0.0";
HelloWorld.prototype.uniqueID = "JSHW";
