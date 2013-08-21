/*!
* Crafty v0.5.3
* http://craftyjs.com
*
* Copyright 2010, Louis Stowasser
* Dual licensed under the MIT or GPL licenses.
*/

(function (window, initComponents, undefined) {
    /**@
    * #Crafty
    * @category Core
    * Select a set of or single entities by components or an entity's ID.
    *
    * Crafty uses syntax similar to jQuery by having a selector engine to select entities by their components.
    *
    * @example
    * ~~~
    *    Crafty("MyComponent")
    *    Crafty("Hello 2D Component")
    *    Crafty("Hello, 2D, Component")
    * ~~~
    * 
    * The first selector will return all entities that have the component `MyComponent`. The second will return all entities that have `Hello` and `2D` and `Component` whereas the last will return all entities that have at least one of those components (or).
    *
    * ~~~
    *   Crafty("*")
    * ~~~
    * Passing `*` will select all entities.
    *
    * ~~~
    *   Crafty(1)
    * ~~~
    * Passing an integer will select the entity with that `ID`.
    *
    * Finding out the `ID` of an entity can be done by returning the property `0`.
    * ~~~
    *    var ent = Crafty.e("2D");
    *    ent[0]; //ID
    * ~~~
    */
    var Crafty = function (selector) {
        return new Crafty.fn.init(selector);
    },

    GUID, FPS, frame, components, entities, handlers, onloads, tick, requestID,
	noSetter, loops, milliSecPerFrame, nextGameTick, slice, rlist, rspace,

	initState = function () {
    	GUID = 1; //GUID for entity IDs
    	FPS = 50;
    	frame = 1;

    	components = {}; //map of components and their functions
    	entities = {}; //map of entities and their data
        entityFactories = {}; //templates of entities
    	handlers = {}; //global event handlers
    	onloads = []; //temporary storage of onload handlers
    	tick;

    	/*
		* `window.requestAnimationFrame` or its variants is called for animation.
		* `.requestID` keeps a record of the return value previous `window.requestAnimationFrame` call.
		* This is an internal variable. Used to stop frame.
		*/
    	requestID;

    	noSetter;

    	loops = 0;
    	milliSecPerFrame = 1000 / FPS;
    	nextGameTick = (new Date).getTime();

    	slice = Array.prototype.slice;
    	rlist = /\s*,\s*/;
    	rspace = /\s+/;
    };

    initState();

    /**@
    * #Crafty Core
    * @category Core
    * @trigger NewEntityName - After setting new name for entity - String - entity name
    * @trigger NewComponent - when a new component is added to the entity - String - Component
    * @trigger RemoveComponent - when a component is removed from the entity - String - Component
    * @trigger Remove - when the entity is removed by calling .destroy()
    * 
    * Set of methods added to every single entity.
    */
    Crafty.fn = Crafty.prototype = {

        init: function (selector) {
            //select entities by component
            if (typeof selector === "string") {
                var elem = 0, //index elements
                e, //entity forEach
                current,
                and = false, //flags for multiple
                or = false,
                del,
                comps,
                score,
                i, l;

                if (selector === '*') {
                    for (e in entities) {
                        this[+e] = entities[e];
                        elem++;
                    }
                    this.length = elem;
                    return this;
                }

                //multiple components OR
                if (selector.indexOf(',') !== -1) {
                    or = true;
                    del = rlist;
                    //deal with multiple components AND
                } else if (selector.indexOf(' ') !== -1) {
                    and = true;
                    del = rspace;
                }

                //loop over entities
                for (e in entities) {
                    if (!entities.hasOwnProperty(e)) continue; //skip
                    current = entities[e];

                    if (and || or) { //multiple components
                        comps = selector.split(del);
                        i = 0;
                        l = comps.length;
                        score = 0;

                        for (; i < l; i++) //loop over components
                            if (current.__c[comps[i]]) score++; //if component exists add to score

                        //if anded comps and has all OR ored comps and at least 1
                        if (and && score === l || or && score > 0) this[elem++] = +e;

                    } else if (current.__c[selector]) this[elem++] = +e; //convert to int
                }

                //extend all common components
                if (elem > 0 && !and && !or) this.extend(components[selector]);
                if (comps && and) for (i = 0; i < l; i++) this.extend(components[comps[i]]);

                this.length = elem; //length is the last index (already incremented)
				
				// if there's only one entity, return the actual entity
				if (elem === 1) {
					return entities[this[elem-1]];
				}

            } else { //Select a specific entity

                if (!selector) { //nothin passed creates God entity
                    selector = 0;
                    if (!(selector in entities)) entities[selector] = this;
                }

                //if not exists, return undefined
                if (!(selector in entities)) {
                    this.length = 0;
                    return this;
                }

                this[0] = selector;
                this.length = 1;

                //update from the cache
                if (!this.__c) this.__c = {};

                //update to the cache if NULL
                if (!entities[selector]) entities[selector] = this;
                return entities[selector]; //return the cached selector
            }

            return this;
        },

        /**@
        * #.setName
        * @comp Crafty Core
        * @sign public this .setName(String name)
        * @param name - A human readable name for debugging purposes.
        *
        * @example
        * ~~~
        * this.setName("Player");
        * ~~~
        */
        setName: function (name) {
            var entityName = String(name);

            this._entityName = entityName;

            this.trigger("NewEntityName", entityName);
            return this;
        },

        /**@
        * #.addComponent
        * @comp Crafty Core
        * @sign public this .addComponent(String componentList)
        * @param componentList - A string of components to add separated by a comma `,`
        * @sign public this .addComponent(String Component1[, .., String ComponentN])
        * @param Component# - Component ID to add.
        * Adds a component to the selected entities or entity.
        *
        * Components are used to extend the functionality of entities.
        * This means it will copy properties and assign methods to
        * augment the functionality of the entity.
        *
        * There are multiple methods of adding components. Passing a
        * string with a list of component names or passing multiple
        * arguments with the component names.
        *
        * If the component has a function named `init` it will be called.
        *
        * @example
        * ~~~
        * this.addComponent("2D, Canvas");
        * this.addComponent("2D", "Canvas");
        * ~~~
        */
        addComponent: function (id) {
            var uninit = [], c = 0, ul, //array of components to init
            i = 0, l, comps;

            //add multiple arguments
            if (arguments.length > 1) {
                l = arguments.length;
                for (; i < l; i++) {
                    this.__c[arguments[i]] = true;
                    uninit.push(arguments[i]);
                }
                //split components if contains comma
            } else if (id.indexOf(',') !== -1) {
                comps = id.split(rlist);
                l = comps.length;
                for (; i < l; i++) {
                    this.__c[comps[i]] = true;
                    uninit.push(comps[i]);
                }
                //single component passed
            } else {
                this.__c[id] = true;
                uninit.push(id);
            }

            //extend the components
            ul = uninit.length;
            for (; c < ul; c++) {
                comp = components[uninit[c]];
                this.extend(comp);

                //if constructor, call it
                if (comp && "init" in comp) {
                    comp.init.call(this);
                }
            }

            this.trigger("NewComponent", ul);
            return this;
        },

        /**@
        * #.toggleComponent
        * @comp Crafty Core
        * @sign public this .toggleComponent(String ComponentList)
        * @param ComponentList - A string of components to add or remove separated by a comma `,`
        * @sign public this .toggleComponent(String Component1[, .., String componentN])
        * @param Component# - Component ID to add or remove.
        * Add or Remove Components from an entity.
        * 
        * @example
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.toggleComponent("Test,Test2"); //Remove Test, add Test2
        * e.toggleComponent("Test,Test2"); //Add Test, remove Test2
        * ~~~
        *
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.toggleComponent("Test","Test2"); //Remove Test, add Test2
        * e.toggleComponent("Test","Test2"); //Add Test, remove Test2
        * e.toggleComponent("Test");         //Remove Test
        * ~~~
        */
       toggleComponent:function(toggle){
            var i = 0, l, comps;
            if (arguments.length > 1) {
                l = arguments.length;
                        
                for (; i < l; i++) {
                    if(this.has(arguments[i])){ 
                        this.removeComponent(arguments[i]);
                    }else{
                        this.addComponent(arguments[i]);
                    }
                }
            //split components if contains comma
            } else if (toggle.indexOf(',') !== -1) {
                comps = toggle.split(rlist);
                l = comps.length;
                for (; i < l; i++) {
                    if(this.has(comps[i])){ 
                        this.removeComponent(comps[i]);
                    }else{
                        this.addComponent(comps[i]);
                    }
                }
                
            //single component passed
            } else {
                if(this.has(toggle)){ 
                    this.removeComponent(toggle);
                }else{
                    this.addComponent(toggle);
                }
            }

            return this;
        },

        /**@
        * #.requires
        * @comp Crafty Core
        * @sign public this .requires(String componentList)
        * @param componentList - List of components that must be added
        * 
        * Makes sure the entity has the components listed. If the entity does not
        * have the component, it will add it.
        * 
        * @see .addComponent
        */
        requires: function (list) {
            var comps = list.split(rlist),
            i = 0, l = comps.length,
            comp;

            //loop over the list of components and add if needed
            for (; i < l; ++i) {
                comp = comps[i];
                if (!this.has(comp)) this.addComponent(comp);
            }

            return this;
        },

        /**@
        * #.removeComponent
        * @comp Crafty Core
        * @sign public this .removeComponent(String Component[, soft])
        * @param component - Component to remove
        * @param soft - Whether to soft remove it (defaults to `true`)
        *
        * Removes a component from an entity. A soft remove (the default) will only
        * refrain `.has()` from returning true. Hard will remove all
        * associated properties and methods.
        *
        * @example
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.removeComponent("Test");        //Soft remove Test component
        * e.removeComponent("Test", false); //Hard remove Test component
        * ~~~
        */
        removeComponent: function (id, soft) {
            if (soft === false) {
                var props = components[id], prop;
                for (prop in props) {
                    delete this[prop];
                }
            }
            delete this.__c[id];

            this.trigger("RemoveComponent", id);
            return this;
        },

        /**@
        * #.has
        * @comp Crafty Core
        * @sign public Boolean .has(String component)
        * Returns `true` or `false` depending on if the
        * entity has the given component.
        *
        * For better performance, simply use the `.__c` object
        * which will be `true` if the entity has the component or
        * will not exist (or be `false`).
        */
        has: function (id) {
            return !!this.__c[id];
        },

        /**@
        * #.attr
        * @comp Crafty Core
        * @sign public this .attr(String property, * value)
        * @param property - Property of the entity to modify
        * @param value - Value to set the property to
        * @sign public this .attr(Object map)
        * @param map - Object where the key is the property to modify and the value as the property value
        * @trigger Change - when properties change - {key: value}
        * 
        * Use this method to set any property of the entity.
        * 
        * @example
        * ~~~
        * this.attr({key: "value", prop: 5});
        * this.key; //value
        * this.prop; //5
        *
        * this.attr("key", "newvalue");
        * this.key; //newvalue
        * ~~~
        */
        attr: function (key, value) {
            if (arguments.length === 1) {
                //if just the key, return the value
                if (typeof key === "string") {
                    return this[key];
                }

                //extend if object
                this.extend(key);
                this.trigger("Change", key); //trigger change event
                return this;
            }
            //if key value pair
            this[key] = value;

            var change = {};
            change[key] = value;
            this.trigger("Change", change); //trigger change event
            return this;
        },

        /**@
        * #.toArray
        * @comp Crafty Core
        * @sign public this .toArray(void)
        * 
        * This method will simply return the found entities as an array.
        */
        toArray: function () {
            return slice.call(this, 0);
        },

        /**@
        * #.timeout
        * @comp Crafty Core
        * @sign public this .timeout(Function callback, Number delay)
        * @param callback - Method to execute after given amount of milliseconds
        * @param delay - Amount of milliseconds to execute the method
        * 
        * The delay method will execute a function after a given amount of time in milliseconds.
        *
        * Essentially a wrapper for `setTimeout`.
        *
        * @example
        * Destroy itself after 100 milliseconds
        * ~~~
        * this.timeout(function() {
             this.destroy();
        * }, 100);
        * ~~~
        */
        timeout: function (callback, duration) {
            this.each(function () {
                var self = this;
                setTimeout(function () {
                    callback.call(self);
                }, duration);
            });
            return this;
        },

        /**@
        * #.bind
        * @comp Crafty Core
        * @sign public this .bind(String eventName, Function callback)
        * @param eventName - Name of the event to bind to
        * @param callback - Method to execute when the event is triggered
        * Attach the current entity (or entities) to listen for an event.
        *
        * Callback will be invoked when an event with the event name passed
        * is triggered. Depending on the event, some data may be passed
        * via an argument to the callback function.
        *
        * The first argument is the event name (can be anything) whilst the
        * second argument is the callback. If the event has data, the
        * callback should have an argument.
        *
        * Events are arbitrary and provide communication between components.
        * You can trigger or bind an event even if it doesn't exist yet.
        * 
        * @example
        * ~~~
        * this.attr("triggers", 0); //set a trigger count
        * this.bind("myevent", function() {
        *     this.triggers++; //whenever myevent is triggered, increment
        * });
        * this.bind("EnterFrame", function() {
        *     this.trigger("myevent"); //trigger myevent on every frame
        * });
        * ~~~
        * 
        * @see .trigger, .unbind
        */
        bind: function (event, callback) {
            //optimization for 1 entity
            if (this.length === 1) {
                if (!handlers[event]) handlers[event] = {};
                var h = handlers[event];

                if (!h[this[0]]) h[this[0]] = []; //init handler array for entity
                h[this[0]].push(callback); //add current callback
                return this;
            }

            this.each(function () {
                //init event collection
                if (!handlers[event]) handlers[event] = {};
                var h = handlers[event];

                if (!h[this[0]]) h[this[0]] = []; //init handler array for entity
                h[this[0]].push(callback); //add current callback
            });
            return this;
        },

        /**@
        * #.unbind
        * @comp Crafty Core
        * @sign public this .unbind(String eventName[, Function callback])
        * @param eventName - Name of the event to unbind
        * @param callback - Function to unbind
        * Removes binding with an event from current entity.
        *
        * Passing an event name will remove all events bound to
        * that event. Passing a reference to the callback will
        * unbind only that callback.
        * @see .bind, .trigger
        */
        unbind: function (event, callback) {
            this.each(function () {
                var hdl = handlers[event], i = 0, l, current;
                //if no events, cancel
                if (hdl && hdl[this[0]]) l = hdl[this[0]].length;
                else return this;

                //if no function, delete all
                if (!callback) {
                    delete hdl[this[0]];
                    return this;
                }
                //look for a match if the function is passed
                for (; i < l; i++) {
                    current = hdl[this[0]];
                    if (current[i] == callback) {
                        current.splice(i, 1);
                        i--;
                    }
                }
            });

            return this;
        },

        /**@
        * #.trigger
        * @comp Crafty Core
        * @sign public this .trigger(String eventName[, Object data])
        * @param eventName - Event to trigger
        * @param data - Arbitrary data that will be passed into every callback as an argument
        * Trigger an event with arbitrary data. Will invoke all callbacks with
        * the context (value of `this`) of the current entity object.
        *
        * *Note: This will only execute callbacks within the current entity, no other entity.*
        *
        * The first argument is the event name to trigger and the optional
        * second argument is the arbitrary event data. This can be absolutely anything.
        */
        trigger: function (event, data) {
            if (this.length === 1) {
                //find the handlers assigned to the event and entity
                if (handlers[event] && handlers[event][this[0]]) {
                    var callbacks = handlers[event][this[0]], i = 0, l = callbacks.length;
                    for (; i < l; i++) {
                        callbacks[i].call(this, data);
                    }
                }
                return this;
            }

            this.each(function () {
                //find the handlers assigned to the event and entity
                if (handlers[event] && handlers[event][this[0]]) {
                    var callbacks = handlers[event][this[0]], i = 0, l = callbacks.length;
                    for (; i < l; i++) {
                        callbacks[i].call(this, data);
                    }
                }
            });
            return this;
        },

        /**@
        * #.each
        * @sign public this .each(Function method)
        * @param method - Method to call on each iteration
        * Iterates over found entities, calling a function for every entity.
        *
        * The function will be called for every entity and will pass the index
        * in the iteration as an argument. The context (value of `this`) of the
        * function will be the current entity in the iteration.
        * 
        * @example
        * Destroy every second 2D entity
        * ~~~
        * Crafty("2D").each(function(i) {
        *     if(i % 2 === 0) {
        *         this.destroy();
        *     }
        * });
        * ~~~
        */
        each: function (func) {
            var i = 0, l = this.length;
            for (; i < l; i++) {
                //skip if not exists
                if (!entities[this[i]]) continue;
                func.call(entities[this[i]], i);
            }
            return this;
        },

        /**@
        * #.clone
        * @comp Crafty Core
        * @sign public Entity .clone(void)
        * @returns Cloned entity of the current entity
        * 
        * Method will create another entity with the exact same
        * properties, components and methods as the current entity.
        */
        clone: function () {
            var comps = this.__c,
            comp,
            prop,
            clone = Crafty.e();

            for (comp in comps) {
                clone.addComponent(comp);
            }
            for (prop in this) {
                if (prop != "0" && prop != "_global" && prop != "_changed" && typeof this[prop] != "function" && typeof this[prop] != "object") {
                    clone[prop] = this[prop];
                }
            }

            return clone;
        },

        /**@
        * #.setter
        * @comp Crafty Core
        * @sign public this .setter(String property, Function callback)
        * @param property - Property to watch for modification
        * @param callback - Method to execute if the property is modified
        * Will watch a property waiting for modification and will then invoke the
        * given callback when attempting to modify.
        *
        * *Note: Support in IE<9 is slightly different. The method will be executed
        * after the property has been set*
        */
        setter: function (prop, callback) {
            if (Crafty.support.setter) {
                this.__defineSetter__(prop, callback);
            } else if (Crafty.support.defineProperty) {
                Object.defineProperty(this, prop, {
                    set: callback,
                    configurable: true
                });
            } else {
                noSetter.push({
                    prop: prop,
                    obj: this,
                    fn: callback
                });
            }
            return this;
        },

        /**@
        * #.destroy
        * @comp Crafty Core
        * @sign public this .destroy(void)
        * Will remove all event listeners and delete all properties as well as removing from the stage
        */
        destroy: function () {
            //remove all event handlers, delete from entities
            this.each(function () {
                this.trigger("Remove");
                for (var e in handlers) {
                    this.unbind(e);
                }
                delete entities[this[0]];
            });
        }
    };

    //give the init instances the Crafty prototype
    Crafty.fn.init.prototype = Crafty.fn;

    /**
    * Extension method to extend the namespace and
    * selector instances
    */
    Crafty.extend = Crafty.fn.extend = function (obj) {
        var target = this, key;

        //don't bother with nulls
        if (!obj) return target;

        for (key in obj) {
            if (target === obj[key]) continue; //handle circular reference
            target[key] = obj[key];
        }

        return target;
    };

    /**@
    * #Crafty.extend
    * @category Core
    * Used to extend the Crafty namespace.
    */
    Crafty.extend({
        /**@
        * #Crafty.init
        * @category Core
        * @trigger EnterFrame - on each frame - { frame: Number }
        * @trigger Load - Just after the viewport is initialised. Before the EnterFrame loops is started
        * @sign public this Crafty.init([Number width, Number height])
        * @param width - Width of the stage
        * @param height - Height of the stage
        * 
        * Create a div with id `cr-stage`, if there is not already an HTMLElement with id `cr-stage` (by `Crafty.viewport.init`).
        *
        * Starts the `EnterFrame` interval. This will call the `EnterFrame` event for every frame.
        *
        * Can pass width and height values for the stage otherwise will default to window size (see `Crafty.DOM.window`).
        *
        * All `Load` events will be executed.
        *
        * Uses `requestAnimationFrame` to sync the drawing with the browser but will default to `setInterval` if the browser does not support it.
        * @see Crafty.stop,  Crafty.viewport
        */
        init: function (w, h) {
            Crafty.viewport.init(w, h);

            //call all arbitrary functions attached to onload
            this.trigger("Load");
            this.timer.init();

            return this;
        },

        /**@
        * #.getVersion
        * @comp Crafty Core
        * @sign public this .getVersion()
        * @returns Actually crafty version
        *
        * @example
        * ~~~
        * Crafty.getVersion(); //'0.5.2'
        * ~~~
        */
        getVersion: function () {
            return '0.5.3';
        },

        /**@
        * #Crafty.stop
        * @category Core
        * @trigger CraftyStop - when the game is stopped
        * @sign public this Crafty.stop([bool clearState])
		* @param clearState - if true the stage and all game state is cleared.
        *
        * Stops the EnterFrame interval and removes the stage element.
        *
        * To restart, use `Crafty.init()`.
        * @see Crafty.init
        */
        stop: function (clearState) {
        	this.timer.stop();
        	if (clearState) {
        		if (Crafty.stage && Crafty.stage.elem.parentNode) {
        			var newCrStage = document.createElement('div');
        			newCrStage.id = "cr-stage";
        			Crafty.stage.elem.parentNode.replaceChild(newCrStage, Crafty.stage.elem);
        		}
        		initState();
        		initComponents(Crafty, window, window.document);
        	}

            Crafty.trigger("CraftyStop");

        	return this;
        },

        /**@
        * #Crafty.pause
        * @category Core
        * @trigger Pause - when the game is paused
        * @trigger Unpause - when the game is unpaused
        * @sign public this Crafty.pause(void)
        * 
        * Pauses the game by stopping the EnterFrame event from firing. If the game is already paused it is unpaused.
        * You can pass a boolean parameter if you want to pause or unpause mo matter what the current state is.
        * Modern browsers pauses the game when the page is not visible to the user. If you want the Pause event
        * to be triggered when that happens you can enable autoPause in `Crafty.settings`.
        * 
        * @example
        * Have an entity pause the game when it is clicked.
        * ~~~
        * button.bind("click", function() {
        *     Crafty.pause();
        * });
        * ~~~
        */
        pause: function (toggle) {
            if (arguments.length == 1 ? toggle : !this._paused) {
                this.trigger('Pause');
                this._paused = true;
                setTimeout(function(){ Crafty.timer.stop(); }, 0);
                Crafty.keydown = {};
            } else {
                this.trigger('Unpause');
                this._paused = false;
                setTimeout(function(){ Crafty.timer.init(); }, 0);
            }
            return this;
        },

        /**@
         * #Crafty.isPaused
         * @category Core
         * @sign public this Crafty.isPaused()
         * 
         * Check whether the game is already paused or not.
         * 
         * @example
         * ~~~
         * Crafty.isPaused();
         * ~~~
         */
        isPaused: function () {
            return this._paused;
        },

        /**@
        * #Crafty.timer
        * @category Internal
        * Handles game ticks
        */
        timer: {
            prev: (+new Date),
            current: (+new Date),
            currentTime: +new Date(),
            frames:0,
            frameTime:0,
            init: function () {
                var onFrame = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    null;

                if (onFrame) {
                    tick = function () {
                        Crafty.timer.step();
                        requestID = onFrame(tick);
                        //console.log(requestID + ', ' + frame)
                    }

                    tick();
                } else {
                    tick = setInterval(function () { Crafty.timer.step(); }, 1000 / FPS);
                }
            },

            stop: function () {
                Crafty.trigger("CraftyStopTimer");

                if (typeof tick === "number") clearInterval(tick);

                var onFrame = window.cancelRequestAnimationFrame ||
                    window.webkitCancelRequestAnimationFrame ||
                    window.mozCancelRequestAnimationFrame ||
                    window.oCancelRequestAnimationFrame ||
                    window.msCancelRequestAnimationFrame ||
                    null;

                if (onFrame) onFrame(requestID);
                tick = null;
            },

            /**@
            * #Crafty.timer.step
            * @comp Crafty.timer
            * @sign public void Crafty.timer.step()
            * Advances the game by triggering `EnterFrame` and calls `Crafty.DrawManager.draw` to update the stage.
            */
            step: function () {
                loops = 0;
                this.currentTime = +new Date();
                if (this.currentTime - nextGameTick > 60 * milliSecPerFrame) {
                    nextGameTick = this.currentTime - milliSecPerFrame;
                }
                while (this.currentTime > nextGameTick) {
                    Crafty.trigger("EnterFrame", { frame: frame++ });
                    nextGameTick += milliSecPerFrame;
                    loops++;
                }
                if (loops) {
                    Crafty.DrawManager.draw();
                }
               if(this.currentTime > this.frameTime){
                    Crafty.trigger("MessureFPS",{value:this.frame});
                    this.frame = 0;
                    this.frameTime = this.currentTime + 1000;
                }else{
                    this.frame++;
                }
            
            },
            /**@
            * #Crafty.timer.getFPS
            * @comp Crafty.timer
            * @sign public void Crafty.timer.getFPS()
            * Returns the target frames per second. This is not an actual frame rate.
            */
            getFPS: function () {
                return FPS;
            },

            /**@
            * #Crafty.timer.simulateFrames
            * @comp Crafty.timer
            * Advances the game state by a number of frames and draws the resulting stage at the end. Useful for tests and debugging.
            * @sign public this Crafty.timer.simulateFrames(Number frames)
            * @param frames - number of frames to simulate
            */
            simulateFrames: function (frames) {
                while (frames-- > 0) {
                    Crafty.trigger("EnterFrame", { frame: frame++ });
                }
                Crafty.DrawManager.draw();
            }

        },

        /**@
        * #Crafty.addEntityFactory
        * @category Core
        * @param name - Name of the entity factory.
        * @param callback - Function containing the entity creation procedure.
        * 
        * Registers an Entity Factory.  An Entity Factory allows for the repeatable creation of an Entity.
        *
        * @example
        * ~~~
        * Crafty.addEntityFactory('Projectile', function() {
        *   var entity = Crafty.e('2D, Canvas, Color, Physics, Collision')
        *   .color("red")
        *   .attr({
        *     w: 3,
        *     h: 3,
        *     x: this.x,
        *     y: this.y
        *   })
        *   .addComponent('Gravity').gravity("Floor");
        *   
        *   return entity;
        * });
        * ~~~
        * 
        * @see Crafty.e
        */
        addEntityFactory: function(name, callback) {
            this.entityFactories[name] = callback;
        },

        /**@
        * #Crafty.newFactoryEntity
        * @category Core
        * @param name - Name of the entity factory.
        * 
        * Creates a new entity based on a specific Entity Factory.
        *
        * @example
        * ~~~
        * Crafty.addEntityFactory('Projectile', function() {
        *   var entity = Crafty.e('2D, Canvas, Color, Physics, Collision')
        *   .color("red")
        *   .attr({
        *     w: 3,
        *     h: 3,
        *     x: this.x,
        *     y: this.y
        *   })
        *   .addComponent('Gravity').gravity("Floor");
        *   
        *   return entity;
        * });
        *
        * Crafty.newFactoryEntity('Projectile'); // This returns a new Projectile Entity.
        * ~~~
        * 
        * @see Crafty.e
        */
        newFactoryEntity: function(name) {
            return this.entityTemplates[name]();
        },

        /**@
        * #Crafty.e
        * @category Core
        * @trigger NewEntity - When the entity is created and all components are added - { id:Number }
        * @sign public Entity Crafty.e(String componentList)
        * @param componentList - List of components to assign to new entity
        * @sign public Entity Crafty.e(String component1[, .., String componentN])
        * @param component# - Component to add
        * 
        * Creates an entity. Any arguments will be applied in the same
        * way `.addComponent()` is applied as a quick way to add components.
        *
        * Any component added will augment the functionality of
        * the created entity by assigning the properties and methods from the component to the entity.
        * 
        * @example
        * ~~~
        * var myEntity = Crafty.e("2D, DOM, Color");
        * ~~~
        * 
        * @see Crafty.c
        */
        e: function () {
            var id = UID(), craft;

            entities[id] = null; //register the space
            entities[id] = craft = Crafty(id);

            if (arguments.length > 0) {
                craft.addComponent.apply(craft, arguments);
            }
            craft.setName('Entity #'+id); //set default entity human readable name
            craft.addComponent("obj"); //every entity automatically assumes obj

            Crafty.trigger("NewEntity", { id: id });

            return craft;
        },

        /**@
        * #Crafty.c
        * @category Core
        * @sign public void Crafty.c(String name, Object component)
        * @param name - Name of the component
        * @param component - Object with the components properties and methods
        * Creates a component where the first argument is the ID and the second
        * is the object that will be inherited by entities.
        *
        * There is a convention for writing components. 
        *
        * - Properties or methods that start with an underscore are considered private.
        * - A method called `init` will automatically be called as soon as the
        * component is added to an entity.
        * - A method with the same name as the component is considered to be a constructor
        * and is generally used when you need to pass configuration data to the component on a per entity basis.
        *
        * @example
        * ~~~
        * Crafty.c("Annoying", {
        *     _message: "HiHi",
        *     init: function() {
        *         this.bind("EnterFrame", function() { alert(this.message); });
        *     },
        *     annoying: function(message) { this.message = message; }
        * });
        *
        * Crafty.e("Annoying").annoying("I'm an orange...");
        * ~~~
        *
        * 
        * WARNING: 
        *
        * in the example above the field _message is local to the entity. That is, if you create many entities with the Annoying component they can all have different values for _message. That is because it is a simple value, and simple values are copied by value. If however the field had been an object or array, the value would have been shared by all entities with the component because complex types are copied by reference in javascript. This is probably not what you want and the following example demonstrates how to work around it:
        *
        * ~~~
        * Crafty.c("MyComponent", {
        *     _iAmShared: { a: 3, b: 4 },
        *     init: function() {
        *         this._iAmNotShared = { a: 3, b: 4 };
        *     },
        * });
        * ~~~
        *
        * @see Crafty.e
        */
        c: function (compName, component) {
            components[compName] = component;
        },

        /**@
        * #Crafty.trigger
        * @category Core, Events
        * @sign public void Crafty.trigger(String eventName, * data)
        * @param eventName - Name of the event to trigger
        * @param data - Arbitrary data to pass into the callback as an argument
        * 
        * This method will trigger every single callback attached to the event name. This means
        * every global event and every entity that has a callback.
        * 
        * @see Crafty.bind
        */
        trigger: function (event, data) {
            var hdl = handlers[event], h, i, l;
            //loop over every object bound
            for (h in hdl) {
                if (!hdl.hasOwnProperty(h)) continue;

                //loop over every handler within object
                for (i = 0, l = hdl[h].length; i < l; i++) {
                    if (hdl[h] && hdl[h][i]) {
                        //if an entity, call with that context
                        if (entities[h]) {
                            hdl[h][i].call(Crafty(+h), data);
                        } else { //else call with Crafty context
                            hdl[h][i].call(Crafty, data);
                        }
                    }
                }
            }
        },

        /**@
        * #Crafty.bind
        * @category Core, Events
        * @sign public Number bind(String eventName, Function callback)
        * @param eventName - Name of the event to bind to
        * @param callback - Method to execute upon event triggered
        * @returns ID of the current callback used to unbind
        * 
        * Binds to a global event. Method will be executed when `Crafty.trigger` is used
        * with the event name.
        * 
        * @see Crafty.trigger, Crafty.unbind
        */
        bind: function (event, callback) {
            if (!handlers[event]) handlers[event] = {};
            var hdl = handlers[event];

            if (!hdl.global) hdl.global = [];
            return hdl.global.push(callback) - 1;
        },

        /**@
        * #Crafty.unbind
        * @category Core, Events
        * @sign public Boolean Crafty.unbind(String eventName, Function callback)
        * @param eventName - Name of the event to unbind
        * @param callback - Function to unbind
        * @sign public Boolean Crafty.unbind(String eventName, Number callbackID)
        * @param callbackID - ID of the callback
        * @returns True or false depending on if a callback was unbound
        * Unbind any event from any entity or global event.
        */
        unbind: function (event, callback) {
            var hdl = handlers[event], h, i, l;

            //loop over every object bound
            for (h in hdl) {
                if (!hdl.hasOwnProperty(h)) continue;

                //if passed the ID
                if (typeof callback === "number") {
                    delete hdl[h][callback];
                    return true;
                }

                //loop over every handler within object
                for (i = 0, l = hdl[h].length; i < l; i++) {
                    if (hdl[h][i] === callback) {
                        delete hdl[h][i];
                        return true;
                    }
                }
            }

            return false;
        },

        /**@
        * #Crafty.frame
        * @category Core
        * @sign public Number Crafty.frame(void)
        * Returns the current frame number
        */
        frame: function () {
            return frame;
        },

        components: function () {
            return components;
        },

        isComp: function (comp) {
            return comp in components;
        },

        debug: function () {
            return entities;
        },

        /**@
        * #Crafty.settings
        * @category Core
        * Modify the inner workings of Crafty through the settings.
        */
        settings: (function () {
            var states = {},
            callbacks = {};

            return {
            /**@
            * #Crafty.settings.register
            * @comp Crafty.settings
            * @sign public void Crafty.settings.register(String settingName, Function callback)
            * @param settingName - Name of the setting
            * @param callback - Function to execute when use modifies setting
            * 
            * Use this to register custom settings. Callback will be executed when `Crafty.settings.modify` is used.
            * 
            * @see Crafty.settings.modify
            */
                register: function (setting, callback) {
                    callbacks[setting] = callback;
                },

            /**@
            * #Crafty.settings.modify
            * @comp Crafty.settings
            * @sign public void Crafty.settings.modify(String settingName, * value)
            * @param settingName - Name of the setting
            * @param value - Value to set the setting to
            * 
            * Modify settings through this method.
            * 
            * @see Crafty.settings.register, Crafty.settings.get
            */
                modify: function (setting, value) {
                    if (!callbacks[setting]) return;
                    callbacks[setting].call(states[setting], value);
                    states[setting] = value;
                },

            /**@
            * #Crafty.settings.get
            * @comp Crafty.settings
            * @sign public * Crafty.settings.get(String settingName)
            * @param settingName - Name of the setting
            * @returns Current value of the setting
            * 
            * Returns the current value of the setting.
            * 
            * @see Crafty.settings.register, Crafty.settings.get
            */
                get: function (setting) {
                    return states[setting];
                }
            };
        })(),

        clone: clone
    });

    /**
    * Return a unique ID
    */
    function UID() {
        var id = GUID++;
        //if GUID is not unique
        if (id in entities) {
            return UID(); //recurse until it is unique
        }
        return id;
    }

    /**@
    * #Crafty.clone
    * @category Core
    * @sign public Object .clone(Object obj)
    * @param obj - an object
    * 
    * Deep copy (a.k.a clone) of an object.
    */
    function clone(obj) {
        if (obj === null || typeof(obj) != 'object')
            return obj;

        var temp = obj.constructor(); // changed

        for (var key in obj)
            temp[key] = clone(obj[key]);
        return temp;
    }

    Crafty.bind("Load", function () {
        if (!Crafty.support.setter && Crafty.support.defineProperty) {
            noSetter = [];
            Crafty.bind("EnterFrame", function () {
                var i = 0, l = noSetter.length, current;
                for (; i < l; ++i) {
                    current = noSetter[i];
                    if (current.obj[current.prop] !== current.obj['_' + current.prop]) {
                        current.fn.call(current.obj, current.obj[current.prop]);
                    }
                }
            });
        }
    });

    initComponents(Crafty, window, window.document);

    //make Crafty global
    window.Crafty = Crafty;

    if (typeof define === 'function') {
        define('crafty', [], function() { return Crafty; });
    }
})(window,

//wrap around components
function(Crafty, window, document) {

/**
* Spatial HashMap for broad phase collision
*
* @author Louis Stowasser
*/
(function (parent) {


	/**@
	* #Crafty.HashMap.constructor
	* @comp Crafty.HashMap
	* @sign public void Crafty.HashMap([cellsize])
	* @param cellsize - the cell size. If omitted, `cellsize` is 64.
	* 
    * Set `cellsize`.
    * And create `this.map`.
	*/
	var cellsize,

	HashMap = function (cell) {
		cellsize = cell || 64;
		this.map = {};
	},

	SPACE = " ";

	HashMap.prototype = {
	/**@
	* #Crafty.map.insert
	* @comp Crafty.map
    * @sign public Object Crafty.map.insert(Object obj)
	* @param obj - An entity to be inserted.
	* 
    * `obj` is inserted in '.map' of the corresponding broad phase cells. An object of the following fields is returned.
    * ~~~
    * - the object that keep track of cells (keys)
    * - `obj`
    * - the HashMap object
    * ~~~
	*/
		insert: function (obj) {
			var keys = HashMap.key(obj),
			entry = new Entry(keys, obj, this),
			i = 0,
			j,
			hash;

			//insert into all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;
					if (!this.map[hash]) this.map[hash] = [];
					this.map[hash].push(obj);
				}
			}

			return entry;
		},

	/**@
	* #Crafty.map.search
	* @comp Crafty.map
    * @sign public Object Crafty.map.search(Object rect[, Boolean filter])
	* @param rect - the rectangular region to search for entities.
	* @param filter - Default value is true. Otherwise, must be false.
	* 
    * - If `filter` is `false`, just search for all the entries in the give `rect` region by broad phase collision. Entity may be returned duplicated.
    * - If `filter` is `true`, filter the above results by checking that they actually overlap `rect`.
    * The easier usage is with `filter`=`true`. For performance reason, you may use `filter`=`false`, and filter the result yourself. See examples in drawing.js and collision.js
	*/
		search: function (rect, filter) {
			var keys = HashMap.key(rect),
			i, j,
			hash,
			results = [];

			if (filter === undefined) filter = true; //default filter to true

			//search in all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;

					if (this.map[hash]) {
						results = results.concat(this.map[hash]);
					}
				}
			}

			if (filter) {
				var obj, id, finalresult = [], found = {};
				//add unique elements to lookup table with the entity ID as unique key
				for (i = 0, l = results.length; i < l; i++) {
					obj = results[i];
					if (!obj) continue; //skip if deleted
					id = obj[0]; //unique ID

					//check if not added to hash and that actually intersects
					if (!found[id] && obj.x < rect._x + rect._w && obj._x + obj._w > rect._x &&
								 obj.y < rect._y + rect._h && obj._h + obj._y > rect._y)
						found[id] = results[i];
				}

				//loop over lookup table and copy to final array
				for (obj in found) finalresult.push(found[obj]);

				return finalresult;
			} else {
				return results;
			}
		},

	/**@
	* #Crafty.map.remove
	* @comp Crafty.map
	* @sign public void Crafty.map.remove([Object keys, ]Object obj)
	* @param keys - key region. If omitted, it will be derived from obj by `Crafty.HashMap.key`.
	* @param obj - need more document.
	* 
	* Remove an entity in a broad phase map.
	* - The second form is only used in Crafty.HashMap to save time for computing keys again, where keys were computed previously from obj. End users should not call this form directly.
	*
	* @example 
	* ~~~
	* Crafty.map.remove(e);
	* ~~~
	*/
		remove: function (keys, obj) {
			var i = 0, j, hash;

			if (arguments.length == 1) {
				obj = keys;
				keys = HashMap.key(obj);
			}

			//search in all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;

					if (this.map[hash]) {
						var cell = this.map[hash],
						m,
						n = cell.length;
						//loop over objs in cell and delete
						for (m = 0; m < n; m++)
							if (cell[m] && cell[m][0] === obj[0])
								cell.splice(m, 1);
					}
				}
			}
		},

	/**@
	* #Crafty.map.boundaries
	* @comp Crafty.map
	* @sign public Object Crafty.map.boundaries()
	* 
    * The return `Object` is of the following format.
    * ~~~
	* {
    *   min: {
    *     x: val_x,
    *     y: val_y
    *   },
    *   max: {
    *     x: val_x,
    *     y: val_y
    *   }
    * }
    * ~~~
	*/
		boundaries: function () {
			var k, ent,
			hash = {
				max: { x: -Infinity, y: -Infinity },
				min: { x: Infinity, y: Infinity }
			},
			coords = {
				max: { x: -Infinity, y: -Infinity },
				min: { x: Infinity, y: Infinity }
			};

      //Using broad phase hash to speed up the computation of boundaries.
			for (var h in this.map) {
				if (!this.map[h].length) continue;

        //broad phase coordinate
				var map_coord = h.split(SPACE),
					i=map_coord[0],
					j=map_coord[0];
				if (i >= hash.max.x) {
					hash.max.x = i;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						//make sure that this is a Crafty entity
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.max.x = Math.max(coords.max.x, ent.x + ent.w);
						}
					}
				}
				if (i <= hash.min.x) {
					hash.min.x = i;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.min.x = Math.min(coords.min.x, ent.x);
						}
					}
				}
				if (j >= hash.max.y) {
					hash.max.y = j;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.max.y = Math.max(coords.max.y, ent.y + ent.h);
						}
					}
				}
				if (j <= hash.min.y) {
					hash.min.y = j;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.min.y = Math.min(coords.min.y, ent.y);
						}
					}
				}
			}

			return coords;
		}
	};

