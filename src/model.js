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
    constructor (data) {
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
        return (Object.prototype.toString.call(obj) === '[object Object]');     
    }

    /**
    * Checks if variable is a "real" date
    *
    * @method _isDate
    * @param {any} value
    * @return {boolean} True if event added to the list
    */
    _isDate (value) {
        return value instanceof Date && !isNaN(value.valueOf());
    }

    /**
    * Clones array or object
    *
    * @method _clone
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
            const keys = Object.keys(data);
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
    * Execute callback method after parameter check
    *
    * @method _execute
    * @params {undefined/String/Array} name(s) of properties, if none specified, then all keys will be used
    * @params {function} callback
    * @return {undefined} 
    */
    _execute (arg, callback, break = false) {
        let out;
        if (typeof callback === 'function') {
            // Check the type
        }
        return out;
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
        const delta = self._delta();
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
}


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { Model: Model };
} else {
    window.bimo = window.bimo || {};
    window.bimo.Model = Model;
}