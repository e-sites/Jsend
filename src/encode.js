'use strict';

var encode = function encode(data) {
	var e = encodeURIComponent,
			tmp = [];

	if ( typeof data === 'string' ) {
		return data;
	}

	for (var k in data) {
		if ( data.hasOwnProperty(k) ) {
			tmp.push( e(k) + '=' + e(data[k]) );
		}
	}

	return tmp.join('&');
}

module.exports = encode;