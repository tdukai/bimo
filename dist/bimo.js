/*global window */
"use strict";

var isBrowser = (typeof window !== 'undefined'),
    isNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');

/**
* Model base class 
* @class Model
* @param {object} content in simple javascript object format
* @constructor
*/
var Model = function (data) {
    this._dt = data;
    this._ev = {};
    this._df = {};
    this._sp = false;
    this._ct = 0;
    // Assign keys
    for (var key in this._dt) {
        this._addProperty(key);
    }
};

/**
* Checks if variable is a "real" object
*
* @method _isObject
* @param {any} variable
* @return {boolean} True if event added to the list
*/
Model.prototype._isObject = function _isObject (obj) {
    return (Object.prototype.toString.call(obj) === '[object Object]');
};

/**
* Converts model into simple javascript object
*
* @method _toObject
* @return {object} model content in simple javascript object
*/
Model.prototype._toObject = function _toObject () {
    return this._dt;
};

/**
* Suspends events firing
*
* @method _suspend
* @return {undefined}
*/
Model.prototype._suspend = function _suspend () {
    this._sp = true;
    this._ct = 0;
};

/**
* Resumes event firing
*
* @method _resume
* @return {undefined}
*/
Model.prototype._resume = function _resume () {
    var self = this;
    self._sp = false;
    if (self._ct > 0) {
        self._ct = 0;
        var list = [],
        i,
        len;
        for (var key in self._dt) {
            if (self._dt.hasOwnProperty(key) && Array.isArray(self._ev[key])) {
                for (i = 0, len = self._ev[key].length; i < len; i++) {
                    if (list.indexOf(self._ev[key][i]) === -1) {
                        list.push(self._ev[key][i]);
                    }
                }
            }
        }
        // Run all distinct methods and send argument the cumulated result
        for (i = 0, len = list.length; i < len; i++) {
            if (typeof list[i] === 'function') {
                list[i].call(self, self._df);
            }
        }
    }
};

/**
* Returns all changed keys (delta) since the beginning or the last reset
*
* @method _delta
* @return {object} all changed keys with previous actual and original values
*/
Model.prototype._delta = function _delta () {
    return this._df;
};

/**
* Reset change tracking (delta)
*
* @method _reset
* @return {undefined} 
*/
Model.prototype._reset = function _reset () {
    this._df = {};
};

/**
* Restore original value(s)
*
* @method _revert
* @params {undefined/string/array} name(s) of properties, if none specified all keys content will revert back
* @return {undefined} 
*/
Model.prototype._revert = function _revert (name) {
    var self = this,
    revert = function (name) {
        if (self._df[name]) {
            self[name] = self._df[name].original;
        }
    };
    // Check the type
    if (typeof name === 'string') {
        revert(name);
    } else if (Array.isArray(name)) {
        for (var i = 0, len = name.length; i < len; i++) {
            revert(name[i]);
        }
    } else if (name === undefined) {
        for (var key in self._dt) {
            if (self._dt.hasOwnProperty(key)) {
                revert(self._dt[key]);
            }
        }
    }
};

/**
* Adds new callback to change event list but checking if the event already on the list avoiding double subscription
*
* @method on
* @param {String/Array/Object/function} name / names / name or callback object
* @param {Function} callback method pointer - it can be specified as first parameter
* @return {undefined}
*/
Model.prototype._watch = function _watch () {
    var self = this,
    param,
    event,
    values = {},
    key,
    i,
    len;
    if (arguments.length > 0) {
        if (arguments.length === 1) {
            if (typeof arguments[0] === 'function') {
                event = arguments[0];
            } else if (self._isObject(arguments[0])) {
                param = arguments[0];
            }
        } else if (arguments.length >= 2) {
            param = arguments[0];
            event = arguments[1];
        }
        // Check first parameter
        if (typeof param === 'string' && typeof event === 'function') {
            var list = param.split(' ');
            for (i = 0, len = list.length; i < len; i++) {
                values[list[i]] = event;
            }
        } else if (Array.isArray(param) && typeof event === 'function') {
            for (i = 0, len = param.length; i < len; i++) {
                values[param[i]] = event;
            }
        } else if (self._isObject(param)) {
            values = param;
        } else if (typeof event === 'function') {
            for (key in self._dt) {
                if (self._dt.hasOwnProperty(key) && !self._isObject(self._dt[key])) {
                    values[key] = event;
                }
            }
        }
        // Loop through all the names and create entry in events
        for (key in values) {
            if (values.hasOwnProperty(key)) {
                if (self._ev[key] && self._ev[key].indexOf(event) === -1) {
                    self._ev[key].push(values[key]);
                } else {
                    self._ev[key] = [values[key]];
                }
            }
        }
    }
};

