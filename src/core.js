
/**
 * JSend is a native AJAX implementation that strictly handles JSend responses according to the non-official JSend spec.
 *
 * @class Constructor function that handles / validates JSON data according to the JSend spec.
 *
 * @see http://labs.omniti.com/labs/JSend
 *
 * @author   Iain van der Wiel <iain@e-sites.nl>
 * @version  2.0
 * @return   {object} The JSend object
**/

'use strict';

var JSend = (function () {
	var ajax = require('./ajax'),
		jsonp = require('./jsonp');

	if ( !window.Promise ) {
		return console && console.warn('JSend requires `window.Promise`, please provide a polyfill');
	}

	return {
		get: function (url, data) {
			return ajax({
				method: 'GET',
				url: url,
				data: data
			});
		},

		post: function (url, data, headers) {
			var options = {
				method: 'POST',
				url: url,
				data: data
			}

			if ( headers && typeof headers === 'object' && header.constructor !== 'Array' ) {
				options.headers = headers;
			}

			return ajax(options);
		},

		jsonp: function (url, data) {
			return jsonp({
				url: url,
				data: data
			});
		}
	}
}());

module.exports = JSend;