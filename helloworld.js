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

    /* USER MODIFIABLE END */
};

// Also update the prototype function here!
HelloWorld.prototype = Object.create(BasePlugin.prototype);
HelloWorld.prototype.constructor = HelloWorld;
HelloWorld.prototype.name = "HelloWorld";
HelloWorld.prototype.version = "1.0.0";
HelloWorld.prototype.uniqueID = "JSHW";
