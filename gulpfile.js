/**
 * Created by Oleg Galaburda on 26.12.15.
 */
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var include = require('gulp-include');

gulp.task('build', function() {
  gulp.src('source/data-access-interface-umd.js')
    .pipe(include())
    .pipe(rename('data-access-interface.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'));

});

gulp.task('build-standalone', function() {
  gulp.src('source/data-access-interface-umd.standalone.js')
    .pipe(include())
    .pipe(rename('data-access-interface.standalone.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'));

});

gulp.task('default', ['build', 'build-standalone']);