/**
* Removes references from change event list
*
* @method _unwatch
* @param {String/Array/Object} name / names / name - callback object
* @param {Function} callback method pointer - optional, if not specified it will remove all references registered for the same name
* @return {undefined}
*/
Model.prototype._unwatch = function _unwatch () {
    var self = this,
    param,
    event,
    key,
    i,
    len,
    remove = function remove (key) {
        if (typeof event === 'function' && Array.isArray(self._ev[key])) {
            var pos = self._ev[key].indexOf(event);
            if (pos > -1) {
                self._ev[key] = self._ev[key].splice(pos, 1);
            }
        } else {
            self._ev[key] = null;
            delete self._ev[key];
        }
    };
    // Check arguments passed in
    if (arguments.length > 0) {
        if (arguments.length === 1) {
            if (typeof arguments[0] === 'function') {
                event = arguments[0];
            } else if (self._isObject(arguments[0])) {
                param = arguments[0];
            }
        } else if (arguments.length >= 2) {
            param = arguments[0];
            event = arguments[1];
        }
        // Check first parameter
        if (typeof param === 'string') {
            var list = param.split(' ');
            for (i = 0, len = list.length; i < len; i++) {
                remove(list[i]);
            }
        } else if (Array.isArray(param)) {
            for (i = 0, len = param.length; i < len; i++) {
                remove(param[i]);
            }
        } else if (self._isObject(param)) {
            for (key in param) {
                if (param.hasOwnProperty(key)) {
                    remove(key);
                }
            }
        } else {
            for (key in self._dt) {
                if (self._dt.hasOwnProperty(key) && !self._isObject(self._dt[key])) {
                    remove(key);
                }
            }
        }
    } else {
        self._ev = {}; // Remove all events
    }
};

/**
* Adds new property to object (only non object properties)
*
* @method _addProperty
* @param {string} property name
* @return {undefined}
*/
Model.prototype._addProperty = function _addProperty (key) {
    var self = this,
    isEqual = function isEqual (a, b) {
        var result = false;
        if (Array.isArray(a) && Array.isArray(b)) {
            result = (a.length === b.length); // Check length first
            if (result) {
                // search array a elements in b
                for (var i = 0, len = a.length; i < len; i++) {
                    if (b.indexOf(a[i]) === -1) { // if event 1 item not matching it's not the same!
                        result = false;
                        break;
                    }
                }
            }
        } else {
            result = (a === b);
        }
        return result;
    };
    // Only create property against own key and non-object element
    if (self._dt.hasOwnProperty(key) && !self._isObject(self._dt[key])) {
        Object.defineProperty(self, key, {
            configurable: false,
            enumerable: true,
            get: function () {
                var result = self._dt[key];
                // Look for formatter method
                if (typeof self[key + 'Read'] === 'function') {
                    result = self[key + 'Read'](result);
                }
                return result;
            },
            set: function (actual) {
                // Check for parser method
                if (typeof self[key + 'Write'] === 'function') {
                    actual = self[key + 'Write'](actual);
                }
                // Get previous value
                var previous = self._dt[key],
                arg = {};
                if (previous !== actual) {
                    // Update with new value
                    self._dt[key] = actual;
                    // Update delta
                    self._df[key] = self._df[key] || { original: previous };
                    self._df[key].actual = actual;
                    self._df[key].previous = previous;
                    // Count event if suspended
                    if (self._sp) {
                        self._ct++; // Count changes
                    } else if (Array.isArray(self._ev[key])) { // Otherwise run events
                        // Collect all keys from diff
                        arg[key] = {};
                        for (var k in self._df[key]) {
                            if (self._df[key].hasOwnProperty(k)) {
                                arg[key][k] = self._df[key][k];
                            }
                        }
                        // If value reverted back to original remove it
                        if (isEqual(self._df[key].actual, self._df[key].original)) {
                            delete self._df[key];
                        }
                        // Run event
                        for (var i = 0, len = self._ev[key].length; i < len; i++) {
                            if (typeof self._ev[key][i] === 'function') {
                                self._ev[key][i].call(self._ev[key][i], arg);
                            }
                        }
                    }
                }
            }
        });
    }
};