/**@
* #Crafty.HashMap
* @category 2D
* Broad-phase collision detection engine. See background information at 
*
* ~~~
* - [N Tutorial B - Broad-Phase Collision](http://www.metanetsoftware.com/technique/tutorialB.html)
* - [Broad-Phase Collision Detection with CUDA](http.developer.nvidia.com/GPUGems3/gpugems3_ch32.html)
* ~~~
* @see Crafty.map
*/

	/**@
	* #Crafty.HashMap.key
	* @comp Crafty.HashMap
	* @sign public Object Crafty.HashMap.key(Object obj)
	* @param obj - an Object that has .mbr() or _x, _y, _w and _h.
    * Get the rectangular region (in terms of the grid, with grid size `cellsize`), where the object may fall in. This region is determined by the object's bounding box.
    * The `cellsize` is 64 by default.
    * 
    * @see Crafty.HashMap.constructor
	*/
	HashMap.key = function (obj) {
		if (obj.hasOwnProperty('mbr')) {
			obj = obj.mbr();
		}
		var x1 = Math.floor(obj._x / cellsize),
		y1 = Math.floor(obj._y / cellsize),
		x2 = Math.floor((obj._w + obj._x) / cellsize),
		y2 = Math.floor((obj._h + obj._y) / cellsize);
		return { x1: x1, y1: y1, x2: x2, y2: y2 };
	};

	HashMap.hash = function (keys) {
		return keys.x1 + SPACE + keys.y1 + SPACE + keys.x2 + SPACE + keys.y2;
	};

	function Entry(keys, obj, map) {
		this.keys = keys;
		this.map = map;
		this.obj = obj;
	}

	Entry.prototype = {
		update: function (rect) {
			//check if buckets change
			if (HashMap.hash(HashMap.key(rect)) != HashMap.hash(this.keys)) {
				this.map.remove(this.keys, this.obj);
				var e = this.map.insert(this.obj);
				this.keys = e.keys;
			}
		}
	};

	parent.HashMap = HashMap;
})(Crafty);

