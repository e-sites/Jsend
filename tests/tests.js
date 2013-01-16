(function(window) {

	window.log = function () {
		if (typeof window.console === 'object' && document.location.host.indexOf('.dev-') !== -1) {
			console.log((arguments.length === 1 ? arguments[0] : Array.prototype.slice.call(arguments)));
		}
	};

	module('Input Support');

	test('Accept an object literal as single argument when calling the JSend constructor only', function () {
		expect(3);
		stop();
		JSend({
			url: '../xhr.php?m=test',
			foo: 'bar',
			success: function (data, xhr) {
				ok(xhr, 'Success callback invoked');
				equal(this.status === 'success', true, 'The status corresponds with the actual callback');
				equal(this.constructor === JSend, true, 'The constructor of the `this` context points to JSend');
				start();
			}
		});
	});

	test('Handle a failed response', function () {
		expect(2);
		stop();

		JSend({
			url: '../xhr.php?m=doFail',
			foo: 'bar',
			fail: function (data, xhr) {
				ok(xhr, 'Fail callback invoked');
				equal(this.status === 'fail', true, 'The status corresponds with the actual callback');
				start();
			}
		});
	});

	test('Error occurred in processing the request (i.e. an exception was thrown)', function () {
		expect(3);
		stop();

		JSend({
			url: '../xhr.php?m=doError',
			foo: 'bar',
			error: function (message, xhr) {
				console.log(this);
				ok(xhr, 'Error callback invoked');
				equal(this.status === 'error', true, 'The status corresponds with the actual callback');
				equal(this.jsendResponse.status === 'error', true, 'The status of the original JSend response corresponds with the actual callback as well');
				//equal(this.status === 'error', true, 'The status corresponds with the actual callback');
				start();
			}
		});
	});

	module('XHR info');

	test('Original XHR object is available and has the appropriate data', function () {
		expect(4);
		stop();
		JSend()
			.get('../xhr.php?m=test', {foo:'bar'}, function (data, xhr) {
				ok(xhr, 'Original XHR object is available');
				equal(typeof xhr, 'object', 'The xhr argument is an object');
				equal(xhr.status, 200, 'Correct HTTP status');
				equal(xhr.readyState, 4, 'Correct readyState');
				start();
			});
	});

	module('JSend instance');

	test('Instantiating the JSend constructor', function () {
		expect(5);
		stop();
		var xhr = new JSend();
		xhr.config.type = 'GET';
		xhr.config.crossDomain = true;
		xhr.get('http://boye.e-sites.nl/jsend/xhr.php?m=test', 'name=boye', function (data, xhr) {
			ok(data, 'Valid JSend data is returned from the server');
			ok(this instanceof JSend, 'The `this` context is an instance of JSend');
			equal(this.constructor === JSend, true, 'The constructor of the `this` context points to JSend');
			equal(typeof data, 'object', 'The data argument is an object');
			equal(xhr.status === 200, true, 'The HTTP status is 200');
			start();
		});
	});

	module('Callbacks');

	test('Valid JSend data', function() {
		expect(2);
		stop();
		JSend().
			get('../xhr.php?m=test', {foo:'bar'}, function (data, xhr) {
				ok(data, 'Valid JSend data is returned from the server');
				equal(typeof data, 'object', 'The data argument is an object (e.g. valid JSON)');
				start();
			});
	});

	test('Custom fail callback', function () {
		expect(2);
		stop();
		JSend()
			.fail(function (data) {
				ok(data, 'Valid JSend data is returned from the server');
				equal(typeof data, 'object', 'Data is an object');
				start();
			})
			.get('../xhr.php?m=doFail', 'name=boye', function () {
				ok(false, 'It should not reach the success callback');
			});
	});

	test('Custom error callback', function () {
		expect(2);
		stop();
		JSend()
			.error(function (message, xhr) {
				ok(message, 'Valid JSend data is returned from the server');
				equal(typeof message, 'string', 'Message must be a string');
				start();
			})
			.get('../xhr.php?m=doError', 'name=boye', function () {
				ok(false, 'It should not reach the success callback');
			});
	});

	test('Valid JSend data', function() {
		expect(3);
		stop();
		JSend()
			.get('../xhr.php?m=test', {foo:'bar'}, function (data, xhr) {
				ok(data, 'Valid JSend data is returned from the server');
				ok(this instanceof JSend, 'the `this` context is an instance of JSend');
				equal(this.jsendResponse.status, 'success', 'the value of data.stats should be success');
				start();
			});
	});

	module('Aliases');

	test('Doing a GET request using the J$ alias', function () {
		expect(3);
		stop();
		J$.get('../xhr.php?m=test', {foo:'bar'}, function (data, xhr) {
			ok(data, 'Valid JSend data is returned from the server');
			ok(this instanceof JSend, 'the `this` context is an instance of JSend');
			equal(this.jsendResponse.status, 'success', 'the value of data.stats should be success');
			start();
		});
	});

	test('Doing a POST request using the J$ alias', function () {
		expect(3);
		stop();
		J$.post('../xhr.php?m=test', {foo:'bar'}, function(data, xhr) {
			ok(data, 'Valid JSend data is returned from the server');
			ok(this instanceof JSend, 'the `this` context is an instance of JSend');
			equal(this.jsendResponse.status, 'success', 'the value of data.stats should be success');
			start();
		});
	});

}(window));
