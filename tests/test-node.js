(function () {
	'use strict';

	// Required globals
	global.Promise = require('native-promise-only');
	global.XMLHttpRequest = global.XDomainRequest = require('xmlhttprequest').XMLHttpRequest;
	global.navigator = {
		userAgent: ''
	};

	// Unit test requirements
	var chai = require('chai');
	var chaiAsPromised = require('chai-as-promised');
	var spies = require('chai-spies');
	var expect = chai.expect;

	// Mock path
	function mock(modules) {
		var mockPaths = {};

		modules.forEach(function (module) {
			mockPaths[module] = require('./mocks/' + module);
		});

		return mockPaths;
	}

	// Modules to test
	var proxyquire = require('proxyquire');
	var core = proxyquire('../src/core', mock(['./request']));
	var request = proxyquire('../src/request', mock(['./serialize', './validate', './ajax', './jsonp']));
	var ajax = proxyquire('../src/ajax', mock(['./merge', './error']));
	var error = require('../src/error');
	var jsdom = require('jsdom');
	var jsonp = require('../src/jsonp');
	var merge = require('../src/merge');
	var serialize = require('../src/serialize');
	var validate = proxyquire('../src/validate', mock(['./error']));

	chai.use(chaiAsPromised);
	chai.use(spies);

	// Test core API
	describe('Core', function () {
		context('.get()', function () {
			it('should return a Promise', function () {
				expect(core.get('foo', 'bar=baz')).to.be.instanceof(Promise);
			});
		});
		context('.post()', function () {
			it('should return a Promise', function () {
				expect(core.post('foo', 'bar=baz')).to.be.instanceof(Promise);
			});
		});
		context('.post() with custom headers', function () {
			it('should return a Promise', function () {
				expect(core.post('foo', 'bar=baz', {'Content-Type': 'application/x-www-form-urlencoded'})).to.be.instanceof(Promise);
			});
		});
		context('.jsonp()', function () {
			it('should return a Promise', function () {
				expect(core.jsonp('foo', 'bar=baz')).to.be.instanceof(Promise);
			});
		});
	});

	// Test request module
	describe('Request()', function () {
		var config = {
			options: {
				url: '/xhr.php',
				data: 'foo=bar'
			}
		};

		it('ajax with string data request should return a Promise', function () {
			config.type = 'ajax';
			config.options.method = 'GET';

			expect(request(config)).to.be.instanceof(Promise);
		});

		it('ajax with object data request should return a Promise', function () {
			config.type = 'ajax';
			config.options.url = '/xhr.php?m=success';
			config.options.method = 'GET';
			config.options.data = {foo: 'bar'};

			expect(request(config)).to.be.instanceof(Promise);
		});

		it('jsonp with string data should return a Promise', function () {
			config.type = 'jsonp';
			config.options.url = '/xhr.php';
			config.options.method = null;

			expect(request(config)).to.be.instanceof(Promise);
		});

		it('jsonp with object data should return a Promise', function () {
			config.type = 'jsonp';
			config.options.method = null;
			config.options.url = '/xhr.php';
			config.options.data = {foo: 'bar'};

			expect(request(config)).to.be.instanceof(Promise);
		});

		it('should warn when Promise() isn\'t available', function () {
			var origPromise = Promise;

			Promise = null;

			config.type = 'ajax';
			config.options.method = 'GET';

			expect(request(config)).to.be.undefined;

			Promise = origPromise;
		});
	});

	describe('Ajax()', function () {
		var options = {};

		it('should fire the callback when done with a GET', function (done) {
			options.method = 'GET';
			options.url = 'http://localhost:8888/JSend/xhr.php?m=success&name=get';

			function callback(response, xhr) {
				expect(response)
					.to.be.an('object')
					.and.have.property('status');

				expect(xhr).to.be.an('object');
				
				done();
			}

			ajax(options, callback);
		});

		it('should fire the callback when done with a POST', function (done) {
			options.method = 'POST';
			options.url = 'http://localhost:8888/JSend/xhr.php';

			function callback(response, xhr) {
				expect(response)
					.to.be.an('object')
					.and.have.property('status');

				expect(xhr).to.be.an('object');
				
				done();
			}

			ajax(options, callback);
		});

		it('should fire the callback when done with a GET with IE8 UA', function (done) {
			options.method = 'GET';
			options.url = 'http://localhost:8888/JSend/xhr.php?m=success&name=get';
			navigator.userAgent = 'MSIE 8.0;';

			function callback(response, xhr) {
				expect(response)
					.to.be.an('object')
					.and.have.property('status');

				expect(xhr).to.be.an('object');
				
				done();
			}

			ajax(options, callback);
		});

		it('should fire the callback when done with a POST with IE8 UA', function (done) {
			options.method = 'POST';
			options.url = 'http://localhost:8888/JSend/xhr.php';
			navigator.userAgent = 'MSIE 8.0;';

			function callback(response, xhr) {
				expect(response)
					.to.be.an('object')
					.and.have.property('status');

				expect(xhr).to.be.an('object');
				
				done();
			}

			ajax(options, callback);
		});

		it('should fire the callback when getting a server error', function (done) {
			options.method = 'GET';
			options.url = 'http://localhost:8888/JSend/xhr.php?m=404&name=404';

			function callback(response, xhr) {
				expect(response)
					.to.be.an('object')
					.and.have.property('status', 'error');

				expect(xhr).to.be.an('object');
				expect(xhr.responseText).to.be.a('string');
				
				done();
			}

			ajax(options, callback);
		});

		// it('should fire the callback when getting a timeout error', function (done) {
		// 	options.method = 'GET';
		// 	options.timeout = 1000;
		// 	options.url = 'http://localhost:8888/JSend/xhr.php?m=timeout&name=timeout';

		// 	function callback(response, xhr) {
		// 		expect(response)
		// 			.to.be.an('object')
		// 			.and.have.property('status', 'error');

		// 		expect(xhr).to.be.an('object');
		// 		expect(xhr.responseText).to.be.a('string');
				
		// 		done();
		// 	}

		// 	ajax(options, callback);
		// });
	});

	describe('Error', function () {
		it('should return a string with a timeout error', function () {
			expect(error(null, 'timeout'))
				.to.be.a('string')
				.and.have.string('Timeout error.');
		});

		it('should return a string with a JSend error status', function () {
			expect(error(null, {message: 'Test error'}))
				.to.be.a('string')
				.and.have.string('Test error');
		});

		it('should return a string with XHR status 0', function () {
			expect(error({status: 0}))
				.to.be.a('string')
				.and.have.string('Can\'t connect. Verify network.');
		});

		it('should return a string with XHR status 400', function () {
			expect(error({status: 400}))
				.to.be.a('string')
				.and.have.string('Bad Request [400].');
		});
		
		it('should return a string with XHR status 403', function () {
			expect(error({status: 403}))
				.to.be.a('string')
				.and.have.string('URL Forbidden [403]');
		});

		it('should return a string with XHR status 404', function () {
			expect(error({status: 404}))
				.to.be.a('string')
				.and.have.string('URL Not Found [404]');
		});

		it('should return a string with XHR status 500', function () {
			expect(error({status: 500}))
				.to.be.a('string')
				.and.have.string('Internal Server Error [500]');
		});

		it('should return a string with a different XHR status', function () {
			expect(error({responseText: 'Testing 1337', status: 1337}))
				.to.be.a('string')
				.and.have.string('Testing 1337 [1337]');
		});
	});

	// describe('JSONP', function () {
	// 	var options = {};
	// 	var readFile = require('fs').readFileSync;

	// 	it('should fire a callback when requesting valid JSONP', function (done) {
	// 		jsdom.env({
	// 			url: 'http://localhost:8888/JSend/dev.html',
	// 			done: function (errors, window) {
	// 				global.window = window;
	// 				global.window.JSend = {};
	// 				global.document = window.document;

	// 				jsonp({
	// 					url: 'http://localhost:8888/JSend/xhr.php?m=success&name=success'
	// 				}, function (response) {
	// 					expect(response).to.be.an('object')
	// 						and.have.property('status', 'success')
	// 						.and.to.contain.all.keys('status', 'data')
	// 						.and.have.property('data')
	// 							.that.has.property('input', 'success');
	// 					delete global.window;
	// 					done();
	// 				});
	// 			}
	// 		});
	// 	});
	// });
	
	describe('merge', function () {
		it('should merge two basic objects', function () {
			var merged = merge({foo: 'bar'}, {foo: 'baz'});

			expect(merged)
				.to.be.an('object')
				.to.have.property('foo', 'baz');
		});

		it('should merge two basic arrays', function () {
			var merged = merge([123], [345]);

			expect(merged)
				.to.be.an('array')
				.and.to.have.members([123, 345]);
		});

		it('should deep merge objects', function () {
			var obj1 = {
					foo: {
						bar: 'baz'
					}
				},
				obj2 = {
					foo: {
						bar: 123,
						baz: true
					},
					faz: 'abc',
					bla: {
						foo: 'blabla'
					}
				},
				merged = merge(obj1, obj2);

			expect(merged)
				.to.be.an('object');

			expect(merged)
				.to.have.deep.property('foo.bar', 123);

			expect(merged)
				.to.have.deep.property('foo.baz', true);

			expect(merged)
				.to.have.deep.property('faz', 'abc');

			expect(merged)
				.to.have.deep.property('bla.foo', 'blabla');
		});

		it('should deep merge arrays', function () {
			var arr1 = [[123, 456], ['abc', 'def']],
				arr2 = [[789], ['ghi']],
				merged = merge(arr1, arr2);

			expect(merged)
				.to.be.an('array');

			expect(merged)
				.to.have.deep.property('[0][2]', 789);

			expect(merged)
				.to.have.deep.property('[1][2]', 'ghi');
		});

		it('should deep merge null with an array', function () {
			var arr1 = [[123, 456], ['abc', 'def']],
				merged = merge(null, arr1);

			expect(merged)
				.to.be.an('array');

			expect(merged)
				.to.have.deep.property('[0][1]', 456);

			expect(merged)
				.to.have.deep.property('[1][1]', 'def');
		});
	});

	describe('Serialize', function () {
		it('should serialize an object to a query string', function () {
			var data = {
					foo: 'bar',
					baz: 123,
					bla: true
				};

			function test() {
				return serialize(data);
			}

			expect(test).to.not.throw();

			expect(test()).to.be.a('string');

			expect(test()).to.contain('foo=bar&baz=123&bla=true');
		});

		it('should throw TypeError when the argument is not an object', function () {
			function test() {
				return serialize('foo');
			}

			expect(test).to.throw(TypeError);
		});
	});

	describe('Validate', function () {
		it('should validate a JSend success reponse', function (done) {
			var data = {
					status: 'success',
					data: {
						foo: 'bar'
					}
				},
				validSpy = chai.spy(valid),
				invalidSpy = chai.spy(invalid);

			function valid(res) {
				console.log('ok');
				expect(res).to.contain.all.keys('status', 'data');
				expect(res).to.have.deep.property('status', 'success');
				expect(res).to.have.deep.property('data.foo', 'bar');
			}

			function invalid(res) {
				console.log('wrong');
			}

			validate(data, {}, validSpy, invalidSpy);

			expect(validSpy).to.have.been.called.once;
			expect(invalidSpy).to.not.have.been.called;

			done();
		});
		
		it('should invalidate a JSend fail reponse', function (done) {
			var data = {
					status: 'fail',
					data: {
						foo: 'bar'
					}
				},
				validSpy = chai.spy(valid),
				invalidSpy = chai.spy(invalid);

			function valid(res) {
				console.log('wrong');
			}

			function invalid(res) {
				console.log('ok');
				expect(res).to.contain.all.keys('status', 'data');
				expect(res).to.have.deep.property('status', 'fail');
				expect(res).to.have.deep.property('data.foo', 'bar');
			}

			validate(data, {}, validSpy, invalidSpy);

			expect(invalidSpy).to.have.been.called.once;
			expect(validSpy).to.not.have.been.called;

			done();
		});
		
		it('should invalidate a JSend error reponse', function (done) {
			var data = {
					status: 'error',
					message: 'this is an error',
					data: {
						foo: 'bar'
					}
				},
				validSpy = chai.spy(valid),
				invalidSpy = chai.spy(invalid);

			function valid(res) {
				console.log('wrong');
			}

			function invalid(res) {
				console.log('ok');
				expect(res).to.contain.all.keys('status', 'message');
				expect(res).to.have.deep.property('status', 'error');
				expect(res).to.have.deep.property('data.foo', 'bar');
			}

			validate(data, {}, validSpy, invalidSpy);

			expect(invalidSpy).to.have.been.called.once;
			expect(validSpy).to.not.have.been.called;

			done();
		});
		
		it('should invalidate XHR error reponse', function (done) {
			var xhr = {
					status: 500,
					responseText: 'Error'
				},
				validSpy = chai.spy(valid),
				invalidSpy = chai.spy(invalid);

			function valid(res) {
				console.log('wrong');
			}

			function invalid(res) {
				console.log('ok');
				expect(res).to.contain.all.keys('status', 'message');
				expect(res).to.have.deep.property('status', 'error');
				expect(res.message).to.contain('Error [500]');
			}

			validate(null, xhr, validSpy, invalidSpy);

			expect(invalidSpy).to.have.been.called.once;
			expect(validSpy).to.not.have.been.called;

			done();
		});

	});
}());