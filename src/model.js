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