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
        Object.assign(this, options);

        // handlers
        this.controlHandler = (e) => { 
           this.controlChanged(e); 
        };
        this.modelHandler = (data) => { 
            this.modelChanged(data); 
        };
	    
	    // Other custom events
        this.handlers = {};
	    this.events = this.events || {};
        this.elements = this.elements || null;
        this.selector = this.selector || null;
	    
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
    getValue (target) {
        let out;
        if (target !== null) {
            if (['SELECT', 'INPUT', 'TEXTAREA'].includes(target.nodeName)) {
                var type = target.type.toLowerCase();
                if (type === 'checkbox') {
                    out = target.checked;
                } else if (type === 'file') {
                    out = target.files;
                } else if (type === 'number') {
                    out = Number(target[this.property]);
                } else if (type === 'date') {
                    out = target.valueAsDate;
                } else if (type === 'time') {
                    out = target.value; 
                } else if (type === 'datetime-local') {
                    out = target.valueAsDate;
                } else {
                    out = target[this.property];
                }
            } else {
                out = target.innerHTML;
            }
        }

        // Apply parsing (if exists)
        if (typeof this.write === 'function') {
            out = this.write({ value: out, elements: this.elements, target: target, binding: this });
        }
        return out;
    }

    /* Sets the value for HTML control */
    setValue (value, refresh = false) {
        // If method specified then control update will happen there
        const args = { value: value, elements: this.elements, binding: this };
        if (typeof this.read === 'function') {
            this.read(args);
        } else if (!this.isEmpty(this.elements)) {
            if (typeof this.format === 'function') {
                value = this.format(args);
            }
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
        if (this.twoWay === true) {
            const value = this.getValue(e.target);
            if (value !== undefined) {
                this.model[this.key] = value;
            }
        }
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
    * Handles binding and unbinding
    * 
    * @method apply
    */
    apply (bind, callback) {

       	if (bind === true) {
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
	        this.model._watch(this.key, this.modelHandler);
	        // Bind to control when not read only (both direction)
	        if (this.twoWay === true && !this.isEmpty(this.elements)) {
	            for (const element of this.elements) {
	                this.addEvent(element, this.event, this.controlHandler);
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
	    } else {
	        // Remove model watch event
	        this.model._unwatch(this.key, this.modelHandler);
	        // Default clearing of binding
	        if (this.twoWay === true) {
	            for (const element of this.elements) {
	                this.removeEvent(element, this.event, this.controlHandler);
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
    init (container, model, config = {}, defaults = { twoWay: true, event: 'change', property: 'value' }) {
        // Update references
        if (container) {
            this.container = this.getContainer(container);
        }
        this.model = model;
        // Create bindings
        // Loop over all the configuration elements
        const keys = Object.keys(config);
        for (const key of keys) {
            // Detect if multiple bindings specified
            if (Array.isArray(config[key]) === true) {
                this.binds[key] = [];
                for (const cfg of config[key]) {
                    const opt = Object.assign({}, defaults, cfg, {
                        container: this.container,
                        model: this.model._model(key),
                        key: this.model._property(key)
                    });
                    const item = new window.bimo.Bind(opt);
                    this.binds[key].push(item);
                }
            } else {
                const cfg = (typeof config[key] === 'string') ? { selector: config[key] } : config[key];
                const opt = Object.assign({}, defaults, cfg, {
                    container: this.container,
                    model: this.model._model(key),
                    key: this.model._property(key)
                });
                this.binds[key] = new window.bimo.Bind(opt);
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
    					item.apply(true);
    				}
    			} else {
    				this.binds[key].apply(true);
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
        				item.apply(false);
        			}
        		} else {
        			this.binds[key].apply(false);
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