if (isBrowser) {
    window.bimo = window.bimo || {};
    window.bimo.Model = Model;
} else if (isNode) {
    module.exports = {
        Model: Model
    };
}
/*global window, document */

window.bimo = window.bimo || {};

/**
* Bind (event binder between single value and DOM control(s)
*
* @class Bind
* @constructor
* @param {object} options
*/
window.bimo.Bind = function Bind (options) {
    "use strict";
    var self = this,
    key,
    _handlers = {},
    addEvent,
    addOptions,
    removeEvent,
    customEvent,
    isEmpty,
    isObject,
    getValue,
    setValue,
    controlChanged,
    modelChanged;

    // Default the options
    options = options || {};
    // Create proper format if only selector string specified
    if (typeof options.config === 'string') {
        options.config = { selector: options.config };
    }
    options.config = options.config || {};

    /* Add event handler */
    addEvent = function addEvent (el, type, handler) {
        if (el.attachEvent) {
            el.attachEvent('on' + type, handler);
        } else {
            el.addEventListener(type, handler);
        }
    };

    /* Load options for SELECT type HTML controls */
    addOptions = function addOptions (control, selected) {
        var opt,
        items,
        key;
        if (self.options) {
            control.options.length = 0; // Remove all existing options
            // Load inital option
            if (self.placeHolder) {
                opt = document.createElement('option');
                opt.value = '';
                opt.label = self.placeHolder;
                if (selected === undefined) {
                    opt.selected = 'selected';
                }
                opt.disabled = 'disabled';
                control.appendChild(opt);
            }
            // Load all the options
            if (typeof self.options === 'function') {
                items = self.options.call(self);
            } else {
                items = self.options;
            }
            if (items) {
                // Convert array to object
                if (Array.isArray(items)) {
                    var temp = {};
                    for (var i = 0, len = items.length; i < len; i++) {
                        temp[items[i]] = items[i];
                    }
                    items = temp;
                }
                for (key in items) {
                    if (items.hasOwnProperty(key)) {
                        opt = document.createElement('option');
                        opt.value = key;
                        opt.label = items[key];
                        if (key === selected) {
                            opt.selected = 'selected';
                        }
                        control.appendChild(opt);
                    }
                }
            }
        }
    };

    /* Remove event handler */
    removeEvent = function removeEvent (el, type, handler) {
        // if (el.removeEventListener) not working in IE11
        if (el.detachEvent) {
            el.detachEvent('on' + type, handler);
        } else {
            el.removeEventListener(type, handler);
        }
    };

    /* Wires up custom event */
    customEvent = function customEvent (key, handler) {
        var result = function (e) {
            handler.call(self, e);
        };
        _handlers[key] = result;
        return result;
    };

    /* Checks if it has valid element(s) */
    isEmpty = function isEmpty (obj) {
        return (obj === undefined || obj === null);
    };

    /* Checks if something a real object */
    isObject = function isObject (obj) {
        return (Object.prototype.toString.call(obj) === '[object Object]');
    };

    /* Gets the value from the HTML control */
    getValue = function getValue (control) {
        var result;
        if (control !== null) {
            if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(control.nodeName) !== -1) {
                result = control[self.property];
            } else {
                result = control.innerHTML;
            }
        }
        // Apply parsing (if exists)
        if (typeof self.write === 'function') {
            result = self.write.call(self, result, control);
        }
        return result;
    };

    /* Sets the value for HTML control */
    setValue = function setValue (value) {
        // Apply formatting if exists
        if (typeof self.read === 'function') {
            self.read.call(self, value);
        } else if (!isEmpty(self.elements) && !isEmpty(value)) {
            // Assign value
            for (var i = 0, len = self.elements.length; i < len; i++) {
                if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(self.elements[i].nodeName) !== -1) {
                    if (self.elements[i][self.property] !== value) {
                        self.elements[i][self.property] = value;
                    }
                } else {
                    if (self.elements[i].innerHTML !== value) {
                        self.elements[i].innerHTML = value;
                    }
                }
            }
        }
    };

    /* Event handler for HTML control changed  */
    controlChanged = function controlChanged (e) {
        if (self.twoWay) {
            var value = getValue(e.target);
            if (value !== undefined) {
                self.model[self.key] = value;
            }
        }
    };

    /* Event handler for the model value */
    modelChanged = function modelChanged (data) {
        for (var key in data) {
            if (data.hasOwnProperty(key) && self.key === key) {
                setValue(data[key].actual);
            }
        }
    };

    /**
    * Applies the bind between the control and the value
    * 
    * @method bind
    */
    self.bind = function bind (cb) {
        // Assign initial value from model and prepare options etc
        var i,
        len,
        key;
        if (!isEmpty(self.elements)) {
            i = 0;
            len = self.elements.length;
            for (i = 0; i < len; ++i) {
                if (self.elements[i].nodeName === 'SELECT') {
                    addOptions(self.elements[i], self.model[self.key]);
                }
            }
            setValue(self.model[self.key]);
        }
        // Bind to model watch event
        self.model._watch(self.key, modelChanged);
        // Bind to control when not read only (both direction)
        if (self.twoWay && !isEmpty(self.elements)) {
            i = 0;
            len = self.elements.length;
            for (i = 0; i < len; ++i) {
                addEvent(self.elements[i], self.event, controlChanged);
            }
        }
        // Wire up all other custom events
        for (key in self.events) {
            if (self.events.hasOwnProperty(key) && typeof self.events[key] === 'function') {
                var handler = customEvent(key, self.events[key]);
                i = 0;
                len = self.elements.length;
                for (i = 0; i < len; ++i) {
                    addEvent(self.elements[i], key, handler);
                }
            }
        }
        // Call the callback method if supplied
        if (typeof cb === 'function') {
            cb.call(self);
        }
    };

    /**
    * Removes bind between the control and value
    * 
    * @method unbind
    */
    self.unbind = function unbind (cb) {
        var i,
        len,
        key;
        // Remove model watch event
        self.model._unwatch(self.key, modelChanged);
        // Default clearing of binding
        if (self.twoWay) {
            for (i = 0, len = self.elements.length; i < len; ++i) {
                removeEvent(self.elements[i], self.event, controlChanged);
            }
        }
        // Remove all other custom events
        for (key in _handlers) {
            if (_handlers.hasOwnProperty(key)) {
                for (i = 0, len = self.elements.length; i < len; ++i) {
                    removeEvent(self.elements[i], key, _handlers[key]);
                }
            }
        }
        // Call the callback method if supplied
        if (typeof cb === 'function') {
            cb.call(self);
        }
    };

    /**
    * Changes visibility of the associated elements
    * 
    * @propery visible
    */
    Object.defineProperty(self, 'visible', {
        enumerable: true,
        configurable: true,
        get: function() {
            var result = true;
            if (!isEmpty(self.elements) && !isEmpty(self.elements[0])) {
                result = (self.elements[0].style.display !== 'none');
            }
            return result;
        },
        set: function(flag) {
            for (var i = 0, len = self.elements.length; i < len; i++) {
                self.elements[i].style.display = flag ? (self.display || '') : 'none';
            } 
        }
    });

    /**
    * Changes disabled flag of the associated elements
    * 
    * @propery disabled
    */
    Object.defineProperty(self, 'disabled', {
        enumerable: true,
        configurable: true,
        get: function() {
            var result = false;
            if (!isEmpty(self.elements) && !isEmpty(self.elements[0])) {
                result = self.elements[0].disabled;
            }
            return result;
        },
        set: function(flag) {
            for (var i = 0, len = self.elements.length; i < len; i++) {
                self.elements[i].disabled = flag;
            }
        }
    });

    /**
    * Changes readOnly flag of the associated elements (INPUT only)
    * 
    * @propery readOnly
    */
    Object.defineProperty(self, 'readOnly', {
        enumerable: true,
        configurable: true,
        get: function() {
            var result = false;
            if (!isEmpty(self.elements) && !isEmpty(self.elements[0]) && ['INPUT', 'TEXTAREA'].indexOf(self.elements[0].nodeName) !== -1) {
                result = self.elements[0].readOnly;
            }
            return result;
        },
        set: function(flag) {
            for (var i = 0, len = self.elements.length; i < len; i++) {
                if (['INPUT', 'TEXTAREA'].indexOf(self.elements[i].nodeName) !== -1) {
                    self.elements[i].readOnly = flag;
                }
            }
        }
    });

    /**
    * Changes required flag of the associated elements
    * 
    * @propery required
    */
    Object.defineProperty(self, 'required', {
        enumerable: true,
        configurable: true,
        get: function() {
            var result = false;
            if (!isEmpty(self.elements) && !isEmpty(self.elements[0])) {
                result = self.elements[0].required;
            }
            return result;
        },
        set: function(flag) {
            for (var i = 0, len = self.elements.length; i < len; i++) {
                self.elements[i].required = flag;
            }
        }
    });

    // Assign configuration
    for (key in options) {
        if (options.hasOwnProperty(key) && key !== 'config') {
            self[key] = options[key];
        }
    }
    // Set defaults
    self.twoWay = self.twoWay === undefined ? options.defaults.twoWay : self.twoWay;
    self.event = self.event || options.defaults.event;
    self.property = self.property || options.defaults.property;
    self.elements = options.config.elements || null;
    self.selector = options.config.selector || null;
    // Load configuration keys
    for (key in options.config) { 
        if (options.config.hasOwnProperty(key)) {
            self[key] = options.config[key];
        }
    }
    // Other custom events
    self.events = self.events || {};
    // Find elements
    if (isEmpty(self.elements)) {
        if (isEmpty(self.selector)) {
            self.elements = null;
        } else {
            self.elements = self.container.querySelectorAll(self.selector);
        }
    }
};

