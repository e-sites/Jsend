if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(callback, thisArg) {
		var T, k;

		if (this == null) {
			throw new TypeError('this is null or not defined');
		}

		var O = Object(this);
		var len = O.length >>> 0;

		if (typeof callback !== 'function') {
			throw new TypeError(callback + ' is not a function');
		}

		if (arguments.length > 1) {
			T = thisArg;
		}

		k = 0;

		while (k < len) {
			var kValue;

			if (k in O) {
				kValue = O[k];
				callback.call(T, kValue, k, O);
			}
			k++;
		}
	};
}

if (!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

(function () {
	'use strict';

	var select = function(selector) {return document.querySelector(selector)},
		tests = [
			// JSend GET response tests
			'success', 'error', 'fail', 'long','timeout',

			// JSend POST response tests
			'post-success', 'post-error', 'post-fail', 'post-long','post-timeout',

			// JSend JSONP response tests
			'jsonp-success', 'jsonp-error', 'jsonp-fail', 'jsonp-long','jsonp-timeout',

			// HTTP status code response tests
			'http301', 'http302', 'http400','http403','http404','http500'
		];

	tests.forEach(function (test) {
		var btn = select('.btn-test-' + test),
			method = test.indexOf('-') !== -1 ? test.replace(/-(.*)/, '') : 'get',
			resultContainer = select('.test-result-' + test),
			url = 'xhr.php',
			data = {
				m: test.replace(/(post|jsonp)-/, ''),
				name: test
			};

		test === 'cors' ? url = '//xhr.localhost:8888/JSend/' + url : null;

		btn.onclick = function () {
			var config = {
				url: url,
				data: data,
				timeout: 3000
			};

			resultContainer.className += ' running';
			resultContainer.innerHTML = '';

			JSend
				// .request(config)
				[method](config)
				.then(
					// Success
					function (response) {
						resultContainer.innerHTML = 'Success: ' + JSON.stringify(response);
						resultContainer.className = resultContainer.className.replace(' running', '');
					},

					// Fail
					function (response) {
						if ( response.status === 'fail' ) {
							resultContainer.innerHTML = 'Fail: ' + JSON.stringify(response);
						} else if ( response.status === 'error' ) {
							resultContainer.innerHTML = 'Error: ' + JSON.stringify(response);
						}
						resultContainer.className = resultContainer.className.replace(' running', '');
						
					}
				);

			return false;
		}
	});

	document.querySelector('.btn-test-all').onclick = function (e) {
		var event = document.createEvent('HTMLEvents');

		e.preventDefault();

	    event.initEvent('click', true, true);

		tests.forEach(function (test) {
			var btn = select('.btn-test-' + test);

			btn.dispatchEvent(event);
		});
	}
}())