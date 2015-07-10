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

		if ( !window.Promise ) {
			return console && console.warn('JSend requires `window.Promise`, please provide a polyfill');
		}

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
(function() {
	'use strict';

	var merge = require('./merge'),
		error = require('./error');

	var ajax = function ajax(options, callback) {
		var defaults = {
				timeout: 5000, // 5 seconds
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

},{"./error":"/Applications/MAMP/htdocs/Jsend/src/error.js","./merge":"/Applications/MAMP/htdocs/Jsend/src/merge.js"}],"/Applications/MAMP/htdocs/Jsend/src/encode.js":[function(require,module,exports){
(function() {
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
	};

	module.exports = encode;
}());
},{}],"/Applications/MAMP/htdocs/Jsend/src/error.js":[function(require,module,exports){
(function() {
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
(function() {
	'use strict';

	var res;

	var jsonp = function jsonp(options, callback) {
		var fname = 'jsend' + Math.round(Math.random() * 1000),
			script = document.createElement('script'),
			url = options.url.indexOf('?') === -1 ? options.url + '?callback=' + fname : options.url + '&callback=' + fname;

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

		window[fname] = function jsonpResponse(response) {
			callback(response);

			delete window[fname];
		};
	};

	module.exports = jsonp;
}());
},{}],"/Applications/MAMP/htdocs/Jsend/src/merge.js":[function(require,module,exports){
(function() {
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/reason.js":[function(require,module,exports){
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
},{}],"/Applications/MAMP/htdocs/Jsend/src/request.js":[function(require,module,exports){
(function() {
	'use strict';
		
	var encode = require('./encode'),
		validate = require('./validate'),
		error = require('./error'),
		reason = require('./reason'),
		modules = {
			ajax: require('./ajax'),
			jsonp: require('./jsonp')
		},
		res;

	var request = function request(config) {
		var options = config.options;

		// Encode the form data
		options.data = encode(options.data);

		// Generate GET url with data
		if ( (options.method === 'GET' || config.type === 'jsonp') && options.data ) {
			options.url = options.url.indexOf('?') === -1 ? options.url + '?' + options.data : options.url + '&' + options.data;

			options.data = null;
		}

		// Setup request as a Promise
		var requestPromise = new Promise(function (resolve, reject) {
			modules[config.type](options, function (response, xhr) {
				res = response;

				// Validate response as JSend
				if ( validate(res) ) {
					// Check JSend response status
					if ( res.status === 'success' ) {
						resolve(reason(res, xhr));
					} else {
						reject(reason(res, xhr));
					}
				} else {
					res = {
						status: 'error',
						message: error(xhr, response)
					};

					reject(reason(res, xhr));
				}
			});
		});

		// Return the JSend request promise
		return requestPromise;
	};

	module.exports = request;
}());
},{"./ajax":"/Applications/MAMP/htdocs/Jsend/src/ajax.js","./encode":"/Applications/MAMP/htdocs/Jsend/src/encode.js","./error":"/Applications/MAMP/htdocs/Jsend/src/error.js","./jsonp":"/Applications/MAMP/htdocs/Jsend/src/jsonp.js","./reason":"/Applications/MAMP/htdocs/Jsend/src/reason.js","./validate":"/Applications/MAMP/htdocs/Jsend/src/validate.js"}],"/Applications/MAMP/htdocs/Jsend/src/validate.js":[function(require,module,exports){
(function() {
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
	};

	module.exports = validate;
}());
},{}]},{},["./src/core.js"])("./src/core.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29yZS5qcyIsInNyYy9hamF4LmpzIiwic3JjL2VuY29kZS5qcyIsInNyYy9lcnJvci5qcyIsInNyYy9qc29ucC5qcyIsInNyYy9tZXJnZS5qcyIsInNyYy9yZWFzb24uanMiLCJzcmMvcmVxdWVzdC5qcyIsInNyYy92YWxpZGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxyXG4gKiBKU2VuZCBpcyBhIG5hdGl2ZSBBSkFYIGltcGxlbWVudGF0aW9uIHRoYXQgc3RyaWN0bHkgaGFuZGxlcyBKU2VuZCByZXNwb25zZXMgYWNjb3JkaW5nIHRvIHRoZSBub24tb2ZmaWNpYWwgSlNlbmQgc3BlYy5cclxuICpcclxuICogQGNsYXNzIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyAvIHZhbGlkYXRlcyBKU09OIGRhdGEgYWNjb3JkaW5nIHRvIHRoZSBKU2VuZCBzcGVjLlxyXG4gKlxyXG4gKiBAc2VlIGh0dHA6Ly9sYWJzLm9tbml0aS5jb20vbGFicy9KU2VuZFxyXG4gKlxyXG4gKiBAYXV0aG9yICAgSWFpbiB2YW4gZGVyIFdpZWwgPGlhaW5AZS1zaXRlcy5ubD5cclxuICogQHZlcnNpb24gIDIuMC4wXHJcbiAqIEByZXR1cm4gICB7T2JqZWN0fSBUaGUgSlNlbmQgb2JqZWN0XHJcbioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBKU2VuZCA9IChmdW5jdGlvbiBjb3JlKCkge1xyXG5cdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKTtcclxuXHJcblx0XHRpZiAoICF3aW5kb3cuUHJvbWlzZSApIHtcclxuXHRcdFx0cmV0dXJuIGNvbnNvbGUgJiYgY29uc29sZS53YXJuKCdKU2VuZCByZXF1aXJlcyBgd2luZG93LlByb21pc2VgLCBwbGVhc2UgcHJvdmlkZSBhIHBvbHlmaWxsJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbiBqc2VuZEdldCh1cmwsIGRhdGEpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVxdWVzdCh7XHJcblx0XHRcdFx0XHR0eXBlOiAnYWpheCcsXHJcblx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogJ0dFVCcsXHJcblx0XHRcdFx0XHRcdHVybDogdXJsLFxyXG5cdFx0XHRcdFx0XHRkYXRhOiBkYXRhXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHRwb3N0OiBmdW5jdGlvbiBqc2VuZFBvc3QodXJsLCBkYXRhLCBoZWFkZXJzKSB7XHJcblx0XHRcdFx0dmFyIGNvbmZpZyA9IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogJ2FqYXgnLFxyXG5cdFx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsXHJcblx0XHRcdFx0XHRcdFx0dXJsOiB1cmwsXHJcblx0XHRcdFx0XHRcdFx0ZGF0YTogZGF0YVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRpZiAoIGhlYWRlcnMgJiYgdHlwZW9mIGhlYWRlcnMgPT09ICdvYmplY3QnICYmIGhlYWRlcnMuY29uc3RydWN0b3IgIT09ICdBcnJheScgKSB7XHJcblx0XHRcdFx0XHRjb25maWcub3B0aW9ucy5oZWFkZXJzID0gaGVhZGVycztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiByZXF1ZXN0KGNvbmZpZyk7XHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHRqc29ucDogZnVuY3Rpb24ganNlbmRKc29ucCh1cmwsIGRhdGEpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVxdWVzdCh7XHJcblx0XHRcdFx0XHR0eXBlOiAnanNvbnAnLFxyXG5cdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHR1cmw6IHVybCxcclxuXHRcdFx0XHRcdFx0ZGF0YTogZGF0YVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH0oKSk7XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gSlNlbmQ7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIG1lcmdlID0gcmVxdWlyZSgnLi9tZXJnZScpLFxyXG5cdFx0ZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XHJcblxyXG5cdHZhciBhamF4ID0gZnVuY3Rpb24gYWpheChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGRlZmF1bHRzID0ge1xyXG5cdFx0XHRcdHRpbWVvdXQ6IDUwMDAsIC8vIDUgc2Vjb25kc1xyXG5cdFx0XHRcdG1ldGhvZDogJ0dFVCcsXHJcblx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpc0x0ZUlFOCA9IChmdW5jdGlvbiBpc0x0ZUlFOCgpIHtcclxuXHRcdFx0XHR2YXIgdGVzdCA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL01TSUUgKC57M30/KTsvKTtcclxuXHJcblx0XHRcdFx0aWYgKCB0ZXN0ICE9PSBudWxsICYmIE51bWJlcih0ZXN0W3Rlc3QubGVuZ3RoIC0gMV0pIDw9IDggKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fSgpKSxcclxuXHRcdFx0b25sb2FkID0gaXNMdGVJRTggPyAnb25yZWFkeXN0YXRlY2hhbmdlJyA6ICdvbmxvYWQnLFxyXG5cdFx0XHRjb25maWcgPSBtZXJnZShkZWZhdWx0cywgb3B0aW9ucyksXHJcblx0XHRcdGRhdGEgPSBjb25maWcuZGF0YSxcclxuXHRcdFx0bWV0aG9kID0gY29uZmlnLm1ldGhvZCxcclxuXHRcdFx0dXJsLFxyXG5cdFx0XHR4aHIsXHJcblx0XHRcdHJlcyxcclxuXHRcdFx0dGltZW91dCA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIFRyeSB0byBjcmVhdGUgYW4gVVJMIHRvIGNoZWNrIGlmIGhvc3RuYW1lIGFuZCBwb3J0IGFyZSB0aGUgc2FtZVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dXJsID0gbmV3IFVSTChjb25maWcudXJsKTtcclxuXHRcdH1cclxuXHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdHVybCA9IGNvbmZpZy51cmw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdXJsIGlzIGNyb3NzLWRvbWFpbiBhbmQgc2V0IGNvcnJlY3QgQ09SUyBYSFIgb2JqZWN0XHJcblx0XHRpZiAoIHVybC5sb2NhdGlvbiAmJiAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSB1cmwuaG9zdG5hbWUgfHwgd2luZG93LmxvY2F0aW9uLnBvcnQgIT09IHVybC5wb3J0KSAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpKSApIHtcclxuXHRcdFx0eGhyID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPcGVuIHJlcXVlc3RcclxuXHRcdHhoci5vcGVuKG1ldGhvZCwgdXJsKTtcclxuXHJcblx0XHQvLyBGb3JjZSBDb250ZW50IFR5cGUgZm9yIElFXHJcblx0XHRpZiAoIG1ldGhvZCA9PT0gJ0dFVCcgKSB7XHJcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1cInV0Zi04XCInKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgcmVxdWVzdCBoZWFkZXJzXHJcblx0XHRmb3IgKHZhciBoIGluIGNvbmZpZy5oZWFkZXJzKSB7XHJcblx0XHRcdGlmICggY29uZmlnLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaCkgKSB7XHJcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoaCwgY29uZmlnLmhlYWRlcnNbaF0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlIFhIUiB0aW1lb3V0LCBuZWNlc3Nhcnk/XHJcblx0XHR4aHIudGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xyXG5cdFx0eGhyLm9udGltZW91dCA9IGZ1bmN0aW9uIGFqYXhPblRpbWVvdXQoKSB7XHJcblx0XHRcdC8vIFNldCB0aW1lb3V0IHZhcmlhYmxlIHRvIHByZXZlbnQgSUU4IGZyb20gZXhlY3V0aW5nIG9ucmVhZHlzdGF0ZWNoYW5nZVxyXG5cdFx0XHR0aW1lb3V0ID0gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIEdlbmVyYXRlIGVycm9yIHJlc3BvbnNlXHJcblx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0bWVzc2FnZTogZXJyb3IoeGhyLCAndGltZW91dCcpXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjYWxsYmFjayhyZXMsIHhocik7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEhhbmRsZSBYSFIgcmVxdWVzdCBmaW5pc2hlZCBzdGF0ZSAoc3RhdGUgNClcclxuXHRcdHhocltvbmxvYWRdID0gZnVuY3Rpb24gYWpheE9uTG9hZCgpIHtcclxuXHRcdFx0Ly8gUHJldmVudCBleGVjdXRpb24gaWYgcmVxdWVzdCBpc24ndCBjb21wbGV0ZSB5ZXQsIG9yIHRpbWVzIG91dFxyXG5cdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgIT09IDQgfHwgdGltZW91dCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIEhUVFAgZXJyb3JcclxuXHRcdFx0dmFyIGVyciA9ICgheGhyLnN0YXR1cyB8fCAoeGhyLnN0YXR1cyA8IDIwMCB8fCB4aHIuc3RhdHVzID49IDMwMCkgJiYgeGhyLnN0YXR1cyAhPT0gMzA0KTtcclxuXHJcblx0XHRcdGlmICggZXJyICkge1xyXG5cdFx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhocilcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJlcyA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNhbGxiYWNrKHJlcywgeGhyKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU2VuZCByZXF1ZXN0XHJcblx0XHR4aHIuc2VuZChkYXRhKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGFqYXg7XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdHZhciBlbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUoZGF0YSkge1xyXG5cdFx0dmFyIGUgPSBlbmNvZGVVUklDb21wb25lbnQsXHJcblx0XHRcdFx0dG1wID0gW107XHJcblxyXG5cdFx0aWYgKCB0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgKSB7XHJcblx0XHRcdHJldHVybiBkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGsgaW4gZGF0YSkge1xyXG5cdFx0XHRpZiAoIGRhdGEuaGFzT3duUHJvcGVydHkoaykgKSB7XHJcblx0XHRcdFx0dG1wLnB1c2goIGUoaykgKyAnPScgKyBlKGRhdGFba10pICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdG1wLmpvaW4oJyYnKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGVuY29kZTtcclxufSgpKTsiLCIoZnVuY3Rpb24oKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgZXJyb3IgPSBmdW5jdGlvbiBlcnJvcih4aHIsIGVycm9yKSB7XHJcblx0XHRcclxuXHRcdHZhciBtc2cgPSAnJyxcclxuXHRcdFx0ZXJyb3IgPSBlcnJvciB8fCB7fTtcclxuXHJcblx0XHRpZiAoZXJyb3IgPT09ICd0aW1lb3V0Jykge1xyXG5cdFx0XHRtc2cgPSAnVGltZW91dCBlcnJvci4nO1xyXG5cdFx0fSBlbHNlIGlmIChlcnJvci5oYXNPd25Qcm9wZXJ0eSgnbWVzc2FnZScpKSB7XHJcblx0XHRcdG1zZyA9IGVycm9yLm1lc3NhZ2UgKyAnLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDApIHtcclxuXHRcdFx0bXNnID0gJ0NhblxcJ3QgY29ubmVjdC4gVmVyaWZ5IG5ldHdvcmsuJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDAwKSB7XHJcblx0XHRcdG1zZyA9ICdCYWQgUmVxdWVzdCBbNDAwXS4nO1xyXG5cdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcclxuXHRcdFx0bXNnID0gJ1VSTCBGb3JiaWRkZW4gWzQwM10uJztcclxuXHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0KSB7XHJcblx0XHRcdG1zZyA9ICdVUkwgTm90IEZvdW5kIFs0MDRdLic7XHJcblx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDUwMCkge1xyXG5cdFx0XHRtc2cgPSAnSW50ZXJuYWwgU2VydmVyIEVycm9yIFs1MDBdLic7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtc2cgPSB4aHIucmVzcG9uc2VUZXh0ICsgJyBbJyArIHhoci5zdGF0dXMgKyAnXS4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtc2c7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBlcnJvcjtcclxufSgpKTsiLCIoZnVuY3Rpb24oKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgcmVzO1xyXG5cclxuXHR2YXIganNvbnAgPSBmdW5jdGlvbiBqc29ucChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIGZuYW1lID0gJ2pzZW5kJyArIE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDApLFxyXG5cdFx0XHRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKSxcclxuXHRcdFx0dXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignPycpID09PSAtMSA/IG9wdGlvbnMudXJsICsgJz9jYWxsYmFjaz0nICsgZm5hbWUgOiBvcHRpb25zLnVybCArICcmY2FsbGJhY2s9JyArIGZuYW1lO1xyXG5cclxuXHRcdHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24ganNvbnBPbkVycm9yIChlKSB7XHJcblx0XHRcdGlmICggZS50eXBlID09PSAnZXJyb3InICkge1xyXG5cdFx0XHRcdHJlcyA9IHtcclxuXHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcclxuXHRcdFx0XHRcdG1lc3NhZ2U6ICdFcnJvciBsb2FkaW5nIHNjcmlwdCdcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYWxsYmFjayhyZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHNjcmlwdC5zcmMgPSB1cmw7XHJcblxyXG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpO1xyXG5cclxuXHRcdHdpbmRvd1tmbmFtZV0gPSBmdW5jdGlvbiBqc29ucFJlc3BvbnNlKHJlc3BvbnNlKSB7XHJcblx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcclxuXHJcblx0XHRcdGRlbGV0ZSB3aW5kb3dbZm5hbWVdO1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGpzb25wO1xyXG59KCkpOyIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIGRlZXAgbWVyZ2UgYXJyYXlzL29iamVjdHNcclxuXHR2YXIgbWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNyYykge1xyXG5cdFx0dmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpLFxyXG5cdFx0XHRkc3QgPSBhcnJheSAmJiBbXSB8fCB7fTtcclxuXHJcblx0XHRpZiAoYXJyYXkpIHtcclxuXHRcdFx0dGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xyXG5cdFx0XHRkc3QgPSBkc3QuY29uY2F0KHRhcmdldCk7XHJcblxyXG5cdFx0XHRzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBlID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0ZHN0W2ldID0gbWVyZ2UodGFyZ2V0W2ldLCBlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRkc3QucHVzaChlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHRhcmdldFtrZXldO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBzcmNba2V5XSAhPT0gJ29iamVjdCcgfHwgIXNyY1trZXldKSB7XHJcblx0XHRcdFx0XHRkc3Rba2V5XSA9IHNyY1trZXldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGlmICghdGFyZ2V0W2tleV0pIHtcclxuXHRcdFx0XHRcdFx0ZHN0W2tleV0gPSBzcmNba2V5XTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGRzdFtrZXldID0gbWVyZ2UodGFyZ2V0W2tleV0sIHNyY1trZXldKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkc3Q7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcclxufSgpKTsiLCIoZnVuY3Rpb24oKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHR2YXIgcmVhc29uID0gZnVuY3Rpb24gcmVhc29uKHJlc3BvbnNlLCB4aHIpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGRhdGE6IHJlc3BvbnNlLFxyXG5cdFx0XHR4aHI6IHhoclxyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHJlYXNvbjtcclxufSgpKTsiLCIoZnVuY3Rpb24oKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cdFx0XHJcblx0dmFyIGVuY29kZSA9IHJlcXVpcmUoJy4vZW5jb2RlJyksXHJcblx0XHR2YWxpZGF0ZSA9IHJlcXVpcmUoJy4vdmFsaWRhdGUnKSxcclxuXHRcdGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLFxyXG5cdFx0cmVhc29uID0gcmVxdWlyZSgnLi9yZWFzb24nKSxcclxuXHRcdG1vZHVsZXMgPSB7XHJcblx0XHRcdGFqYXg6IHJlcXVpcmUoJy4vYWpheCcpLFxyXG5cdFx0XHRqc29ucDogcmVxdWlyZSgnLi9qc29ucCcpXHJcblx0XHR9LFxyXG5cdFx0cmVzO1xyXG5cclxuXHR2YXIgcmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XHJcblx0XHR2YXIgb3B0aW9ucyA9IGNvbmZpZy5vcHRpb25zO1xyXG5cclxuXHRcdC8vIEVuY29kZSB0aGUgZm9ybSBkYXRhXHJcblx0XHRvcHRpb25zLmRhdGEgPSBlbmNvZGUob3B0aW9ucy5kYXRhKTtcclxuXHJcblx0XHQvLyBHZW5lcmF0ZSBHRVQgdXJsIHdpdGggZGF0YVxyXG5cdFx0aWYgKCAob3B0aW9ucy5tZXRob2QgPT09ICdHRVQnIHx8IGNvbmZpZy50eXBlID09PSAnanNvbnAnKSAmJiBvcHRpb25zLmRhdGEgKSB7XHJcblx0XHRcdG9wdGlvbnMudXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignPycpID09PSAtMSA/IG9wdGlvbnMudXJsICsgJz8nICsgb3B0aW9ucy5kYXRhIDogb3B0aW9ucy51cmwgKyAnJicgKyBvcHRpb25zLmRhdGE7XHJcblxyXG5cdFx0XHRvcHRpb25zLmRhdGEgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldHVwIHJlcXVlc3QgYXMgYSBQcm9taXNlXHJcblx0XHR2YXIgcmVxdWVzdFByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdG1vZHVsZXNbY29uZmlnLnR5cGVdKG9wdGlvbnMsIGZ1bmN0aW9uIChyZXNwb25zZSwgeGhyKSB7XHJcblx0XHRcdFx0cmVzID0gcmVzcG9uc2U7XHJcblxyXG5cdFx0XHRcdC8vIFZhbGlkYXRlIHJlc3BvbnNlIGFzIEpTZW5kXHJcblx0XHRcdFx0aWYgKCB2YWxpZGF0ZShyZXMpICkge1xyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgSlNlbmQgcmVzcG9uc2Ugc3RhdHVzXHJcblx0XHRcdFx0XHRpZiAoIHJlcy5zdGF0dXMgPT09ICdzdWNjZXNzJyApIHtcclxuXHRcdFx0XHRcdFx0cmVzb2x2ZShyZWFzb24ocmVzLCB4aHIpKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHJlamVjdChyZWFzb24ocmVzLCB4aHIpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmVzID0ge1xyXG5cdFx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXHJcblx0XHRcdFx0XHRcdG1lc3NhZ2U6IGVycm9yKHhociwgcmVzcG9uc2UpXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdHJlamVjdChyZWFzb24ocmVzLCB4aHIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmV0dXJuIHRoZSBKU2VuZCByZXF1ZXN0IHByb21pc2VcclxuXHRcdHJldHVybiByZXF1ZXN0UHJvbWlzZTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XHJcbn0oKSk7IiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0dmFyIHZhbGlkYXRlID0gZnVuY3Rpb24gdmFsaWRhdGUoYm9keSkge1xyXG5cdFx0aWYgKCBib2R5ICYmIGJvZHkuaGFzT3duUHJvcGVydHkoJ3N0YXR1cycpICkge1xyXG5cdFx0XHRpZiAoICggYm9keS5zdGF0dXMgPT09ICdzdWNjZXNzJyB8fCBib2R5LnN0YXR1cyA9PT0gJ2ZhaWwnICkgJiYgYm9keS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpICkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRlbHNlIGlmIChib2R5LnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiBib2R5Lmhhc093blByb3BlcnR5KCdtZXNzYWdlJykgKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSB2YWxpZGF0ZTtcclxufSgpKTsiXX0=