/**@
* #Crafty.map
* @category 2D
* Functions related with querying entities.
* @see Crafty.HashMap
*/
Crafty.map = new Crafty.HashMap();
var M = Math,
	Mc = M.cos,
	Ms = M.sin,
	PI = M.PI,
	DEG_TO_RAD = PI / 180;


/**@
* #2D
* @category 2D
* Component for any entity that has a position on the stage.
* @trigger Move - when the entity has moved - { _x:Number, _y:Number, _w:Number, _h:Number } - Old position
* @trigger Change - when the entity has moved - { _x:Number, _y:Number, _w:Number, _h:Number } - Old position
* @trigger Rotate - when the entity is rotated - { cos:Number, sin:Number, deg:Number, rad:Number, o: {x:Number, y:Number}, matrix: {M11, M12, M21, M22} }
*/
Crafty.c("2D", {
/**@
	* #.x
	* @comp 2D
	* The `x` position on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._x` property.
	* @see ._attr
	*/
	_x: 0,
	/**@
	* #.y
	* @comp 2D
	* The `y` position on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._y` property.
	* @see ._attr
	*/
	_y: 0,
	/**@
	* #.w
	* @comp 2D
	* The width of the entity. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._w` property.
	*
	* Changing this value is not recommended as canvas has terrible resize quality and DOM will just clip the image.
	* @see ._attr
	*/
	_w: 0,
	/**@
	* #.h
	* @comp 2D
	* The height of the entity. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._h` property.
	*
	* Changing this value is not recommended as canvas has terrible resize quality and DOM will just clip the image.
	* @see ._attr
	*/
	_h: 0,
	/**@
	* #.z
	* @comp 2D
	* The `z` index on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._z` property.
	*
	* A higher `z` value will be closer to the front of the stage. A smaller `z` value will be closer to the back.
	* A global Z index is produced based on its `z` value as well as the GID (which entity was created first).
	* Therefore entities will naturally maintain order depending on when it was created if same z value.
	* @see ._attr
	*/
	_z: 0,
	/**@
	* #.rotation
	* @comp 2D
	* Set the rotation of your entity. Rotation takes degrees in a clockwise direction.
	* It is important to note there is no limit on the rotation value. Setting a rotation
	* mod 360 will give the same rotation without reaching huge numbers.
	* @see ._attr
	*/
	_rotation: 0,
	/**@
	* #.alpha
	* @comp 2D
	* Transparency of an entity. Must be a decimal value between 0.0 being fully transparent to 1.0 being fully opaque.
	*/
	_alpha: 1.0,
	/**@
	* #.visible
	* @comp 2D
	* If the entity is visible or not. Accepts a true or false value.
	* Can be used for optimization by setting an entities visibility to false when not needed to be drawn.
	*
	* The entity will still exist and can be collided with but just won't be drawn.
  * @see Crafty.DrawManager.draw, Crafty.DrawManager.drawAll
	*/
	_visible: true,

	/**@
	* #._globalZ
	* @comp 2D
	* When two entities overlap, the one with the larger `_globalZ` will be on top of the other.
	* @see Crafty.DrawManager.draw, Crafty.DrawManager.drawAll
	*/
	_globalZ: null,

	_origin: null,
	_mbr: null,
	_entry: null,
	_children: null,
	_parent: null,
	_changed: false,

	_defineGetterSetter_setter: function() {
		//create getters and setters using __defineSetter__ and __defineGetter__
		this.__defineSetter__('x', function (v) { this._attr('_x', v); });
		this.__defineSetter__('y', function (v) { this._attr('_y', v); });
		this.__defineSetter__('w', function (v) { this._attr('_w', v); });
		this.__defineSetter__('h', function (v) { this._attr('_h', v); });
		this.__defineSetter__('z', function (v) { this._attr('_z', v); });
		this.__defineSetter__('rotation', function (v) { this._attr('_rotation', v); });
		this.__defineSetter__('alpha', function (v) { this._attr('_alpha', v); });
		this.__defineSetter__('visible', function (v) { this._attr('_visible', v); });

		this.__defineGetter__('x', function () { return this._x; });
		this.__defineGetter__('y', function () { return this._y; });
		this.__defineGetter__('w', function () { return this._w; });
		this.__defineGetter__('h', function () { return this._h; });
		this.__defineGetter__('z', function () { return this._z; });
		this.__defineGetter__('rotation', function () { return this._rotation; });
		this.__defineGetter__('alpha', function () { return this._alpha; });
		this.__defineGetter__('visible', function () { return this._visible; });
		this.__defineGetter__('parent', function () { return this._parent; });
		this.__defineGetter__('numChildren', function () { return this._children.length; });
	},

	_defineGetterSetter_defineProperty: function() {
		Object.defineProperty(this, 'x', {
				set: function (v) { this._attr('_x', v); }
				, get: function () { return this._x; }
				, configurable: true
			});

		Object.defineProperty(this, 'y', {
				set: function (v) { this._attr('_y', v); }
				, get: function () { return this._y; }
				, configurable: true
			});

		Object.defineProperty(this, 'w', {
				set: function (v) { this._attr('_w', v); }
				, get: function () { return this._w; }
				, configurable: true
			});

		Object.defineProperty(this, 'h', {
				set: function (v) { this._attr('_h', v); }
				, get: function () { return this._h; }
				, configurable: true
			});

		Object.defineProperty(this, 'z', {
				set: function (v) { this._attr('_z', v); }
				, get: function () { return this._z; }
				, configurable: true
			});

		Object.defineProperty(this, 'rotation', {
			set: function (v) { this._attr('_rotation', v); }
			, get: function () { return this._rotation; }
			, configurable: true
		});

		Object.defineProperty(this, 'alpha', {
			set: function (v) { this._attr('_alpha', v); }
			, get: function () { return this._alpha; }
			, configurable: true
		});

		Object.defineProperty(this, 'visible', {
			set: function (v) { this._attr('_visible', v); }
			, get: function () { return this._visible; }
			, configurable: true
		});
	},

	_defineGetterSetter_fallback: function() {
		//set the public properties to the current private properties
		this.x = this._x;
		this.y = this._y;
		this.w = this._w;
		this.h = this._h;
		this.z = this._z;
		this.rotation = this._rotation;
		this.alpha = this._alpha;
		this.visible = this._visible;

		//on every frame check for a difference in any property
		this.bind("EnterFrame", function () {
			//if there are differences between the public and private properties
			if (this.x !== this._x || this.y !== this._y ||
				this.w !== this._w || this.h !== this._h ||
				this.z !== this._z || this.rotation !== this._rotation ||
				this.alpha !== this._alpha || this.visible !== this._visible) {

				//save the old positions
				var old = this.mbr() || this.pos();

				//if rotation has changed, use the private rotate method
				if (this.rotation !== this._rotation) {
					this._rotate(this.rotation);
				} else {
					//update the MBR
					var mbr = this._mbr, moved = false;
					// If the browser doesn't have getters or setters,
					// {x, y, w, h, z} and {_x, _y, _w, _h, _z} may be out of sync,
					// in which case t checks if they are different on tick and executes the Change event.
					if (mbr) { //check each value to see which has changed
						if (this.x !== this._x) { mbr._x -= this.x - this._x; moved = true; }
						else if (this.y !== this._y) { mbr._y -= this.y - this._y; moved = true; }
						else if (this.w !== this._w) { mbr._w -= this.w - this._w; moved = true; }
						else if (this.h !== this._h) { mbr._h -= this.h - this._h; moved = true; }
						else if (this.z !== this._z) { mbr._z -= this.z - this._z; moved = true; }
					}

					//if the moved flag is true, trigger a move
					if (moved) this.trigger("Move", old);
				}

				//set the public properties to the private properties
				this._x = this.x;
				this._y = this.y;
				this._w = this.w;
				this._h = this.h;
				this._z = this.z;
				this._rotation = this.rotation;
				this._alpha = this.alpha;
				this._visible = this.visible;

				//trigger the changes
				this.trigger("Change", old);
				//without this entities weren't added correctly to Crafty.map.map in IE8.
				//not entirely sure this is the best way to fix it though
				this.trigger("Move", old);
			}
		});
  },

	init: function() {
		this._globalZ = this[0];
		this._origin = { x: 0, y: 0 };
		this._children = [];

		if(Crafty.support.setter) {
      this._defineGetterSetter_setter();
		} else if (Crafty.support.defineProperty) {
			//IE9 supports Object.defineProperty
      this._defineGetterSetter_defineProperty();
		} else {
			/*
			If no setters and getters are supported (e.g. IE8) supports,
			check on every frame for a difference between this._(x|y|w|h|z...)
			and this.(x|y|w|h|z) and update accordingly.
			*/
      this._defineGetterSetter_fallback();
		}

		//insert self into the HashMap
		this._entry = Crafty.map.insert(this);

		//when object changes, update HashMap
		this.bind("Move", function (e) {
			var area = this._mbr || this;
			this._entry.update(area);
			this._cascade(e);
		});

		this.bind("Rotate", function (e) {
			var old = this._mbr || this;
			this._entry.update(old);
			this._cascade(e);
		});

		//when object is removed, remove from HashMap and destroy attached children
		this.bind("Remove", function () {
			if (this._children) {
				for (var i = 0; i < this._children.length; i++) {
					if (this._children[i].destroy) {
						this._children[i].destroy();
					}
				}
				this._children = [];
			}
			
			if (this._parent) {
				this._parent.detach(this);
			}

			Crafty.map.remove(this);

			this.detach();
		});
	},

	/**
	* Calculates the MBR when rotated with an origin point
	*/
	_rotate: function (v) {
		var theta = -1 * (v % 360), //angle always between 0 and 359
			rad = theta * DEG_TO_RAD,
			ct = Math.cos(rad), //cache the sin and cosine of theta
			st = Math.sin(rad),
			o = {
			x: this._origin.x + this._x,
			y: this._origin.y + this._y
		};

		//if the angle is 0 and is currently 0, skip
		if (!theta) {
			this._mbr = null;
			if (!this._rotation % 360) return;
		}

		var x0 = o.x + (this._x - o.x) * ct + (this._y - o.y) * st,
			y0 = o.y - (this._x - o.x) * st + (this._y - o.y) * ct,
			x1 = o.x + (this._x + this._w - o.x) * ct + (this._y - o.y) * st,
			y1 = o.y - (this._x + this._w - o.x) * st + (this._y - o.y) * ct,
			x2 = o.x + (this._x + this._w - o.x) * ct + (this._y + this._h - o.y) * st,
			y2 = o.y - (this._x + this._w - o.x) * st + (this._y + this._h - o.y) * ct,
			x3 = o.x + (this._x - o.x) * ct + (this._y + this._h - o.y) * st,
			y3 = o.y - (this._x - o.x) * st + (this._y + this._h - o.y) * ct,
			minx = Math.round(Math.min(x0, x1, x2, x3)),
			miny = Math.round(Math.min(y0, y1, y2, y3)),
			maxx = Math.round(Math.max(x0, x1, x2, x3)),
			maxy = Math.round(Math.max(y0, y1, y2, y3));

		this._mbr = { _x: minx, _y: miny, _w: maxx - minx, _h: maxy - miny };

		//trigger rotation event
		var difference = this._rotation - v,
			drad = difference * DEG_TO_RAD;

		this.trigger("Rotate", {
			cos: Math.cos(drad),
			sin: Math.sin(drad),
			deg: difference,
			rad: drad,
			o: { x: o.x, y: o.y },
			matrix: { M11: ct, M12: st, M21: -st, M22: ct }
		});
	},

	/**@
	* #.area
	* @comp 2D
	* @sign public Number .area(void)
	* Calculates the area of the entity
	*/
	area: function () {
		return this._w * this._h;
	},

	/**@
	* #.intersect
	* @comp 2D
	* @sign public Boolean .intersect(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .intersect(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if this entity intersects a rectangle.
	*/
	intersect: function (x, y, w, h) {
		var rect, obj = this._mbr || this;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return obj._x < rect.x + rect.w && obj._x + obj._w > rect.x &&
			   obj._y < rect.y + rect.h && obj._h + obj._y > rect.y;
	},

	/**@
	* #.within
	* @comp 2D
	* @sign public Boolean .within(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .within(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if this current entity is within another rectangle.
	*/
	within: function (x, y, w, h) {
		var rect;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return rect.x <= this.x && rect.x + rect.w >= this.x + this.w &&
				rect.y <= this.y && rect.y + rect.h >= this.y + this.h;
	},

	/**@
	* #.contains
	* @comp 2D
	* @sign public Boolean .contains(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .contains(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if the rectangle is within the current entity.
	*/
	contains: function (x, y, w, h) {
		var rect;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return rect.x >= this.x && rect.x + rect.w <= this.x + this.w &&
				rect.y >= this.y && rect.y + rect.h <= this.y + this.h;
	},

	/**@
	* #.pos
	* @comp 2D
	* @sign public Object .pos(void)
	* Returns the x, y, w, h properties as a rect object
	* (a rect object is just an object with the keys _x, _y, _w, _h).
	*
	* The keys have an underscore prefix. This is due to the x, y, w, h
	* properties being merely setters and getters that wrap the properties with an underscore (_x, _y, _w, _h).
	*/
	pos: function () {
		return {
			_x: (this._x),
			_y: (this._y),
			_w: (this._w),
			_h: (this._h)
		};
	},

	/**@
	* #.mbr
	* @comp 2D
	* @sign public Object .mbr()
	* Returns the minimum bounding rectangle. If there is no rotation
	* on the entity it will return the rect.
	*/
	mbr: function () {
		if (!this._mbr) return this.pos();
		return {
			_x: (this._mbr._x),
			_y: (this._mbr._y),
			_w: (this._mbr._w),
			_h: (this._mbr._h)
		};
	},

	/**@
	* #.isAt
	* @comp 2D
	* @sign public Boolean .isAt(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	* Determines whether a point is contained by the entity. Unlike other methods,
	* an object can't be passed. The arguments require the x and y value
	*/
	isAt: function (x, y) {
		if (this.mapArea) {
      		return this.mapArea.containsPoint(x, y);
		} else if (this.map) {
			return this.map.containsPoint(x, y);
		}
		return this.x <= x && this.x + this.w >= x &&
			   this.y <= y && this.y + this.h >= y;
	},

	/**@
	* #.move
	* @comp 2D
	* @sign public this .move(String dir, Number by)
	* @param dir - Direction to move (n,s,e,w,ne,nw,se,sw)
	* @param by - Amount to move in the specified direction
	* Quick method to move the entity in a direction (n, s, e, w, ne, nw, se, sw) by an amount of pixels.
	*/
	move: function (dir, by) {
		if (dir.charAt(0) === 'n') this.y -= by;
		if (dir.charAt(0) === 's') this.y += by;
		if (dir === 'e' || dir.charAt(1) === 'e') this.x += by;
		if (dir === 'w' || dir.charAt(1) === 'w') this.x -= by;

		return this;
	},

	/**@
	* #.shift
	* @comp 2D
	* @sign public this .shift(Number x, Number y, Number w, Number h)
	* @param x - Amount to move X
	* @param y - Amount to move Y
	* @param w - Amount to widen
	* @param h - Amount to increase height
	* Shift or move the entity by an amount. Use negative values
	* for an opposite direction.
	*/
	shift: function (x, y, w, h) {
		if (x) this.x += x;
		if (y) this.y += y;
		if (w) this.w += w;
		if (h) this.h += h;

		return this;
	},

	/**@
	* #._cascade
	* @comp 2D
    * @sign public void ._cascade(e)
	* @param e - Amount to move X
	* Shift move or rotate the entity by an amount. Use negative values
	* for an opposite direction.
	*/
	_cascade: function (e) {
		if (!e) return; //no change in position
		var i = 0, children = this._children, l = children.length, obj;
		//rotation
		if (e.cos) {
			for (; i < l; ++i) {
				obj = children[i];
				if ('rotate' in obj) obj.rotate(e);
			}
		} else {
			//use MBR or current
			var rect = this._mbr || this,
				dx = rect._x - e._x,
				dy = rect._y - e._y,
				dw = rect._w - e._w,
				dh = rect._h - e._h;

			for (; i < l; ++i) {
				obj = children[i];
				obj.shift(dx, dy, dw, dh);
			}
		}
	},

	/**@
	* #.attach
	* @comp 2D
	* @sign public this .attach(Entity obj[, .., Entity objN])
	* @param obj - Entity(s) to attach
	* Attaches an entities position and rotation to current entity. When the current entity moves,
	* the attached entity will move by the same amount. Attached entities stored in _children array,
	* the parent object is stored in _parent on the child entities.
	*
	* As many objects as wanted can be attached and a hierarchy of objects is possible by attaching.
	*/
	attach: function () {
		var i = 0, arg = arguments, l = arguments.length, obj;
		for (; i < l; ++i) {
			obj = arg[i];
			if (obj._parent) { obj._parent.detach(obj); }
			obj._parent = this;
			this._children.push(obj);
		}

		return this;
	},

	/**@
	* #.detach
	* @comp 2D
	* @sign public this .detach([Entity obj])
	* @param obj - The entity to detach. Left blank will remove all attached entities
	* Stop an entity from following the current entity. Passing no arguments will stop
	* every entity attached.
	*/
	detach: function (obj) {
		//if nothing passed, remove all attached objects
		if (!obj) {
			for (var i = 0; i < this._children.length; i++) {
				this._children[i]._parent = null;
			}
			this._children = [];
			return this;
		}

		//if obj passed, find the handler and unbind
		for (var i = 0; i < this._children.length; i++) {
			if (this._children[i] == obj) {
				this._children.splice(i, 1);
			}
		}
		obj._parent = null;

		return this;
	},

	/**@
	* #.origin
	* @comp 2D
	* @sign public this .origin(Number x, Number y)
	* @param x - Pixel value of origin offset on the X axis
	* @param y - Pixel value of origin offset on the Y axis
	* @sign public this .origin(String offset)
	* @param offset - Combination of center, top, bottom, middle, left and right
	* Set the origin point of an entity for it to rotate around.
	*
	* @example
	* ~~~
	* this.origin("top left")
	* this.origin("center")
	* this.origin("bottom right")
	* this.origin("middle right")
	* ~~~
	*
	* @see .rotation
	*/
	origin: function (x, y) {
		//text based origin
		if (typeof x === "string") {
			if (x === "centre" || x === "center" || x.indexOf(' ') === -1) {
				x = this._w / 2;
				y = this._h / 2;
			} else {
				var cmd = x.split(' ');
				if (cmd[0] === "top") y = 0;
				else if (cmd[0] === "bottom") y = this._h;
				else if (cmd[0] === "middle" || cmd[1] === "center" || cmd[1] === "centre") y = this._h / 2;

				if (cmd[1] === "center" || cmd[1] === "centre" || cmd[1] === "middle") x = this._w / 2;
				else if (cmd[1] === "left") x = 0;
				else if (cmd[1] === "right") x = this._w;
			}
		}

		this._origin.x = x;
		this._origin.y = y;

		return this;
	},

	/**@
	* #.flip
	* @comp 2D
	* @trigger Change - when the entity has flipped
	* @sign public this .flip(String dir)
	* @param dir - Flip direction
	*
	* Flip entity on passed direction
	*
	* @example
	* ~~~
	* this.flip("X")
	* ~~~
	*/
	flip: function (dir) {
		dir = dir || "X";
                if(!this["_flip" + dir]) {
                    this["_flip" + dir] = true;
                    this.trigger("Change");
                }
	},

        /**@
	* #.unflip
	* @comp 2D
	* @trigger Change - when the entity has unflipped
	* @sign public this .unflip(String dir)
	* @param dir - Unflip direction
	*
	* Unflip entity on passed direction (if it's flipped)
	*
	* @example
	* ~~~
	* this.unflip("X")
	* ~~~
	*/
	unflip: function (dir) {
		dir = dir || "X";
                if(this["_flip" + dir]) {
                    this["_flip" + dir] = false;
                    this.trigger("Change");
                }
	},

	/**
	* Method for rotation rather than through a setter
	*/
	rotate: function (e) {
		//assume event data origin
		this._origin.x = e.o.x - this._x;
		this._origin.y = e.o.y - this._y;

		//modify through the setter method
		this._attr('_rotation', e.theta);
	},

	/**@
	* #._attr
	* @comp 2D
	* Setter method for all 2D properties including
	* x, y, w, h, alpha, rotation and visible.
	*/
	_attr: function (name, value) {
		//keep a reference of the old positions
		var pos = this.pos(),
			old = this.mbr() || pos;

		//if rotation, use the rotate method
		if (name === '_rotation') {
			this._rotate(value);
			this.trigger("Rotate");
			//set the global Z and trigger reorder just in case
		} else if (name === '_z') {
			this._globalZ = parseInt(value + Crafty.zeroFill(this[0], 5), 10); //magic number 10e5 is the max num of entities
			this.trigger("reorder");
			//if the rect bounds change, update the MBR and trigger move
		} else if (name == '_x' || name === '_y' || name === '_w' || name === '_h') {
			var mbr = this._mbr;
			if (mbr) {
				mbr[name] -= this[name] - value;
			}
			this[name] = value;
			this.trigger("Move", old);
		}

		//everything will assume the value
		this[name] = value;

		//trigger a change
		this.trigger("Change", old);
	}
});

