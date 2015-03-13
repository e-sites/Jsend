(function() {
	'use strict';

	var merge = require('./merge'),
		httpError = require('./httperror'),
		validate = require('./validate'),
		encode = require('./encode'),
		reason = require('./reason'),
		indicator = require('./indicator');

	var ajax = function ajax(options) {
		var requestPromise,
			defaults = {
				timeout: 5000, // 5 seconds
				method: 'GET',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			},
			isLteIE8 = (function () {
				var test = navigator.userAgent.match(/MSIE (.{3}?);/);

				if ( test !== null && Number(test[test.length - 1]) <= 8 ) {
					return true;
				}

				return false;
			}()),
			onload = isLteIE8 ? 'onreadystatechange' : 'onload',
			config,
			xhr,
			data,
			url,
			res,
			timeout = false;

		// Merge options into defaults to create final config object
		config = merge(defaults, options);

		data = encode(config.data);

		try {
			url = new URL(config.url);
		}
		catch (e) {
			url = false;
		}

		if ( url && (window.location.hostname !== url.hostname || window.location.port !== url.port) && !('withCredentials' in new XMLHttpRequest()) ) {
			xhr = new XDomainRequest();
		} else {
			xhr = new XMLHttpRequest();
		}

		// Setup request as a Promise
		requestPromise = new Promise(function (resolve, reject) {
			// Open request
			xhr.open(config.method, config.url);

			// Force Content Type for IE
			xhr.setRequestHeader('Content-Type', 'application/json; charset="utf-8"');

			// Set data as query string for GET method
			if ( config.method === 'GET' && data ) {
				config.url = config.url.indexOf('?') === -1 ? config.url + '?' + data : config.url + '&' + data;

				data = null;
			}

			// Set request headers
			for (var h in config.headers) {
				if ( config.headers.hasOwnProperty(h) ) {
					xhr.setRequestHeader(h, config.headers[h]);
				}
			}

			// Handle XHR timeout, necessary?
			xhr.timeout = config.timeout;
			xhr.ontimeout = function () {
				// Set timeout variable to prevent IE8 from executing onreadystatechange
				timeout = true;

				res = {
					status: 'error',
					message: httpError(xhr, 'timeout')
				};

				reject(reason(res, xhr));
			};

			// Handle XHR request finished state (state 4)
			xhr[onload] = function () {
				// Prevent execution if request isn't complete yet, or times out
				if (xhr.readyState != 4 || timeout)
					return;

				var err = (!xhr.status || (xhr.status < 200 || xhr.status >= 300) && xhr.status !== 304);

				// Check for HTTP error
				if ( err ) {
					res = {
						status: 'error',
						message: httpError(xhr)
					};

					reject(reason(res, xhr));

					return;
				}

				// Validate JSend response
				res = JSON.parse(xhr.responseText);

				if ( validate(res) ) {
					// Check JSend response status
					if ( res.status === 'success' ) {
						resolve(reason(res, xhr));
					} else {
						reject(reason(res, xhr));
					}
				} else {
					res = {
						status: 'error',
						message: httpError(xhr)
					};

					reject(reason(res, xhr));
				}
			};

			// Send request
			xhr.send(data);
		});

		return requestPromise;
	};

	module.exports = ajax;
}());