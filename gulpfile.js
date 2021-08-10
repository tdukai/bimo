'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')({"camelize": true});
var jsLint = ['*.js', 'src/*.js'];
var jsTest = ['test/tests.js'];
var bundle = [
    'src/model.js',
    'src/binder.js'
];
var terserOptions = { 
    keep_classnames: true, 
    keep_fnames: true 
};

// Lint source
gulp.task('lint', function () {
    return gulp.src(jsLint)
        .pipe(plugins.expectFile(jsLint))
        .pipe(plugins.eslint('.eslintrc'))
        .pipe(plugins.eslint.format());
});

// Testing
gulp.task('test', gulp.series('lint', function () {
    return gulp.src(jsTest)
        .pipe(plugins.expectFile(jsTest))
        .pipe(plugins.mocha({reporter: 'nyan'}));
}));

// Bundling
gulp.task('bundle', function () {
    // Copy License to dist folder
    gulp.src('LICENSE')
        .pipe(gulp.dest('dist'));
    // Create combined (non compressed) package
    gulp.src(bundle)
        .pipe(plugins.concat('bimo.js'))
        .pipe(gulp.dest('dist'));
    // Create individual files compressed 
    gulp.src(bundle)
        .pipe(plugins.terser(terserOptions).on('error', console.error))
        .pipe(plugins.rename({ extname: '.min.js' }))
        .pipe(gulp.dest('dist'));
    // Create individual files gzip compressed
    gulp.src(bundle)
    .pipe(plugins.terser(terserOptions).on('error', console.error))
        .pipe(plugins.gzip({
            append: true,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(gulp.dest('dist'));
    return gulp.src(bundle)
        .pipe(plugins.concat('bimo.min.js'))
        .pipe(plugins.terser(terserOptions).on('error', console.error))
        .pipe(gulp.dest('dist'))
        .pipe(plugins.gzip({
            append: true,
            gzipOptions: {
                level: 9
            }
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.parallel('lint', 'bundle'));