Crafty.c("Physics", {
	_gravity: 0.4,
	_friction: 0.2,
	_bounce: 0.5,

	gravity: function (gravity) {
		this._gravity = gravity;
	}
});

/**@
* #Gravity
* @category 2D
* Adds gravitational pull to the entity.
*/
Crafty.c("Gravity", {
	_gravityConst: 0.2,
	_gy: 0,
	_falling: true,
	_anti: null,

	init: function () {
		this.requires("2D");
	},

	/**@
	* #.gravity
	* @comp Gravity
	* @sign public this .gravity([comp])
	* @param comp - The name of a component that will stop this entity from falling
	*
	* Enable gravity for this entity no matter whether comp parameter is not specified,
	* If comp parameter is specified all entities with that component will stop this entity from falling.
	* For a player entity in a platform game this would be a component that is added to all entities
	* that the player should be able to walk on.
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color, Gravity")
	*	 .color("red")
	*	 .attr({ w: 100, h: 100 })
	*	 .gravity("platform")
	* ~~~
	*/
	gravity: function (comp) {
		if (comp) this._anti = comp;

		this.bind("EnterFrame", this._enterFrame);

		return this;
	},

	/**@
	* #.gravityConst
	* @comp Gravity
	* @sign public this .gravityConst(g)
	* @param g - gravitational constant
	*
	* Set the gravitational constant to g. The default is .2. The greater g, the faster the object falls.
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color, Gravity")
	*   .color("red")
	*   .attr({ w: 100, h: 100 })
	*   .gravity("platform")
	*   .gravityConst(2)
	* ~~~
	*/
	gravityConst: function(g) {
		this._gravityConst=g;
		return this;
	},

	_enterFrame: function () {
		if (this._falling) {
			//if falling, move the players Y
			this._gy += this._gravityConst;
			this.y += this._gy;
		} else {
			this._gy = 0; //reset change in y
		}

		var obj, hit = false, pos = this.pos(),
			q, i = 0, l;

		//Increase by 1 to make sure map.search() finds the floor
		pos._y++;

		//map.search wants _x and intersect wants x...
		pos.x = pos._x;
		pos.y = pos._y;
		pos.w = pos._w;
		pos.h = pos._h;

		q = Crafty.map.search(pos);
		l = q.length;

		for (; i < l; ++i) {
			obj = q[i];
			//check for an intersection directly below the player
			if (obj !== this && obj.has(this._anti) && obj.intersect(pos)) {
				hit = obj;
				break;
			}
		}

		if (hit) { //stop falling if found
			if (this._falling) this.stopFalling(hit);
		} else {
			this._falling = true; //keep falling otherwise
		}
	},

	stopFalling: function (e) {
		if (e) this.y = e._y - this._h; //move object

		//this._gy = -1 * this._bounce;
		this._falling = false;
		if (this._up) this._up = false;
		this.trigger("hit");
	},

	/**@
	* #.antigravity
	* @comp Gravity
	* @sign public this .antigravity()
	* Disable gravity for this component. It can be reenabled by calling .gravity()
	*/
	antigravity: function () {
		this.unbind("EnterFrame", this._enterFrame);
	}
});

/**@
* #Crafty.polygon
* @category 2D
*
* Polygon object used for hitboxes and click maps. Must pass an Array for each point as an
* argument where index 0 is the x position and index 1 is the y position.
*
* For example one point of a polygon will look like this: `[0,5]` where the `x` is `0` and the `y` is `5`.
*
* Can pass an array of the points or simply put each point as an argument.
*
* When creating a polygon for an entity, each point should be offset or relative from the entities `x` and `y`
* (don't include the absolute values as it will automatically calculate this).
*
*
* @example
* ~~~
* new Crafty.polygon([50,0],[100,100],[0,100]);
* new Crafty.polygon([[50,0],[100,100],[0,100]]);
* ~~~
*/
Crafty.polygon = function (poly) {
	if (arguments.length > 1) {
		poly = Array.prototype.slice.call(arguments, 0);
	}
	this.points = poly;
};

