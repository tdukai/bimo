"use strict";

/**
* Model watchable model
*
* @class Model
* @constructor
* @param {object} data
*/
class Model {
    /* Constructor */
    constructor (data = {}) {
        // Add property to hold internal values
        Object.defineProperty(this, '_', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: {
                data: data,
                events: {},
                delta: {},
                suspended: false,
                count: 0
            }
        });
        // Assign keys
        const keys = Object.keys(data);
        for (const key of keys) {
            this._addProperty(key);
        }
    }

    /**
    * Checks if variable is a "real" object
    *
    * @method _isObject
    * @param {any} value
    * @return {boolean} True if event added to the list
    */
    _isObject (value) {
        return (Object.prototype.toString.call(value) === '[object Object]');     
    }

    /**
    * Checks if variable is a "real" date
    *
    * @method isDate
    * @param {any} value
    * @return {boolean} True if event added to the list
    */
    _isDate (value) {
        return (value instanceof Date && !isNaN(value.valueOf()));
    }

    /**
    * Clones array or object
    *
    * @method clone
    * @param {array/object} obj
    * @return {array/object} clone of original array or object
    */
    _clone (obj) {
        let out = null;
        if (this._isObject(obj)) {
            out = {};
            const keys = Object.keys(obj);
            for (const key of keys) {
                if (this._isObject(obj[key]) || Array.isArray(obj[key])) {
                    out[key] = this._clone(obj[key]);
                } else if (this._isDate(obj[key])) {
                    out[key] = new Date(obj[key].getTime());
                } else {
                    out[key] = obj[key];
                }
            }
        } else if (Array.isArray(obj)) {
            out = [];
            for (const one of obj) {
                let tmp;
                if (this._isObject(one) || Array.isArray(one)) {
                    tmp = this._clone(one);
                } else if (this._isDate(one)) {
                    tmp = new Date(one.getTime());
                } else {
                    tmp = one;
                }
                out.push(tmp);
            }
        }
        return out;
    }

    /**
    * Checks if two arrays are equal, which inludes order of items too
    *
    * @method isEquals
    * @param {array/object} obj
    * @param {array/object} obj
    * @return {array/object} clone of original array or object
    */
    _isEquals (value1, value2) {
        let out = false;
        if (Array.isArray(value1) && Array.isArray(value2)) {
            const a = value1.join('');
            const b = value2.join('');
            out = (a === b);
        } else {
            out = (value1 === value2);
        }
        return out;
    }

    /**
    * Adds new property to object (only non object properties)
    *
    * @method addProperty
    * @param {string} property name
    * @return {undefined}
    */
    _addProperty (name) {
        // Only create property against own name and non-object element
        if (this._.data.hasOwnProperty(name)) { 
            if (!this._isObject(this._.data[name])) {
                Object.defineProperty(this, name, {
                    configurable: false,
                    enumerable: true,
                    get: () => {
                        let out = this._.data[name];
                        // Look for formatter method
                        if (typeof this[name + 'Read'] === 'function') {
                            out = this[name + 'Read'](out);
                        }
                        return out;
                    },
                    set: (actual) => {
                        // Check for parser method
                        if (typeof this[name + 'Write'] === 'function') {
                            actual = this[name + 'Write'](actual);
                        }
                        // Get previous value
                        var previous = this._.data[name],
                        arg = {};
                        if (previous !== actual) {
                            // Update with new value
                            this._.data[name] = actual;
                            // Update delta
                            this._.delta[name] = this._.delta[name] || { original: previous };
                            this._.delta[name].actual = actual;
                            this._.delta[name].previous = previous;
                            // Count event if suspended
                            if (this._.suspended) {
                                this._.count++; // Count changes
                            } else if (Array.isArray(this._.events[name])) { // Otherwise run events
                                // Collect all names from diff
                                arg[name] = {};
                                const keys = Object.keys(this._.delta[name]);
                                for (const key of keys) {
                                    arg[name][key] = this._.delta[name][key];
                                }
                                // If value reverted back to original remove it
                                if (this._isEquals(this._.delta[name].actual, this._.delta[name].original)) {
                                    delete this._.delta[name];
                                }
                                // Run event
                                for (const event of this._.events[name]) {
                                    if (typeof event === 'function') {
                                        event.call(event, arg);
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                // Assign the object as normal properties
                Object.defineProperty(this, name, {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: this._.data[name]
                });            
            }    
        }
    }

    /**
    * Converts model into simple javascript object
    *
    * @method _toObject
    * @return {object} model content in simple javascript object
    */
    _toObject () {
        return this._clone(this._.data);
    }

    /**
    * Suspends events firing
    *
    * @method _suspend
    * @return {undefined}
    */
    _suspend () {
        this._.suspended = true;
        this._.count = 0;
    }

    /**
    * Resumes event firing
    *
    * @method _resume
    * @return {undefined}
    */
    _resume () {
        this._.suspended = false;
        if (this._.count > 0) {
            this._.count = 0;
            const items = [];
            const keys = Object.keys(this._.data);
            // Create unique list
            for (const key of keys) {
                for (const event of this._.events[key]) {
                    if (!items.includes(event)) {
                        items.push(event);
                    }
                }
            }
            // Run all distinct methods and send argument the cumulated result
            for (const item of items) {
                if (typeof item === 'function') {
                    item.call(this, this._.delta);
                }
            }
        }
    }

    /**
    * Returns all changed keys (delta) since the beginning or the last reset
    *
    * @method _delta
    * @return {object} all changed keys with previous actual and original values
    */
    _delta () {
        return this._clone(this._.delta);
    }

    /**
    * Reset change tracking (delta)
    *
    * @method _reset
    * @return {undefined} 
    */
    _reset () {
        this._.delta = {};
    }

    /**
    * Restore original value(s)
    *
    * @method _revert
    * @params {undefined/string/array} name(s) of properties, if none specified all keys content will revert back
    * @return {undefined} 
    */
    _revert (name) {
        // Revert a single key
        const revert = (key) => {
            if (this._.delta[key]) {
                this[key] = this._.delta[key].original;
            }
        };
        
        if (typeof name === 'string') {
            const items = name.split(' ');
            for (const item of items) {
                revert(item);    
            }
        } else if (Array.isArray(name)) {
            for (const item of name) {
                revert(item);
            }
        } else if (name === undefined || name === null) {
            const keys = Object.keys(this._.data);
            for (const key of keys) {
                revert(key);
            }
        }
    }

    /**
    * Checks if the whole model, a group or single property changed
    *
    * @method _changed
    * @params {undefined/string/array} name(s) of properties
    * @return {boolean} true if model changed or if single property changed
    */
    _changed (name) {
        let out = false;
        const delta = this._delta();
        // Check change for a single key           
        const changed = (key) => {
            let res = false;
            if (delta[key] && delta[key].original !== this[key]) {
                res = true;
            }
            return res;
        };

        // Check the type
        if (typeof name === 'string') {
            const items = name.split(' ');
            for (const item of items) {
                if (changed(item) && out === false) {
                    out = true;
                    break;
                }
            }
        } else if (Array.isArray(name)) {
            for (const item of name) {
                if (changed(item) && out === false) {
                    out = true;
                    break;
                }
            }
        } else if (name === undefined || name === null) {
            const keys = Object.keys(delta);
            out = (keys.length > 0);
        }
        return out;
    }

    /**
    * Adds new callback to change event list but checking if the event already on the list avoiding double subscription
    *
    * @method on
    * @param {String/Array/Object/function} name / names / name or callback object
    * @param {Function} callback method pointer - it can be specified as first parameter
    * @return {undefined}
    */
    _watch () {
        let event;
        let param;
        let values = {};
        // Check arguments
        if (arguments.length > 0) {

            if (arguments.length === 1) {
                if (typeof arguments[0] === 'function') {
                    event = arguments[0];
                } else if (this._isObject(arguments[0])) {
                    param = arguments[0];
                }
            } else if (arguments.length >= 2) {
                param = arguments[0];
                event = arguments[1];
            }
            
            // Check first parameter
            if (typeof param === 'string' && typeof event === 'function') {
                const items = param.split(' ');
                for (const item of items) {
                    values[item] = event;
                }
            } else if (Array.isArray(param) && typeof event === 'function') {
                for (const item of param) {
                    values[item] = event;
                }
            } else if (this._isObject(param)) {
                values = param;
            } else if (typeof event === 'function') {
                const keys = Object.keys(this._.data);
                for (const key of keys) {
                    if (!this._isObject(this._.data[key])) {
                        values[key] = event;
                    }
                }
            }

            // Loop through all the names and create entry in events
            const keys = Object.keys(values);
            for (const key of keys) {
                if (this._.events[key] && !this._.events[key].includes(event)) {
                    this._.events[key].push(values[key]);
                } else {
                    this._.events[key] = [values[key]];
                }
            }
        }
    }

    /**
    * Removes references from change event list
    *
    * @method _unwatch
    * @param {String/Array/Object} name / names / name - callback object
    * @param {Function} callback method pointer - optional, if not specified it will remove all references registered for the same name
    * @return {undefined}
    */
    _unwatch () {
        let param;
        let event;

        // Remove event
        const remove = (key) => {
            if (typeof event === 'function' && Array.isArray(this._.events[key])) {
                var pos = this._.events[key].indexOf(event);
                if (pos > -1) {
                    this._.events[key] = this._.events[key].splice(pos, 1);
                }
            } else {
                this._.events[key] = null;
                delete this._.events[key];
            }
        };

        // Check arguments passed in
        if (arguments.length > 0) {
            if (arguments.length === 1) {
                if (typeof arguments[0] === 'function') {
                    event = arguments[0];
                } else if (this._isObject(arguments[0])) {
                    param = arguments[0];
                }
            } else if (arguments.length >= 2) {
                param = arguments[0];
                event = arguments[1];
            }
            // Check first parameter
            if (typeof param === 'string') {
                const items = param.split(' ');
                for (const item of items) {
                    remove(item);
                }
            } else if (Array.isArray(param)) {
                for (const item of param) {
                    remove(item);
                }
            } else if (this._isObject(param)) {
                const keys = Object.keys(param);
                for (const key of keys) {
                    remove(key);
                }
            } else {
                const keys = Object.keys(this._.data);
                for (const key of keys) {
                    if (!this._isObject(this._.data[key])) {
                        remove(key);
                    }
                }
            }
        } else {
            this._.events = {}; // Remove all events
        }
    }

    /**
    * Adds new property to object (only non object properties)
    *
    * @method _add
    * @param {string} key
    * @param {string} value (default null)
    * @return {undefined}
    */
    _add (key, value = null) {
        this._.data[key] = value;
        this._addProperty(key);
    }

    /**
    * Clears all properties and set them null or empty array
    *
    * @method _clear
    * @return {undefined}
    */
    _clear (values = {}) {
        const keys = Object.keys(this);
        for (const key of keys) {
            if (values[key]) {
                this[key] = values[key];
            } else {
                if (Array.isArray(this[key])) {
                    this[key] = [];
                } else if (typeof this[key] === 'boolean') {
                    this[key] = false;
                } else if (typeof this[key] === 'number') {
                    this[key] = 0;
                } else if (typeof this[key] === 'string') {
                    this[key] = '';
                } else {
                    this[key] = null;
                }
            }
        }
    }
}


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { Model: Model };
} else {
    window.bimo = window.bimo || {};
    window.bimo.Model = Model;
}
"use strict";

/**
* Bind (event binder between single value and DOM control(s)
*
* @class Bind
* @constructor
* @param {object} options
*/
class Bind {

	// Constructor
	constructor (options = {}) {
    	if (typeof options.config === 'string') {
        	options.config = { selector: options.config };
    	}
    	options.config = options.config || {};
    	this.handlers = {};

	    // Assign configuration
	    const optionsKeys = Object.keys(options);
	    for (const key of optionsKeys) {
	        if (key !== 'config') {
	            this[key] = options[key];
	        }
	    }

	    // Set defaults
	    this.twoWay = (this.twoWay === undefined ? options.defaults.twoWay : this.twoWay);
	    this.event = this.event || options.defaults.event;
	    this.property = this.property || options.defaults.property;
	    this.elements = options.config.elements || null;
	    this.selector = options.config.selector || null;
	    
	    // Load configuration keys
	    const configKeys = Object.keys(options.config);
	    for (const key of configKeys) { 
            this[key] = options.config[key];
	    }
	    // Other custom events
	    this.events = this.events || {};
	    
	    // Find elements
	    if (this.isEmpty(this.elements)) {
	        if (this.isEmpty(this.selector)) {
	            this.elements = null;
	        } else {
	            this.elements = (typeof this.selector === 'string') ? this.container.querySelectorAll(this.selector) : this.selector;
	            if (this.elements === null) {
	                throw new Error(['"', this.selector.toString(), '" element not found!']);
	            }
	        }
	    }
	}

    /**
    * Changes visibility of the associated elements
    * 
    * @propery visible
    */
    get visible () {
        let out = true;
        if (!this.isEmpty(this.elements) && !this.isEmpty(this.elements[0])) {
            out = (this.elements[0].style.display !== 'none');
        }
        return out;
    }

    set visible (value) {
    	for (const element of this.elements) {
            element.style.display = (value ? (this.display || '') : 'none');
        } 
    }

    /**
    * Changes disabled flag of the associated elements
    * 
    * @propery disabled
    */
    get disabled () {
        let out = false;
        if (!this.isEmpty(this.elements) && !this.isEmpty(this.elements[0])) {
            out = this.elements[0].disabled;
        }
        return out;
    }

    set disabled (value) {
        for (const element of this.elements) {
            element.disabled = value;
        }
    }

    /**
    * Changes readOnly flag of the associated elements (INPUT only)
    * 
    * @propery readOnly
    */
    get readOnly () {
        let out = false;
        if (!this.isEmpty(this.elements) && !this.isEmpty(this.elements[0]) && !['INPUT', 'TEXTAREA'].includes(this.elements[0].nodeName)) {
            out = this.elements[0].readOnly;
        }
        return out;
    }

    set readOnly (value) {
        for (const element of this.elements) {
            if (!['INPUT', 'TEXTAREA'].includes(element.nodeName)) {
                element.readOnly = value;
            }
        }
    }

	/**
    * Changes required flag of the associated elements
    * 
    * @propery required
    */
    get required () {
        let out = false;
        if (!this.isEmpty(this.elements) && !this.isEmpty(this.elements[0])) {
            out = this.elements[0].required;
        }
        return out;
    }

    set required (value) {
        for (const element of this.elements) {
            element.required = value;
        }
    }

    /* Add event handler */
    addEvent (element, type, handler) {
        if (element.attachEvent) {
            element.attachEvent('on' + type, handler);
        } else {
            element.addEventListener(type, handler);
        }
    }

    /* Load options for SELECT type HTML controls */
    addOptions (control, selected) {
        let opt;
        let items;
        if (this.options) {
            control.options.length = 0; // Remove all existing options
            // Load inital option
            if (this.placeHolder) {
                opt = document.createElement('option');
                opt.value = '';
                opt.innerHTML = this.placeHolder;
                if (selected === undefined || selected === null || selected === '') {
                    opt.selected = 'selected';
                }
                opt.disabled = 'disabled';
                control.appendChild(opt);
            }
            // Load all the options
            if (typeof this.options === 'function') {
                items = this.options(this);
            } else {
                items = this.options;
            }
            if (items) {
                // Convert array to object
                if (Array.isArray(items)) {
                    var temp = {};
                    for (const item of items) {
                        temp[item] = item;
                    }
                    items = temp;
                }
                const keys = Object.keys(items);
                for (const key of keys) {
                    opt = document.createElement('option');
                    opt.value = key;
                    opt.innerHTML = items[key];
                    if (key === selected) {
                        opt.selected = 'selected';
                    }
                    control.appendChild(opt);
                }
            }
        }
    }

    /* Remove event handler */
    removeEvent (element, type, handler) {
        if (element.detachEvent) {
            element.detachEvent('on' + type, handler);
        } else {
            element.removeEventListener(type, handler);
        }
    }

    /* Wires up custom event */
    customEvent (key, handler) {
        const out = (e) => {
            handler(this, e);
        };
        this.handlers[key] = out;
        return out;
    }

    /* Checks if it has valid element(s) */
    isEmpty (obj) {
        return (obj === undefined || obj === null);
    }

    /* Gets the value from the HTML control */
    getValue (control) {
        let out;
        if (control !== null) {
            if (['SELECT', 'INPUT', 'TEXTAREA'].includes(control.nodeName)) {
                var type = control.type.toLowerCase();
                if (type === 'checkbox') {
                    out = control.checked;
                } else if (type === 'file') {
                    out = control.files;
                } else if (type === 'number') {
                    out = Number(control[this.property]);
                } else if (type === 'date') {
                    out = control.valueAsDate;
                } else if (type === 'time') {
                    out = control.value; 
                } else if (type === 'datetime-local') {
                    out = control.valueAsDate;
                } else {
                    out = control[this.property];
                }
            } else {
                out = control.innerHTML;
            }
        }
        // Apply parsing (if exists)
        if (typeof this.write === 'function') {
            out = this.write.call(this, out, control);
        }
        return out;
    }

    /* Sets the value for HTML control */
    setValue (value, refresh = false) {
        // Apply formatting if exists
        if (typeof this.read === 'function') {
            this.read.call(this, value);
        } else if (!this.isEmpty(this.elements)) {
            // Assign value
            for (const element of this.elements) {
                // Check by type
                if (['SELECT', 'INPUT', 'TEXTAREA'].includes(element.nodeName)) {
                    const type = element.type.toLowerCase();
                    // Check for empty
                    if (this.isEmpty(value)) {
                        if (type === 'checkbox') {
                            element.checked = false;
                        } else if (type === 'file') {
                            // No input value from model here
                        } else {
                            if (element[this.property] !== '') {
                                element[this.property] = '';
                            }
                        }
                    } else {
                        if (type === 'checkbox') {
                            if (element.checked !== value || refresh === true) {
                                element.checked = value;
                            }
                        } else if (type === 'file') {
                            // No input value from model here
                        } else if (type === 'date') {
                            if (typeof value === 'string') {
                                element.value = value.substr(0, 10);
                            } else if (value && typeof value.toISOString === 'function') {
                                element.value = value.toISOString().substr(0, 10);
                            }
                        } else if (type === 'time') {
                            if (typeof value === 'string') {
                                element.value = value.substr(11, 5);
                            } else if (value && typeof value.toISOString === 'function') {
                                element.value = value.toISOString().substr(11, 5);
                            }
                        } else if (type === 'datetime-local') {
                            if (typeof value === 'string') {
                                element.value = value.substr(0, 16);
                            } else if (value && typeof value.toISOString === 'function') {
                                element.value = value.toISOString().substr(0, 16);
                            }
                        } else {
                            if (element[this.property] !== value || refresh === true) {
                                element[this.property] = value;
                            }
                        }
                    }
                } else {
                    if (this.isEmpty(value)) {
                        if (element.innerHTML !== '') {
                            element.innerHTML = '';
                        }
                    } else {
                        if (element.innerHTML !== value || refresh === true) {
                            element.innerHTML = value;
                        }
                    }
                }
            }                
        }
    }

    /* Event handler for HTML control changed  */
    controlChanged (e) {
    	const changed = (element) => {
	        if (this.twoWay === true) {
	            const value = this.getValue(element);
	            if (value !== undefined) {
	                this.model[this.key] = value;
	            }
	        }
	    };
	    changed(e.target);
    }

    /* Event handler for the model value */
    modelChanged (data) {
    	const keys = Object.keys(data);
        for (const key of keys) {
            if (this.key === key) {
                this.setValue(this.model[key], data.refresh);
            }
        }
    }

    /**
    * Applies the bind between the control and the value
    * 
    * @method bind
    */
    bind (callback) {
        // Assign initial value from model and prepare options etc
        if (!this.isEmpty(this.elements)) {
            for (const element of this.elements) {
                if (element.nodeName === 'SELECT') {
                    this.addOptions(element, this.model[this.key]);
                }
            }
            this.setValue(this.model[this.key]);
        }

        // Bind to model watch event
        this.model._watch(this.key, this.modelChanged);
        // Bind to control when not read only (both direction)
        if (this.twoWay === true && !this.isEmpty(this.elements)) {
            for (const element of this.elements) {
                this.addEvent(element, this.event, this.controlChanged);
            }
        }
        // Wire up all other custom events
        const keys = Object.keys(this.events);
        for (const key of keys) {
            if (typeof this.events[key] === 'function') {
                const handler = this.customEvent(key, this.events[key]);
                for (const element of this.elements) {
                    this.addEvent(element, key, handler);
                }
            }
        }

        // Call the callback method if supplied
        if (typeof callback === 'function') {
            callback.call(this);
        }
    }

    /**
    * Removes bind between the control and value
    * 
    * @method unbind
    */
    unbind (callback) {
        // Remove model watch event
        this.model._unwatch(this.key, this.modelChanged);
        // Default clearing of binding
        if (this.twoWay === true) {
            for (const element of this.elements) {
                this.removeEvent(element, this.event, this.controlChanged);
            }
        }
        // Remove all other custom events
        const keys = Object.keys(this.handlers);
        for (const key of keys) {
            for (const element of this.elements) {
                this.removeEvent(element, key, this.handlers[key]);
            }
        }
        // Call the callback method if supplied
        if (typeof callback === 'function') {
            callback(this);
        }
    }
}

window.bimo = window.bimo || {};
window.bimo.Bind = Bind;

/**
* Event binder between model and HTML controls
*
* @class Binder
* @constructor
* @param {object} options
*/
class Binder {

	// Constructor
	constructor (options = {}) {
	    this.container = this.getContainer(options.container);
	    this.model = options.model || {};
	    this.binds = {};
        this.init(this.container, this.model, options.config, options.defaults);
	}

    /**
    * Initialize binding 
    * 
    * @method init
    * @param {DOM object} container - container node element for the binding
    * @param {object} model - data model
    * @param {object} config - binding configuration objects
    * @param {object} defaults - default values for bind objects
    */
    init (container, model, config, defaults =  { twoWay: true, event: 'change', property: 'value' }) {
        // Update references
        if (container) {
            this.container = this.getContainer(container);
        }
        this.model = model;
        // Create bindings
        if (config) {
            // Loop over all the configuration elements
            const keys = Object.keys(config);
            for (const key of keys) {
                // Detect if multiple bindings specified
                if (Array.isArray(config[key]) === true) {
                    this.binds[key] = [];
                    for (const cfg of config[key]) {
                        var item = new window.bimo.Bind({
                            container: this.container,
                            model: this.model,
                            key: key,
                            config: cfg,
                            defaults: defaults
                        });
                        this.binds[key].push(item);
                    }
                } else {
                    this.binds[key] = new window.bimo.Bind({
                        container: this.container,
                        model: this.model,
                        key: key,
                        config: config[key],
                        defaults: defaults
                    });
                }
            }
        }
    }

    /* Checks the container */
    getContainer (container) {
        let out = container;
        if (out === undefined || out === null) {
            out = document;
        } else if (typeof container === 'string') {
            out = document.querySelector(out);
            if (out === null) {
                throw new Error(['"', container, '" container selector not found!']);
            }
        }
        return out;
    }

    /**
    * Binds all items
    * 
    * @method bind
    */
    bind (callback) {
    	const keys = Object.keys(this.binds);
    	for (const key of keys) {
    		try {
    			if (Array.isArray(this.binds[key])) {
    				for (const item of this.binds[key]) {
    					item.bind();
    				}
    			} else {
    				this.binds[key].bind();
    			}
    		} catch (err) {
    			console.error(key, err);
    		}
        }
        if (typeof callback === 'function') {
            callback.call(this);
        }
    }

    /**
    * Remove all binds
    * 
    * @method remove
    */
    unbind (callback) {
        const keys = Object.keys(this.binds);
        for (const key of keys) {
        	try {
        		if (Array.isArray(this.binds[key])) {
        			for (const item of this.binds[key]) {
        				item.unbind();
        			}
        		} else {
        			this.binds[key].unbind();
        		}
        	} catch (err) {
        		console.error(key, err);
        	}
        }
        if (typeof callback === 'function') {
            callback.call(this);
        }
    }
}

window.bimo.Binder = Binder;