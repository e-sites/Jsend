/**
 * JSend is a native AJAX implementation that strictly handles JSend responses according to the non-official JSend spec.
 *
 * @class Constructor function that handles / validates JSON data according to the JSend spec.
 *
 * @see http://labs.omniti.com/labs/JSend
 *
 * @author   Iain van der Wiel <iain@e-sites.nl>
 * @version  2.0.0
 * @return   {Object} The JSend object
**/

(function () {
	'use strict';

	var JSend = (function core() {
		var request = require('./request'),
			merge = require('./merge'),
			defaults = {
				type: 'get',
				data: '',
				timeout: 0,
				headers: {}
			},
			types = ['get', 'post', 'jsonp'],
			apis = {};

		// Base request API
		apis.request = function jsendRequest(options) {
			var config = merge(defaults, options);

			return request(config);
		};

		// Add aliases for each request type
		types.forEach(function (method) {
			var func = function (config) {
				var config = merge(defaults, config);

				config.type = method;

				return this.request(config);
			};

			apis[method] = func;
		});

		return apis;
	}());

	module.exports = JSend;
}());