/**
* Event binder between model and HTML controls
*
* @class Binder
* @constructor
* @param {object} options
*/
window.bimo.Binder = function Binder (options) {
    "use strict";
    var self = this;

    /**
    * Container DOM node
    * 
    * @property container - DOM object
    */
    self.container = options.container === undefined ? document : (typeof options.container === 'string' ? document.querySelector(options.container) : options.container);

    /**
    * Model
    * 
    * @property model - object
    */
    self.model = options.model || {};

    /**
    * Binding items
    * 
    * @property items - hash table of objects based on model keys
    */
    self.binds = {};

    /**
    * Runs specified method on all bind items 
    * 
    * 
    * @method run
    * @param {string} method name
    */
    self.run = function run (methodName) {
        var execute = function execute (item) {
            if (typeof item[methodName] === 'function') {
                item[methodName].call(item);
            }
        },
        key;
        // Run on all elements
        for (key in self.binds) {
            if (self.binds.hasOwnProperty(key)) {
                if (Array.isArray(self.binds[key])) {
                    for (var i = 0, len = self.binds[key].length; i < len; i++) {
                        execute(self.binds[key][i]);
                    }
                } else {
                    execute(self.binds[key]);
                }
            }
        }
    };

    /**
    * Initialize binding 
    * 
    * @method init
    * @param {DOM object} container - container node element for the binding
    * @param {object} model - data model
    * @param {object} config - binding configuration objects
    * @param {object} defaults - default values for bind objects
    */
    self.init = function init (container, model, config, defaults) {
        var key;
        // Update references
        if (container === undefined || container === null) {
            self.container = document;
        } else if (typeof container === 'string') {
            self.container = document.querySelector(container);
            if (self.container === null) {
                throw new Error(['"', container, '" container selector not found!']);
            }
        }
        self.model = model;
        // Create bindings
        if (config) {
            // Set default initial values
            defaults = defaults || {
                twoWay: true,
                event: 'change',
                property: 'value'
            };
            // Loop over all the configuration elements
            for (key in config) {
                if (config.hasOwnProperty(key)) {
                    // Detect if multiple bindings specified
                    if (Array.isArray(config[key]) === true) {
                        self.binds[key] = [];
                        for (var i = 0, len = config[key].length; i < len; i++) {
                            var item = new window.bimo.Bind({
                                container: self.container,
                                model: self.model,
                                key: key,
                                config: config[key][i],
                                defaults: defaults
                            });
                            self.binds[key].push(item);
                        }
                    } else {
                        self.binds[key] = new window.bimo.Bind({
                            container: self.container,
                            model: self.model,
                            key: key,
                            config: config[key],
                            defaults: defaults
                        });
                    }
                }
            }
        }
    };

    /**
    * Binds all items
    * 
    * @method bind
    */
    self.bind = function bind (cb) {
        self.run('bind');
        if (typeof cb === 'function') {
            cb.call(self);
        }
    };

    /**
    * Remove all binds
    * 
    * @method remove
    */
    self.unbind = function unbind (cb) {
        self.run('unbind');
        if (typeof cb === 'function') {
            cb.call(self);
        }
    };

    // Initialize binding
    if (options.model && options.config) {
        self.init(self.container, self.model, options.config, options.defaults);
    }
};