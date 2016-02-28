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