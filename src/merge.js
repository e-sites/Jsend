'use strict';

// Function to deep merge arrays/objects
var merge = function merge(target, src) {
	var array = Array.isArray(src),
		dst = array && [] || {};

	if (array) {
		target = target || [];
		dst = dst.concat(target);

		src.forEach(function(e, i) {
			if (typeof e === 'object') {
				dst[i] = merge(target[i], e);
			} else {
				if (target.indexOf(e) === -1) {
					dst.push(e);
				}
			}
		});
	} else {
		if (target && typeof target === 'object') {
			Object.keys(target).forEach(function (key) {
				dst[key] = target[key];
			})
		}
		Object.keys(src).forEach(function (key) {
			if (typeof src[key] !== 'object' || !src[key]) {
				dst[key] = src[key];
			}
			else {
				if (!target[key]) {
					dst[key] = src[key];
				} else {
					dst[key] = merge(target[key], src[key]);
				}
			}
		});
	}

	return dst;
}

module.exports = merge;