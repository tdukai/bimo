/*global bimo */
"use strict";

// Lookup
var lookups = {
    states: {
        AL: "Alabama",
        AK: "Alaska",
        AZ: "Arizona",
        AR: "Arkansas",
        CA: "California",
        CO: "Colorado",
        CT: "Connecticut",
        DE: "Delaware",
        DC: "District Of Columbia",
        FL: "Florida",
        GA: "Georgia",
        HI: "Hawaii",
        ID: "Idaho",
        IL: "Illinois",
        IN: "Indiana",
        IA: "Iowa",
        KS: "Kansas",
        KY: "Kentucky",
        LA: "Louisiana",
        ME: "Maine",
        MD: "Maryland",
        MA: "Massachusetts",
        MI: "Michigan",
        MN: "Minnesota",
        MS: "Mississippi",
        MO: "Missouri",
        MT: "Montana",
        NE: "Nebraska",
        NV: "Nevada",
        NH: "New Hampshire",
        NJ: "New Jersey",
        NM: "New Mexico",
        NY: "New York",
        NC: "North Carolina",
        ND: "North Dakota",
        OH: "Ohio",
        OK: "Oklahoma",
        OR: "Oregon",
        PA: "Pennsylvania",
        RI: "Rhode Island",
        SC: "South Carolina",
        SD: "South Dakota",
        TN: "Tennessee",
        TX: "Texas",
        UT: "Utah",
        VT: "Vermont",
        VA: "Virginia",
        WA: "Washington",
        WV: "West Virginia",
        WI: "Wisconsin",
        WY: "Wyoming"
    }
};

// Model
var json = {
    address: {
        state: 'CA',
        city: 'San Jose'
    },
    user: 'John Doe',
    member: false,
    gender: 'male',
    age: 34,
    birthday: new Date(2021-34, 11, 23),
    cars: [],
    movies: []
};

// Create model
const model = new bimo.Model(json);
model.address.stateWrite = (value) => {
    return value.toUpperCase();
};

// Update textarea with JSON
function displayModel () {
    var obj = {
        data: model._toObject(),
        changes: {
            main: {},
            address: {}
        }
    };
    obj.changes.main = model._delta();
    obj.changes.address = model.address._delta();
    document.querySelector('#json-out').value = JSON.stringify(obj, null, 4);
}

// Watch event
function doWatch (obj) {
    // Loop object and display to console
    var out = [];
    const keys = Object.keys(obj);
    for (const key of keys) {
        const props = Object.keys(obj[key]);
        const line = [];
        for (const prop of props) {
            line.push(`${prop} => ${obj[key][prop]}`)
        }
        console.log(line.join(', '));
    }
    // Update JSON
    displayModel();
}

// Setup watch
model._watch(doWatch);
model.address._watch(doWatch);


// Define binder object
var binder = new bimo.Binder({
    container: '#page-container',
    model: model,
    config: {
        user: '.js-name',
        member: {
            selector: '.js-membership',
            property: 'checked'
        },
        gender: {
            selector: 'input[name="gender"]',
            read: function (value) {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    control.checked = (value.indexOf(control.value) > -1);
                }
            },
            write: function () {
                var result;
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    if (control.checked === true) {
                        result = control.value;
                        break;
                    }
                }
                return result;
            }
        },
        birthday: '.js-birthday',
        age: {
            selector: '.js-age',
            events: { // Any valid event can be wired up if specified in the "events" sub object
                focus: function () {
                    console.log('Age here');
                }
            }
        },
        cars: {
            selector: '.js-cars',
            read: function (value) {
                // I know only 1 node here
                var control = this.elements[0];
                for (var i = 0, len = control.options.length; i < len; i++) {
                    var option = control.options[i];
                    if (value.indexOf(option.value) > -1) {
                        option.selected = true;
                    }
                }
            },
            write: function (value, control) {
                var result = [];
                for (var i = 0, len = control.options.length; i < len; i++) {
                    var option = control.options[i];
                    if (option.selected === true) {
                        result.push(option.value);
                    }
                }
                return result;
            }
        },
        movies: {
            selector: 'input[name="movies"]',
            read: function (value) {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    control.checked = (value.indexOf(control.value) > -1);
                }
            },
            write: function () {
                var result = [];
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    if (control.checked === true) {
                        result.push(control.value);
                    }
                }
                return result;
            }
        }
    }
});

// Bind the address part
var binderAddress = new bimo.Binder({
    container: '#page-container',
    model: model.address,
    config: {
        state: [
            {
                selector: '.js-state',
                options: lookups.states,
                placeHolder: 'Select a state',
            },
            {
                selector: '.js-state-name',
                twoWay: false, // Disable 2 way binding this part is readonly
                read: function (value) {
                    for (var i = 0, len = this.elements.length; i < len; i++) {
                        var control = this.elements[i];
                        control.innerHTML = lookups.states[value];
                    }
                }
            }
        ],
        city: {
            selector: '.js-city',
            event: 'keyup',
            events: { // Any valid event can be wired up if specified in the "events" sub object
                blur: function () {
                    console.log('Leaving city');
                },
                read: function (value) {
                    console.log('Refreshed city');
                    return value;
                }
            }
        }
    }
});

// Setup sample buttons
var buttons = {
    bind: document.getElementById('bindBtn'),
    unbind: document.getElementById('unbindBtn'),
    revert: document.getElementById('revertBtn'),
    clear: document.getElementById('clearBtn'),
    refresh: document.getElementById('refreshBtn'),
    suspend: document.getElementById('suspendBtn'),
    resume: document.getElementById('resumeBtn')
};

// Wire up the events
buttons.bind.addEventListener('click', function () {
    binder.bind();
    binderAddress.bind();
    displayModel();
    buttons.bind.disabled = true;
    buttons.unbind.disabled = false;
});

buttons.unbind.addEventListener('click', function () {
    binder.unbind();
    binderAddress.unbind();
    buttons.bind.disabled = false;
    buttons.unbind.disabled = true;
});

buttons.revert.addEventListener('click', function () {
    model._revert();
    model.address._revert();
});

buttons.clear.addEventListener('click', function () {
    model._clear();
    model.address._clear();
});

buttons.refresh.addEventListener('click', function () {
    model._refresh('age');
});

buttons.suspend.addEventListener('click', function () {
    model._suspend();
    model.address._suspend();
    buttons.suspend.disabled = true;
    buttons.resume.disabled = false;
});

buttons.resume.addEventListener('click', function () {
    model._resume();
    model.address._resume();
    buttons.suspend.disabled = false;
    buttons.resume.disabled = true;
});