Crafty.polygon.prototype = {
	/**@
	* #.containsPoint
	* @comp Crafty.polygon
	* @sign public Boolean .containsPoint(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	*
	* Method is used to determine if a given point is contained by the polygon.
	*
	* @example
	* ~~~
	* var poly = new Crafty.polygon([50,0],[100,100],[0,100]);
	* poly.containsPoint(50, 50); //TRUE
	* poly.containsPoint(0, 0); //FALSE
	* ~~~
	*/
	containsPoint: function (x, y) {
		var p = this.points, i, j, c = false;

		for (i = 0, j = p.length - 1; i < p.length; j = i++) {
			if (((p[i][1] > y) != (p[j][1] > y)) && (x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) {
				c = !c;
			}
		}

		return c;
	},

	/**@
	* #.shift
	* @comp Crafty.polygon
	* @sign public void .shift(Number x, Number y)
	* @param x - Amount to shift the `x` axis
	* @param y - Amount to shift the `y` axis
	*
	* Shifts every single point in the polygon by the specified amount.
	*
	* @example
	* ~~~
	* var poly = new Crafty.polygon([50,0],[100,100],[0,100]);
	* poly.shift(5,5);
	* //[[55,5], [105,5], [5,105]];
	* ~~~
	*/
	shift: function (x, y) {
		var i = 0, l = this.points.length, current;
		for (; i < l; i++) {
			current = this.points[i];
			current[0] += x;
			current[1] += y;
		}
	},

	rotate: function (e) {
		var i = 0, l = this.points.length,
			current, x, y;

		for (; i < l; i++) {
			current = this.points[i];

			x = e.o.x + (current[0] - e.o.x) * e.cos + (current[1] - e.o.y) * e.sin;
			y = e.o.y - (current[0] - e.o.x) * e.sin + (current[1] - e.o.y) * e.cos;

			current[0] = x;
			current[1] = y;
		}
	}
};

/**@
* #Crafty.circle
* @category 2D
* Circle object used for hitboxes and click maps. Must pass a `x`, a `y` and a `radius` value.
*
*@example
* ~~~
* var centerX = 5,
*     centerY = 10,
*     radius = 25;
*
* new Crafty.circle(centerX, centerY, radius);
* ~~~
*
* When creating a circle for an entity, each point should be offset or relative from the entities `x` and `y`
* (don't include the absolute values as it will automatically calculate this).
*/
Crafty.circle = function (x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;

    // Creates an octagon that approximate the circle for backward compatibility.
    this.points = [];
    var theta;

    for (var i = 0; i < 8; i++) {
        theta = i * Math.PI / 4;
        this.points[i] = [this.x + (Math.sin(theta) * radius), this.y + (Math.cos(theta) * radius)];
    }
};

Crafty.circle.prototype = {
    /**@
	* #.containsPoint
	* @comp Crafty.circle
	* @sign public Boolean .containsPoint(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	*
	* Method is used to determine if a given point is contained by the circle.
	*
	* @example
	* ~~~
	* var circle = new Crafty.circle(0, 0, 10);
	* circle.containsPoint(0, 0); //TRUE
	* circle.containsPoint(50, 50); //FALSE
	* ~~~
	*/
	containsPoint: function (x, y) {
		var radius = this.radius,
		    sqrt = Math.sqrt,
		    deltaX = this.x - x,
		    deltaY = this.y - y;

		return (deltaX * deltaX + deltaY * deltaY) < (radius * radius);
	},

	/**@
	* #.shift
	* @comp Crafty.circle
	* @sign public void .shift(Number x, Number y)
	* @param x - Amount to shift the `x` axis
	* @param y - Amount to shift the `y` axis
	*
	* Shifts the circle by the specified amount.
	*
	* @example
	* ~~~
	* var poly = new Crafty.circle(0, 0, 10);
	* circle.shift(5,5);
	* //{x: 5, y: 5, radius: 10};
	* ~~~
	*/
	shift: function (x, y) {
		this.x += x;
		this.y += y;

		var i = 0, l = this.points.length, current;
		for (; i < l; i++) {
			current = this.points[i];
			current[0] += x;
			current[1] += y;
		}
	},

	rotate: function () {
		// We are a circle, we don't have to rotate :)
	}
};


Crafty.matrix = function (m) {
	this.mtx = m;
	this.width = m[0].length;
	this.height = m.length;
};

Crafty.matrix.prototype = {
	x: function (other) {
		if (this.width != other.height) {
			return;
		}

		var result = [];
		for (var i = 0; i < this.height; i++) {
			result[i] = [];
			for (var j = 0; j < other.width; j++) {
				var sum = 0;
				for (var k = 0; k < this.width; k++) {
					sum += this.mtx[i][k] * other.mtx[k][j];
				}
				result[i][j] = sum;
			}
		}
		return new Crafty.matrix(result);
	},


	e: function (row, col) {
		//test if out of bounds
		if (row < 1 || row > this.mtx.length || col < 1 || col > this.mtx[0].length) return null;
		return this.mtx[row - 1][col - 1];
	}
}

/**@
* #Collision
* @category 2D
* Component to detect collision between any two convex polygons.
*/
Crafty.c("Collision", {
    /**@
     * #.init
     * @comp Collision
     * Create a rectangle polygon based on the x, y, w, h dimensions.
     *
     * You must ensure that the x, y, w, h properties are set before the init function is called. If you have a Car component that sets these properties you should create your entity like this
     * ~~~
     * Crafty.e('2D, DOM, Car, Collision');
     * ~~~
     * And not like
     * ~~~
     * Crafty.e('2D, DOM, Collision, Car');
     * ~~~
     */
    init: function () {
        this.requires("2D");
        var area = this._mbr || this;

        poly = new Crafty.polygon([0, 0], [area._w, 0], [area._w, area._h], [0, area._h]);
        this.map = poly;
        this.attach(this.map);
        this.map.shift(area._x, area._y);
    },

    /**@
	* #.collision
	* @comp Collision
	* 
	* @sign public this .collision([Crafty.polygon polygon])
	* @param polygon - Crafty.polygon object that will act as the hit area
	* 
	* @sign public this .collision(Array point1, .., Array pointN)
	* @param point# - Array with an `x` and `y` position to generate a polygon
	* 
	* Constructor takes a polygon or array of points to use as the hit area.
	*
	* The hit area (polygon) must be a convex shape and not concave
	* for the collision detection to work.
    *
    * If no hit area is specified x, y, w, h properties of the entity will be used.
	* 
	* @example
	* ~~~
	* Crafty.e("2D, Collision").collision(
	*     new Crafty.polygon([50,0], [100,100], [0,100])
	* );
    * 
    * Crafty.e("2D, Collision").collision([50,0], [100,100], [0,100]);
	* ~~~
	* 
	* @see Crafty.polygon
	*/
    collision: function (poly) {
        var area = this._mbr || this;

        if (!poly) {
            poly = new Crafty.polygon([0, 0], [area._w, 0], [area._w, area._h], [0, area._h]);
        }

        if (arguments.length > 1) {
            //convert args to array to create polygon
            var args = Array.prototype.slice.call(arguments, 0);
            poly = new Crafty.polygon(args);
        }

        this.map = poly;
        this.attach(this.map);
        this.map.shift(area._x, area._y);

        return this;
    },

	/**@
	* #.hit
	* @comp Collision
	* @sign public Boolean/Array hit(String component)
	* @param component - Check collision with entities that has this component
	* @return `false` if no collision. If a collision is detected, returns an Array of objects that are colliding.
	* 
	* Takes an argument for a component to test collision for. If a collision is found, an array of
	* every object in collision along with the amount of overlap is passed.
	*
	* If no collision, will return false. The return collision data will be an Array of Objects with the
	* type of collision used, the object collided and if the type used was SAT (a polygon was used as the hitbox) then an amount of overlap.\
	* ~~~
	* [{
	*    obj: [entity],
	*    type "MBR" or "SAT",
	*    overlap: [number]
	* }]
	* ~~~
	* `MBR` is your standard axis aligned rectangle intersection (`.intersect` in the 2D component).
	* `SAT` is collision between any convex polygon.
	* 
	* @see .onHit, 2D
	*/
	hit: function (comp) {
		var area = this._mbr || this,
			results = Crafty.map.search(area, false),
			i = 0, l = results.length,
			dupes = {},
			id, obj, oarea, key,
			hasMap = ('map' in this && 'containsPoint' in this.map),
			finalresult = [];

		if (!l) {
			return false;
		}

		for (; i < l; ++i) {
			obj = results[i];
			oarea = obj._mbr || obj; //use the mbr

			if (!obj) continue;
			id = obj[0];

			//check if not added to hash and that actually intersects
			if (!dupes[id] && this[0] !== id && obj.__c[comp] &&
							 oarea._x < area._x + area._w && oarea._x + oarea._w > area._x &&
							 oarea._y < area._y + area._h && oarea._h + oarea._y > area._y)
				dupes[id] = obj;
		}

		for (key in dupes) {
			obj = dupes[key];

			if (hasMap && 'map' in obj) {
				var SAT = this._SAT(this.map, obj.map);
				SAT.obj = obj;
				SAT.type = "SAT";
				if (SAT) finalresult.push(SAT);
			} else {
				finalresult.push({ obj: obj, type: "MBR" });
			}
		}

		if (!finalresult.length) {
			return false;
		}

		return finalresult;
	},

	/**@
	* #.onHit
	* @comp Collision
	* @sign public this .onHit(String component, Function hit[, Function noHit])
	* @param component - Component to check collisions for
	* @param hit - Callback method to execute when collided with component
	* @param noHit - Callback method executed once as soon as collision stops
	* 
	* Creates an enterframe event calling .hit() each time and if collision detected will invoke the callback.
	* 
	* @see .hit
	*/
	onHit: function (comp, callback, callbackOff) {
		var justHit = false;
		this.bind("EnterFrame", function () {
			var hitdata = this.hit(comp);
			if (hitdata) {
				justHit = true;
				callback.call(this, hitdata);
			} else if (justHit) {
				if (typeof callbackOff == 'function') {
					callbackOff.call(this);
				}
				justHit = false;
			}
		});
		return this;
	},

	_SAT: function (poly1, poly2) {
		var points1 = poly1.points,
			points2 = poly2.points,
			i = 0, l = points1.length,
			j, k = points2.length,
			normal = { x: 0, y: 0 },
			length,
			min1, min2,
			max1, max2,
			interval,
			MTV = null,
			MTV2 = null,
			MN = null,
			dot,
			nextPoint,
			currentPoint;

		//loop through the edges of Polygon 1
		for (; i < l; i++) {
			nextPoint = points1[(i == l - 1 ? 0 : i + 1)];
			currentPoint = points1[i];

			//generate the normal for the current edge
			normal.x = -(nextPoint[1] - currentPoint[1]);
			normal.y = (nextPoint[0] - currentPoint[0]);

			//normalize the vector
			length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
			normal.x /= length;
			normal.y /= length;

			//default min max
			min1 = min2 = -1;
			max1 = max2 = -1;

			//project all vertices from poly1 onto axis
			for (j = 0; j < l; ++j) {
				dot = points1[j][0] * normal.x + points1[j][1] * normal.y;
				if (dot > max1 || max1 === -1) max1 = dot;
				if (dot < min1 || min1 === -1) min1 = dot;
			}

			//project all vertices from poly2 onto axis
			for (j = 0; j < k; ++j) {
				dot = points2[j][0] * normal.x + points2[j][1] * normal.y;
				if (dot > max2 || max2 === -1) max2 = dot;
				if (dot < min2 || min2 === -1) min2 = dot;
			}

			//calculate the minimum translation vector should be negative
			if (min1 < min2) {
				interval = min2 - max1;

				normal.x = -normal.x;
				normal.y = -normal.y;
			} else {
				interval = min1 - max2;
			}

			//exit early if positive
			if (interval >= 0) {
				return false;
			}

			if (MTV === null || interval > MTV) {
				MTV = interval;
				MN = { x: normal.x, y: normal.y };
			}
		}

		//loop through the edges of Polygon 2
		for (i = 0; i < k; i++) {
			nextPoint = points2[(i == k - 1 ? 0 : i + 1)];
			currentPoint = points2[i];

			//generate the normal for the current edge
			normal.x = -(nextPoint[1] - currentPoint[1]);
			normal.y = (nextPoint[0] - currentPoint[0]);

			//normalize the vector
			length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
			normal.x /= length;
			normal.y /= length;

			//default min max
			min1 = min2 = -1;
			max1 = max2 = -1;

			//project all vertices from poly1 onto axis
			for (j = 0; j < l; ++j) {
				dot = points1[j][0] * normal.x + points1[j][1] * normal.y;
				if (dot > max1 || max1 === -1) max1 = dot;
				if (dot < min1 || min1 === -1) min1 = dot;
			}

			//project all vertices from poly2 onto axis
			for (j = 0; j < k; ++j) {
				dot = points2[j][0] * normal.x + points2[j][1] * normal.y;
				if (dot > max2 || max2 === -1) max2 = dot;
				if (dot < min2 || min2 === -1) min2 = dot;
			}

			//calculate the minimum translation vector should be negative
			if (min1 < min2) {
				interval = min2 - max1;

				normal.x = -normal.x;
				normal.y = -normal.y;
			} else {
				interval = min1 - max2;


			}

			//exit early if positive
			if (interval >= 0) {
				return false;
			}

			if (MTV === null || interval > MTV) MTV = interval;
			if (interval > MTV2 || MTV2 === null) {
				MTV2 = interval;
				MN = { x: normal.x, y: normal.y };
			}
		}

		return { overlap: MTV2, normal: MN };
	}
});


/**@
* #.WiredHitBox
* @comp Collision
* 
* Components to display Crafty.polygon Array for debugging collision detection
* 
* @example
* This will display a wired square over your original Canvas screen
* ~~~
* Crafty.e("2D,DOM,Player,Collision,WiredHitBox").collision(new Crafty.polygon([0,0],[0,300],[300,300],[300,0]))
* ~~~
*/
Crafty.c("WiredHitBox", {

	init: function () {

		if (Crafty.support.canvas) {
			var c = document.getElementById('HitBox');
			if (!c) {
				c = document.createElement("canvas");
				c.id = 'HitBox';
				c.width = Crafty.viewport.width;
				c.height = Crafty.viewport.height;
				c.style.position = 'absolute';
				c.style.left = "0px";
				c.style.top = "0px";
				c.style.zIndex = '1000';
				Crafty.stage.elem.appendChild(c);
			}
			var ctx = c.getContext('2d');
			var drawed = 0, total = Crafty("WiredHitBox").length;
			this.requires("Collision").bind("EnterFrame", function () {
				if (drawed == total) {
					ctx.clearRect(0, 0, Crafty.viewport.width, Crafty.viewport.height);
					drawed = 0;
				}
				ctx.beginPath();
				for (var p in this.map.points) {
					ctx.lineTo(Crafty.viewport.x + this.map.points[p][0], Crafty.viewport.y + this.map.points[p][1]);
				}
				ctx.closePath();
				ctx.stroke();
				drawed++;

			});
		}

		return this;
	}
});
/**@
* #.SolidHitBox
* @comp Collision
* 
* Components to display Crafty.polygon Array for debugging collision detection
* 
* @example
* This will display a solid triangle over your original Canvas screen
* ~~~
* Crafty.e("2D,DOM,Player,Collision,SolidHitBox").collision(new Crafty.polygon([0,0],[0,300],[300,300]))
* ~~~
*/
Crafty.c("SolidHitBox", {
	init: function () {
		if (Crafty.support.canvas) {
			var c = document.getElementById('HitBox');
			if (!c) {
				c = document.createElement("canvas");
				c.id = 'HitBox';
				c.width = Crafty.viewport.width;
				c.height = Crafty.viewport.height;
				c.style.position = 'absolute';
				c.style.left = "0px";
				c.style.top = "0px";
				c.style.zIndex = '1000';
				Crafty.stage.elem.appendChild(c);
			}
			var ctx = c.getContext('2d');
			var drawed = 0, total = Crafty("SolidHitBox").length;
			this.requires("Collision").bind("EnterFrame", function () {
				if (drawed == total) {
					ctx.clearRect(0, 0, Crafty.viewport.width, Crafty.viewport.height);
					drawed = 0;
				}
				ctx.beginPath();
				for (var p in this.map.points) {
					ctx.lineTo(Crafty.viewport.x + this.map.points[p][0], Crafty.viewport.y + this.map.points[p][1]);
				}
				ctx.closePath();
				ctx.fill();
				drawed++;
			});
		}

		return this;
	}
});
/**@
* #DOM
* @category Graphics
* Draws entities as DOM nodes, specifically `<DIV>`s.
*/
Crafty.c("DOM", {
    /**@
	* #._element
	* @comp DOM
	* The DOM element used to represent the entity.
	*/
	_element: null,
	//holds current styles, so we can check if there are changes to be written to the DOM
	_cssStyles: null,

	init: function () {
		this._cssStyles = { visibility: '', left: '', top: '', width: '', height: '', zIndex: '', opacity: '', transformOrigin: '', transform: '' };
		this._element = document.createElement("div");
		Crafty.stage.inner.appendChild(this._element);
		this._element.style.position = "absolute";
		this._element.id = "ent" + this[0];

		this.bind("Change", function () {
			if (!this._changed) {
				this._changed = true;
				Crafty.DrawManager.add(this);
			}
		});

		function updateClass() {
			var i = 0, c = this.__c, str = "";
			for (i in c) {
				str += ' ' + i;
			}
			str = str.substr(1);
			this._element.className = str;
		}

		this.bind("NewComponent", updateClass).bind("RemoveComponent", updateClass);

		if (Crafty.support.prefix === "ms" && Crafty.support.version < 9) {
			this._filters = {};

			this.bind("Rotate", function (e) {
				var m = e.matrix,
					elem = this._element.style,
					M11 = m.M11.toFixed(8),
					M12 = m.M12.toFixed(8),
					M21 = m.M21.toFixed(8),
					M22 = m.M22.toFixed(8);

				this._filters.rotation = "progid:DXImageTransform.Microsoft.Matrix(M11=" + M11 + ", M12=" + M12 + ", M21=" + M21 + ", M22=" + M22 + ",sizingMethod='auto expand')";
			});
		}

		this.bind("Remove", this.undraw);
		this.bind("RemoveComponent", function (compName) {
			if (compName === "DOM")
				this.undraw();
		});
	},

	/**@
	* #.getDomId
	* @comp DOM
	* @sign public this .getId()
	* 
	* Get the Id of the DOM element used to represent the entity.
	*/
	getDomId: function() {
		return this._element.id;
	},

	/**@
	* #.DOM
	* @comp DOM
	* @trigger Draw - when the entity is ready to be drawn to the stage - { style:String, type:"DOM", co}
	* @sign public this .DOM(HTMLElement elem)
	* @param elem - HTML element that will replace the dynamically created one
	* 
	* Pass a DOM element to use rather than one created. Will set `._element` to this value. Removes the old element.
	*/
	DOM: function (elem) {
		if (elem && elem.nodeType) {
			this.undraw();
			this._element = elem;
			this._element.style.position = 'absolute';
		}
		return this;
	},

	/**@
	* #.draw
	* @comp DOM
	* @sign public this .draw(void)
	* 
	* Updates the CSS properties of the node to draw on the stage.
	*/
	draw: function () {
		var style = this._element.style,
			coord = this.__coord || [0, 0, 0, 0],
			co = { x: coord[0], y: coord[1] },
			prefix = Crafty.support.prefix,
			trans = [];

		if (this._cssStyles.visibility != this._visible) {
			this._cssStyles.visibility = this._visible;
			if (!this._visible) {
				style.visibility = "hidden";
			} else {
				style.visibility = "visible";
			}
		}

		//utilize CSS3 if supported
		if (Crafty.support.css3dtransform) {
			trans.push("translate3d(" + (~~this._x) + "px," + (~~this._y) + "px,0)");
		} else {
			if (this._cssStyles.left != this._x) {
				this._cssStyles.left = this._x;
				style.left = ~~(this._x) + "px";
			}
			if (this._cssStyles.top != this._y) {
				this._cssStyles.top = this._y;
				style.top = ~~(this._y) + "px";
			}
		}

		if (this._cssStyles.width != this._w) {
			this._cssStyles.width = this._w;
			style.width = ~~(this._w) + "px";
		}
		if (this._cssStyles.height != this._h) {
			this._cssStyles.height = this._h;
			style.height = ~~(this._h) + "px";
		}
		if (this._cssStyles.zIndex != this._z) {
			this._cssStyles.zIndex = this._z;
			style.zIndex = this._z;
		}

		if (this._cssStyles.opacity != this._alpha) {
			this._cssStyles.opacity = this._alpha;
			style.opacity = this._alpha;
			style[prefix + "Opacity"] = this._alpha;
		}

		//if not version 9 of IE
		if (prefix === "ms" && Crafty.support.version < 9) {
			//for IE version 8, use ImageTransform filter
			if (Crafty.support.version === 8) {
				this._filters.alpha = "progid:DXImageTransform.Microsoft.Alpha(Opacity=" + (this._alpha * 100) + ")"; // first!
				//all other versions use filter
			} else {
				this._filters.alpha = "alpha(opacity=" + (this._alpha * 100) + ")";
			}
		}

		if (this._mbr) {
			var origin = this._origin.x + "px " + this._origin.y + "px";
			style.transformOrigin = origin;
			style[prefix + "TransformOrigin"] = origin;
			if (Crafty.support.css3dtransform) trans.push("rotateZ(" + this._rotation + "deg)");
			else trans.push("rotate(" + this._rotation + "deg)");
		}

		if (this._flipX) {
			trans.push("scaleX(-1)");
			if (prefix === "ms" && Crafty.support.version < 9) {
				this._filters.flipX = "fliph";
			}
		}

		if (this._flipY) {
			trans.push("scaleY(-1)");
			if (prefix === "ms" && Crafty.support.version < 9) {
				this._filters.flipY = "flipv";
			}
		}

		//apply the filters if IE
		if (prefix === "ms" && Crafty.support.version < 9) {
			this.applyFilters();
		}

		if (this._cssStyles.transform != trans.join(" ")) {
			this._cssStyles.transform = trans.join(" ");
			style.transform = this._cssStyles.transform;
			style[prefix + "Transform"] = this._cssStyles.transform;
		}

		this.trigger("Draw", { style: style, type: "DOM", co: co });

		return this;
	},

	applyFilters: function () {
		this._element.style.filter = "";
		var str = "";

		for (var filter in this._filters) {
			if (!this._filters.hasOwnProperty(filter)) continue;
			str += this._filters[filter] + " ";
		}

		this._element.style.filter = str;
	},

	/**@
	* #.undraw
	* @comp DOM
	* @sign public this .undraw(void)
	* 
	* Removes the element from the stage.
	*/
	undraw: function () {
		if (this._element) {
			Crafty.stage.inner.removeChild(this._element);
		}
		return this;
	},

	/**@
	* #.css
	* @comp DOM
	* @sign public * css(String property, String value)
	* @param property - CSS property to modify
	* @param value - Value to give the CSS property
	* @sign public * css(Object map)
	* @param map - Object where the key is the CSS property and the value is CSS value
	* 
	* Apply CSS styles to the element.
	*
	* Can pass an object where the key is the style property and the value is style value.
	*
	* For setting one style, simply pass the style as the first argument and the value as the second.
	*
	* The notation can be CSS or JS (e.g. `text-align` or `textAlign`).
	*
	* To return a value, pass the property.
	* 
	* @example
	* ~~~
	* this.css({'text-align', 'center', font: 'Arial'});
	* this.css("textAlign", "center");
	* this.css("text-align"); //returns center
	* ~~~
	*/
	css: function (obj, value) {
		var key,
			elem = this._element,
			val,
			style = elem.style;

		//if an object passed
		if (typeof obj === "object") {
			for (key in obj) {
				if (!obj.hasOwnProperty(key)) continue;
				val = obj[key];
				if (typeof val === "number") val += 'px';

				style[Crafty.DOM.camelize(key)] = val;
			}
		} else {
			//if a value is passed, set the property
			if (value) {
				if (typeof value === "number") value += 'px';
				style[Crafty.DOM.camelize(obj)] = value;
			} else { //otherwise return the computed property
				return Crafty.DOM.getStyle(elem, obj);
			}
		}

		this.trigger("Change");

		return this;
	}
});

/**
* Fix IE6 background flickering
*/
try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e) { }

