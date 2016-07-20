#  bimo (~2.5kb)
## ***Bi***nder & ***Mo***del
#### tiny but powerful micro framework

- [Binder](#binder) + [Bind](#bind)
- [Model](#model)

---

# Model
Non-opiniated observable model with multiple watch strategies. It works on both client and server side. No dependencies. It uses ES5 standard properties with generated "**get**" and "**set**" methods tracking individual changes and cumulative changes for the whole model. Also provides intercept methods for each property as needed.

Quick Reference:

|Function|Description|
|---|---|
|_delta()|Returns all changeset since creation or last _reset() call|
|_changed()|Checks if a single, a group or any property changed|
|_clone()|creates a copy of an array or object - mostly internal use)|
|_reset()|Clears out tracked changes|
|_revert()|Reverts back to the original values since creation or last _reset() call|
|_suspend()|Stops firing events at each change (still tracking)|
|_resume()|Resumes firing events. If any change occured since _suspend() then it fire once all distinct event handlers with a single multiple object of changes. (same as _delta())|
|_toObject()|Returns the pure javascript object from model. Note: model assigns original object as reference so changes will be updated directly|

|Event|Description|
|---|---|
|_watch([key(s), callback])|Setup event handlers (see examples below)|
|_unwatch([key(s), callback])|Removes event handlers (see examples below)

Sample data:
```javascript
// JSON data
var data = {
    firstName: 'Boba',
    lastName: 'Fett',
    gender: 'male',
    age: 35,
    street: '123 Main St',
    city: 'Kamino',
    state: 'CA',
    zip: '12345'
};
```

Simple use with demonstrating individual property change detection vs multiple updates and cumulative changes:
```javascript
// Create model
var model = new bimo.Model(data);

// Attach event
model._watch(function (e) {
    for (var key in e) {
        if (e.hasOwnProperty(key)) {
            console.log(['key ', key, ' original: ', e[key].original, ', previous: ', e[key].previous, ' actual: ', e[key].actual].join(''));
        }
    }
});

// Change age
model.age = 42;
/*
// change object:
{
    age: {
        actual: 42,
        previous: 35,
        original: 35
    }
}
// console log: 
key 'age', original: 35, previous: 35, actual: 42
*/

// *** _changed() method test:
// returns true
model._changed();
model._changed('age');
model._changed(['age', 'lastName']);
// returns false
model._changed('lastName');

// Change again
model.age = 28;
/*
// change object: 
{
    age: {
        actual: 28,
        previous: 42,
        original: 35
    }
}
// console log: 
key: 'age', original: 35, previous: 42, actual: 28
*/

// Stop firing individual events
model._suspend();
// Do multiple changes
model.firstName = 'Han';
model.lastName = 'Solo';
// Resume with an event firing
model._resume();

// Model will collect all distinct event method and all changes and fire them once by sending the cumulated changes (delta)

/*
// change object:
{
    firstName: {
        actual: 'Han',
        previous: 'Boba',
        original: 'Boba'
    },
    lastName: {
        actual: 'Solo',
        previous: 'Fett',
        original: 'Fett'
    }
}
// console log:
key: 'firstName', original: 'Boba', previous: 'Boba', actual: 'Han'
key: 'lastName', original: 'Fett', previous: 'Fett', actual: 'Solo'
```

Watching event(s) setup is highly flexible:
```javascript
// Watching every change to the model
model._watch(function (e) {     
...
});

// Watching a single property
model._watch('age', function (e) {
...
});

// Watching multiple properties with the same event handler
model._watch('age state lastName', function (e) {
...
});

// Watch multiple properties with dedicated methods 
// (this is the same as subscribe multiple times to as single field)
model._watch({
    age: function (e) {
        ...
    },
    state: function (e) {
        ...
    },
    lastName: function (e) {
        ...
    }
});
```

Stop watching:
```javascript
// Removes all event handlers associated with the model
model._unwatch(); 

// Removes all events associated with specified property
model._unwatch('age');

// Removes event handler associated with property and specific method 
// (one property can have many watcher event so it must be specified when removed)
model._unwatch('age', handlerMethod);

// Removes all event handlers from multiple properties
model._unwatch('age state lastName');

// Removes specified event handlers from multiple properties
model._unwatch({
    age: handlerMethod1,
    state: handlerMethod2,
    lastName: handlerMethod3
});
```

>##### Note: The model only supports single level values for simplicity, so if the json data has multiple components it needs to be handled independently. Generally more flat the model is the better. The wrapping process leaves the object properties alone:

```javascript
// Multi-level JSON data
var data = {
    address: {
        street: '123 Main St',
        city: 'Kamino',
        state: 'CA',
        zip: '12345'
    },
    firstName: 'Boba',
    lastName: 'Fett',
    gender: 'male',
    age: 35
};
```

Create base model for level 1 and another model for level 2:
```javascript
var model = new bimo.Model(data);
model.address = new bimo.Model(data.address);
```

Or it can be included in the model with inheritance:
```javascript
var MyModel = function (data) {
    bimo.Model.call(this, data);
    this.address = new bimo.Model(data.address);
};

MyModel.prototype = Object.create(bimo.Model.prototype);
MyModel.constructor = bimo.Model;
```

The model provides methods for each property based on naming convention to intercept read and write operations. The methods can be dynamically added or specified as prototypical methods in inherited class:
```javascript
var model = new bimo.Model(data);

// Property name + "Read"
model.stateRead = function (value) {
    return value.toLowerCase();
};

// Property name + "Write"
model.stateWrite = function (value) {
    return value.toUpperCase();
};

console.log(model.state); // it will display 'ma' but model contains 'MA';

model.state = 'ca';

console.log(model.state); // it will display 'ca' but model contains 'CA'
```

Model delta can queried and be reset or values revert to original values:
```javascript
var model = new bimo.Model(data);

model.firstName = 'Darth';
model.lastName = 'Vader';

var changes = model._delta();
/* - change object:
{
    firstName: {
        actual: 'Darth',
        previous: 'Boba',
        original: 'Boba'
    },
    lastName: {
        actual: 'Vader',
        previous: 'Fett',
        original: 'Fett'
    }
}
*/

// This will wipe out tracking so the new base for first and last name is "Darth Vader"
model._reset(); 

// First set of changes
model.firstName = 'Luke';
model.lastName = 'Skywalker';

// Second set of changes
model.firstName = 'Lea';
model.lastName = 'Organa';

changes = model._delta();
/* - change object:
{
    firstName: {
        actual: 'Lea',
        previous: 'Luke',
        original: 'Darth'
    },
    lastName: {
        actual: 'Organa',
        previous: 'Skywalker',
        original: 'Vader'
    }
}
*/

// This will revert back to the original (this case after the reset it will be Darth Vader with no changes
model._revert();
```

---

# Binder
Non-intrusive binding between model and HTML controls. It avoids most common design traps by NOT intruding into either the model or the HTML domain. Configuration over implementation, also providing intercept methods when reading or writing into model. Only dependency is the Model, pure vanilla js.

Quick Reference:

|Property|Description|
|---|---|
|container|Javascript node of the root container in the DOM|
|model|Model object used to bind into HTML controls|
|binds|Hash table of Bind objects. The keys are the same as the model keys.|

|Function|Description|
|---|---|
|new Binder(options)|Constructor. Options object: "container": DOM Selector, "model": Observable Model, "config": Binding Configuration, "defaults": Default Values. Initial default values: "twoWay" true, "event": 'change', "property": 'value'
|bind(callback)|Execute bind() methods on each member of the binds hash table of Bind objects. If callback is specified it will be called after binding process is completed|
|unbind(callback)|Execute unbind() methods on each member of the binds hash table of Bind objects. If callback is specified it will be called after binding process is completed|
|run('methodName')|Expose method to specify any method as string to executed on all bind objects, example bind() is syntax sugar on run('bind') or unbind() on run('unbind')|
|init(container, model, config, defaults)|Method to add ability to initalize a binder object outside of the constructor.|

>##### Note: if you are using multiple level object (multiple models) then use multiple binders also. Each model you want to connect to HTML controls should have it's own binder object.


Sample data:
```javascript
// Lookup data from initial payload or ajax load
var lookups = {
    states: { // USA states
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

// JSON data
var data = {
    firstName: 'Boba',
    lastName: 'Fett',
    gender: 'male',
    citizen: true,
    age: 35,
    street: '123 Main St',
    city: 'Kamino',
    state: 'CA',
    zip: '12345',
    cars: [], // Favorite car types - demo multi-select input
    genres: [] // Favorite movie genres - demo 
};
```

HTML markup:
```html
<div id="sample-container">
    State: <select class="js-state"></select> Selected state name: <span class="js-state-name">na</span><br /><br />
    City: <input type="text" class="js-city" placeholder="City"><br /><br />
    Zip: <input type="number" class="js-zip" placeholder="Postal code"><br /><br />
    Street: <input type="text" class="js-street" placeholder="Street"><br /><br />
    First Name: <input type="text" class="js-first-name" placeholder="First name"><br /><br />
    Last Name: <input type="text" class="js-last-name" placeholder="Last name"><br /><br />
    Gender: <input type="radio" name="gender" value="male"> Male, <input type="radio" name="gender" value="female"> Female<br /><br />
    Citizen: <input type="checkbox" class="js-citizen"><br /><br />
    Age: <input type="number" class="js-age"><br /><br />
    Fav. genres:
    <input type="checkbox" name="movies" value="thriller"> Thriller,
    <input type="checkbox" name="movies" value="comedy"> Comedy,
    <input type="checkbox" name="movies" value="romantic"> Romantic,
    <input type="checkbox" name="movies" value="action"> Action,
    <input type="checkbox" name="movies" value="sci-fi"> Sci-Fi
    Fav. car models: 
    <select class="js-cars" multiple="multiple" style="width: 300px;">
        <option value="volvo">Volvo</option>
        <option value="saab">Saab</option>
        <option value="mercedes">Mercedes</option>
        <option value="audi">Audi</option>
        <option value="ferrari">Ferrari</option>
        <option value="trabant">Trabant</option>
    </select>
    <br /><br />

</div>
```

Binder sample code:
```javascript

// Create model
var model = new bimo.Model(data);
// Wire up events do other stuff
...

// Create binder object (the whole configuration should be maybe in another file)
// config keys are matching with the properties!
var binder = new bimo.Binder({
    container: '#sample-container', // or can be specified directly: document.getElementById('sample-container')
    model: model,
    config: {
        state: [    // Multiple configurations can be specified in an array!
            {
                selector: '.js-state',
                options: lookups.states,    // provides list of options (key-value hash) or method
                placeHolder: 'Select a state', // Only for select options!
            },
            {
                selector: '.js-state-name',
                twoWay: false,  // Disables default 2 way binding (this is a readonly field)
                read: function (value) {    // Provides an intercept method to transform original value
                    for (var i, len = this.elements.length; i < len; i++) {
                        var control = this.elements[i];
                        control.innerHTML = lookups.states[value];
                    }
                }
            }
        ],
        city: {
            selector: '.js-city',
            event: 'keyup' // Override default event "change"
        },
        zip: {
            selector: '.js-zip',
            events: {   // Any valid event handler will be wired up placed into this section
                blur: function (e) {
                    // validate zip code here
                    ...
                }
            }
        },
        street: '.js-street',   // Minimal requirement is to provide the selector
        firstName: '.js-first-name',
        lastName: '.js-last-name',
        gender: {
            selector: 'input[name="gender"]',
            read: function (value) { // read intercept to update HTML, context (this) set to the bind object
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    if (value.indexOf(control.value) > -1) {
                        control.checked = true;
                        break;
                    }
                }
            },
            write: function () {  // write intercept to update model value (if undefined returned no update occurs)
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
        citizen: {
            selector: 'js-citizen',
            property: 'checked' // Overrides default property (value) for input type controls to handle checkbox
        },
        age: {
            selector: '.js-age',
            events: {
                blur: function (e) {
                    // Validate age here
                    ...
                }
            }
        },
        cars: {
            selector: '.js-cars', // multi-value select combobox
            read: function (value, control) { // intercept to setup HTML
                for (var i = 0, len = control.options.length; i < len; i++) {
                    var option = control.options[i];
                    if (value.indexOf(option.value) > -1) {
                        option.selected = true;
                    }
                }
            },
            write: function (value, control) { // intercept to get values
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
        genres: {
            selector: 'input[name="movies"]', // group of checkboxes
            read: function (value) { // intercept to setup HTML
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    var control = this.elements[i];
                    control.checked = (value.indexOf(control.value) > -1);
                }
            },
            write: function () { // intercept to get values
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

// Execute binding
binder.bind(function () {
    ... // do stuff after binding is completed and connections built
});
```
Options:

| Keyword | type | Description | Comment |
---|:---:|---|:---:|
|selector|string|Follow syntax for [querySelectorAll](https://developer.mozilla.org/en/docs/Web/API/Element/querySelectorAll) method |mandatory|
|event|string|Event used to detect changes in HTML controls|default is "change"|
|property|string|Property name used to retrieve value from HTML controls|default is "value"|
|events|object|Holder object for any valid handler to be wired up to target control||
|options|string/function|Provides options for combobox in key-value hash format|SELECT control only|
|placeHolder| string | Default "empty" option for select control|SELECT control only|
|read|function|Intercept method reading FROM model to control. Method context is set to the Bind object parameters passed are the "value" from model and the HTML "control" associated with the bind.||
|write|function|Intercept method writing TO model from control. Method context is set to the Bind object parameters passed are the "value" and the HTML "control" associated with the bind.||

>##### Note: If you defined read/write methods the responsibility of reading from HTML controls or writing into them must be implemented in there!

# Bind
Small class represent a single connection in binder (binds property - hash collection)

|Property|Description|
|---|---|
|elements|HTML controls array. Result of [querySelectorAll](https://developer.mozilla.org/en/docs/Web/API/Element/querySelectorAll) method call|
|event|Event used to detect changes in HTML controls, default is "change" (from config)|
|property|Property name used to retrieve value from HTML controls, default is "value" (from config)|
|key|Model property name.|
|model|Model object passed in by the parent Binder object|
|container|Javascript node of the root container in the DOM|
|twoWay|flag to set one or two way binding, default is true|
|disabled|Property forwarding to all HTML elements|
|readOnly|Property forwarding to all HTML elements|
|required|Property forwarding to all HTML elements|
|visible|Property forwarding to all HTML elements|

|Function|Description|
|---|---|
|bind(callback)|Create connection (wire up event(s)) between model property and HTML control(s)|
|unbind(callback)|Remove connection (events) between model and HTML control(s)|


