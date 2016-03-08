(function () {
	/* global Promise */

	'use strict';

	var serialize = require('./serialize'),
		validate = require('./validate'),
		ajax = require('./ajax'),
		modules = {
			get: ajax,
			post: ajax,
			jsonp: require('./jsonp')
		},
		request;

	request = function request(config) {
		var requestPromise;

		config.type = config.type.toLowerCase();

		if ( !Promise ) {
			throw new Error('JSend requires `Promise`, please provide a polyfill');
		}

		// Encode the form data
		config.data = typeof config.data === 'string' ? config.data : serialize(config.data);

		// Generate GET url with data
		if ( (config.type === 'get' || config.type === 'jsonp') && config.data ) {
			config.url = config.url.indexOf('?') === -1 ? config.url + '?' + config.data : config.url + '&' + config.data;

			config.data = null;
		}

		// Setup request as a Promise
		requestPromise = new Promise(function handlePromise(resolve, reject) {
			modules[config.type](config, function (response, xhr) {
				validate(response, xhr, resolve, reject);
			});
		});

		// Return the JSend request promise
		return requestPromise;
	};

	module.exports = request;
}());