Crafty.extend({
    /**@
	* #Crafty.DOM
	* @category Graphics
	* 
	* Collection of utilities for using the DOM.
	*/
	DOM: {
	/**@
		* #Crafty.DOM.window
		* @comp Crafty.DOM
		* 
		* Object with `width` and `height` values representing the width
		* and height of the `window`.
		*/
		window: {
			init: function () {
				this.width = window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth);
				this.height = window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight);
			},

			width: 0,
			height: 0
		},

		/**@
		* #Crafty.DOM.inner
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.inner(HTMLElement obj)
		* @param obj - HTML element to calculate the position
		* @returns Object with `x` key being the `x` position, `y` being the `y` position
		* 
		* Find a DOM elements position including
		* padding and border.
		*/
		inner: function (obj) {
			var rect = obj.getBoundingClientRect(),
				x = rect.left + (window.pageXOffset ? window.pageXOffset : document.body.scrollLeft),
				y = rect.top + (window.pageYOffset ? window.pageYOffset : document.body.scrollTop),

			//border left
				borderX = parseInt(this.getStyle(obj, 'border-left-width') || 0, 10) || parseInt(this.getStyle(obj, 'borderLeftWidth') || 0, 10) || 0,
				borderY = parseInt(this.getStyle(obj, 'border-top-width') || 0, 10) || parseInt(this.getStyle(obj, 'borderTopWidth') || 0, 10) || 0;

			x += borderX;
			y += borderY;

			return { x: x, y: y };
		},

		/**@
		* #Crafty.DOM.getStyle
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.getStyle(HTMLElement obj, String property)
		* @param obj - HTML element to find the style
		* @param property - Style to return
		* 
		* Determine the value of a style on an HTML element. Notation can be
		* in either CSS or JS.
		*/
		getStyle: function (obj, prop) {
			var result;
			if (obj.currentStyle)
				result = obj.currentStyle[this.camelize(prop)];
			else if (window.getComputedStyle)
				result = document.defaultView.getComputedStyle(obj, null).getPropertyValue(this.csselize(prop));
			return result;
		},

		/**
		* Used in the Zepto framework
		*
		* Converts CSS notation to JS notation
		*/
		camelize: function (str) {
			return str.replace(/-+(.)?/g, function (match, chr){ return chr ? chr.toUpperCase() : '' });
		},

		/**
		* Converts JS notation to CSS notation
		*/
		csselize: function (str) {
			return str.replace(/[A-Z]/g, function (chr){ return chr ? '-' + chr.toLowerCase() : '' });
		},

		/**@
		* #Crafty.DOM.translate
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.translate(Number x, Number y)
		* @param x - x position to translate
		* @param y - y position to translate
		* @return Object with x and y as keys and translated values
		*
		* Method will translate x and y positions to positions on the
		* stage. Useful for mouse events with `e.clientX` and `e.clientY`.
		*/
		translate: function (x, y) {
			return {
				x: (x - Crafty.stage.x + document.body.scrollLeft + document.documentElement.scrollLeft - Crafty.viewport._x)/Crafty.viewport._zoom,
				y: (y - Crafty.stage.y + document.body.scrollTop + document.documentElement.scrollTop - Crafty.viewport._y)/Crafty.viewport._zoom
			}
		}
	}
});

/**@
* #HTML
* @category Graphics
* Component allow for insertion of arbitrary HTML into an entity
*/
Crafty.c("HTML", {
	inner: '',

	init: function () {
		this.requires('2D, DOM');
	},

	/**@
	* #.replace
	* @comp HTML
	* @sign public this .replace(String html)
	* @param html - arbitrary html
	* 
	* This method will replace the content of this entity with the supplied html
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .replace("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	replace: function (new_html) {
		this.inner = new_html;
		this._element.innerHTML = new_html;
		return this;
	},

	/**@
	* #.append
	* @comp HTML
	* @sign public this .append(String html)
	* @param html - arbitrary html
	* 
	* This method will add the supplied html in the end of the entity
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .append("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	append: function (new_html) {
		this.inner += new_html;
		this._element.innerHTML += new_html;
		return this;
	},

	/**@
	* #.prepend
	* @comp HTML
	* @sign public this .prepend(String html)
	* @param html - arbitrary html
	* 
	* This method will add the supplied html in the beginning of the entity
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .prepend("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	prepend: function (new_html) {
		this.inner = new_html + this.inner;
		this._element.innerHTML = new_html + this.inner;
		return this;
	}
});
/**@
 * #Storage
 * @category Utilities
 * Utility to allow data to be saved to a permanent storage solution: IndexedDB, WebSql, localstorage or cookies
 */
    /**@
	 * #.open
	 * @comp Storage
	 * @sign .open(String gameName)
	 * @param gameName - a machine readable string to uniquely identify your game
	 * 
	 * Opens a connection to the database. If the best they have is localstorage or lower, it does nothing
	 *
	 * @example
	 * Open a database
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * ~~~
	 */

    /**@
	 * #.save
	 * @comp Storage
	 * @sign .save(String key, String type, Mixed data)
	 * @param key - A unique key for identifying this piece of data
	 * @param type - 'save' or 'cache'
	 * @param data - Some kind of data.
	 * 
	 * Saves a piece of data to the database. Can be anything, although entities are preferred.
	 * For all storage methods but IndexedDB, the data will be serialized as a string
	 * During serialization, an entity's SaveData event will be triggered.
	 * Components should implement a SaveData handler and attach the necessary information to the passed object
	 *
	 * @example
	 * Saves an entity to the database
	 * ~~~
	 * var ent = Crafty.e("2D, DOM")
	 *                     .attr({x: 20, y: 20, w: 100, h:100});
	 * Crafty.storage.open('MyGame');
	 * Crafty.storage.save('MyEntity', 'save', ent);
	 * ~~~
	 */

    /**@
	 * #.load
	 * @comp Storage
	 * @sign .load(String key, String type)
	 * @param key - A unique key to search for
	 * @param type - 'save' or 'cache'
	 * @param callback - Do things with the data you get back
	 * 
	 * Loads a piece of data from the database.
	 * Entities will be reconstructed from the serialized string

	 * @example
	 * Loads an entity from the database
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * Crafty.storage.load('MyEntity', 'save', function (data) { // do things });
	 * ~~~
	 */

    /**@
	 * #.getAllKeys
	 * @comp Storage
	 * @sign .getAllKeys(String type)
	 * @param type - 'save' or 'cache'
	 * Gets all the keys for a given type

	 * @example
	 * Gets all the save games saved
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * var saves = Crafty.storage.getAllKeys('save');
	 * ~~~
	 */

    /**@
	 * #.external
	 * @comp Storage
	 * @sign .external(String url)
	 * @param url - URL to an external to save games too
	 * 
	 * Enables and sets the url for saving games to an external server
	 * 
	 * @example
	 * Save an entity to an external server
	 * ~~~
	 * Crafty.storage.external('http://somewhere.com/server.php');
	 * Crafty.storage.open('MyGame');
	 * var ent = Crafty.e('2D, DOM')
	 *                     .attr({x: 20, y: 20, w: 100, h:100});
	 * Crafty.storage.save('save01', 'save', ent);
	 * ~~~
	 */

    /**@
	 * #SaveData event
	 * @comp Storage
	 * @param data - An object containing all of the data to be serialized
	 * @param prepare - The function to prepare an entity for serialization
	 * 
	 * Any data a component wants to save when it's serialized should be added to this object.
	 * Straight attribute should be set in data.attr.
	 * Anything that requires a special handler should be set in a unique property.
	 *
	 * @example
	 * Saves the innerHTML of an entity
	 * ~~~
	 * Crafty.e("2D DOM").bind("SaveData", function (data, prepare) {
	 *     data.attr.x = this.x;
	 *     data.attr.y = this.y;
	 *     data.dom = this.element.innerHTML;
	 * });
	 * ~~~
	 */

    /**@
	 * #LoadData event
	 * @param data - An object containing all the data that been saved
	 * @param process - The function to turn a string into an entity
	 * 
	 * Handlers for processing any data that needs more than straight assignment
	 *
	 * Note that data stored in the .attr object is automatically added to the entity.
	 * It does not need to be handled here
	 *
	 * @example
	 * ~~~
	 * Sets the innerHTML from a saved entity
	 * Crafty.e("2D DOM").bind("LoadData", function (data, process) {
	 *     this.element.innerHTML = data.dom;
	 * });
	 * ~~~
	 */

Crafty.storage = (function () {
	var db = null, url, gameName, timestamps = {}, 
		transactionType = { READ: "readonly", READ_WRITE: "readwrite" };

	/*
	 * Processes a retrieved object.
	 * Creates an entity if it is one
	 */
	function process(obj) {
		if (obj.c) {
			var d = Crafty.e(obj.c)
						.attr(obj.attr)
						.trigger('LoadData', obj, process);
			return d;
		}
		else if (typeof obj == 'object') {
			for (var prop in obj) {
				obj[prop] = process(obj[prop]);
			}
		}
		return obj;
	}

	function unserialize(str) {
		if (typeof str != 'string') return null;
		var data = (JSON ? JSON.parse(str) : eval('(' + str + ')'));
		return process(data);
	}

	/* recursive function
	 * searches for entities in an object and processes them for serialization
	 */
	function prep(obj) {
		if (obj.__c) {
			// object is entity
			var data = { c: [], attr: {} };
			obj.trigger("SaveData", data, prep);
			for (var i in obj.__c) {
				data.c.push(i);
			}
			data.c = data.c.join(', ');
			obj = data;
		}
		else if (typeof obj == 'object') {
			// recurse and look for entities
			for (var prop in obj) {
				obj[prop] = prep(obj[prop]);
			}
		}
		return obj;
	}

	function serialize(e) {
		if (JSON) {
			var data = prep(e);
			return JSON.stringify(data);
		}
		else {
			alert("Crafty does not support saving on your browser. Please upgrade to a newer browser.");
			return false;
		}
	}

	// for saving a game to a central server
	function external(setUrl) {
		url = setUrl;
	}

	function openExternal() {
		if (1 && typeof url == "undefined") return;
		// get the timestamps for external saves and compare them to local
		// if the external is newer, load it

		var xml = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.onreadystatechange = function (evt) {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var data = eval("(" + xhr.responseText + ")");
					for (var i in data) {
						if (Crafty.storage.check(data[i].key, data[i].timestamp)) {
							loadExternal(data[i].key);
						}
					}
				}
			}
		}
		xhr.send("mode=timestamps&game=" + gameName);
	}

	function saveExternal(key, data, ts) {
		if (1 && typeof url == "undefined") return;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.send("mode=save&key=" + key + "&data=" + encodeURIComponent(data) + "&ts=" + ts + "&game=" + gameName);
	}

	function loadExternal(key) {
		if (1 && typeof url == "undefined") return;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.onreadystatechange = function (evt) {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var data = eval("(" + xhr.responseText + ")");
					Crafty.storage.save(key, 'save', data);
				}
			}
		}
		xhr.send("mode=load&key=" + key + "&game=" + gameName);
	}

	/**
	 * get timestamp
	 */
	function ts() {
		var d = new Date();
		return d.getTime();
	}

	// everyone names their object different. Fix that nonsense.
	if (typeof indexedDB != 'object') {
		window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
		
		/* Numeric constants for transaction type are deprecated
		 * Ensure that the script will work consistenly for recent and legacy browser versions
		 */
		if (typeof IDBTransaction == 'object') {
			transactionType.READ = IDBTransaction.READ || IDBTransaction.readonly || transactionType.READ;
			transactionType.READ_WRITE = IDBTransaction.READ_WRITE || IDBTransaction.readwrite || transactionType.READ_WRITE;
		}
	}

	if (typeof indexedDB == 'object') {

		return {
			open: function (gameName_n) {
				gameName = gameName_n;
				var stores = [];

				if (arguments.length == 1) {
					stores.push('save');
					stores.push('cache');
				}
				else {
					stores = arguments;
					stores.shift();
					stores.push('save');
					stores.push('cache');
				}
				if (db == null) {
					var request = indexedDB.open(gameName);
					request.onsuccess = function (e) {
						db = e.target.result;
						createStores();
						getTimestamps();
						openExternal();
					};
				}
				else {
					createStores();
					getTimestamps();
					openExternal();
				}

				// get all the timestamps for existing keys
				function getTimestamps() {
					try {
						var trans = db.transaction(['save'], transactionType.READ),
						store = trans.objectStore('save'),
						request = store.getAll();
						request.onsuccess = function (e) {
							var i = 0, a = event.target.result, l = a.length;
							for (; i < l; i++) {
								timestamps[a[i].key] = a[i].timestamp;
							}
						};
					}
					catch (e) {
					}
				}

				function createStores() {
					var request = db.setVersion("1.0");
					request.onsuccess = function (e) {
						for (var i = 0; i < stores.length; i++) {
							var st = stores[i];
							if (db.objectStoreNames.contains(st)) continue;
							db.createObjectStore(st, { keyPath: "key" });
						}
					};
				}
			},

			save: function (key, type, data) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.save(key, type, data); }, 1);
					return;
				}

				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				try {
					var trans = db.transaction([type], transactionType.READ_WRITE),
					store = trans.objectStore(type),
					request = store.put({
						"data": str,
						"timestamp": t,
						"key": key
					});
				}
				catch (e) {
					console.error(e);
				}
			},

			load: function (key, type, callback) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.load(key, type, callback); }, 1);
					return;
				}
				try {
					var trans = db.transaction([type], transactionType.READ),
					store = trans.objectStore(type),
					request = store.get(key);
					request.onsuccess = function (e) {
						callback(unserialize(e.target.result.data));
					};
				}
				catch (e) {
					console.error(e);
				}
			},

			getAllKeys: function (type, callback) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.getAllkeys(type, callback); }, 1);
				}
				try {
					var trans = db.transaction([type], transactionType.READ),
					store = trans.objectStore(type),
					request = store.getCursor(),
					res = [];
					request.onsuccess = function (e) {
						var cursor = e.target.result;
						if (cursor) {
							res.push(cursor.key);
							// 'continue' is a reserved word, so .continue() causes IE8 to completely bark with "SCRIPT1010: Expected identifier".
							cursor['continue']();
						}
						else {
							callback(res);
						}
					};
				}
				catch (e) {
					console.error(e);
				}
			},

			check: function (key, timestamp) {
				return (timestamps[key] > timestamp);
			},

			external: external
		};
	}
	else if (typeof openDatabase == 'function') {
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
				if (arguments.length == 1) {
					db = {
						save: openDatabase(gameName_n + '_save', '1.0', 'Saves games for ' + gameName_n, 5 * 1024 * 1024),
						cache: openDatabase(gameName_n + '_cache', '1.0', 'Cache for ' + gameName_n, 5 * 1024 * 1024)
					}
				}
				else {
					// allows for any other types that can be thought of
					var args = arguments, i = 0;
					args.shift();
					for (; i < args.length; i++) {
						if (typeof db[args[i]] == 'undefined')
							db[args[i]] = openDatabase(gameName + '_' + args[i], '1.0', type, 5 * 1024 * 1024);
					}
				}

				db['save'].transaction(function (tx) {
					tx.executeSql('SELECT key, timestamp FROM data', [], function (tx, res) {
						var i = 0, a = res.rows, l = a.length;
						for (; i < l; i++) {
							timestamps[a.item(i).key] = a.item(i).timestamp;
						}
					});
				});
			},

			save: function (key, type, data) {
				if (typeof db[type] == 'undefined' && gameName != '') {
					this.open(gameName, type);
				}

				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				db[type].transaction(function (tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS data (key unique, text, timestamp)');
					tx.executeSql('SELECT * FROM data WHERE key = ?', [key], function (tx, results) {
						if (results.rows.length) {
							tx.executeSql('UPDATE data SET text = ?, timestamp = ? WHERE key = ?', [str, t, key]);
						}
						else {
							tx.executeSql('INSERT INTO data VALUES (?, ?, ?)', [key, str, t]);
						}
					});
				});
			},

			load: function (key, type, callback) {
				if (db[type] == null) {
					setTimeout(function () { Crafty.storage.load(key, type, callback); }, 1);
					return;
				}
				db[type].transaction(function (tx) {
					tx.executeSql('SELECT text FROM data WHERE key = ?', [key], function (tx, results) {
						if (results.rows.length) {
							res = unserialize(results.rows.item(0).text);
							callback(res);
						}
					});
				});
			},

			getAllKeys: function (type, callback) {
				if (db[type] == null) {
					setTimeout(function () { Crafty.storage.getAllKeys(type, callback); }, 1);
					return;
				}
				db[type].transaction(function (tx) {
					tx.executeSql('SELECT key FROM data', [], function (tx, results) {
						callback(results.rows);
					});
				});
			},

			check: function (key, timestamp) {
				return (timestamps[key] > timestamp);
			},

			external: external
		};
	}
	else if (typeof window.localStorage == 'object') {
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
			},

			save: function (key, type, data) {
				var k = gameName + '.' + type + '.' + key,
					str = serialize(data),
					t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				window.localStorage[k] = str;
				if (type == 'save')
					window.localStorage[k + '.ts'] = t;
			},

			load: function (key, type, callback) {
				var k = gameName + '.' + type + '.' + key,
					str = window.localStorage[k];

				callback(unserialize(str));
			},

			getAllKeys: function (type, callback) {
				var res = {}, output = [], header = gameName + '.' + type;
				for (var i in window.localStorage) {
					if (i.indexOf(header) != -1) {
						var key = i.replace(header, '').replace('.ts', '');
						res[key] = true;
					}
				}
				for (i in res) {
					output.push(i);
				}
				callback(output);
			},

			check: function (key, timestamp) {
				var ts = window.localStorage[gameName + '.save.' + key + '.ts'];

				return (parseInt(timestamp) > parseInt(ts));
			},

			external: external
		};
	}
	else {
		// default fallback to cookies
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
			},

			save: function (key, type, data) {
				// cookies are very limited in space. we can only keep saves there
				if (type != 'save') return;
				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				document.cookie = gameName + '_' + key + '=' + str + '; ' + gameName + '_' + key + '_ts=' + t + '; expires=Thur, 31 Dec 2099 23:59:59 UTC; path=/';
			},

			load: function (key, type, callback) {
				if (type != 'save') return;
				var reg = new RegExp(gameName + '_' + key + '=[^;]*'),
					result = reg.exec(document.cookie),
					data = unserialize(result[0].replace(gameName + '_' + key + '=', ''));

				callback(data);
			},

			getAllKeys: function (type, callback) {
				if (type != 'save') return;
				var reg = new RegExp(gameName + '_[^_=]', 'g'),
					matches = reg.exec(document.cookie),
					i = 0, l = matches.length, res = {}, output = [];
				for (; i < l; i++) {
					var key = matches[i].replace(gameName + '_', '');
					res[key] = true;
				}
				for (i in res) {
					output.push(i);
				}
				callback(output);
			},

			check: function (key, timestamp) {
				var header = gameName + '_' + key + '_ts',
					reg = new RegExp(header + '=[^;]'),
					result = reg.exec(document.cookie),
					ts = result[0].replace(header + '=', '');

				return (parseInt(timestamp) > parseInt(ts));
			},

			external: external
		};
	}
	/* template
	return {
		open: function (gameName) {
		},
		save: function (key, type, data) {
		},
		load: function (key, type, callback) {
		},
	}*/
})();
/**@
* #Crafty.support
* @category Misc, Core
* Determines feature support for what Crafty can do.
*/

