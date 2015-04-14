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

	var JSend = (function () {
		var request = require('./request');

		if ( !window.Promise ) {
			return console && console.warn('JSend requires `window.Promise`, please provide a polyfill');
		}

		return {
			get: function (url, data) {
				return request({
					type: 'ajax',
					options: {
						method: 'GET',
						url: url,
						data: data
					}
				});
			},

			post: function (url, data, headers) {
				var config = {
						type: 'ajax',
						options: {
							method: 'POST',
							url: url,
							data: data
						}
					};

				if ( headers && typeof headers === 'object' && headers.constructor !== 'Array' ) {
					config.options.headers = headers;
				}

				return request(config);
			},

			jsonp: function (url, data) {
				return request({
					type: 'jsonp',
					options: {
						url: url,
						data: data
					}
				});
			}
		};
	}());

	module.exports = JSend;
}());