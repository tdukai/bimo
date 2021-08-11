/*global bimo */
"use strict";

// Lookup
const lookups = {
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
const json = {
    address: {
        state: 'CA',
        city: 'San Jose',
        min: 23,
        max: 34
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

// Update textarea with JSON
function displayModel () {
    const obj = {
        data: model._toObject(),
        changes: model._delta()
    };
    document.querySelector('#json-out').value = JSON.stringify(obj, null, 4);
}

// Watch event
function doWatch (obj) {
    // Loop object and display to console
    const out = [];
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

// Helper method to convert to number
function toNumber (args) {
    let out = args.value;
    if (isNaN(args.value)) {
        out = 0;
    } else {
        out = Number(args.value);
    }
    return out;
}

// Helper method to format before reach control
function suppressZero (args) {
    let out = String(args.value);
    if (out === '0') {
        out = '';
    }
    return out;
}

// Define binder object
const binder = new bimo.Binder({
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
            read: (args) => {
                for (let i = 0, len = args.elements.length; i < len; i++) {
                    const el = args.elements[i];
                    el.checked = (args.value === el.value);
                }
            },
            write: (args) => {
                let out;
                for (let i = 0, len = args.elements.length; i < len; i++) {
                    const el = args.elements[i];
                    if (el.checked === true) {
                        out = el.value;
                        break;
                    }
                }
                return out;
            }
        },
        birthday: '.js-birthday',
        age: {
            selector: '.js-age',
            events: { // Any valid event can be wired up if specified in the "events" sub object
                focus: () => {
                    console.log('Age here');
                }
            }
        },
        cars: {
            selector: '.js-cars',
            read: (args) => {
                // I know only 1 node here
                const el = args.elements[0];
                for (let i = 0, len = el.options.length; i < len; i++) {
                    const option = el.options[i];
                    if (args.value.includes(option.value)) {
                        option.selected = true;
                    }
                }
            },
            write: (args) => {
                const out = [];
                for (let i = 0, len = args.target.options.length; i < len; i++) {
                    const option = args.target.options[i];
                    if (option.selected === true) {
                        out.push(option.value);
                    }
                }
                return out;
            }
        },
        movies: {
            selector: 'input[name="movies"]',
            read: (args) => {
                for (let i = 0, len = args.elements.length; i < len; i++) {
                    const el = args.elements[i];
                    el.checked = args.value.includes(el.value);
                }
            },
            write: (args) => {
                const out = [];
                for (let i = 0, len = args.elements.length; i < len; i++) {
                    const el = args.elements[i];
                    if (el.checked === true) {
                        out.push(el.value);
                    }
                }
                return out;
            }
        },
        'address.state': [
            {
                selector: '.js-state',
                options: lookups.states,
                placeHolder: 'Select a state',
                write: (args) => {
                    return args.value.toUpperCase();
                }
            },
            {
                selector: '.js-state-name',
                twoWay: false, // Disable 2 way binding this part is readonly
                read: (args) => {
                    const el = args.elements[0];
                    el.innerHTML = lookups.states[args.value];
                }
            }
        ],
        'address.city': {
            selector: '.js-city',
            event: 'keyup',
            events: { // Any valid event can be wired up if specified in the "events" sub object
                blur: () => {
                    console.log('Leaving city');
                },
                read: (value) => {
                    console.log('Refreshed city');
                    return value;
                }
            }
        },
        'address.min': {
            selector: '#address-min',
            write: toNumber,
            format: suppressZero
        },
        'address.max': {
            selector: '#address-max',
            write: toNumber,
            format: suppressZero
        }
    }
});

// Setup sample buttons
const buttons = {
    bind: document.getElementById('bindBtn'),
    unbind: document.getElementById('unbindBtn'),
    revert: document.getElementById('revertBtn'),
    clear: document.getElementById('clearBtn'),
    refresh: document.getElementById('refreshBtn'),
    suspend: document.getElementById('suspendBtn'),
    resume: document.getElementById('resumeBtn')
};

// Wire up the events
buttons.bind.addEventListener('click', () => {
    binder.bind();
    displayModel();
    buttons.bind.disabled = true;
    buttons.unbind.disabled = false;
});

buttons.unbind.addEventListener('click', () => {
    binder.unbind();
    buttons.bind.disabled = false;
    buttons.unbind.disabled = true;
});

buttons.revert.addEventListener('click', () => {
    model._revert();
});

buttons.clear.addEventListener('click', () => {
    model._clear();
});

buttons.refresh.addEventListener('click', () => {
    model._refresh('age');
});

buttons.suspend.addEventListener('click', () => {
    model._suspend();
    buttons.suspend.disabled = true;
    buttons.resume.disabled = false;
});

buttons.resume.addEventListener('click', () => {
    model._resume();
    buttons.suspend.disabled = false;
    buttons.resume.disabled = true;
});