(function testSupport() {
    var support = Crafty.support = {},
        ua = navigator.userAgent.toLowerCase(),
        match = /(webkit)[ \/]([\w.]+)/.exec(ua) ||
                /(o)pera(?:.*version)?[ \/]([\w.]+)/.exec(ua) ||
                /(ms)ie ([\w.]+)/.exec(ua) ||
                /(moz)illa(?:.*? rv:([\w.]+))?/.exec(ua) || [],
        mobile = /iPad|iPod|iPhone|Android|webOS|IEMobile/i.exec(ua);

    /**@
    * #Crafty.mobile
    * @comp Crafty.device
    * 
    * Determines if Crafty is running on mobile device.
    * 
    * If Crafty.mobile is equal true Crafty does some things under hood:
    * ~~~
    * - set viewport on max device width and height
    * - set Crafty.stage.fullscreen on true
    * - hide window scrollbars
    * ~~~
    * 
    * @see Crafty.viewport
    */
    if (mobile) Crafty.mobile = mobile[0];

    /**@
    * #Crafty.support.setter
    * @comp Crafty.support
    * Is `__defineSetter__` supported?
    */
    support.setter = ('__defineSetter__' in this && '__defineGetter__' in this);

    /**@
    * #Crafty.support.defineProperty
    * @comp Crafty.support
    * Is `Object.defineProperty` supported?
    */
    support.defineProperty = (function () {
        if (!'defineProperty' in Object) return false;
        try { Object.defineProperty({}, 'x', {}); }
        catch (e) { return false };
        return true;
    })();

    /**@
    * #Crafty.support.audio
    * @comp Crafty.support
    * Is HTML5 `Audio` supported?
    */
    support.audio = ('Audio' in window);

    /**@
    * #Crafty.support.prefix
    * @comp Crafty.support
    * Returns the browser specific prefix (`Moz`, `O`, `ms`, `webkit`).
    */
    support.prefix = (match[1] || match[0]);

    //browser specific quirks
    if (support.prefix === "moz") support.prefix = "Moz";
    if (support.prefix === "o") support.prefix = "O";

    if (match[2]) {
        /**@
        * #Crafty.support.versionName
        * @comp Crafty.support
        * Version of the browser
        */
        support.versionName = match[2];

        /**@
        * #Crafty.support.version
        * @comp Crafty.support
        * Version number of the browser as an Integer (first number)
        */
        support.version = +(match[2].split("."))[0];
    }

    /**@
    * #Crafty.support.canvas
    * @comp Crafty.support
    * Is the `canvas` element supported?
    */
    support.canvas = ('getContext' in document.createElement("canvas"));

    /**@
    * #Crafty.support.webgl
    * @comp Crafty.support
    * Is WebGL supported on the canvas element?
    */
    if (support.canvas) {
        var gl;
        try {
            gl = document.createElement("canvas").getContext("experimental-webgl");
            gl.viewportWidth = support.canvas.width;
            gl.viewportHeight = support.canvas.height;
        }
        catch (e) { }
        support.webgl = !!gl;
    }
    else {
        support.webgl = false;
    }

    /**@
    * #Crafty.support.css3dtransform
    * @comp Crafty.support
    * Is css3Dtransform supported by browser.
    */
    support.css3dtransform = (typeof document.createElement("div").style["Perspective"] !== "undefined")
                            || (typeof document.createElement("div").style[support.prefix + "Perspective"] !== "undefined");

    /**@
    * #Crafty.support.deviceorientation
    * @comp Crafty.support
    * Is deviceorientation event supported by browser.
    */
    support.deviceorientation = (typeof window.DeviceOrientationEvent !== "undefined") || (typeof window.OrientationEvent !== "undefined");

    /**@
    * #Crafty.support.devicemotion
    * @comp Crafty.support
    * Is devicemotion event supported by browser.
    */
    support.devicemotion = (typeof window.DeviceMotionEvent !== "undefined");

})();
Crafty.extend({

    zeroFill: function (number, width) {
        width -= number.toString().length;
        if (width > 0)
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        return number.toString();
    },

    /**@
    * #Crafty.sprite
    * @category Graphics
    * @sign public this Crafty.sprite([Number tile], String url, Object map[, Number paddingX[, Number paddingY]])
    * @param tile - Tile size of the sprite map, defaults to 1
    * @param url - URL of the sprite image
    * @param map - Object where the key is what becomes a new component and the value points to a position on the sprite map
    * @param paddingX - Horizontal space in between tiles. Defaults to 0.
    * @param paddingY - Vertical space in between tiles. Defaults to paddingX.
    * Generates components based on positions in a sprite image to be applied to entities.
    *
    * Accepts a tile size, URL and map for the name of the sprite and it's position.
    *
    * The position must be an array containing the position of the sprite where index `0`
    * is the `x` position, `1` is the `y` position and optionally `2` is the width and `3`
    * is the height. If the sprite map has padding, pass the values for the `x` padding
    * or `y` padding. If they are the same, just add one value.
    *
    * If the sprite image has no consistent tile size, `1` or no argument need be
    * passed for tile size.
    *
    * Entities that add the generated components are also given a component called `Sprite`.
    * 
    * @see Sprite
    */
    sprite: function (tile, tileh, url, map, paddingX, paddingY) {
        var spriteName, temp, x, y, w, h, img;

        //if no tile value, default to 1
        if (typeof tile === "string") {
            paddingY = paddingX;
            paddingX = map;
            map = tileh;
            url = tile;
            tile = 1;
            tileh = 1;
        }

        if (typeof tileh == "string") {
            paddingY = paddingX;
            paddingX = map;
            map = url;
            url = tileh;
            tileh = tile;
        }

        //if no paddingY, use paddingX
        if (!paddingY && paddingX) paddingY = paddingX;
        paddingX = parseInt(paddingX || 0, 10); //just incase
        paddingY = parseInt(paddingY || 0, 10);

        img = Crafty.asset(url);
        if (!img) {
            img = new Image();
            img.src = url;
            Crafty.asset(url, img);
            img.onload = function () {
                //all components with this img are now ready
                for (spriteName in map) {
                    Crafty(spriteName).each(function () {
                        this.ready = true;
                        this.trigger("Change");
                    });
                }
            };
        }

        for (spriteName in map) {
            if (!map.hasOwnProperty(spriteName)) continue;

            temp = map[spriteName];
            x = temp[0] * (tile + paddingX);
            y = temp[1] * (tileh + paddingY);
            w = temp[2] * tile || tile;
            h = temp[3] * tileh || tileh;

            //generates sprite components for each tile in the map
            Crafty.c(spriteName, {
                ready: false,
                __coord: [x, y, w, h],

                init: function () {
                    this.requires("Sprite");
                    this.__trim = [0, 0, 0, 0];
                    this.__image = url;
                    this.__coord = [this.__coord[0], this.__coord[1], this.__coord[2], this.__coord[3]];
                    this.__tile = tile;
                    this.__tileh = tileh;
                    this.__padding = [paddingX, paddingY];
                    this.img = img;

                    //draw now
                    if (this.img.complete && this.img.width > 0) {
                        this.ready = true;
                        this.trigger("Change");
                    }

                    //set the width and height to the sprite size
                    this.w = this.__coord[2];
                    this.h = this.__coord[3];
                }
            });
        }

        return this;
    },

    _events: {},

    /**@
    * #Crafty.addEvent
    * @category Events, Misc
    * @sign public this Crafty.addEvent(Object ctx, HTMLElement obj, String event, Function callback)
    * @param ctx - Context of the callback or the value of `this`
    * @param obj - Element to add the DOM event to
    * @param event - Event name to bind to
    * @param callback - Method to execute when triggered
    * 
    * Adds DOM level 3 events to elements. The arguments it accepts are the call
    * context (the value of `this`), the DOM element to attach the event to,
    * the event name (without `on` (`click` rather than `onclick`)) and
    * finally the callback method.
    *
    * If no element is passed, the default element will be `window.document`.
    *
    * Callbacks are passed with event data.
    * 
    * @see Crafty.removeEvent
    */
    addEvent: function (ctx, obj, type, callback) {
        if (arguments.length === 3) {
            callback = type;
            type = obj;
            obj = window.document;
        }

        //save anonymous function to be able to remove
        var afn = function (e) { 
                var e = e || window.event; 

                if (typeof callback === 'function') {
                    callback.call(ctx, e);
                }
            },
            id = ctx[0] || "";

        if (!this._events[id + obj + type + callback]) this._events[id + obj + type + callback] = afn;
        else return;

        if (obj.attachEvent) { //IE
            obj.attachEvent('on' + type, afn);
        } else { //Everyone else
            obj.addEventListener(type, afn, false);
        }
    },

    /**@
    * #Crafty.removeEvent
    * @category Events, Misc
    * @sign public this Crafty.removeEvent(Object ctx, HTMLElement obj, String event, Function callback)
    * @param ctx - Context of the callback or the value of `this`
    * @param obj - Element the event is on
    * @param event - Name of the event
    * @param callback - Method executed when triggered
    * 
    * Removes events attached by `Crafty.addEvent()`. All parameters must
    * be the same that were used to attach the event including a reference
    * to the callback method.
    * 
    * @see Crafty.addEvent
    */
    removeEvent: function (ctx, obj, type, callback) {
        if (arguments.length === 3) {
            callback = type;
            type = obj;
            obj = window.document;
        }

        //retrieve anonymous function
        var id = ctx[0] || "",
            afn = this._events[id + obj + type + callback];

        if (afn) {
            if (obj.detachEvent) {
                obj.detachEvent('on' + type, afn);
            } else obj.removeEventListener(type, afn, false);
            delete this._events[id + obj + type + callback];
        }
    },

    /**@
    * #Crafty.background
    * @category Graphics, Stage
    * @sign public void Crafty.background(String value)
    * @param style - Modify the background with a color or image
    * 
    * This method is essentially a shortcut for adding a background
    * style to the stage element.
    */
    background: function (style) {
        Crafty.stage.elem.style.background = style;
    },

    /**@
    * #Crafty.viewport
    * @category Stage
    * 
    * Viewport is essentially a 2D camera looking at the stage. Can be moved which
    * in turn will react just like a camera moving in that direction.
    */
    viewport: {
    /**@
        * #Crafty.viewport.clampToEntities
        * @comp Crafty.viewport
        * 
        * Decides if the viewport functions should clamp to game entities.
        * When set to `true` functions such as Crafty.viewport.mouselook() will not allow you to move the
        * viewport over areas of the game that has no entities.
        * For development it can be useful to set this to false.
        */
        clampToEntities: true,
        width: 0,
        height: 0,
        /**@
        * #Crafty.viewport.x
        * @comp Crafty.viewport
        * 
        * Will move the stage and therefore every visible entity along the `x`
        * axis in the opposite direction.
        *
        * When this value is set, it will shift the entire stage. This means that entity
        * positions are not exactly where they are on screen. To get the exact position,
        * simply add `Crafty.viewport.x` onto the entities `x` position.
        */
        _x: 0,
        /**@
        * #Crafty.viewport.y
        * @comp Crafty.viewport
        * 
        * Will move the stage and therefore every visible entity along the `y`
        * axis in the opposite direction.
        *
        * When this value is set, it will shift the entire stage. This means that entity
        * positions are not exactly where they are on screen. To get the exact position,
        * simply add `Crafty.viewport.y` onto the entities `y` position.
        */
        _y: 0,
		
		/**@
         * #Crafty.viewport.bounds
         * @comp Crafty.viewport
         *
		 * A rectangle which defines the bounds of the viewport. If this 
		 * variable is null, Crafty uses the bounding box of all the items
		 * on the stage.
         */
        bounds:null,

        /**@
         * #Crafty.viewport.scroll
         * @comp Crafty.viewport
         * @sign Crafty.viewport.scroll(String axis, Number v)
         * @param axis - 'x' or 'y'
         * @param v - The new absolute position on the axis
         *
         * Will move the viewport to the position given on the specified axis
         * 
         * @example 
         * Will move the camera 500 pixels right of its initial position, in effect
         * shifting everything in the viewport 500 pixels to the left.
         * 
         * ~~~
         * Crafty.viewport.scroll('_x', 500);
         * ~~~
         */
        scroll: function (axis, v) {
            v = Math.floor(v);
            var change = v - this[axis], //change in direction
                context = Crafty.canvas.context,
                style = Crafty.stage.inner.style,
                canvas;

            //update viewport and DOM scroll
            this[axis] = v;
			if (context) {
				if (axis == '_x') {
					context.translate(change, 0);
				} else {
					context.translate(0, change);
				}
				Crafty.DrawManager.drawAll();
			}
            style[axis == '_x' ? "left" : "top"] = v + "px";
        },

        rect: function () {
            return { _x: -this._x, _y: -this._y, _w: this.width, _h: this.height };
        },

        /**@
         * #Crafty.viewport.pan
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.pan(String axis, Number v, Number time)
         * @param String axis - 'x' or 'y'. The axis to move the camera on
         * @param Number v - the distance to move the camera by
         * @param Number time - The duration in frames for the entire camera movement
         *
         * Pans the camera a given number of pixels over a given number of frames
         */
        pan: (function () {
            var tweens = {}, i, bound = false;

            function enterFrame(e) {
                var l = 0;
                for (i in tweens) {
                    var prop = tweens[i];
                    if (prop.remTime > 0) {
                        prop.current += prop.diff;
                        prop.remTime--;
                        Crafty.viewport[i] = Math.floor(prop.current);
                        l++;
                    }
                    else {
                        delete tweens[i];
                    }
                }
                if (l) Crafty.viewport._clamp();
            }

            return function (axis, v, time) {
                Crafty.viewport.follow();
                if (axis == 'reset') {
                    for (i in tweens) {
                        tweens[i].remTime = 0;
                    }
                    return;
                }
                if (time == 0) time = 1;
                tweens[axis] = {
                    diff: -v / time,
                    current: Crafty.viewport[axis],
                    remTime: time
                };
                if (!bound) {
                    Crafty.bind("EnterFrame", enterFrame);
                    bound = true;
                }
            }
        })(),

        /**@
         * #Crafty.viewport.follow
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.follow(Object target, Number offsetx, Number offsety)
         * @param Object target - An entity with the 2D component
         * @param Number offsetx - Follow target should be offsetx pixels away from center
         * @param Number offsety - Positive puts target to the right of center
         *
         * Follows a given entity with the 2D component. If following target will take a portion of
         * the viewport out of bounds of the world, following will stop until the target moves away.
         * 
         * @example
         * ~~~
         * var ent = Crafty.e('2D, DOM').attr({w: 100, h: 100:});
         * Crafty.viewport.follow(ent, 0, 0);
         * ~~~
         */
        follow: (function () {
            var oldTarget, offx, offy;

            function change() {
                Crafty.viewport.scroll('_x', -(this.x + (this.w / 2) - (Crafty.viewport.width / 2) - offx));
                Crafty.viewport.scroll('_y', -(this.y + (this.h / 2) - (Crafty.viewport.height / 2) - offy));
                Crafty.viewport._clamp();
            }

            return function (target, offsetx, offsety) {
                if (oldTarget)
                    oldTarget.unbind('Change', change);
                if (!target || !target.has('2D'))
                    return;
                Crafty.viewport.pan('reset');

                oldTarget = target;
                offx = (typeof offsetx != 'undefined') ? offsetx : 0;
                offy = (typeof offsety != 'undefined') ? offsety : 0;

                target.bind('Change', change);
                change.call(target);
            }
        })(),

        /**@
         * #Crafty.viewport.centerOn
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.centerOn(Object target, Number time)
         * @param Object target - An entity with the 2D component
         * @param Number time - The number of frames to perform the centering over
         *
         * Centers the viewport on the given entity
         */
        centerOn: function (targ, time) {
            var x = targ.x,
                    y = targ.y,
                    mid_x = targ.w / 2,
                    mid_y = targ.h / 2,
                    cent_x = Crafty.viewport.width / 2,
                    cent_y = Crafty.viewport.height / 2,
                    new_x = x + mid_x - cent_x,
                    new_y = y + mid_y - cent_y;

            Crafty.viewport.pan('reset');
            Crafty.viewport.pan('x', new_x, time);
            Crafty.viewport.pan('y', new_y, time);
        },
        /**@
        * #Crafty.viewport._zoom
        * @comp Crafty.viewport
        * 
        * This value keeps an amount of viewport zoom, required for calculating mouse position at entity
        */
        _zoom : 1,

        /**@
         * #Crafty.viewport.zoom
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.zoom(Number amt, Number cent_x, Number cent_y, Number time)
         * @param Number amt - amount to zoom in on the target by (eg. 2, 4, 0.5)
         * @param Number cent_x - the center to zoom on
         * @param Number cent_y - the center to zoom on
         * @param Number time - the duration in frames of the entire zoom operation
         *
         * Zooms the camera in on a given point. amt > 1 will bring the camera closer to the subject
         * amt < 1 will bring it farther away. amt = 0 will do nothing.
         * Zooming is multiplicative. To reset the zoom amount, pass 0.
         */
        zoom: (function () {
            var zoom = 1,
                zoom_tick = 0,
                dur = 0,
                prop = Crafty.support.prefix + "Transform",
                bound = false,
                act = {},
                prct = {};
            // what's going on:
            // 1. Get the original point as a percentage of the stage
            // 2. Scale the stage
            // 3. Get the new size of the stage
            // 4. Get the absolute position of our point using previous percentage
            // 4. Offset inner by that much

            function enterFrame() {
                if (dur > 0) {
					if (isFinite(Crafty.viewport._zoom)) zoom = Crafty.viewport._zoom;
                    var old = {
                        width: act.width * zoom,
                        height: act.height * zoom
                    };
                    zoom += zoom_tick;
                    Crafty.viewport._zoom = zoom;
                    var new_s = {
                        width: act.width * zoom,
                        height: act.height * zoom
                    },
                    diff = {
                        width: new_s.width - old.width,
                        height: new_s.height - old.height
                    };
                    Crafty.stage.inner.style[prop] = 'scale(' + zoom + ',' + zoom + ')';
                    if (Crafty.canvas._canvas) {
						var czoom = zoom / (zoom - zoom_tick);
						Crafty.canvas.context.scale(czoom, czoom);
                        Crafty.DrawManager.drawAll();
                    }
                    Crafty.viewport.x -= diff.width * prct.width;
                    Crafty.viewport.y -= diff.height * prct.height;
                    dur--;
                }
            }

            return function (amt, cent_x, cent_y, time) {
                var bounds = this.bounds || Crafty.map.boundaries(),
                    final_zoom = amt ? zoom * amt : 1;
				if (!amt) {	// we're resetting to defaults
					zoom = 1;
					this._zoom = 1;
				}

                act.width = bounds.max.x - bounds.min.x;
                act.height = bounds.max.y - bounds.min.y;

                prct.width = cent_x / act.width;
                prct.height = cent_y / act.height;

                if (time == 0) time = 1;
                zoom_tick = (final_zoom - zoom) / time;
                dur = time;

                Crafty.viewport.pan('reset');
                if (!bound) {
                    Crafty.bind('EnterFrame', enterFrame);
                    bound = true;
                }
            }
        })(),
        /**@
         * #Crafty.viewport.scale
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.scale(Number amt)
         * @param Number amt - amount to zoom/scale in on the element on the viewport by (eg. 2, 4, 0.5)
         *
         * Zooms/scale the camera. amt > 1 increase all entities on stage 
         * amt < 1 will reduce all entities on stage. amt = 0 will reset the zoom/scale.
         * Zooming/scaling is multiplicative. To reset the zoom/scale amount, pass 0.
         *
         * @example
         * ~~~
         * Crafty.viewport.scale(2); //to see effect add some entities on stage.
         * ~~~
         */
        scale: (function () {
            var prop = Crafty.support.prefix + "Transform",
                act = {};
            return function (amt) {
                var bounds = this.bounds || Crafty.map.boundaries(),
                    final_zoom = amt ? this._zoom * amt : 1,
					czoom = final_zoom / this._zoom;

                this._zoom = final_zoom;
                act.width = bounds.max.x - bounds.min.x;
                act.height = bounds.max.y - bounds.min.y;
                var new_s = {
                    width: act.width * final_zoom,
                    height: act.height * final_zoom
                }
                Crafty.viewport.pan('reset');
                Crafty.stage.inner.style['transform'] = 
				Crafty.stage.inner.style[prop] = 'scale(' + this._zoom + ',' + this._zoom + ')';

                if (Crafty.canvas._canvas) {
                    Crafty.canvas.context.scale(czoom, czoom);
                    Crafty.DrawManager.drawAll();
                }
                //Crafty.viewport.width = new_s.width;
                //Crafty.viewport.height = new_s.height;
            }
        })(),
        /**@
         * #Crafty.viewport.mouselook
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.mouselook(Boolean active)
         * @param Boolean active - Activate or deactivate mouselook
         *
         * Toggle mouselook on the current viewport.
         * Simply call this function and the user will be able to
         * drag the viewport around.
         */
        mouselook: (function () {
            var active = false,
                dragging = false,
                lastMouse = {}
            old = {};


            return function (op, arg) {
                if (typeof op == 'boolean') {
                    active = op;
                    if (active) {
                        Crafty.mouseObjs++;
                    }
                    else {
                        Crafty.mouseObjs = Math.max(0, Crafty.mouseObjs - 1);
                    }
                    return;
                }
                if (!active) return;
                switch (op) {
                    case 'move':
                    case 'drag':
                        if (!dragging) return;
                        diff = {
                            x: arg.clientX - lastMouse.x,
                            y: arg.clientY - lastMouse.y
                        };

                        Crafty.viewport.x += diff.x;
                        Crafty.viewport.y += diff.y;
                        Crafty.viewport._clamp(); 
                    case 'start':
                        lastMouse.x = arg.clientX;
                        lastMouse.y = arg.clientY;
                        dragging = true;
                        break;
                    case 'stop':
                        dragging = false;
                        break;
                }
            };
        })(),
        _clamp: function () {
            // clamps the viewport to the viewable area
            // under no circumstances should the viewport see something outside the boundary of the 'world'
            if (!this.clampToEntities) return;
            var bound = this.bounds || Crafty.map.boundaries();
			bound.max.x *= this._zoom;
			bound.min.x *= this._zoom;
			bound.max.y *= this._zoom;
			bound.min.y *= this._zoom;
            if (bound.max.x - bound.min.x > Crafty.viewport.width) {
                bound.max.x -= Crafty.viewport.width;

                if (Crafty.viewport.x < -bound.max.x) {
                    Crafty.viewport.x = -bound.max.x;
                }
                else if (Crafty.viewport.x > -bound.min.x) {
                    Crafty.viewport.x = -bound.min.x;
                }
            }
            else {
                Crafty.viewport.x = -1 * (bound.min.x + (bound.max.x - bound.min.x) / 2 - Crafty.viewport.width / 2);
            }
            if (bound.max.y - bound.min.y > Crafty.viewport.height) {
                bound.max.y -= Crafty.viewport.height;

                if (Crafty.viewport.y < -bound.max.y) {
                    Crafty.viewport.y = -bound.max.y;
                }
                else if (Crafty.viewport.y > -bound.min.y) {
                    Crafty.viewport.y = -bound.min.y;
                }
            }
            else {
                Crafty.viewport.y = -1 * (bound.min.y + (bound.max.y - bound.min.y) / 2 - Crafty.viewport.height / 2);
            }
        },

        /**@
         * #Crafty.viewport.init
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.init([Number width, Number height])
         * @param width - Width of the viewport
         * @param height - Height of the viewport
         *
         * Initialize the viewport. If the arguments 'width' or 'height' are missing, or Crafty.mobile is true, use Crafty.DOM.window.width and Crafty.DOM.window.height (full screen model).
         * Create a div with id `cr-stage`, if there is not already an HTMLElement with id `cr-stage` (by `Crafty.viewport.init`).
         *
         * @see Crafty.device, Crafty.DOM, Crafty.stage
         */
        init: function (w, h) {
            Crafty.DOM.window.init();

            //fullscreen if mobile or not specified
            this.width = (!w || Crafty.mobile) ? Crafty.DOM.window.width : w;
            this.height = (!h || Crafty.mobile) ? Crafty.DOM.window.height : h;

            //check if stage exists
            var crstage = document.getElementById("cr-stage");

            /**@
             * #Crafty.stage
             * @category Core
             * The stage where all the DOM entities will be placed.
             */

            /**@
             * #Crafty.stage.elem
             * @comp Crafty.stage
             * The `#cr-stage` div element.
             */

            /**@
             * #Crafty.stage.inner
             * @comp Crafty.stage
             * `Crafty.stage.inner` is a div inside the `#cr-stage` div that holds all DOM entities.
             * If you use canvas, a `canvas` element is created at the same level in the dom
             * as the the `Crafty.stage.inner` div. So the hierarchy in the DOM is
             * 
             * `Crafty.stage.elem`
             * <!-- not sure how to do indentation in the document-->
             *
             *     - `Crafty.stage.inner` (a div HTMLElement)
             *
             *     - `Crafty.canvas._canvas` (a canvas HTMLElement) 
             */

            //create stage div to contain everything
            Crafty.stage = {
                x: 0,
                y: 0,
                fullscreen: false,
                elem: (crstage ? crstage : document.createElement("div")),
                inner: document.createElement("div")
            };

            //fullscreen, stop scrollbars
            if ((!w && !h) || Crafty.mobile) {
                document.body.style.overflow = "hidden";
                Crafty.stage.fullscreen = true;
            }

            Crafty.addEvent(this, window, "resize", Crafty.viewport.reload);

            Crafty.addEvent(this, window, "blur", function () {
                if (Crafty.settings.get("autoPause")) {
                    if(!Crafty._paused) Crafty.pause();
                }
            });
            Crafty.addEvent(this, window, "focus", function () {
                if (Crafty._paused && Crafty.settings.get("autoPause")) {
                    Crafty.pause();
                }
            });

            //make the stage unselectable
            Crafty.settings.register("stageSelectable", function (v) {
                Crafty.stage.elem.onselectstart = v ? function () { return true; } : function () { return false; };
            });
            Crafty.settings.modify("stageSelectable", false);

            //make the stage have no context menu
            Crafty.settings.register("stageContextMenu", function (v) {
                Crafty.stage.elem.oncontextmenu = v ? function () { return true; } : function () { return false; };
            });
            Crafty.settings.modify("stageContextMenu", false);

            Crafty.settings.register("autoPause", function (){ });
            Crafty.settings.modify("autoPause", false);

            //add to the body and give it an ID if not exists
            if (!crstage) {
                document.body.appendChild(Crafty.stage.elem);
                Crafty.stage.elem.id = "cr-stage";
            }

            var elem = Crafty.stage.elem.style,
                offset;

            Crafty.stage.elem.appendChild(Crafty.stage.inner);
            Crafty.stage.inner.style.position = "absolute";
            Crafty.stage.inner.style.zIndex = "1";

            //css style
            elem.width = this.width + "px";
            elem.height = this.height + "px";
            elem.overflow = "hidden";

            if (Crafty.mobile) {
                elem.position = "absolute";
                elem.left = "0px";
                elem.top = "0px";

                // remove default gray highlighting after touch
                if (typeof elem.webkitTapHighlightColor != undefined) {
                    elem.webkitTapHighlightColor = "rgba(0,0,0,0)";
                }

                var meta = document.createElement("meta"),
                    head = document.getElementsByTagName("HEAD")[0];

                //stop mobile zooming and scrolling
                meta.setAttribute("name", "viewport");
                meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
                head.appendChild(meta);

                //hide the address bar
                meta = document.createElement("meta");
                meta.setAttribute("name", "apple-mobile-web-app-capable");
                meta.setAttribute("content", "yes");
                head.appendChild(meta);
                setTimeout(function () { window.scrollTo(0, 1); }, 0);

                Crafty.addEvent(this, window, "touchmove", function (e) {
                    e.preventDefault();
                });

                Crafty.stage.x = 0;
                Crafty.stage.y = 0;

            } else {
                elem.position = "relative";
                //find out the offset position of the stage
                offset = Crafty.DOM.inner(Crafty.stage.elem);
                Crafty.stage.x = offset.x;
                Crafty.stage.y = offset.y;
            }

            if (Crafty.support.setter) {
                //define getters and setters to scroll the viewport
                this.__defineSetter__('x', function (v) { this.scroll('_x', v); });
                this.__defineSetter__('y', function (v) { this.scroll('_y', v); });
                this.__defineGetter__('x', function () { return this._x; });
                this.__defineGetter__('y', function () { return this._y; });
                //IE9
            } else if (Crafty.support.defineProperty) {
                Object.defineProperty(this, 'x', { set: function (v) { this.scroll('_x', v); }, get: function () { return this._x; } });
                Object.defineProperty(this, 'y', { set: function (v) { this.scroll('_y', v); }, get: function () { return this._y; } });
            } else {
                //create empty entity waiting for enterframe
                this.x = this._x;
                this.y = this._y;
                Crafty.e("viewport");
            }
        },

        /**@
         * #Crafty.viewport.reload
         * @comp Crafty.stage
         * 
         * @sign public Crafty.viewport.reload()
         * 
         * Recalculate and reload stage width, height and position.
         * Useful when browser return wrong results on init (like safari on Ipad2).
         * 
         */
        reload : function () {
            Crafty.DOM.window.init();
            var w = Crafty.DOM.window.width,
                h = Crafty.DOM.window.height,
                offset;


            if (Crafty.stage.fullscreen) {
                this.width = w;
                this.height = h;
                Crafty.stage.elem.style.width = w + "px";
                Crafty.stage.elem.style.height = h + "px";

                if (Crafty.canvas._canvas) {
                    Crafty.canvas._canvas.width = w;
                    Crafty.canvas._canvas.height = h;
                    Crafty.DrawManager.drawAll();
                }
            }

            offset = Crafty.DOM.inner(Crafty.stage.elem);
            Crafty.stage.x = offset.x;
            Crafty.stage.y = offset.y;
        },
		
		/**@
		 * #Crafty.viewport.reset
		 * @comp Crafty.stage
		 *
		 * @sign public Crafty.viewport.reset()
		 *
		 * Resets the viewport to starting values
		 * Called when scene() is run.
		 */
		reset: function () {
			Crafty.viewport.pan('reset');
			Crafty.viewport.follow();
			Crafty.viewport.mouselook('stop');
			Crafty.viewport.scale();
		}
    }

    /**@
    * #Crafty.keys
    * @category Input
    * Object of key names and the corresponding key code.
    * 
    * ~~~
    * BACKSPACE: 8,
    * TAB: 9,
    * ENTER: 13,
    * PAUSE: 19,
    * CAPS: 20,
    * ESC: 27,
    * SPACE: 32,
    * PAG