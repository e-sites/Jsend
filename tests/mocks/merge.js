(function () {
	'use strict';
	
	function merge(defaults, options) {
		return {
			url: options.url,
			type: 'get',
			data: 'm=success&name=get',
			method: options.method,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}
	}

	module.exports = merge;
}());