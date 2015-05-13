(function() {
	'use strict';
		
	var encode = require('./encode'),
		validate = require('./validate'),
		error = require('./error'),
		reason = require('./reason'),
		// promise = require('./promise'),
		modules = {
			ajax: require('./ajax'),
			jsonp: require('./jsonp')
		},
		res;

	var request = function request(config) {
		var options = config.options;

		// Encode the form data
		options.data = encode(options.data);

		// Generate GET url with data
		if ( (options.method === 'GET' || config.type === 'jsonp') && options.data ) {
			options.url = options.url.indexOf('?') === -1 ? options.url + '?' + options.data : options.url + '&' + options.data;

			options.data = null;
		}

		// Setup request as a Promise
		var requestPromise = new Promise(function (resolve, reject) {
			modules[config.type](options, function (response, xhr) {
				res = response;

				// Validate response as JSend
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
						message: error(xhr, response)
					};

					reject(reason(res, xhr));
				}
			});
		});

		// console.dir(requestPromise);

		// requestPromise.complete = function requestComplete(fn) {
		// 	if ( typeof fn === 'function' ) {
		// 		fn();
		// 	}
		// };
	
		// Return the JSend request promise
		return requestPromise;
	};

	module.exports = request;
}());