'use strict';

var validate = function validate(body) {
	if ( body && body.hasOwnProperty('status') ) {
		if ( ( body.status === 'success' || body.status === 'fail' ) && body.hasOwnProperty('data') ) {
			return true;
		}

		else if (body.status === 'error' && body.hasOwnProperty('message') ) {
			return true;
		}
	}

	return false;
}

module.exports = validate;