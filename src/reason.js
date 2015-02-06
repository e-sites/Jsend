(function() {
	'use strict';

	var reason = function (response, xhr) {
		return {
			data: response,
			xhr: xhr
		};
	};

	module.exports = reason;
}());