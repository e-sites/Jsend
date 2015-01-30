'use strict';

var merge = require('./merge'),
	httpError = require('./httperror'),
	validate = require('./validate'),
	encode = require('./encode');

var ajax = function ajax(options) {
	var request,
		defaults = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			timeout: 5000 // 5 seconds
		},
		config,
		xhr,
		data;

	// Merge options into defaults to create final config object
	config = merge(defaults, options);

	xhr = new XMLHttpRequest(),
	data = encode(config.data);

	// Setup request as a Promise
	request = new Promise(function (resolve, reject) {
		// Open request
		xhr.open(config.method, config.url);

		// Set data as query string for GET method
		if ( config.method === 'GET' && data ) {
			url = url.indexOf('?') === -1 
				? url + '?' + data 
				: url + '&' + data;

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
			reject(httpError(xhr, 'timeout'))
		}

		// Handle XHR request finished state
		xhr.onload = function () {
			var err = (!xhr.status || (xhr.status < 200 || xhr.status >= 300) && xhr.status !== 304),
				res;

			// Check for HTTP error
			if ( !err ) {
				res = JSON.parse(xhr.responseText);

				// Validate JSend response
				if ( validate(res) ) {
					if ( res.status === 'success' ) {
						resolve(res.data, xhr);
					} else {
						reject(res.data, res.status, xhr);
					}
				} else {
					reject('Invalid JSend response');
				}
			} else {
				reject(httpError(xhr));
			}
		}

		// Send request
		xhr.send(data);
	});

	return request;
}

module.exports = ajax;