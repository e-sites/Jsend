var del = require('del');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var exec = require('child_process').exec;
var testCmd = "istanbul cover _mocha tests/test-node.js; istanbul report html";

var args = {
	cache: {},
	packageCache: {},
	fullPaths: false,
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

gulp.task('build', ['jsend']);

gulp.task('uglify', ['build'], function () {
	return gulp.src('./dist/*.js')
		.pipe(rename({
			suffix: ".min"
		}))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./dist/'))
});

gulp.task('jshint', function () {
	return gulp.src('./src/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('mocha', function (cb) {
	exec(testCmd, function(error, stdout, stderr) {
		if ( error ) {
			console.error(error);

			cb();

			return;
		}

		console.log(stdout);

		cb();
	});
});

gulp.task('test', ['mocha', 'jshint']);

gulp.task('default', ['test', 'uglify']);

gulp.task('watch', function() {
	gulp.watch('./src/*.js', ['default']);
});