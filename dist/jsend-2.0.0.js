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
		var request = require('./request');

		return {
			get: function jsendGet(url, data) {
				return request({
					type: 'ajax',
					options: {
						method: 'GET',
						url: url,
						data: data
					}
				});
			},

			post: function jsendPost(url, data, headers) {
				var config = {
						type: 'ajax',
						options: {
							method: 'POST',
							url: url,
							data: data
						}
					};

				if ( headers && typeof headers === 'object' && headers.constructor !== 'Array' ) {
					config.options.headers = headers;
				}

				return request(config);
			},

			jsonp: function jsendJsonp(url, data) {
				return request({
					type: 'jsonp',
					options: {
						url: url,
						data: data
					}
				});
			}
		};
	}());

	module.exports = JSend;
}());
},{"./request":"/Applications/MAMP/htdocs/Jsend/src/request.js"}],"/Applications/MAMP/htdocs/Jsend/src/ajax.js":[function(require,module,exports){
(function () {
	'use strict';

	var merge = require('./merge'),
		error = require('./error');

	var ajax = function ajax(options, callback) {
		var defaults = {
				timeout: 0,
				method: 'GET',
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
			onload = isLteIE8 ? 'onreadystatechange' : 'onload',
			config = merge(defaults, options),
			data = config.data,
			method = config.method,
			url,
			xhr,
			res,
			timeout = false;

		// Try to create an URL to check if hostname and port are the same
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
		xhr.open(method, url);

		// Force Content Type for IE
		if ( method === 'GET' ) {
			xhr.setRequestHeader('Content-Type', 'application/json; charset="utf-8"');
		}

		// Set request headers
		for (var h in config.headers) {
			if ( config.headers.hasOwnProperty(h) ) {
				xhr.setRequestHeader(h, config.headers[h]);
			}
		}

		// Handle XHR timeout, necessary?
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
		xhr[onload] = function ajaxOnLoad() {
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
		xhr.send(data);
	};

	module.exports = ajax;
}());

},{"./error":"/Applications/MAMP/htdocs/Jsend/src/error.js","./merge":"/Applications/MAMP/htdocs/Jsend/src/merge.js"}],"/Applications/MAMP/htdocs/Jsend/src/error.js":[function(require,module,exports){
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
		modules = {
			ajax: require('./ajax'),
			jsonp: require('./jsonp')
		},
		request;

	request = function request(config) {
		var options = config.options,
			requestPromise;

		if ( !Promise ) {
			return console && console.error('JSend requires `Promise`, please provide a polyfill');
		}

		// Encode the form data
		options.data = typeof options.data === 'string' ? options.data : serialize(options.data);

		console.log(options.url);

		// Generate GET url with data
		if ( (options.method === 'GET' || config.type === 'jsonp') && options.data ) {
			options.url = options.url.indexOf('?') === -1 ? options.url + '?' + options.data : options.url + '&' + options.data;

			options.data = null;
		}

		// Setup request as a Promise
		requestPromise = new Promise(function handlePromise(resolve, reject) {
			modules[config.type](options, function (response, xhr) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29yZS5qcyIsInNyYy9hamF4LmpzIiwic3JjL2Vycm9yLmpzIiwic3JjL2pzb25wLmpzIiwic3JjL21lcmdlLmpzIiwic3JjL3JlcXVlc3QuanMiLCJzcmMvc2VyaWFsaXplLmpzIiwic3JjL3ZhbGlkYXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXHJcbiAqIEpTZW5kIGlzIGEgbmF0aXZlIEFKQVggaW1wbGVtZW50YXRpb24gdGhhdCBzdHJpY3RseSBoYW5kbGVzIEpTZW5kIHJlc3BvbnNlcyBhY2NvcmRpbmcgdG8gdGhlIG5vbi1vZmZpY2lhbCBKU2VuZCBzcGVjLlxyXG4gKlxyXG4gKiBAY2xhc3MgQ29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIC8gdmFsaWRhdGVzIEpTT04gZGF0YSBhY2NvcmRpbmcgdG8gdGhlIEpTZW5kIHNwZWMuXHJcbiAqXHJcbiAqIEBzZWUgaHR0cDovL2xhYnMub21uaXRpLmNvbS9sYWJzL0pTZW5kXHJcbiAqXHJcbiAqIEBhdXRob3IgICBJYWluIHZhbiBkZXIgV2llbCA8aWFpbkBlLXNpdGVzLm5sPlxyXG4gKiBAdmVyc2lvbiAgMi4wLjBcclxuICogQHJldHVybiAgIHtPYmplY3R9IFRoZSBKU2VuZCBvYmplY3RcclxuKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIEpTZW5kID0gKGZ1bmN0aW9uIGNvcmUoKSB7XHJcblx0XHR2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24ganNlbmRHZXQodXJsLCBkYXRhKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcXVlc3Qoe1xyXG5cdFx0XHRcdFx0dHlwZTogJ2FqYXgnLFxyXG5cdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6ICdHRVQnLFxyXG5cdFx0XHRcdFx0XHR1cmw6IHVybCxcclxuXHRcdFx0XHRcdFx0ZGF0YTogZGF0YVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFx0cG9zdDogZnVuY3Rpb24ganNlbmRQb3N0KHVybCwgZGF0YSwgaGVhZGVycykge1xyXG5cdFx0XHRcdHZhciBjb25maWcgPSB7XHJcblx0XHRcdFx0XHRcdHR5cGU6ICdhamF4JyxcclxuXHRcdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxyXG5cdFx0XHRcdFx0XHRcdHVybDogdXJsLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGE6IGRhdGFcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0aWYgKCBoZWFkZXJzICYmIHR5cGVvZiBoZWFkZXJzID09PSAnb2JqZWN0JyAmJiBoZWFkZXJzLmNvbnN0cnVjdG9yICE9PSAnQXJyYXknICkge1xyXG5cdFx0XHRcdFx0Y29uZmlnLm9wdGlvbnMuaGVhZGVycyA9IGhlYWRlcnM7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVxdWVzdChjb25maWcpO1xyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFx0anNvbnA6IGZ1bmN0aW9uIGpzZW5kSnNvbnAodXJsLCBkYXRhKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcXVlc3Qoe1xyXG5cdFx0XHRcdFx0dHlwZTogJ2pzb25wJyxcclxuXHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0dXJsOiB1cmwsXHJcblx0XHRcdFx0XHRcdGRhdGE6IGRhdGFcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9KCkpO1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IEpTZW5kO1xyXG59KCkpOyIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgbWVyZ2UgPSByZXF1aXJlKCcuL21lcmdlJyksXHJcblx0XHRlcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcclxuXHJcblx0dmFyIGFqYXggPSBmdW5jdGlvbiBhamF4KG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgZGVmYXVsdHMgPSB7XHJcblx0XHRcdFx0dGltZW91dDogMCxcclxuXHRcdFx0XHRtZXRob2Q6ICdHRVQnLFxyXG5cdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0aXNMdGVJRTggPSAoZnVuY3Rpb24gaXNMdGVJRTgoKSB7XHJcblx0XHRcdFx0dmFyIHRlc3QgPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9NU0lFICguezN9Pyk7Lyk7XHJcblxyXG5cdFx0XHRcdGlmICggdGVzdCAhPT0gbnVsbCAmJiBOdW1iZXIodGVzdFt0ZXN0Lmxlbmd0aCAtIDFdKSA8PSA4ICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0oKSksXHJcblx0XHRcdG9ubG9hZCA9IGlzTHRlSUU4ID8gJ29ucmVhZHlzdGF0ZWNoYW5nZScgOiAnb25sb2FkJyxcclxuXHRcdFx0Y29uZmlnID0gbWVyZ2UoZGVmYXVsdHMsIG9wdGlvbnMpLFxyXG5cdFx0XHRkYXRhID0gY29uZmlnLmRhdGEsXHJcblx0XHRcdG1ldGhvZCA9IGNvbmZpZy5tZXRob2QsXHJcblx0XHRcdHVybCxcclxuXHRcdFx0eGhyLFxyXG5cdFx0XHRyZXMsXHJcblx0XHRcdHRpbWVvdXQgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBUcnkgdG8gY3JlYXRlIGFuIFVSTCB0byBjaGVjayBpZiBob3N0bmFtZSBhbmQgcG9ydCBhcmUgdGhlIHNhbWVcclxuXHRcdHRyeSB7XHJcblx0XHRcdHVybCA9IG5ldyBVUkwoY29uZmlnLnVybCk7XHJcblx0XHR9XHJcblx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHR1cmwgPSBjb25maWcudXJsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHVybCBpcyBjcm9zcy1kb21haW4gYW5kIHNldCBjb3JyZWN0IENPUlMgWEhSIG9iamVjdFxyXG5cdFx0aWYgKCB1cmwubG9jYXRpb24gJiYgKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSAhPT0gdXJsLmhvc3RuYW1lIHx8IHdpbmRvdy5sb2NhdGlvbi5wb3J0ICE9PSB1cmwucG9ydCkgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiBuZXcgWE1MSHR0cFJlcXVlc3QoKSkgKSB7XHJcblx0XHRcdHhociA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0eGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT3BlbiByZXF1ZXN0XHJcblx0XHR4aHIub3BlbihtZXRob2QsIHVybCk7XHJcblxyXG5cdFx0Ly8gRm9yY2UgQ29udGVudCBUeXBlIGZvciBJRVxyXG5cdFx0aWYgKCBtZXRob2QgPT09ICdHRVQnICkge1xyXG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9XCJ1dGYtOFwiJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHJlcXVlc3QgaGVhZGVyc1xyXG5cdFx0Zm9yICh2YXIgaCBpbiBjb25maWcuaGVhZGVycykge1xyXG5cdFx0XHRpZiAoIGNvbmZpZy5oZWFkZXJzLmhhc093blByb3BlcnR5KGgpICkge1xyXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKGgsIGNvbmZpZy5oZWFkZXJzW2hdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBYSFIgdGltZW91dCwgbmVjZXNzYXJ5P1xyXG5cdFx0eGhyLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcclxuXHRcdHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiBhamF4T25UaW1lb3V0KCkge1xyXG5cdFx0XHQvLyBTZXQgdGltZW91dCB2YXJpYWJsZSB0byBwcmV2ZW50IElFOCBmcm9tIGV4ZWN1dGluZyBvbnJlYWR5c3RhdGVjaGFuZ2VcclxuXHRcdFx0dGltZW91dCA9IHRydWU7XHJcblxyXG5cdFx0XHQvLyBHZW5lcmF0ZSBlcnJvciByZXNwb25zZVxyXG5cdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxyXG5cdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhociwgJ3RpbWVvdXQnKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y2FsbGJhY2socmVzLCB4aHIpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBIYW5kbGUgWEhSIHJlcXVlc3QgZmluaXNoZWQgc3RhdGUgKHN0YXRlIDQpXHJcblx0XHR4aHJbb25sb2FkXSA9IGZ1bmN0aW9uIGFqYXhPbkxvYWQoKSB7XHJcblx0XHRcdC8vIFByZXZlbnQgZXhlY3V0aW9uIGlmIHJlcXVlc3QgaXNuJ3QgY29tcGxldGUgeWV0LCBvciB0aW1lcyBvdXRcclxuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlICE9PSA0IHx8IHRpbWVvdXQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciBIVFRQIGVycm9yXHJcblx0XHRcdHZhciBlcnIgPSAoIXhoci5zdGF0dXMgfHwgKHhoci5zdGF0dXMgPCAyMDAgfHwgeGhyLnN0YXR1cyA+PSAzMDApICYmIHhoci5zdGF0dXMgIT09IDMwNCk7XHJcblxyXG5cdFx0XHRpZiAoIGVyciApIHtcclxuXHRcdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiBlcnJvcih4aHIpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXMgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYWxsYmFjayhyZXMsIHhocik7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFNlbmQgcmVxdWVzdFxyXG5cdFx0eGhyLnNlbmQoZGF0YSk7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBhamF4O1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIGVycm9yID0gZnVuY3Rpb24gZXJyb3IoeGhyLCBlcnJvcikge1xyXG5cdFx0XHJcblx0XHR2YXIgbXNnID0gJycsXHJcblx0XHRcdGVycm9yID0gZXJyb3IgfHwge307XHJcblxyXG5cdFx0aWYgKGVycm9yID09PSAndGltZW91dCcpIHtcclxuXHRcdFx0bXNnID0gJ1RpbWVvdXQgZXJyb3IuJztcclxuXHRcdH0gZWxzZSBpZiAoZXJyb3IuaGFzT3duUHJvcGVydHkoJ21lc3NhZ2UnKSkge1xyXG5cdFx0XHRtc2cgPSBlcnJvci5tZXNzYWdlICsgJy4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSAwKSB7XHJcblx0XHRcdG1zZyA9ICdDYW5cXCd0IGNvbm5lY3QuIFZlcmlmeSBuZXR3b3JrLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwMCkge1xyXG5cdFx0XHRtc2cgPSAnQmFkIFJlcXVlc3QgWzQwMF0uJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XHJcblx0XHRcdG1zZyA9ICdVUkwgRm9yYmlkZGVuIFs0MDNdLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwNCkge1xyXG5cdFx0XHRtc2cgPSAnVVJMIE5vdCBGb3VuZCBbNDA0XS4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA1MDApIHtcclxuXHRcdFx0bXNnID0gJ0ludGVybmFsIFNlcnZlciBFcnJvciBbNTAwXS4nO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bXNnID0geGhyLnJlc3BvbnNlVGV4dCArICcgWycgKyB4aHIuc3RhdHVzICsgJ10uJztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbXNnO1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gZXJyb3I7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciByZXM7XHJcblxyXG5cdHZhciBqc29ucCA9IGZ1bmN0aW9uIGpzb25wKG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgZm5hbWUgPSAnanNlbmQnICsgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwMCksXHJcblx0XHRcdHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpLFxyXG5cdFx0XHR1cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCc/JykgPT09IC0xID8gb3B0aW9ucy51cmwgKyAnP2NhbGxiYWNrPScgKyBmbmFtZSA6IG9wdGlvbnMudXJsICsgJyZjYWxsYmFjaz1KU2VuZC5jYWxsYmFja3MuJyArIGZuYW1lO1xyXG5cclxuXHRcdHdpbmRvdy5KU2VuZC5jYWxsYmFja3MgPSB3aW5kb3cuSlNlbmQuY2FsbGJhY2tzIHx8IHt9O1xyXG5cclxuXHRcdHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24ganNvbnBPbkVycm9yIChlKSB7XHJcblx0XHRcdGlmICggZS50eXBlID09PSAnZXJyb3InICkge1xyXG5cdFx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdG1lc3NhZ2U6ICdFcnJvciBsb2FkaW5nIHNjcmlwdCdcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYWxsYmFjayhyZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHNjcmlwdC5zcmMgPSB1cmw7XHJcblxyXG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpO1xyXG5cclxuXHRcdHdpbmRvdy5KU2VuZC5jYWxsYmFja3NbZm5hbWVdID0gZnVuY3Rpb24ganNvbnBSZXNwb25zZShyZXNwb25zZSkge1xyXG5cdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XHJcblxyXG5cdFx0XHRkZWxldGUgd2luZG93LkpTZW5kLmNhbGxiYWNrc1tmbmFtZV07XHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0ganNvbnA7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIGRlZXAgbWVyZ2UgYXJyYXlzL29iamVjdHNcclxuXHR2YXIgbWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNyYykge1xyXG5cdFx0dmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpLFxyXG5cdFx0XHRkc3QgPSBhcnJheSAmJiBbXSB8fCB7fTtcclxuXHJcblx0XHRpZiAoYXJyYXkpIHtcclxuXHRcdFx0dGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xyXG5cdFx0XHRkc3QgPSBkc3QuY29uY2F0KHRhcmdldCk7XHJcblxyXG5cdFx0XHRzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBlID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0ZHN0W2ldID0gbWVyZ2UodGFyZ2V0W2ldLCBlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRkc3QucHVzaChlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHRhcmdldFtrZXldO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBzcmNba2V5XSAhPT0gJ29iamVjdCcgfHwgIXNyY1trZXldKSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHNyY1trZXldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGlmICghdGFyZ2V0W2tleV0pIHtcclxuXHRcdFx0XHRcdFx0ZHN0W2tleV0gPSBzcmNba2V5XTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGRzdFtrZXldID0gbWVyZ2UodGFyZ2V0W2tleV0sIHNyY1trZXldKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkc3Q7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcclxufSgpKTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHRcdFxyXG5cdHZhciBzZXJpYWxpemUgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZScpLFxyXG5cdFx0dmFsaWRhdGUgPSByZXF1aXJlKCcuL3ZhbGlkYXRlJyksXHJcblx0XHRtb2R1bGVzID0ge1xyXG5cdFx0XHRhamF4OiByZXF1aXJlKCcuL2FqYXgnKSxcclxuXHRcdFx0anNvbnA6IHJlcXVpcmUoJy4vanNvbnAnKVxyXG5cdFx0fSxcclxuXHRcdHJlcXVlc3Q7XHJcblxyXG5cdHJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xyXG5cdFx0dmFyIG9wdGlvbnMgPSBjb25maWcub3B0aW9ucyxcclxuXHRcdFx0cmVxdWVzdFByb21pc2U7XHJcblxyXG5cdFx0aWYgKCAhUHJvbWlzZSApIHtcclxuXHRcdFx0cmV0dXJuIGNvbnNvbGUgJiYgY29uc29sZS5lcnJvcignSlNlbmQgcmVxdWlyZXMgYFByb21pc2VgLCBwbGVhc2UgcHJvdmlkZSBhIHBvbHlmaWxsJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRW5jb2RlIHRoZSBmb3JtIGRhdGFcclxuXHRcdG9wdGlvbnMuZGF0YSA9IHR5cGVvZiBvcHRpb25zLmRhdGEgPT09ICdzdHJpbmcnID8gb3B0aW9ucy5kYXRhIDogc2VyaWFsaXplKG9wdGlvbnMuZGF0YSk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2cob3B0aW9ucy51cmwpO1xyXG5cclxuXHRcdC8vIEdlbmVyYXRlIEdFVCB1cmwgd2l0aCBkYXRhXHJcblx0XHRpZiAoIChvcHRpb25zLm1ldGhvZCA9PT0gJ0dFVCcgfHwgY29uZmlnLnR5cGUgPT09ICdqc29ucCcpICYmIG9wdGlvbnMuZGF0YSApIHtcclxuXHRcdFx0b3B0aW9ucy51cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCc/JykgPT09IC0xID8gb3B0aW9ucy51cmwgKyAnPycgKyBvcHRpb25zLmRhdGEgOiBvcHRpb25zLnVybCArICcmJyArIG9wdGlvbnMuZGF0YTtcclxuXHJcblx0XHRcdG9wdGlvbnMuZGF0YSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0dXAgcmVxdWVzdCBhcyBhIFByb21pc2VcclxuXHRcdHJlcXVlc3RQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gaGFuZGxlUHJvbWlzZShyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0bW9kdWxlc1tjb25maWcudHlwZV0ob3B0aW9ucywgZnVuY3Rpb24gKHJlc3BvbnNlLCB4aHIpIHtcclxuXHRcdFx0XHR2YWxpZGF0ZShyZXNwb25zZSwgeGhyLCByZXNvbHZlLCByZWplY3QpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJldHVybiB0aGUgSlNlbmQgcmVxdWVzdCBwcm9taXNlXHJcblx0XHRyZXR1cm4gcmVxdWVzdFByb21pc2U7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0O1xyXG59KCkpOyIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZGF0YSkge1xyXG5cdFx0dmFyIGUgPSBlbmNvZGVVUklDb21wb25lbnQsXHJcblx0XHRcdFx0dG1wID0gW107XHJcblxyXG5cdFx0aWYgKCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcgKSB7XHJcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4cGVjdGVkIGRhdGEgdG8gYmUgb2YgdHlwZSBvYmplY3QnKTtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKHZhciBrIGluIGRhdGEpIHtcclxuXHRcdFx0aWYgKCBkYXRhLmhhc093blByb3BlcnR5KGspICkge1xyXG5cdFx0XHRcdHRtcC5wdXNoKCBlKGspICsgJz0nICsgZShkYXRhW2tdKSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRtcC5qb2luKCcmJyk7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBzZXJpYWxpemU7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBlcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKSxcclxuXHRcdHZhbGlkYXRlUmVxdWVzdDtcclxuXHJcblx0dmFyIHZhbGlkYXRlUmVxdWVzdCA9IGZ1bmN0aW9uIHZhbGlkYXRlUmVxdWVzdChyZXNwb25zZSwgeGhyLCByZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdGZ1bmN0aW9uIGlzVmFsaWRKc2VuZChyZXNwb25zZSkge1xyXG5cdFx0XHRpZiAoIHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCdzdGF0dXMnKSApIHtcclxuXHRcdFx0XHRpZiAoICggcmVzcG9uc2Uuc3RhdHVzID09PSAnc3VjY2VzcycgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAnZmFpbCcgKSAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdlcnJvcicgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ21lc3NhZ2UnKSApIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHZhbGlkYXRlUmVxdWVzdCByZXNwb25zZSBhcyBKU2VuZFxyXG5cdFx0aWYgKCBpc1ZhbGlkSnNlbmQocmVzcG9uc2UpICkge1xyXG5cdFx0XHQvLyBDaGVjayBKU2VuZCByZXNwb25zZSBzdGF0dXNcclxuXHRcdFx0aWYgKCByZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyApIHtcclxuXHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZWplY3QocmVzcG9uc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXNwb25zZSA9IHtcclxuXHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0bWVzc2FnZTogZXJyb3IoeGhyLCByZXNwb25zZSlcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJlamVjdChyZXNwb25zZSk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSB2YWxpZGF0ZVJlcXVlc3Q7XHJcbn0oKSk7Il19
