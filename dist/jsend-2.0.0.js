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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29yZS5qcyIsInNyYy9hamF4LmpzIiwic3JjL2Vycm9yLmpzIiwic3JjL2pzb25wLmpzIiwic3JjL21lcmdlLmpzIiwic3JjL3JlcXVlc3QuanMiLCJzcmMvc2VyaWFsaXplLmpzIiwic3JjL3ZhbGlkYXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxyXG4gKiBKU2VuZCBpcyBhIG5hdGl2ZSBBSkFYIGltcGxlbWVudGF0aW9uIHRoYXQgc3RyaWN0bHkgaGFuZGxlcyBKU2VuZCByZXNwb25zZXMgYWNjb3JkaW5nIHRvIHRoZSBub24tb2ZmaWNpYWwgSlNlbmQgc3BlYy5cclxuICpcclxuICogQGNsYXNzIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyAvIHZhbGlkYXRlcyBKU09OIGRhdGEgYWNjb3JkaW5nIHRvIHRoZSBKU2VuZCBzcGVjLlxyXG4gKlxyXG4gKiBAc2VlIGh0dHA6Ly9sYWJzLm9tbml0aS5jb20vbGFicy9KU2VuZFxyXG4gKlxyXG4gKiBAYXV0aG9yICAgSWFpbiB2YW4gZGVyIFdpZWwgPGlhaW5AZS1zaXRlcy5ubD5cclxuICogQHZlcnNpb24gIDIuMC4wXHJcbiAqIEByZXR1cm4gICB7T2JqZWN0fSBUaGUgSlNlbmQgb2JqZWN0XHJcbioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBKU2VuZCA9IChmdW5jdGlvbiBjb3JlKCkge1xyXG5cdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKSxcclxuXHRcdFx0bWVyZ2UgPSByZXF1aXJlKCcuL21lcmdlJyksXHJcblx0XHRcdGRlZmF1bHRzID0ge1xyXG5cdFx0XHRcdHR5cGU6ICdnZXQnLFxyXG5cdFx0XHRcdGRhdGE6ICcnLFxyXG5cdFx0XHRcdHRpbWVvdXQ6IDAsXHJcblx0XHRcdFx0aGVhZGVyczoge31cclxuXHRcdFx0fSxcclxuXHRcdFx0dHlwZXMgPSBbJ2dldCcsICdwb3N0JywgJ2pzb25wJ10sXHJcblx0XHRcdGFwaXMgPSB7fTtcclxuXHJcblx0XHQvLyBCYXNlIHJlcXVlc3QgQVBJXHJcblx0XHRhcGlzLnJlcXVlc3QgPSBmdW5jdGlvbiBqc2VuZFJlcXVlc3Qob3B0aW9ucykge1xyXG5cdFx0XHR2YXIgY29uZmlnID0gbWVyZ2UoZGVmYXVsdHMsIG9wdGlvbnMpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHJlcXVlc3QoY29uZmlnKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQWRkIGFsaWFzZXMgZm9yIGVhY2ggcmVxdWVzdCB0eXBlXHJcblx0XHR0eXBlcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcclxuXHRcdFx0dmFyIGZ1bmMgPSBmdW5jdGlvbiAoY29uZmlnKSB7XHJcblx0XHRcdFx0dmFyIGNvbmZpZyA9IG1lcmdlKGRlZmF1bHRzLCBjb25maWcpO1xyXG5cclxuXHRcdFx0XHRjb25maWcudHlwZSA9IG1ldGhvZDtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMucmVxdWVzdChjb25maWcpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXBpc1ttZXRob2RdID0gZnVuYztcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBhcGlzO1xyXG5cdH0oKSk7XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gSlNlbmQ7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBtZXJnZSA9IHJlcXVpcmUoJy4vbWVyZ2UnKSxcclxuXHRcdGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xyXG5cclxuXHR2YXIgYWpheCA9IGZ1bmN0aW9uIGFqYXgob3B0aW9ucywgY2FsbGJhY2spIHtcclxuXHRcdHZhciBkZWZhdWx0cyA9IHtcclxuXHRcdFx0XHR0aW1lb3V0OiAwLFxyXG5cdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0aXNMdGVJRTggPSAoZnVuY3Rpb24gaXNMdGVJRTgoKSB7XHJcblx0XHRcdFx0dmFyIHRlc3QgPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9NU0lFICguezN9Pyk7Lyk7XHJcblxyXG5cdFx0XHRcdGlmICggdGVzdCAhPT0gbnVsbCAmJiBOdW1iZXIodGVzdFt0ZXN0Lmxlbmd0aCAtIDFdKSA8PSA4ICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0oKSksXHJcblx0XHRcdGV2ZW50TmFtZSA9IGlzTHRlSUU4ID8gJ29ucmVhZHlzdGF0ZWNoYW5nZScgOiAnb25sb2FkJyxcclxuXHRcdFx0Y29uZmlnID0gbWVyZ2UoZGVmYXVsdHMsIG9wdGlvbnMpLFxyXG5cdFx0XHR1cmwsXHJcblx0XHRcdHhocixcclxuXHRcdFx0cmVzLFxyXG5cdFx0XHR0aW1lb3V0ID0gZmFsc2U7XHJcblxyXG5cdFx0Y29uZmlnLnR5cGUgPSBjb25maWcudHlwZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdC8vIFRyeSB0byBjcmVhdGUgYW4gVVJMIHRvIGNoZWNrIGlmIGhvc3RuYW1lIGFuZCBwb3J0IGFyZSB0aGUgc2FtZS5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHVybCA9IG5ldyBVUkwoY29uZmlnLnVybCk7XHJcblx0XHR9XHJcblx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHR1cmwgPSBjb25maWcudXJsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHVybCBpcyBjcm9zcy1kb21haW4gYW5kIHNldCBjb3JyZWN0IENPUlMgWEhSIG9iamVjdFxyXG5cdFx0aWYgKCB1cmwubG9jYXRpb24gJiYgKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSAhPT0gdXJsLmhvc3RuYW1lIHx8IHdpbmRvdy5sb2NhdGlvbi5wb3J0ICE9PSB1cmwucG9ydCkgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiBuZXcgWE1MSHR0cFJlcXVlc3QoKSkgKSB7XHJcblx0XHRcdHhociA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0eGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT3BlbiByZXF1ZXN0XHJcblx0XHR4aHIub3Blbihjb25maWcudHlwZSwgdXJsKTtcclxuXHJcblx0XHQvLyBGb3JjZSBDb250ZW50IFR5cGUgZm9yIElFXHJcblx0XHRpZiAoIGNvbmZpZy50eXBlID09PSAnZ2V0JyApIHtcclxuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVwidXRmLThcIicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldCByZXF1ZXN0IGhlYWRlcnNcclxuXHRcdGZvciAodmFyIGggaW4gY29uZmlnLmhlYWRlcnMpIHtcclxuXHRcdFx0aWYgKCBjb25maWcuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShoKSApIHtcclxuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihoLCBjb25maWcuaGVhZGVyc1toXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgWEhSIHRpbWVvdXRcclxuXHRcdHhoci50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XHJcblx0XHR4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gYWpheE9uVGltZW91dCgpIHtcclxuXHRcdFx0Ly8gU2V0IHRpbWVvdXQgdmFyaWFibGUgdG8gcHJldmVudCBJRTggZnJvbSBleGVjdXRpbmcgb25yZWFkeXN0YXRlY2hhbmdlXHJcblx0XHRcdHRpbWVvdXQgPSB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gR2VuZXJhdGUgZXJyb3IgcmVzcG9uc2VcclxuXHRcdFx0cmVzID0ge1xyXG5cdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRtZXNzYWdlOiBlcnJvcih4aHIsICd0aW1lb3V0JylcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNhbGxiYWNrKHJlcywgeGhyKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSGFuZGxlIFhIUiByZXF1ZXN0IGZpbmlzaGVkIHN0YXRlIChzdGF0ZSA0KVxyXG5cdFx0eGhyW2V2ZW50TmFtZV0gPSBmdW5jdGlvbiBhamF4T25Mb2FkKCkge1xyXG5cdFx0XHQvLyBQcmV2ZW50IGV4ZWN1dGlvbiBpZiByZXF1ZXN0IGlzbid0IGNvbXBsZXRlIHlldCwgb3IgdGltZXMgb3V0XHJcblx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSAhPT0gNCB8fCB0aW1lb3V0KSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayBmb3IgSFRUUCBlcnJvclxyXG5cdFx0XHRpZiAoICgheGhyLnN0YXR1cyB8fCAoeGhyLnN0YXR1cyA8IDIwMCB8fCB4aHIuc3RhdHVzID49IDMwMCkgJiYgeGhyLnN0YXR1cyAhPT0gMzA0KSApIHtcclxuXHRcdFx0XHQvLyBIVFRQIHN0YXR1cyBlcnJvclxyXG5cdFx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhocilcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5vIHN0YXR1cyBlcnJvci4gVHJ5IHBhcnNpbmcgcmVzcG9uc2UuLi5cclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0cmVzID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gUGFyc2luZyBmYWlsZWRcclxuXHRcdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0cmVzID0ge1xyXG5cdFx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhociwgZSlcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYWxsYmFjayhyZXMsIHhocik7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFNlbmQgcmVxdWVzdFxyXG5cdFx0eGhyLnNlbmQoY29uZmlnLmRhdGEpO1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gYWpheDtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBjaGVja0Vycm9yID0gZnVuY3Rpb24gY2hlY2tFcnJvcih4aHIsIGVycm9yKSB7XHJcblx0XHRcclxuXHRcdHZhciBtc2cgPSAnJyxcclxuXHRcdFx0ZXJyb3IgPSBlcnJvciB8fCB7fTtcclxuXHJcblx0XHRpZiAoZXJyb3IgPT09ICd0aW1lb3V0Jykge1xyXG5cdFx0XHRtc2cgPSAnVGltZW91dCBlcnJvci4nO1xyXG5cdFx0fSBlbHNlIGlmIChlcnJvci5oYXNPd25Qcm9wZXJ0eSgnbWVzc2FnZScpKSB7XHJcblx0XHRcdG1zZyA9IGVycm9yLm1lc3NhZ2UgKyAnLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDApIHtcclxuXHRcdFx0bXNnID0gJ0NhblxcJ3QgY29ubmVjdC4gVmVyaWZ5IG5ldHdvcmsuJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDAwKSB7XHJcblx0XHRcdG1zZyA9ICdCYWQgUmVxdWVzdCBbNDAwXS4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcclxuXHRcdFx0bXNnID0gJ1VSTCBGb3JiaWRkZW4gWzQwM10uJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0KSB7XHJcblx0XHRcdG1zZyA9ICdVUkwgTm90IEZvdW5kIFs0MDRdLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDUwMCkge1xyXG5cdFx0XHRtc2cgPSAnSW50ZXJuYWwgU2VydmVyIEVycm9yIFs1MDBdLic7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtc2cgPSB4aHIucmVzcG9uc2VUZXh0ICsgJyBbJyArIHhoci5zdGF0dXMgKyAnXS4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtc2c7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBjaGVja0Vycm9yO1xyXG59KCkpOyIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgcmVzO1xyXG5cclxuXHR2YXIganNvbnAgPSBmdW5jdGlvbiBqc29ucChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGZuYW1lID0gJ2pzZW5kJyArIE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDApLFxyXG5cdFx0XHRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKSxcclxuXHRcdFx0dXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignPycpID09PSAtMSA/IG9wdGlvbnMudXJsICsgJz9jYWxsYmFjaz0nICsgZm5hbWUgOiBvcHRpb25zLnVybCArICcmY2FsbGJhY2s9SlNlbmQuY2FsbGJhY2tzLicgKyBmbmFtZTtcclxuXHJcblx0XHR3aW5kb3cuSlNlbmQuY2FsbGJhY2tzID0gd2luZG93LkpTZW5kLmNhbGxiYWNrcyB8fCB7fTtcclxuXHJcblx0XHRzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uIGpzb25wT25FcnJvciAoZSkge1xyXG5cdFx0XHRpZiAoIGUudHlwZSA9PT0gJ2Vycm9yJyApIHtcclxuXHRcdFx0XHRyZXMgPSB7XHJcblx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiAnRXJyb3IgbG9hZGluZyBzY3JpcHQnXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Y2FsbGJhY2socmVzKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRzY3JpcHQuc3JjID0gdXJsO1xyXG5cclxuXHRcdGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcclxuXHJcblx0XHR3aW5kb3cuSlNlbmQuY2FsbGJhY2tzW2ZuYW1lXSA9IGZ1bmN0aW9uIGpzb25wUmVzcG9uc2UocmVzcG9uc2UpIHtcclxuXHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xyXG5cclxuXHRcdFx0ZGVsZXRlIHdpbmRvdy5KU2VuZC5jYWxsYmFja3NbZm5hbWVdO1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGpzb25wO1xyXG59KCkpOyIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byBkZWVwIG1lcmdlIGFycmF5cy9vYmplY3RzXHJcblx0dmFyIG1lcmdlID0gZnVuY3Rpb24gbWVyZ2UodGFyZ2V0LCBzcmMpIHtcclxuXHRcdHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkoc3JjKSxcclxuXHRcdFx0ZHN0ID0gYXJyYXkgJiYgW10gfHwge307XHJcblxyXG5cdFx0aWYgKGFycmF5KSB7XHJcblx0XHRcdHRhcmdldCA9IHRhcmdldCB8fCBbXTtcclxuXHRcdFx0ZHN0ID0gZHN0LmNvbmNhdCh0YXJnZXQpO1xyXG5cclxuXHRcdFx0c3JjLmZvckVhY2goZnVuY3Rpb24oZSwgaSkge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgZSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdGRzdFtpXSA9IG1lcmdlKHRhcmdldFtpXSwgZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXQuaW5kZXhPZihlKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0ZHN0LnB1c2goZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0YXJnZXQgJiYgdHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRPYmplY3Qua2V5cyh0YXJnZXQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG5cdFx0XHRcdFx0ZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xyXG5cdFx0XHRcdFx0ZHN0W2tleV0gPSBzcmNba2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAoIXRhcmdldFtrZXldKSB7XHJcblx0XHRcdFx0XHRcdGRzdFtrZXldID0gc3JjW2tleV07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRkc3Rba2V5XSA9IG1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZHN0O1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gbWVyZ2U7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQvKiBnbG9iYWwgUHJvbWlzZSAqL1xyXG5cclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBzZXJpYWxpemUgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZScpLFxyXG5cdFx0dmFsaWRhdGUgPSByZXF1aXJlKCcuL3ZhbGlkYXRlJyksXHJcblx0XHRhamF4ID0gcmVxdWlyZSgnLi9hamF4JyksXHJcblx0XHRtb2R1bGVzID0ge1xyXG5cdFx0XHRnZXQ6IGFqYXgsXHJcblx0XHRcdHBvc3Q6IGFqYXgsXHJcblx0XHRcdGpzb25wOiByZXF1aXJlKCcuL2pzb25wJylcclxuXHRcdH0sXHJcblx0XHRyZXF1ZXN0O1xyXG5cclxuXHRyZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdChjb25maWcpIHtcclxuXHRcdHZhciByZXF1ZXN0UHJvbWlzZTtcclxuXHJcblx0XHRjb25maWcudHlwZSA9IGNvbmZpZy50eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0aWYgKCAhUHJvbWlzZSApIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdKU2VuZCByZXF1aXJlcyBgUHJvbWlzZWAsIHBsZWFzZSBwcm92aWRlIGEgcG9seWZpbGwnKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbmNvZGUgdGhlIGZvcm0gZGF0YVxyXG5cdFx0Y29uZmlnLmRhdGEgPSB0eXBlb2YgY29uZmlnLmRhdGEgPT09ICdzdHJpbmcnID8gY29uZmlnLmRhdGEgOiBzZXJpYWxpemUoY29uZmlnLmRhdGEpO1xyXG5cclxuXHRcdC8vIEdlbmVyYXRlIEdFVCB1cmwgd2l0aCBkYXRhXHJcblx0XHRpZiAoIChjb25maWcudHlwZSA9PT0gJ2dldCcgfHwgY29uZmlnLnR5cGUgPT09ICdqc29ucCcpICYmIGNvbmZpZy5kYXRhICkge1xyXG5cdFx0XHRjb25maWcudXJsID0gY29uZmlnLnVybC5pbmRleE9mKCc/JykgPT09IC0xID8gY29uZmlnLnVybCArICc/JyArIGNvbmZpZy5kYXRhIDogY29uZmlnLnVybCArICcmJyArIGNvbmZpZy5kYXRhO1xyXG5cclxuXHRcdFx0Y29uZmlnLmRhdGEgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldHVwIHJlcXVlc3QgYXMgYSBQcm9taXNlXHJcblx0XHRyZXF1ZXN0UHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIGhhbmRsZVByb21pc2UocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdG1vZHVsZXNbY29uZmlnLnR5cGVdKGNvbmZpZywgZnVuY3Rpb24gKHJlc3BvbnNlLCB4aHIpIHtcclxuXHRcdFx0XHR2YWxpZGF0ZShyZXNwb25zZSwgeGhyLCByZXNvbHZlLCByZWplY3QpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJldHVybiB0aGUgSlNlbmQgcmVxdWVzdCBwcm9taXNlXHJcblx0XHRyZXR1cm4gcmVxdWVzdFByb21pc2U7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0O1xyXG59KCkpOyIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZGF0YSkge1xyXG5cdFx0dmFyIGUgPSBlbmNvZGVVUklDb21wb25lbnQsXHJcblx0XHRcdFx0dG1wID0gW107XHJcblxyXG5cdFx0aWYgKCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcgKSB7XHJcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4cGVjdGVkIGRhdGEgdG8gYmUgb2YgdHlwZSBvYmplY3QnKTtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKHZhciBrIGluIGRhdGEpIHtcclxuXHRcdFx0aWYgKCBkYXRhLmhhc093blByb3BlcnR5KGspICkge1xyXG5cdFx0XHRcdHRtcC5wdXNoKCBlKGspICsgJz0nICsgZShkYXRhW2tdKSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRtcC5qb2luKCcmJyk7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBzZXJpYWxpemU7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBlcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKSxcclxuXHRcdHZhbGlkYXRlUmVxdWVzdDtcclxuXHJcblx0dmFyIHZhbGlkYXRlUmVxdWVzdCA9IGZ1bmN0aW9uIHZhbGlkYXRlUmVxdWVzdChyZXNwb25zZSwgeGhyLCByZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdGZ1bmN0aW9uIGlzVmFsaWRKc2VuZChyZXNwb25zZSkge1xyXG5cdFx0XHRpZiAoIHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCdzdGF0dXMnKSApIHtcclxuXHRcdFx0XHRpZiAoICggcmVzcG9uc2Uuc3RhdHVzID09PSAnc3VjY2VzcycgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAnZmFpbCcgKSAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdlcnJvcicgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ21lc3NhZ2UnKSApIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHZhbGlkYXRlUmVxdWVzdCByZXNwb25zZSBhcyBKU2VuZFxyXG5cdFx0aWYgKCBpc1ZhbGlkSnNlbmQocmVzcG9uc2UpICkge1xyXG5cdFx0XHQvLyBDaGVjayBKU2VuZCByZXNwb25zZSBzdGF0dXNcclxuXHRcdFx0aWYgKCByZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyApIHtcclxuXHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZWplY3QocmVzcG9uc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXNwb25zZSA9IHtcclxuXHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0bWVzc2FnZTogZXJyb3IoeGhyLCByZXNwb25zZSlcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJlamVjdChyZXNwb25zZSk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSB2YWxpZGF0ZVJlcXVlc3Q7XHJcbn0oKSk7Il19
