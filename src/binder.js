"use strict";

window.bimo = window.bimo || {};

/**
* Bind (event binder between single value and DOM control(s)
*
* @class Bind
* @constructor
* @param {object} options
*/
window.bimo.Bind = function (options) {
    var self = this,
    key,
    _handlers = {},
    addEvent,
    addOptions,
    removeEvent,
    customEvent,
    isEmpty,
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
    addEvent = function (el, type, handler) {
        if (el.attachEvent) {
            el.attachEvent('on' + type, handler);
        } else {
            el.addEventListener(type, handler);
        }
    };

    /* Load options for SELECT type HTML controls */
    addOptions = function (control, selected) {
        var opt,
        items,
        key;
        if (self.options) {
            control.options.length = 0; // Remove all existing options
            // Load inital option
            if (self.placeHolder) {
                opt = document.createElement('option');
                opt.value = '';
                opt.innerHTML = self.placeHolder;
                if (selected === undefined || selected === null || selected === '') {
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
                        opt.innerHTML = items[key];
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
    removeEvent = function (el, type, handler) {
        // if (el.removeEventListener) not working in IE11
        if (el.detachEvent) {
            el.detachEvent('on' + type, handler);
        } else {
            el.removeEventListener(type, handler);
        }
    };

    /* Wires up custom event */
    customEvent = function (key, handler) {
        var result = function (e) {
            handler.call(self, e);
        };
        _handlers[key] = result;
        return result;
    };

    /* Checks if it has valid element(s) */
    isEmpty = function (obj) {
        return (obj === undefined || obj === null);
    };

    /* Gets the value from the HTML control */
    getValue = function (control) {
        var result;
        if (control !== null) {
            if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(control.nodeName) !== -1) {
                var type = control.type.toLowerCase();
                if (type === 'checkbox') {
                    result = control.checked;
                } else if (type === 'file') {
                    result = control.files;
                } else if (type === 'number') {
                    result = Number(control[self.property]);
                } else if (type === 'date') {
                    result = control.valueAsDate;
                } else if (type === 'time') {
                    result = control.value; 
                } else if (type === 'datetime-local') {
                    result = control.valueAsDate;
                } else {
                    result = control[self.property];
                }
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
    setValue = function (value, refresh = false) {
        // Apply formatting if exists
        if (typeof self.read === 'function') {
            self.read.call(self, value);
        } else if (!isEmpty(self.elements)) {
            // Assign value
            for (var i = 0, len = self.elements.length; i < len; i++) {
                // Check by type
                if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(self.elements[i].nodeName) !== -1) {
                    var type = self.elements[i].type.toLowerCase();
                    // Check for empty
                    if (isEmpty(value)) {
                        if (type === 'checkbox') {
                            self.elements[i].checked = false;
                        } else if (type === 'file') {
                            // No input value from model here
                        } else {
                            if (self.elements[i][self.property] !== '') {
                                self.elements[i][self.property] = '';
                            }
                        }
                    } else {
                        if (type === 'checkbox') {
                            if (self.elements[i].checked !== value || refresh === true) {
                                self.elements[i].checked = value;
                            }
                        } else if (type === 'file') {
                            // No input value from model here
                        } else if (type === 'date') {
                            if (typeof value === 'string') {
                                self.elements[i].value = value.substr(0, 10);
                            } else if (value && typeof value.toISOString === 'function') {
                                self.elements[i].value = value.toISOString().substr(0, 10);
                            }
                        } else if (type === 'time') {
                            if (typeof value === 'string') {
                                self.elements[i].value = value.substr(11, 5);
                            } else if (value && typeof value.toISOString === 'function') {
                                self.elements[i].value = value.toISOString().substr(11, 5);
                            }
                        } else if (type === 'datetime-local') {
                            if (typeof value === 'string') {
                                self.elements[i].value = value.substr(0, 16);
                            } else if (value && typeof value.toISOString === 'function') {
                                self.elements[i].value = value.toISOString().substr(0, 16);
                            }
                        } else {
                            if (self.elements[i][self.property] !== value || refresh === true) {
                                self.elements[i][self.property] = value;
                            }
                        }
                    }
                } else {
                    if (isEmpty(value)) {
                        if (self.elements[i].innerHTML !== '') {
                            self.elements[i].innerHTML = '';
                        }
                    } else {
                        if (self.elements[i].innerHTML !== value || refresh === true) {
                            self.elements[i].innerHTML = value;
                        }
                    }
                }
            }                
        }
    };

    /* Event handler for HTML control changed  */
    controlChanged = function (e) {
        if (self.twoWay) {
            var value = getValue(e.target);
            if (value !== undefined) {
                self.model[self.key] = value;
            }
        }
    };

    /* Event handler for the model value */
    modelChanged = function (data) {
        for (var key in data) {
            if (data.hasOwnProperty(key) && self.key === key) {
                setValue(self.model[key], data.refresh);
            }
        }
    };

    /**
    * Applies the bind between the control and the value
    * 
    * @method bind
    */
    self.bind = function (cb) {
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
    self.unbind = function (cb) {
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
            self.elements = (typeof self.selector === 'string') ? self.container.querySelectorAll(self.selector) : self.selector;
            if (self.elements === null) {
                throw new Error(['"', self.selector.toString(), '" element not found!']);
            }
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
window.bimo.Binder = function (options) {
    var self = this,
    getContainer;

    /* Checks the container */
    getContainer = function (container) {
        var result = container;
        if (result === undefined || result === null) {
            result = document;
        } else if (typeof container === 'string') {
            result = document.querySelector(result);
            if (result === null) {
                throw new Error(['"', container, '" container selector not found!']);
            }
        }
        return result;
    };

    /**
    * Container DOM node
    * 
    * @property container - DOM object
    */
    self.container = getContainer(options.container);

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
    self.run = function (methodName) {
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
    self.init = function (container, model, config, defaults) {
        var key;
        // Update references
        if (container) {
            self.container = getContainer(container);
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
    self.bind = function (cb) {
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
    self.unbind = function (cb) {
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