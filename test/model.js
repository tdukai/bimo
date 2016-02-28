'use strict';

var expect = require('chai').expect;
var bimo = require('../src/model.js');
var data = {
    firstName: 'Boba',
    lastName: 'Fett',
    age: 35,
    street: '123 Main St',
    city: 'Kamino',
    state: 'CA',
    zip: '12345'
};

function clone (obj) {
    var result = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
        }
    }
    return result;
}

function createModel () {
    return new bimo.Model(clone(data));
}

describe('model', function() {

    it('simple change', function(done) {
        var model = createModel();
        model._watch('city', function (obj) {
            // Check properties
            expect(obj).to.have.property('city');
            expect(obj.city).to.have.property('original');
            expect(obj.city).to.have.property('previous');
            expect(obj.city).to.have.property('actual');
            // Check values
            expect(obj.city.original).to.be.equal('Kamino');
            expect(obj.city.previous).to.be.equal('Kamino');
            expect(obj.city.actual).to.be.equal('Geonosis');
            done();
        });
        // Apply change
        model.city = 'Geonosis';
    });

    it('multiple changes', function (done) {
        var model = createModel();
        model._watch(function (obj) {
            // Check properties
            expect(obj).to.have.property('city');
            expect(obj).to.have.property('age');
            expect(obj).to.not.have.property('zip');
            // Check values
            expect(obj.city.actual).to.be.equal('Geonosis');
            expect(obj.city.previous).to.be.equal('Tatooine');
            expect(obj.city.original).to.be.equal('Kamino');
            expect(obj.age.actual).to.be.equal(12);
            expect(obj.age.previous).to.be.equal(105);
            expect(obj.age.original).to.be.equal(35);
            done();
        });
        // Suspend event firing
        model._suspend();
        // First change
        model.city = 'Tatooine';
        model.age = 105;
        // Second change
        model.city = 'Geonosis';
        model.age = 12;
        // Resume event firing
        model._resume();
    });

});
