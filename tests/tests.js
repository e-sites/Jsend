(function(window) {
	var expect = chai.expect;

	window.log = function () {
		if (typeof window.console === 'object' && document.location.host.indexOf('.dev-') !== -1) {
			console.log((arguments.length === 1 ? arguments[0] : Array.prototype.slice.call(arguments)));
		}
	};

	function _success(data) {
		return data;
	}

	function _fail(data) {
		return data;
	}

	describe('JSend', function () {
		context('.get()', function () {
			it('should return data with success status', function () {
				var result = JSend.get('../xhr.php', 'm=success&name=get').then(_success, _fail);

				return expect(result)
					.to.eventually
						.be.an('object')
						.and.to.contain.all.keys('status', 'data')
						.and.have.property('data')
							.that.has.property('input', 'get');
			});

			it('should return data with fail status', function () {
				var result = JSend.get('../xhr.php', 'm=fail&name=get').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'fail');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'get');
			});

			it('should return data with error status', function () {
				var result = JSend.get('../xhr.php', 'm=error&name=get').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'error');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'get');
			});
		});

		context('.post()', function () {
			it('should return data with success status', function () {
				var result = JSend.post('../xhr.php', 'm=success&name=post').then(_success, _fail);

				return expect(result)
					.to.eventually
						.be.an('object')
						.and.to.contain.all.keys('status', 'data')
						.and.have.property('data')
							.that.has.property('input', 'post');
			});

			it('should return data with fail status', function () {
				var result = JSend.post('../xhr.php', 'm=fail&name=post').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'fail');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'post');
			});

			it('should return data with error status', function () {
				var result = JSend.post('../xhr.php', 'm=error&name=post').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'error');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'post');
			});
		});

		context('.jsonp()', function () {
			it('should return data with success status', function () {
				var result = JSend.jsonp('../xhr.php', 'm=success&name=jsonp').then(_success, _fail);

				return expect(result)
					.to.eventually
						.be.an('object')
						.and.to.contain.all.keys('status', 'data')
						.and.have.property('data')
							.that.has.property('input', 'jsonp');
			});

			it('should return data with fail status', function () {
				var result = JSend.jsonp('../xhr.php', 'm=fail&name=jsonp').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'fail');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'jsonp');
			});

			it('should return data with error status', function () {
				var result = JSend.jsonp('../xhr.php', 'm=error&name=jsonp').then(_success, _fail);

				expect(result).to.eventually.be.an('object');

				expect(result)
					.to.eventually.have.property('status', 'error');

				expect(result)
					.to.eventually.have.property('data')
					.that.has.property('input', 'jsonp');
			});
		});
	});

}(window));