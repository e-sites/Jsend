(function () {
	'use strict';

	var error = function error(xhr, error) {
		
		var msg = '',
			error = error || {};

		if (error === 'timeout') {
			msg = 'Timeout error.';
		} else if (error.hasOwnProperty('message')) {
			msg = error.message + '.';
		} else if (xhr.status === 0) {
			msg = 'Can\'t connect. Verify network.';
		} else if (xhr.status === 400) {
			msg = 'Bad Request [400].';
		} else if (xhr.status === 403) {
			msg = 'URL Forbidden [403].';
		} else if (xhr.status === 404) {
			msg = 'URL Not Found [404].';
		} else if (xhr.status === 500) {
			msg = 'Internal Server Error [500].';
		} else {
			msg = xhr.responseText + ' [' + xhr.status + '].';
		}

		return msg;
	};

	module.exports = error;
}());