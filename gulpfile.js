'use strict';

const { src, dest, series } = require('gulp');
const plugins = require('gulp-load-plugins')({"camelize": true});
const mocha = require('gulp-mocha');
const jsLint = ['*.js', 'src/*.js'];
const jsTest = ['test/tests.js'];
const srcList = [
    'src/model.js',
    'src/binder.js'
];
/*
var terserOptions = { 
    keep_classnames: true, 
    keep_fnames: true 
};
*/

// Lint source
function lint () {
    return src(jsLint)
        .pipe(plugins.expectFile(jsLint))
        .pipe(plugins.eslint('.eslintrc'))
        .pipe(plugins.eslint.format());
}

// Testing
function test () {
    return src(jsTest)
        .pipe(plugins.expectFile(jsTest))
        .pipe(mocha({reporter: 'nyan'}));
}

// Bundling
function bundle () {
    // Copy License to dist folder
    src('LICENSE')
        .pipe(dest('dist'));
    // Create combined (non compressed) package
    src(srcList)
        .pipe(plugins.concat('bimo.js'))
        .pipe(dest('dist'));
    // Create individual files compressed 
    src(srcList)
        .pipe(plugins.terser().on('error', console.error))
        .pipe(plugins.rename({ extname: '.min.js' }))
        .pipe(dest('dist'));
    // Create individual files gzip compressed
    src(srcList)
        .pipe(plugins.terser().on('error', console.error))
        .pipe(plugins.gzip({
            append: true,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(dest('dist'));
    return src(srcList)
        .pipe(plugins.concat('bimo.min.js'))
        .pipe(plugins.terser().on('error', console.error))
        .pipe(dest('dist'))
        .pipe(plugins.gzip({
            append: true,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(dest('dist'));
}

exports.test = test;
exports.lint = lint;
exports.bundle = bundle;
exports.default = series(test, bundle);