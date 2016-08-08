!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.JSend=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

	var JSend = (function core() {
		var request = require('./request'),
			merge = require('./merge'),
			defaults = {
				type: 'get',
				data: '',
				timeout: 0,
				headers: {}
			},
			types = ['get', 'post', 'jsonp'],
			apis = {};

		// Base request API
		apis.request = function jsendRequest(options) {
			var config = merge(defaults, options);

			return request(config);
		};

		// Add aliases for each request type
		types.forEach(function (method) {
			var func = function (config) {
				var config = merge(defaults, config);

				config.type = method;

				return this.request(config);
			};

			apis[method] = func;
		});

		return apis;
	}());

	module.exports = JSend;
}());
},{"./merge":5,"./request":6}],2:[function(require,module,exports){
(function () {
	'use strict';

	var merge = require('./merge'),
		error = require('./error');

	var ajax = function ajax(options, callback) {
		var defaults = {
				timeout: 0,
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			},
			isLteIE8 = (function isLteIE8() {
				var test = navigator.userAgent.match(/MSIE (.{3}?);/);

				if ( test !== null && Number(test[test.length - 1]) <= 8 ) {
					return true;
				}

				return false;
			}()),
			eventName = isLteIE8 ? 'onreadystatechange' : 'onload',
			config = merge(defaults, options),
			url,
			xhr,
			res,
			timeout = false;

		config.type = config.type.toLowerCase();

		// Try to create an URL to check if hostname and port are the same.
		try {
			url = new URL(config.url);
		}
		catch (e) {
			url = config.url;
		}

		// Check if url is cross-domain and set correct CORS XHR object
		if ( url.location && (window.location.hostname !== url.hostname || window.location.port !== url.port) && !('withCredentials' in new XMLHttpRequest()) ) {
			xhr = new XDomainRequest();
		} else {
			xhr = new XMLHttpRequest();
		}

		// Open request
		xhr.open(config.type, url);

		// Force Content Type for IE
		if ( config.type === 'get' ) {
			xhr.setRequestHeader('Content-Type', 'application/json; charset="utf-8"');
		}

		// Set request headers
		for (var h in config.headers) {
			if ( config.headers.hasOwnProperty(h) ) {
				xhr.setRequestHeader(h, config.headers[h]);
			}
		}

		// Handle XHR timeout
		xhr.timeout = config.timeout;
		xhr.ontimeout = function ajaxOnTimeout() {
			// Set timeout variable to prevent IE8 from executing onreadystatechange
			timeout = true;

			// Generate error response
			res = {
				status: 'error',
				message: error(xhr, 'timeout')
			};

			callback(res, xhr);
		};

		// Handle XHR request finished state (state 4)
		xhr[eventName] = function ajaxOnLoad() {
			// Prevent execution if request isn't complete yet, or times out
			if (xhr.readyState !== 4 || timeout) {
				return;
			}

			// Check for HTTP error
			if ( (!xhr.status || (xhr.status < 200 || xhr.status >= 300) && xhr.status !== 304) ) {
				// HTTP status error
				res = {
					status: 'error',
					message: error(xhr)
				};
			} else {
				// No status error. Try parsing response...
				try {
					res = JSON.parse(xhr.responseText);
				}
				// Parsing failed
				catch (e) {
					res = {
						status: 'error',
						message: error(xhr, e)
					};
				}
			}

			callback(res, xhr);
		};

		// Send request
		xhr.send(config.data);
	};

	module.exports = ajax;
}());

},{"./error":3,"./merge":5}],3:[function(require,module,exports){
(function () {
	'use strict';

	var checkError = function checkError(xhr, error) {
		
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

	module.exports = checkError;
}());
},{}],4:[function(require,module,exports){
(function () {
	'use strict';

	var res;

	var jsonp = function jsonp(options, callback) {
		var fname = 'jsend' + Math.round(Math.random() * 1000),
			script = document.createElement('script'),
			url = options.url.indexOf('?') === -1 ? options.url + '?callback=' + fname : options.url + '&callback=JSend.callbacks.' + fname;

		window.JSend.callbacks = window.JSend.callbacks || {};

		script.onerror = function jsonpOnError (e) {
			if ( e.type === 'error' ) {
				res = {
					status: 'error',
					message: 'Error loading script'
				};

				callback(res);
			}
		};

		script.src = url;

		document.head.appendChild(script);

		window.JSend.callbacks[fname] = function jsonpResponse(response) {
			callback(response);

			delete window.JSend.callbacks[fname];
		};
	};

	module.exports = jsonp;
}());
},{}],5:[function(require,module,exports){
(function () {
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
				});
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
	};

	module.exports = merge;
}());
},{}],6:[function(require,module,exports){
(function () {
	/* global Promise */

	'use strict';

	var serialize = require('./serialize'),
		validate = require('./validate'),
		ajax = require('./ajax'),
		modules = {
			get: ajax,
			post: ajax,
			jsonp: require('./jsonp')
		},
		request;

	request = function request(config) {
		var requestPromise;

		config.type = config.type.toLowerCase();

		if ( !Promise ) {
			throw new Error('JSend requires `Promise`, please provide a polyfill');
		}

		// Encode the form data
		config.data = typeof config.data === 'string' ? config.data : serialize(config.data);

		// Generate GET url with data
		if ( (config.type === 'get' || config.type === 'jsonp') && config.data ) {
			config.url = config.url.indexOf('?') === -1 ? config.url + '?' + config.data : config.url + '&' + config.data;

			config.data = null;
		}

		// Setup request as a Promise
		requestPromise = new Promise(function handlePromise(resolve, reject) {
			modules[config.type](config, function (response, xhr) {
				validate(response, xhr, resolve, reject);
			});
		});

		// Return the JSend request promise
		return requestPromise;
	};

	module.exports = request;
}());
},{"./ajax":2,"./jsonp":4,"./serialize":7,"./validate":8}],7:[function(require,module,exports){
(function() {
	'use strict';

	var serialize = function serialize(data) {
		var e = encodeURIComponent,
				tmp = [];

		if ( typeof data !== 'object' ) {
			throw new TypeError('expected data to be of type object');
		}

		for (var k in data) {
			if ( data.hasOwnProperty(k) ) {
				tmp.push( e(k) + '=' + e(data[k]) );
			}
		}

		return tmp.join('&');
	};

	module.exports = serialize;
}());
},{}],8:[function(require,module,exports){
(function () {
	'use strict';

	var error = require('./error'),
		validateRequest;

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
},{"./error":3}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29yZS5qcyIsInNyYy9hamF4LmpzIiwic3JjL2Vycm9yLmpzIiwic3JjL2pzb25wLmpzIiwic3JjL21lcmdlLmpzIiwic3JjL3JlcXVlc3QuanMiLCJzcmMvc2VyaWFsaXplLmpzIiwic3JjL3ZhbGlkYXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXHJcbiAqIEpTZW5kIGlzIGEgbmF0aXZlIEFKQVggaW1wbGVtZW50YXRpb24gdGhhdCBzdHJpY3RseSBoYW5kbGVzIEpTZW5kIHJlc3BvbnNlcyBhY2NvcmRpbmcgdG8gdGhlIG5vbi1vZmZpY2lhbCBKU2VuZCBzcGVjLlxyXG4gKlxyXG4gKiBAY2xhc3MgQ29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIC8gdmFsaWRhdGVzIEpTT04gZGF0YSBhY2NvcmRpbmcgdG8gdGhlIEpTZW5kIHNwZWMuXHJcbiAqXHJcbiAqIEBzZWUgaHR0cDovL2xhYnMub21uaXRpLmNvbS9sYWJzL0pTZW5kXHJcbiAqXHJcbiAqIEBhdXRob3IgICBJYWluIHZhbiBkZXIgV2llbCA8aWFpbkBlLXNpdGVzLm5sPlxyXG4gKiBAdmVyc2lvbiAgMi4wLjBcclxuICogQHJldHVybiAgIHtPYmplY3R9IFRoZSBKU2VuZCBvYmplY3RcclxuKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIEpTZW5kID0gKGZ1bmN0aW9uIGNvcmUoKSB7XHJcblx0XHR2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxyXG5cdFx0XHRtZXJnZSA9IHJlcXVpcmUoJy4vbWVyZ2UnKSxcclxuXHRcdFx0ZGVmYXVsdHMgPSB7XHJcblx0XHRcdFx0dHlwZTogJ2dldCcsXHJcblx0XHRcdFx0ZGF0YTogJycsXHJcblx0XHRcdFx0dGltZW91dDogMCxcclxuXHRcdFx0XHRoZWFkZXJzOiB7fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0eXBlcyA9IFsnZ2V0JywgJ3Bvc3QnLCAnanNvbnAnXSxcclxuXHRcdFx0YXBpcyA9IHt9O1xyXG5cclxuXHRcdC8vIEJhc2UgcmVxdWVzdCBBUElcclxuXHRcdGFwaXMucmVxdWVzdCA9IGZ1bmN0aW9uIGpzZW5kUmVxdWVzdChvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjb25maWcgPSBtZXJnZShkZWZhdWx0cywgb3B0aW9ucyk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVxdWVzdChjb25maWcpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBBZGQgYWxpYXNlcyBmb3IgZWFjaCByZXF1ZXN0IHR5cGVcclxuXHRcdHR5cGVzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xyXG5cdFx0XHR2YXIgZnVuYyA9IGZ1bmN0aW9uIChjb25maWcpIHtcclxuXHRcdFx0XHR2YXIgY29uZmlnID0gbWVyZ2UoZGVmYXVsdHMsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy50eXBlID0gbWV0aG9kO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5yZXF1ZXN0KGNvbmZpZyk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRhcGlzW21ldGhvZF0gPSBmdW5jO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGFwaXM7XHJcblx0fSgpKTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBKU2VuZDtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIG1lcmdlID0gcmVxdWlyZSgnLi9tZXJnZScpLFxyXG5cdFx0ZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XHJcblxyXG5cdHZhciBhamF4ID0gZnVuY3Rpb24gYWpheChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGRlZmF1bHRzID0ge1xyXG5cdFx0XHRcdHRpbWVvdXQ6IDAsXHJcblx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0J1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnLFxyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpc0x0ZUlFOCA9IChmdW5jdGlvbiBpc0x0ZUlFOCgpIHtcclxuXHRcdFx0XHR2YXIgdGVzdCA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL01TSUUgKC57M30/KTsvKTtcclxuXHJcblx0XHRcdFx0aWYgKCB0ZXN0ICE9PSBudWxsICYmIE51bWJlcih0ZXN0W3Rlc3QubGVuZ3RoIC0gMV0pIDw9IDggKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fSgpKSxcclxuXHRcdFx0ZXZlbnROYW1lID0gaXNMdGVJRTggPyAnb25yZWFkeXN0YXRlY2hhbmdlJyA6ICdvbmxvYWQnLFxyXG5cdFx0XHRjb25maWcgPSBtZXJnZShkZWZhdWx0cywgb3B0aW9ucyksXHJcblx0XHRcdHVybCxcclxuXHRcdFx0eGhyLFxyXG5cdFx0XHRyZXMsXHJcblx0XHRcdHRpbWVvdXQgPSBmYWxzZTtcclxuXHJcblx0XHRjb25maWcudHlwZSA9IGNvbmZpZy50eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGNyZWF0ZSBhbiBVUkwgdG8gY2hlY2sgaWYgaG9zdG5hbWUgYW5kIHBvcnQgYXJlIHRoZSBzYW1lLlxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dXJsID0gbmV3IFVSTChjb25maWcudXJsKTtcclxuXHRcdH1cclxuXHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdHVybCA9IGNvbmZpZy51cmw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdXJsIGlzIGNyb3NzLWRvbWFpbiBhbmQgc2V0IGNvcnJlY3QgQ09SUyBYSFIgb2JqZWN0XHJcblx0XHRpZiAoIHVybC5sb2NhdGlvbiAmJiAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSB1cmwuaG9zdG5hbWUgfHwgd2luZG93LmxvY2F0aW9uLnBvcnQgIT09IHVybC5wb3J0KSAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpKSApIHtcclxuXHRcdFx0eGhyID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPcGVuIHJlcXVlc3RcclxuXHRcdHhoci5vcGVuKGNvbmZpZy50eXBlLCB1cmwpO1xyXG5cclxuXHRcdC8vIEZvcmNlIENvbnRlbnQgVHlwZSBmb3IgSUVcclxuXHRcdGlmICggY29uZmlnLnR5cGUgPT09ICdnZXQnICkge1xyXG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9XCJ1dGYtOFwiJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHJlcXVlc3QgaGVhZGVyc1xyXG5cdFx0Zm9yICh2YXIgaCBpbiBjb25maWcuaGVhZGVycykge1xyXG5cdFx0XHRpZiAoIGNvbmZpZy5oZWFkZXJzLmhhc093blByb3BlcnR5KGgpICkge1xyXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKGgsIGNvbmZpZy5oZWFkZXJzW2hdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBYSFIgdGltZW91dFxyXG5cdFx0eGhyLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcclxuXHRcdHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiBhamF4T25UaW1lb3V0KCkge1xyXG5cdFx0XHQvLyBTZXQgdGltZW91dCB2YXJpYWJsZSB0byBwcmV2ZW50IElFOCBmcm9tIGV4ZWN1dGluZyBvbnJlYWR5c3RhdGVjaGFuZ2VcclxuXHRcdFx0dGltZW91dCA9IHRydWU7XHJcblxyXG5cdFx0XHQvLyBHZW5lcmF0ZSBlcnJvciByZXNwb25zZVxyXG5cdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxyXG5cdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhociwgJ3RpbWVvdXQnKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y2FsbGJhY2socmVzLCB4aHIpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBIYW5kbGUgWEhSIHJlcXVlc3QgZmluaXNoZWQgc3RhdGUgKHN0YXRlIDQpXHJcblx0XHR4aHJbZXZlbnROYW1lXSA9IGZ1bmN0aW9uIGFqYXhPbkxvYWQoKSB7XHJcblx0XHRcdC8vIFByZXZlbnQgZXhlY3V0aW9uIGlmIHJlcXVlc3QgaXNuJ3QgY29tcGxldGUgeWV0LCBvciB0aW1lcyBvdXRcclxuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlICE9PSA0IHx8IHRpbWVvdXQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciBIVFRQIGVycm9yXHJcblx0XHRcdGlmICggKCF4aHIuc3RhdHVzIHx8ICh4aHIuc3RhdHVzIDwgMjAwIHx8IHhoci5zdGF0dXMgPj0gMzAwKSAmJiB4aHIuc3RhdHVzICE9PSAzMDQpICkge1xyXG5cdFx0XHRcdC8vIEhUVFAgc3RhdHVzIGVycm9yXHJcblx0XHRcdFx0cmVzID0ge1xyXG5cdFx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxyXG5cdFx0XHRcdFx0bWVzc2FnZTogZXJyb3IoeGhyKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm8gc3RhdHVzIGVycm9yLiBUcnkgcGFyc2luZyByZXNwb25zZS4uLlxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRyZXMgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBQYXJzaW5nIGZhaWxlZFxyXG5cdFx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdFx0bWVzc2FnZTogZXJyb3IoeGhyLCBlKVxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNhbGxiYWNrKHJlcywgeGhyKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU2VuZCByZXF1ZXN0XHJcblx0XHR4aHIuc2VuZChjb25maWcuZGF0YSk7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBhamF4O1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIGNoZWNrRXJyb3IgPSBmdW5jdGlvbiBjaGVja0Vycm9yKHhociwgZXJyb3IpIHtcclxuXHRcdFxyXG5cdFx0dmFyIG1zZyA9ICcnLFxyXG5cdFx0XHRlcnJvciA9IGVycm9yIHx8IHt9O1xyXG5cclxuXHRcdGlmIChlcnJvciA9PT0gJ3RpbWVvdXQnKSB7XHJcblx0XHRcdG1zZyA9ICdUaW1lb3V0IGVycm9yLic7XHJcblx0XHR9IGVsc2UgaWYgKGVycm9yLmhhc093blByb3BlcnR5KCdtZXNzYWdlJykpIHtcclxuXHRcdFx0bXNnID0gZXJyb3IubWVzc2FnZSArICcuJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gMCkge1xyXG5cdFx0XHRtc2cgPSAnQ2FuXFwndCBjb25uZWN0LiBWZXJpZnkgbmV0d29yay4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDApIHtcclxuXHRcdFx0bXNnID0gJ0JhZCBSZXF1ZXN0IFs0MDBdLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xyXG5cdFx0XHRtc2cgPSAnVVJMIEZvcmJpZGRlbiBbNDAzXS4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDQpIHtcclxuXHRcdFx0bXNnID0gJ1VSTCBOb3QgRm91bmQgWzQwNF0uJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNTAwKSB7XHJcblx0XHRcdG1zZyA9ICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3IgWzUwMF0uJztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1zZyA9IHhoci5yZXNwb25zZVRleHQgKyAnIFsnICsgeGhyLnN0YXR1cyArICddLic7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1zZztcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNoZWNrRXJyb3I7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciByZXM7XHJcblxyXG5cdHZhciBqc29ucCA9IGZ1bmN0aW9uIGpzb25wKG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgZm5hbWUgPSAnanNlbmQnICsgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwMCksXHJcblx0XHRcdHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpLFxyXG5cdFx0XHR1cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCc/JykgPT09IC0xID8gb3B0aW9ucy51cmwgKyAnP2NhbGxiYWNrPScgKyBmbmFtZSA6IG9wdGlvbnMudXJsICsgJyZjYWxsYmFjaz1KU2VuZC5jYWxsYmFja3MuJyArIGZuYW1lO1xyXG5cclxuXHRcdHdpbmRvdy5KU2VuZC5jYWxsYmFja3MgPSB3aW5kb3cuSlNlbmQuY2FsbGJhY2tzIHx8IHt9O1xyXG5cclxuXHRcdHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24ganNvbnBPbkVycm9yIChlKSB7XHJcblx0XHRcdGlmICggZS50eXBlID09PSAnZXJyb3InICkge1xyXG5cdFx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdG1lc3NhZ2U6ICdFcnJvciBsb2FkaW5nIHNjcmlwdCdcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYWxsYmFjayhyZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHNjcmlwdC5zcmMgPSB1cmw7XHJcblxyXG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpO1xyXG5cclxuXHRcdHdpbmRvdy5KU2VuZC5jYWxsYmFja3NbZm5hbWVdID0gZnVuY3Rpb24ganNvbnBSZXNwb25zZShyZXNwb25zZSkge1xyXG5cdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XHJcblxyXG5cdFx0XHRkZWxldGUgd2luZG93LkpTZW5kLmNhbGxiYWNrc1tmbmFtZV07XHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0ganNvbnA7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIGRlZXAgbWVyZ2UgYXJyYXlzL29iamVjdHNcclxuXHR2YXIgbWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNyYykge1xyXG5cdFx0dmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpLFxyXG5cdFx0XHRkc3QgPSBhcnJheSAmJiBbXSB8fCB7fTtcclxuXHJcblx0XHRpZiAoYXJyYXkpIHtcclxuXHRcdFx0dGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xyXG5cdFx0XHRkc3QgPSBkc3QuY29uY2F0KHRhcmdldCk7XHJcblxyXG5cdFx0XHRzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBlID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0ZHN0W2ldID0gbWVyZ2UodGFyZ2V0W2ldLCBlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRkc3QucHVzaChlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHRhcmdldFtrZXldO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBzcmNba2V5XSAhPT0gJ29iamVjdCcgfHwgIXNyY1trZXldKSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHNyY1trZXldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGlmICghdGFyZ2V0W2tleV0pIHtcclxuXHRcdFx0XHRcdFx0ZHN0W2tleV0gPSBzcmNba2V5XTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGRzdFtrZXldID0gbWVyZ2UodGFyZ2V0W2tleV0sIHNyY1trZXldKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkc3Q7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdC8qIGdsb2JhbCBQcm9taXNlICovXHJcblxyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIHNlcmlhbGl6ZSA9IHJlcXVpcmUoJy4vc2VyaWFsaXplJyksXHJcblx0XHR2YWxpZGF0ZSA9IHJlcXVpcmUoJy4vdmFsaWRhdGUnKSxcclxuXHRcdGFqYXggPSByZXF1aXJlKCcuL2FqYXgnKSxcclxuXHRcdG1vZHVsZXMgPSB7XHJcblx0XHRcdGdldDogYWpheCxcclxuXHRcdFx0cG9zdDogYWpheCxcclxuXHRcdFx0anNvbnA6IHJlcXVpcmUoJy4vanNvbnAnKVxyXG5cdFx0fSxcclxuXHRcdHJlcXVlc3Q7XHJcblxyXG5cdHJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xyXG5cdFx0dmFyIHJlcXVlc3RQcm9taXNlO1xyXG5cclxuXHRcdGNvbmZpZy50eXBlID0gY29uZmlnLnR5cGUudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRpZiAoICFQcm9taXNlICkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0pTZW5kIHJlcXVpcmVzIGBQcm9taXNlYCwgcGxlYXNlIHByb3ZpZGUgYSBwb2x5ZmlsbCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuY29kZSB0aGUgZm9ybSBkYXRhXHJcblx0XHRjb25maWcuZGF0YSA9IHR5cGVvZiBjb25maWcuZGF0YSA9PT0gJ3N0cmluZycgPyBjb25maWcuZGF0YSA6IHNlcmlhbGl6ZShjb25maWcuZGF0YSk7XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgR0VUIHVybCB3aXRoIGRhdGFcclxuXHRcdGlmICggKGNvbmZpZy50eXBlID09PSAnZ2V0JyB8fCBjb25maWcudHlwZSA9PT0gJ2pzb25wJykgJiYgY29uZmlnLmRhdGEgKSB7XHJcblx0XHRcdGNvbmZpZy51cmwgPSBjb25maWcudXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyBjb25maWcudXJsICsgJz8nICsgY29uZmlnLmRhdGEgOiBjb25maWcudXJsICsgJyYnICsgY29uZmlnLmRhdGE7XHJcblxyXG5cdFx0XHRjb25maWcuZGF0YSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0dXAgcmVxdWVzdCBhcyBhIFByb21pc2VcclxuXHRcdHJlcXVlc3RQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gaGFuZGxlUHJvbWlzZShyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0bW9kdWxlc1tjb25maWcudHlwZV0oY29uZmlnLCBmdW5jdGlvbiAocmVzcG9uc2UsIHhocikge1xyXG5cdFx0XHRcdHZhbGlkYXRlKHJlc3BvbnNlLCB4aHIsIHJlc29sdmUsIHJlamVjdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmV0dXJuIHRoZSBKU2VuZCByZXF1ZXN0IHByb21pc2VcclxuXHRcdHJldHVybiByZXF1ZXN0UHJvbWlzZTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIHNlcmlhbGl6ZShkYXRhKSB7XHJcblx0XHR2YXIgZSA9IGVuY29kZVVSSUNvbXBvbmVudCxcclxuXHRcdFx0XHR0bXAgPSBbXTtcclxuXHJcblx0XHRpZiAoIHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JyApIHtcclxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgZGF0YSB0byBiZSBvZiB0eXBlIG9iamVjdCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGsgaW4gZGF0YSkge1xyXG5cdFx0XHRpZiAoIGRhdGEuaGFzT3duUHJvcGVydHkoaykgKSB7XHJcblx0XHRcdFx0dG1wLnB1c2goIGUoaykgKyAnPScgKyBlKGRhdGFba10pICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdG1wLmpvaW4oJyYnKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHNlcmlhbGl6ZTtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLFxyXG5cdFx0dmFsaWRhdGVSZXF1ZXN0O1xyXG5cclxuXHR2YXIgdmFsaWRhdGVSZXF1ZXN0ID0gZnVuY3Rpb24gdmFsaWRhdGVSZXF1ZXN0KHJlc3BvbnNlLCB4aHIsIHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZEpzZW5kKHJlc3BvbnNlKSB7XHJcblx0XHRcdGlmICggcmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ3N0YXR1cycpICkge1xyXG5cdFx0XHRcdGlmICggKCByZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyB8fCByZXNwb25zZS5zdGF0dXMgPT09ICdmYWlsJyApICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCdkYXRhJykgKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnbWVzc2FnZScpICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdmFsaWRhdGVSZXF1ZXN0IHJlc3BvbnNlIGFzIEpTZW5kXHJcblx0XHRpZiAoIGlzVmFsaWRKc2VuZChyZXNwb25zZSkgKSB7XHJcblx0XHRcdC8vIENoZWNrIEpTZW5kIHJlc3BvbnNlIHN0YXR1c1xyXG5cdFx0XHRpZiAoIHJlc3BvbnNlLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnICkge1xyXG5cdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJlamVjdChyZXNwb25zZSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJlc3BvbnNlID0ge1xyXG5cdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRtZXNzYWdlOiBlcnJvcih4aHIsIHJlc3BvbnNlKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHZhbGlkYXRlUmVxdWVzdDtcclxufSgpKTsiXX0=
