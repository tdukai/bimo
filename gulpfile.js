'use strict';

var gulp = require('gulp');
var pkg = require('./package.json');
var plugins = require('gulp-load-plugins')({"camelize": true});
var jsLint = ['*.js', '*.json', '.jshintrc', 'src/*.js', 'test/*.js'];
var jsTest = ['test/*.js'];
var bundle = [
    'src/model.js',
    'src/binder.js'
];

// Lint source
gulp.task('lint', function () {
    return gulp.src(jsLint)
        .pipe(plugins.expectFile(jsLint))
        .pipe(plugins.jshint('.jshintrc'))
        .pipe(plugins.jshint.reporter('jshint-stylish'));
});

// Testing
gulp.task('test', ['lint'], function () {
    return gulp.src(jsTest)
        .pipe(plugins.expectFile(jsTest))
        .pipe(plugins.mocha({reporter: 'nyan'}));
});

// Bundling
gulp.task('bundle', function() {
    var packageName = 'bimo-' + pkg.version;
    // Copy License to dist folder
    gulp.src('LICENSE')
        .pipe(gulp.dest('dist'));

    // Create combined (non compressed) package
    gulp.src(bundle)
        .pipe(plugins.concat(packageName + '.js'))
        .pipe(gulp.dest('dist'));
    
    // Create individual files compressed 
    gulp.src(bundle)
        .pipe(plugins.uglify())
        .pipe(plugins.rename({ extname: '.min.js' }))
        .pipe(gulp.dest('dist'));
    // Create individual files gzip compressed
    gulp.src(bundle)
        .pipe(plugins.uglify())
        .pipe(plugins.gzip({
            append: false,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(plugins.rename({ extname: '.min.js.gz' }))
        .pipe(gulp.dest('dist'));
    // Create the compressed version for the whole package
    gulp.src(bundle)
        .pipe(plugins.concat(packageName + '.min.js'))
        .pipe(plugins.uglify())
        .pipe(gulp.dest('dist'));
    // Create gzip compressed version for the whole package
    return gulp.src(bundle)
        .pipe(plugins.concat(packageName + '.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.gzip({
            append: false,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(plugins.rename({ extname: '.min.js.gz' }))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'bundle']);
