(function () {
	'use strict';

	var error = require('./error'),
		validateRequest;

	/**
	 * Validates a response by checking response data and http response headers
	 *
	 * @param  {Object} response Response Object
	 * @param  {Object} xhr      XHR Object
	 * @param  {Function} resolve  Promise resolve function
	 * @param  {function} reject   Promise reject function
	 */
	var validateRequest = function validateRequest(response, xhr, resolve, reject) {
		function isValidJsend(response) {
			if ( response && response.hasOwnProperty('status') ) {
				if ( ( response.status === 'success' || response.status === 'fail' ) && response.hasOwnProperty('data') ) {
					return true;
				}

				else if (response.status === 'error' && response.hasOwnProperty('message') ) {
					return true;
				}
			}

			return false;
		}

		// validateRequest response as JSend
		if ( isValidJsend(response) ) {
			// Check JSend response status
			if ( response.status === 'success' ) {
				resolve(response);
			} else {
				reject(response);
			}
		} else {
			response = {
				status: 'error',
				message: error(xhr, response)
			};

			reject(response);
		}
	};

	module.exports = validateRequest;
}());