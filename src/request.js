(function () {
	'use strict';
		
	var serialize = require('./serialize'),
		validate = require('./validate'),
		modules = {
			ajax: require('./ajax'),
			jsonp: require('./jsonp')
		},
		request;

	request = function request(config) {
		var options = config.options,
			requestPromise;

		if ( !Promise ) {
			return console && console.error('JSend requires `Promise`, please provide a polyfill');
		}

		// Encode the form data
		options.data = typeof options.data === 'string' ? options.data : serialize(options.data);

		// Generate GET url with data
		if ( (options.method === 'GET' || config.type === 'jsonp') && options.data ) {
			options.url = options.url.indexOf('?') === -1 ? options.url + '?' + options.data : options.url + '&' + options.data;

			options.data = null;
		}

		// Setup request as a Promise
		requestPromise = new Promise(function handlePromise(resolve, reject) {
			modules[config.type](options, function (response, xhr) {
				validate(response, xhr, resolve, reject);
			});
		});

		// Return the JSend request promise
		return requestPromise;
	};

	module.exports = request;
}());