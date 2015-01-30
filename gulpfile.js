var del = require('del');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');

var args = { 
	cache: {}, 
	packageCache: {}, 
	fullPaths: true,
	standalone: 'JSend',
	debug: true
};

var getVersion = function () {
	var version = require('./package.json').version;

	return version;
};

var copyObject = function (object) {
	var copy = JSON.parse(JSON.stringify(object)); // Make copy of object instead of reference

	return copy;
};

gulp.task('clean', function () {
	return del('./dist');
});

gulp.task('jsend', ['clean'], function() {
	var bundler;

	buildArgs = copyObject(args);
	buildArgs.entries = ['./src/core.js'];

	bundler = browserify(buildArgs);

	var bundle = function() {
		return bundler
			.bundle()
			.pipe(source('jsend-' + getVersion() + '.js'))
			.pipe(buffer())
			.pipe(gulp.dest('./dist/'));
	};

	return bundle();
});

gulp.task('jsendpoly', function() {
	var bundler;

	buildArgs = copyObject(args);
	buildArgs.entries = ['./src/polyfill.js'];

	bundler = browserify(buildArgs);

	var bundle = function() {
		return bundler
			.bundle()
			.pipe(source('jsend.polyfill-' + getVersion() + '.js'))
			.pipe(buffer())
			.pipe(gulp.dest('./dist/'));
	};

	return bundle();
});

gulp.task('build', ['jsend', 'jsendpoly']);

gulp.task('uglify', ['build'], function () {
	gulp.src('./dist/*.js')
		.pipe(rename({
			suffix: ".min"
		}))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./dist/'))
});

gulp.task('default', ['uglify']);

gulp.task('watch', function() {
	gulp.watch('./src/*.js', ['default']);
});