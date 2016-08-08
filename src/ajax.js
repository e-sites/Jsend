(function () {
	'use strict';

	var merge = require('./merge'),
		error = require('./error');

	var ajax = function ajax(options, callback) {
		var defaults = {
				timeout: 0,
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			},
			isLteIE8 = (function isLteIE8() {
				var test = navigator.userAgent.match(/MSIE (.{3}?);/);

				if ( test !== null && Number(test[test.length - 1]) <= 8 ) {
					return true;
				}

				return false;
			}()),
			eventName = isLteIE8 ? 'onreadystatechange' : 'onload',
			config = merge(defaults, options),
			url,
			xhr,
			res,
			timeout = false;

		config.type = config.type.toLowerCase();

		// Try to create an URL to check if hostname and port are the same.
		try {
			url = new URL(config.url);
		}
		catch (e) {
			url = config.url;
		}

		// Check if url is cross-domain and set correct CORS XHR object
		if ( url.location && (window.location.hostname !== url.hostname || window.location.port !== url.port) && !('withCredentials' in new XMLHttpRequest()) ) {
			xhr = new XDomainRequest();
		} else {
			xhr = new XMLHttpRequest();
		}

		// Open request
		xhr.open(config.type, url);

		// Force Content Type for IE
		if ( config.type === 'get' ) {
			xhr.setRequestHeader('Content-Type', 'application/json; charset="utf-8"');
		}

		// Set request headers
		for (var h in config.headers) {
			if ( config.headers.hasOwnProperty(h) ) {
				xhr.setRequestHeader(h, config.headers[h]);
			}
		}

		// Handle XHR timeout
		xhr.timeout = config.timeout;
		xhr.ontimeout = function ajaxOnTimeout() {
			// Set timeout variable to prevent IE8 from executing onreadystatechange
			timeout = true;

			// Generate error response
			res = {
				status: 'error',
				message: error(xhr, 'timeout')
			};

			callback(res, xhr);
		};

		// Handle XHR request finished state (state 4)
		xhr[eventName] = function ajaxOnLoad() {
			// Prevent execution if request isn't complete yet, or times out
			if (xhr.readyState !== 4 || timeout) {
				return;
			}

			// Check for HTTP error
			if ( (!xhr.status || (xhr.status < 200 || xhr.status >= 300) && xhr.status !== 304) ) {
				// HTTP status error
				res = {
					status: 'error',
					message: error(xhr)
				};
			} else {
				// No status error. Try parsing response...
				try {
					res = JSON.parse(xhr.responseText);
				}
				// Parsing failed
				catch (e) {
					res = {
						status: 'error',
						message: error(xhr, e)
					};
				}
			}

			callback(res, xhr);
		};

		// Send request
		xhr.send(config.data);
	};

	module.exports = ajax;
}());
