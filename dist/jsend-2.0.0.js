!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.JSend=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./src/core.js":[function(require,module,exports){
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
},{"./merge":"/Applications/MAMP/htdocs/Jsend/src/merge.js","./request":"/Applications/MAMP/htdocs/Jsend/src/request.js"}],"/Applications/MAMP/htdocs/Jsend/src/ajax.js":[function(require,module,exports){
(function () {
	'use strict';

	var merge = require('./merge'),
		error = require('./error');

	var ajax = function ajax(options, callback) {
		var defaults = {
				timeout: 0,
				headers: {
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
			var err = (!xhr.status || (xhr.status < 200 || xhr.status >= 300) && xhr.status !== 304);

			if ( err ) {
				res = {
					status: 'error',
					message: error(xhr)
				};
			} else {
				res = JSON.parse(xhr.responseText);
			}

			callback(res, xhr);
		};

		// Send request
		xhr.send(config.data);
	};

	module.exports = ajax;
}());

},{"./error":"/Applications/MAMP/htdocs/Jsend/src/error.js","./merge":"/Applications/MAMP/htdocs/Jsend/src/merge.js"}],"/Applications/MAMP/htdocs/Jsend/src/error.js":[function(require,module,exports){
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/jsonp.js":[function(require,module,exports){
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/merge.js":[function(require,module,exports){
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/request.js":[function(require,module,exports){
(function () {
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
			return console && console.error('JSend requires `Promise`, please provide a polyfill');
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
},{"./ajax":"/Applications/MAMP/htdocs/Jsend/src/ajax.js","./jsonp":"/Applications/MAMP/htdocs/Jsend/src/jsonp.js","./serialize":"/Applications/MAMP/htdocs/Jsend/src/serialize.js","./validate":"/Applications/MAMP/htdocs/Jsend/src/validate.js"}],"/Applications/MAMP/htdocs/Jsend/src/serialize.js":[function(require,module,exports){
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/validate.js":[function(require,module,exports){
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
},{"./error":"/Applications/MAMP/htdocs/Jsend/src/error.js"}]},{},["./src/core.js"])("./src/core.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29yZS5qcyIsInNyYy9hamF4LmpzIiwic3JjL2Vycm9yLmpzIiwic3JjL2pzb25wLmpzIiwic3JjL21lcmdlLmpzIiwic3JjL3JlcXVlc3QuanMiLCJzcmMvc2VyaWFsaXplLmpzIiwic3JjL3ZhbGlkYXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXHJcbiAqIEpTZW5kIGlzIGEgbmF0aXZlIEFKQVggaW1wbGVtZW50YXRpb24gdGhhdCBzdHJpY3RseSBoYW5kbGVzIEpTZW5kIHJlc3BvbnNlcyBhY2NvcmRpbmcgdG8gdGhlIG5vbi1vZmZpY2lhbCBKU2VuZCBzcGVjLlxyXG4gKlxyXG4gKiBAY2xhc3MgQ29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIC8gdmFsaWRhdGVzIEpTT04gZGF0YSBhY2NvcmRpbmcgdG8gdGhlIEpTZW5kIHNwZWMuXHJcbiAqXHJcbiAqIEBzZWUgaHR0cDovL2xhYnMub21uaXRpLmNvbS9sYWJzL0pTZW5kXHJcbiAqXHJcbiAqIEBhdXRob3IgICBJYWluIHZhbiBkZXIgV2llbCA8aWFpbkBlLXNpdGVzLm5sPlxyXG4gKiBAdmVyc2lvbiAgMi4wLjBcclxuICogQHJldHVybiAgIHtPYmplY3R9IFRoZSBKU2VuZCBvYmplY3RcclxuKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIEpTZW5kID0gKGZ1bmN0aW9uIGNvcmUoKSB7XHJcblx0XHR2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxyXG5cdFx0XHRtZXJnZSA9IHJlcXVpcmUoJy4vbWVyZ2UnKSxcclxuXHRcdFx0ZGVmYXVsdHMgPSB7XHJcblx0XHRcdFx0dHlwZTogJ2dldCcsXHJcblx0XHRcdFx0ZGF0YTogJycsXHJcblx0XHRcdFx0dGltZW91dDogMCxcclxuXHRcdFx0XHRoZWFkZXJzOiB7fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0eXBlcyA9IFsnZ2V0JywgJ3Bvc3QnLCAnanNvbnAnXSxcclxuXHRcdFx0YXBpcyA9IHt9O1xyXG5cclxuXHRcdC8vIEJhc2UgcmVxdWVzdCBBUElcclxuXHRcdGFwaXMucmVxdWVzdCA9IGZ1bmN0aW9uIGpzZW5kUmVxdWVzdChvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjb25maWcgPSBtZXJnZShkZWZhdWx0cywgb3B0aW9ucyk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVxdWVzdChjb25maWcpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBBZGQgYWxpYXNlcyBmb3IgZWFjaCByZXF1ZXN0IHR5cGVcclxuXHRcdHR5cGVzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xyXG5cdFx0XHR2YXIgZnVuYyA9IGZ1bmN0aW9uIChjb25maWcpIHtcclxuXHRcdFx0XHR2YXIgY29uZmlnID0gbWVyZ2UoZGVmYXVsdHMsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy50eXBlID0gbWV0aG9kO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5yZXF1ZXN0KGNvbmZpZyk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRhcGlzW21ldGhvZF0gPSBmdW5jO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGFwaXM7XHJcblx0fSgpKTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBKU2VuZDtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIG1lcmdlID0gcmVxdWlyZSgnLi9tZXJnZScpLFxyXG5cdFx0ZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XHJcblxyXG5cdHZhciBhamF4ID0gZnVuY3Rpb24gYWpheChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGRlZmF1bHRzID0ge1xyXG5cdFx0XHRcdHRpbWVvdXQ6IDAsXHJcblx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpc0x0ZUlFOCA9IChmdW5jdGlvbiBpc0x0ZUlFOCgpIHtcclxuXHRcdFx0XHR2YXIgdGVzdCA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL01TSUUgKC57M30/KTsvKTtcclxuXHJcblx0XHRcdFx0aWYgKCB0ZXN0ICE9PSBudWxsICYmIE51bWJlcih0ZXN0W3Rlc3QubGVuZ3RoIC0gMV0pIDw9IDggKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fSgpKSxcclxuXHRcdFx0ZXZlbnROYW1lID0gaXNMdGVJRTggPyAnb25yZWFkeXN0YXRlY2hhbmdlJyA6ICdvbmxvYWQnLFxyXG5cdFx0XHRjb25maWcgPSBtZXJnZShkZWZhdWx0cywgb3B0aW9ucyksXHJcblx0XHRcdHVybCxcclxuXHRcdFx0eGhyLFxyXG5cdFx0XHRyZXMsXHJcblx0XHRcdHRpbWVvdXQgPSBmYWxzZTtcclxuXHJcblx0XHRjb25maWcudHlwZSA9IGNvbmZpZy50eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGNyZWF0ZSBhbiBVUkwgdG8gY2hlY2sgaWYgaG9zdG5hbWUgYW5kIHBvcnQgYXJlIHRoZSBzYW1lLlxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dXJsID0gbmV3IFVSTChjb25maWcudXJsKTtcclxuXHRcdH1cclxuXHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdHVybCA9IGNvbmZpZy51cmw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdXJsIGlzIGNyb3NzLWRvbWFpbiBhbmQgc2V0IGNvcnJlY3QgQ09SUyBYSFIgb2JqZWN0XHJcblx0XHRpZiAoIHVybC5sb2NhdGlvbiAmJiAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSB1cmwuaG9zdG5hbWUgfHwgd2luZG93LmxvY2F0aW9uLnBvcnQgIT09IHVybC5wb3J0KSAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpKSApIHtcclxuXHRcdFx0eGhyID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPcGVuIHJlcXVlc3RcclxuXHRcdHhoci5vcGVuKGNvbmZpZy50eXBlLCB1cmwpO1xyXG5cclxuXHRcdC8vIEZvcmNlIENvbnRlbnQgVHlwZSBmb3IgSUVcclxuXHRcdGlmICggY29uZmlnLnR5cGUgPT09ICdnZXQnICkge1xyXG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9XCJ1dGYtOFwiJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHJlcXVlc3QgaGVhZGVyc1xyXG5cdFx0Zm9yICh2YXIgaCBpbiBjb25maWcuaGVhZGVycykge1xyXG5cdFx0XHRpZiAoIGNvbmZpZy5oZWFkZXJzLmhhc093blByb3BlcnR5KGgpICkge1xyXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKGgsIGNvbmZpZy5oZWFkZXJzW2hdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBYSFIgdGltZW91dFxyXG5cdFx0eGhyLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcclxuXHRcdHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiBhamF4T25UaW1lb3V0KCkge1xyXG5cdFx0XHQvLyBTZXQgdGltZW91dCB2YXJpYWJsZSB0byBwcmV2ZW50IElFOCBmcm9tIGV4ZWN1dGluZyBvbnJlYWR5c3RhdGVjaGFuZ2VcclxuXHRcdFx0dGltZW91dCA9IHRydWU7XHJcblxyXG5cdFx0XHQvLyBHZW5lcmF0ZSBlcnJvciByZXNwb25zZVxyXG5cdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxyXG5cdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhociwgJ3RpbWVvdXQnKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y2FsbGJhY2socmVzLCB4aHIpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBIYW5kbGUgWEhSIHJlcXVlc3QgZmluaXNoZWQgc3RhdGUgKHN0YXRlIDQpXHJcblx0XHR4aHJbZXZlbnROYW1lXSA9IGZ1bmN0aW9uIGFqYXhPbkxvYWQoKSB7XHJcblx0XHRcdC8vIFByZXZlbnQgZXhlY3V0aW9uIGlmIHJlcXVlc3QgaXNuJ3QgY29tcGxldGUgeWV0LCBvciB0aW1lcyBvdXRcclxuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlICE9PSA0IHx8IHRpbWVvdXQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciBIVFRQIGVycm9yXHJcblx0XHRcdHZhciBlcnIgPSAoIXhoci5zdGF0dXMgfHwgKHhoci5zdGF0dXMgPCAyMDAgfHwgeGhyLnN0YXR1cyA+PSAzMDApICYmIHhoci5zdGF0dXMgIT09IDMwNCk7XHJcblxyXG5cdFx0XHRpZiAoIGVyciApIHtcclxuXHRcdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiBlcnJvcih4aHIpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXMgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYWxsYmFjayhyZXMsIHhocik7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFNlbmQgcmVxdWVzdFxyXG5cdFx0eGhyLnNlbmQoY29uZmlnLmRhdGEpO1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gYWpheDtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBjaGVja0Vycm9yID0gZnVuY3Rpb24gY2hlY2tFcnJvcih4aHIsIGVycm9yKSB7XHJcblx0XHRcclxuXHRcdHZhciBtc2cgPSAnJyxcclxuXHRcdFx0ZXJyb3IgPSBlcnJvciB8fCB7fTtcclxuXHJcblx0XHRpZiAoZXJyb3IgPT09ICd0aW1lb3V0Jykge1xyXG5cdFx0XHRtc2cgPSAnVGltZW91dCBlcnJvci4nO1xyXG5cdFx0fSBlbHNlIGlmIChlcnJvci5oYXNPd25Qcm9wZXJ0eSgnbWVzc2FnZScpKSB7XHJcblx0XHRcdG1zZyA9IGVycm9yLm1lc3NhZ2UgKyAnLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDApIHtcclxuXHRcdFx0bXNnID0gJ0NhblxcJ3QgY29ubmVjdC4gVmVyaWZ5IG5ldHdvcmsuJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDAwKSB7XHJcblx0XHRcdG1zZyA9ICdCYWQgUmVxdWVzdCBbNDAwXS4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcclxuXHRcdFx0bXNnID0gJ1VSTCBGb3JiaWRkZW4gWzQwM10uJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0KSB7XHJcblx0XHRcdG1zZyA9ICdVUkwgTm90IEZvdW5kIFs0MDRdLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDUwMCkge1xyXG5cdFx0XHRtc2cgPSAnSW50ZXJuYWwgU2VydmVyIEVycm9yIFs1MDBdLic7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtc2cgPSB4aHIucmVzcG9uc2VUZXh0ICsgJyBbJyArIHhoci5zdGF0dXMgKyAnXS4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtc2c7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBjaGVja0Vycm9yO1xyXG59KCkpOyIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgcmVzO1xyXG5cclxuXHR2YXIganNvbnAgPSBmdW5jdGlvbiBqc29ucChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGZuYW1lID0gJ2pzZW5kJyArIE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDApLFxyXG5cdFx0XHRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKSxcclxuXHRcdFx0dXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignPycpID09PSAtMSA/IG9wdGlvbnMudXJsICsgJz9jYWxsYmFjaz0nICsgZm5hbWUgOiBvcHRpb25zLnVybCArICcmY2FsbGJhY2s9SlNlbmQuY2FsbGJhY2tzLicgKyBmbmFtZTtcclxuXHJcblx0XHR3aW5kb3cuSlNlbmQuY2FsbGJhY2tzID0gd2luZG93LkpTZW5kLmNhbGxiYWNrcyB8fCB7fTtcclxuXHJcblx0XHRzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uIGpzb25wT25FcnJvciAoZSkge1xyXG5cdFx0XHRpZiAoIGUudHlwZSA9PT0gJ2Vycm9yJyApIHtcclxuXHRcdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiAnRXJyb3IgbG9hZGluZyBzY3JpcHQnXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Y2FsbGJhY2socmVzKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRzY3JpcHQuc3JjID0gdXJsO1xyXG5cclxuXHRcdGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcclxuXHJcblx0XHR3aW5kb3cuSlNlbmQuY2FsbGJhY2tzW2ZuYW1lXSA9IGZ1bmN0aW9uIGpzb25wUmVzcG9uc2UocmVzcG9uc2UpIHtcclxuXHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xyXG5cclxuXHRcdFx0ZGVsZXRlIHdpbmRvdy5KU2VuZC5jYWxsYmFja3NbZm5hbWVdO1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGpzb25wO1xyXG59KCkpOyIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byBkZWVwIG1lcmdlIGFycmF5cy9vYmplY3RzXHJcblx0dmFyIG1lcmdlID0gZnVuY3Rpb24gbWVyZ2UodGFyZ2V0LCBzcmMpIHtcclxuXHRcdHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkoc3JjKSxcclxuXHRcdFx0ZHN0ID0gYXJyYXkgJiYgW10gfHwge307XHJcblxyXG5cdFx0aWYgKGFycmF5KSB7XHJcblx0XHRcdHRhcmdldCA9IHRhcmdldCB8fCBbXTtcclxuXHRcdFx0ZHN0ID0gZHN0LmNvbmNhdCh0YXJnZXQpO1xyXG5cclxuXHRcdFx0c3JjLmZvckVhY2goZnVuY3Rpb24oZSwgaSkge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgZSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdGRzdFtpXSA9IG1lcmdlKHRhcmdldFtpXSwgZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXQuaW5kZXhPZihlKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0ZHN0LnB1c2goZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0YXJnZXQgJiYgdHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRPYmplY3Qua2V5cyh0YXJnZXQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG5cdFx0XHRcdFx0ZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xyXG5cdFx0XHRcdFx0ZHN0W2tleV0gPSBzcmNba2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAoIXRhcmdldFtrZXldKSB7XHJcblx0XHRcdFx0XHRcdGRzdFtrZXldID0gc3JjW2tleV07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRkc3Rba2V5XSA9IG1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZHN0O1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gbWVyZ2U7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblx0XHRcclxuXHR2YXIgc2VyaWFsaXplID0gcmVxdWlyZSgnLi9zZXJpYWxpemUnKSxcclxuXHRcdHZhbGlkYXRlID0gcmVxdWlyZSgnLi92YWxpZGF0ZScpLFxyXG5cdFx0YWpheCA9IHJlcXVpcmUoJy4vYWpheCcpLFxyXG5cdFx0bW9kdWxlcyA9IHtcclxuXHRcdFx0Z2V0OiBhamF4LFxyXG5cdFx0XHRwb3N0OiBhamF4LFxyXG5cdFx0XHRqc29ucDogcmVxdWlyZSgnLi9qc29ucCcpXHJcblx0XHR9LFxyXG5cdFx0cmVxdWVzdDtcclxuXHJcblx0cmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XHJcblx0XHR2YXIgcmVxdWVzdFByb21pc2U7XHJcblxyXG5cdFx0Y29uZmlnLnR5cGUgPSBjb25maWcudHlwZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdGlmICggIVByb21pc2UgKSB7XHJcblx0XHRcdHJldHVybiBjb25zb2xlICYmIGNvbnNvbGUuZXJyb3IoJ0pTZW5kIHJlcXVpcmVzIGBQcm9taXNlYCwgcGxlYXNlIHByb3ZpZGUgYSBwb2x5ZmlsbCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuY29kZSB0aGUgZm9ybSBkYXRhXHJcblx0XHRjb25maWcuZGF0YSA9IHR5cGVvZiBjb25maWcuZGF0YSA9PT0gJ3N0cmluZycgPyBjb25maWcuZGF0YSA6IHNlcmlhbGl6ZShjb25maWcuZGF0YSk7XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgR0VUIHVybCB3aXRoIGRhdGFcclxuXHRcdGlmICggKGNvbmZpZy50eXBlID09PSAnZ2V0JyB8fCBjb25maWcudHlwZSA9PT0gJ2pzb25wJykgJiYgY29uZmlnLmRhdGEgKSB7XHJcblx0XHRcdGNvbmZpZy51cmwgPSBjb25maWcudXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyBjb25maWcudXJsICsgJz8nICsgY29uZmlnLmRhdGEgOiBjb25maWcudXJsICsgJyYnICsgY29uZmlnLmRhdGE7XHJcblxyXG5cdFx0XHRjb25maWcuZGF0YSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0dXAgcmVxdWVzdCBhcyBhIFByb21pc2VcclxuXHRcdHJlcXVlc3RQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gaGFuZGxlUHJvbWlzZShyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0bW9kdWxlc1tjb25maWcudHlwZV0oY29uZmlnLCBmdW5jdGlvbiAocmVzcG9uc2UsIHhocikge1xyXG5cdFx0XHRcdHZhbGlkYXRlKHJlc3BvbnNlLCB4aHIsIHJlc29sdmUsIHJlamVjdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmV0dXJuIHRoZSBKU2VuZCByZXF1ZXN0IHByb21pc2VcclxuXHRcdHJldHVybiByZXF1ZXN0UHJvbWlzZTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIHNlcmlhbGl6ZShkYXRhKSB7XHJcblx0XHR2YXIgZSA9IGVuY29kZVVSSUNvbXBvbmVudCxcclxuXHRcdFx0XHR0bXAgPSBbXTtcclxuXHJcblx0XHRpZiAoIHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JyApIHtcclxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgZGF0YSB0byBiZSBvZiB0eXBlIG9iamVjdCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGsgaW4gZGF0YSkge1xyXG5cdFx0XHRpZiAoIGRhdGEuaGFzT3duUHJvcGVydHkoaykgKSB7XHJcblx0XHRcdFx0dG1wLnB1c2goIGUoaykgKyAnPScgKyBlKGRhdGFba10pICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdG1wLmpvaW4oJyYnKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHNlcmlhbGl6ZTtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLFxyXG5cdFx0dmFsaWRhdGVSZXF1ZXN0O1xyXG5cclxuXHR2YXIgdmFsaWRhdGVSZXF1ZXN0ID0gZnVuY3Rpb24gdmFsaWRhdGVSZXF1ZXN0KHJlc3BvbnNlLCB4aHIsIHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZEpzZW5kKHJlc3BvbnNlKSB7XHJcblx0XHRcdGlmICggcmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ3N0YXR1cycpICkge1xyXG5cdFx0XHRcdGlmICggKCByZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyB8fCByZXNwb25zZS5zdGF0dXMgPT09ICdmYWlsJyApICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCdkYXRhJykgKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnbWVzc2FnZScpICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdmFsaWRhdGVSZXF1ZXN0IHJlc3BvbnNlIGFzIEpTZW5kXHJcblx0XHRpZiAoIGlzVmFsaWRKc2VuZChyZXNwb25zZSkgKSB7XHJcblx0XHRcdC8vIENoZWNrIEpTZW5kIHJlc3BvbnNlIHN0YXR1c1xyXG5cdFx0XHRpZiAoIHJlc3BvbnNlLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnICkge1xyXG5cdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJlamVjdChyZXNwb25zZSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJlc3BvbnNlID0ge1xyXG5cdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRtZXNzYWdlOiBlcnJvcih4aHIsIHJlc3BvbnNlKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHZhbGlkYXRlUmVxdWVzdDtcclxufSgpKTsiXX0=
