(function() {
	'use strict';

	var merge = require('./merge'),
		error = require('./error'),
		res;

	var jsonp = function (options, callback) {
		var fname = 'jsend' + Math.round(Math.random() * 1000),
			script = document.createElement('script'),
			url = options.url.indexOf('?') === -1 ? options.url + '?callback=' + fname : options.url + '&callback=' + fname;

		script.onerror = function (e) {
			if ( e.type === 'error' ) {
				res = {
					status: 'error',
					message: 'Error loading script'
				}

				callback(res);
			}
		}

		script.src = url;

		document.head.appendChild(script);

		window[fname] = function (response) {
			callback(response);

			delete window[fname];
		}
	};

	module.exports = jsonp;
}());