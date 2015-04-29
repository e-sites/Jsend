(function() {
	'use strict';

	var reason = function reason(response, xhr) {
		return {
			data: response,
			xhr: xhr
		};
	};

	module.exports = reason;
}());