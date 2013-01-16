/**
 * JSend is a layer on top of jQuery's `$.ajax` method that handles JSON data exchange according to the non-official JSend spec.
 *
 * @class Constructor function that handles / validates JSON data according to the JSend spec.
 *
 * @see http://labs.omniti.com/labs/JSend
 * @see http://api.jquery.com/jQuery.ajax/
 *
 * @author   Boye Oomens <boye@e-sites.nl>
 * @version  1.2
 * @return   {object} a JSend instance
 *
 * @constructor
 *
 * @property {object} status The actual status of the JSend response
 * @property {object} jsendResponse The original JSend response data.
 * @property {object} processing Determines whether is there is a request ongoing.
 * @property {object} elapsedTime The elapsed time per request (in milliseconds) .
 * @property {object} config The publicly available config that can be overridden.
 * @property {object} onSuccess The default success callback.
 * @property {object} onFail The default fail callback.
 * @property {object} onError The default error callback.
 */

(function (window, $) {

	'use strict';

	function JSend() {

		if ( !$ ) {
			throw new Error('jQuery could be not detected. JSend requires jQuery to handle all requests.');
		}

		/*
		 * Local vars and constants
		 */
		var self = (this instanceof JSend ? this : new JSend()),
			args = arguments,

			// Reserved for default XHR setup
			defaults = {},

			startTime = 0,
			endTime = 0,

			STATUS_SUCCESS = 'success',
			STATUS_FAIL = 'fail',
			STATUS_ERROR = 'error';

		/*
		 * Public members
		 */
		self.status = null;
		self.jsendResponse = null;
		self.processing = false;
		self.elapsedTime = 0;
		self.config = {
			crossDomain: false,
			data: {},
			type: 'GET',
			url: 'xhr.php'
		};
		self.onSuccess = $.noop;
		self.onError = $.noop;
		self.onFail = $.noop;

		/**
		 * Default error handling, called if the request fails due to a http error.
		 * 
		 * @param {object} xhr Original xhr object
		 * @param {string} exception Http status
		 * @param {string} [error]
		 * @private
		 */
		function _httpError(xhr, exception, error) {
			var msg = '';

			if (exception === 'timeout' || error === 'timeout') {
				msg = 'Timeout error.';
			} else if (xhr.status === 0) {
				msg = 'Can\'t connect. Verify network.';
			} else if (xhr.status === 403) {
				msg = 'URL Forbidden [403].';
			} else if (xhr.status === 404) {
				msg = 'URL Not Found [404].';
			} else if (xhr.status === 500) {
				msg = 'Internal Server Error [500].';
			} else if (exception === 'parsererror') {
				msg = 'Requested JSON parse failed.';
			} else if (exception === 'abort') {
				msg = 'Ajax request aborted.';
			} else if (error.message) {
				msg = error.message + '.';
			} else {
				msg = 'Uncaught Error. ' + xhr.responseText + ' [' + xhr.status + '].';
			}

			throw new Error('A JSend HTTP error occurred: ' + msg);
		}

		/**
		 * Validates the response data and is called if the request succeeded.
		 * 
		 * @param {object} body
		 * @param {string} status
		 * @param {object} xhr
		 * @private
		 */
		function _validateResponse(body, status, xhr) {
			_trackRequest('stop');

			if ( body && body.hasOwnProperty('status') ) {
				return _createResponse(body, xhr, status);
			}

			throw new Error('Invalid JSend format: the body should always contain a status property');
		}

		/**
		 * Handles the data sent back from the server and invokes the appropriate callback
		 * 
		 * @param {object} body The actual response body
		 * @param {object} xhr The original xhr object
		 * @private
		 */
		function _createResponse(body, xhr) {
			self.status = body.status;
			self.jsendResponse = body;

			switch ( body.status ) {
				case STATUS_SUCCESS:
					self.onSuccess.apply(self, [body.data, xhr]);
					break;
				case STATUS_FAIL:
					self.onFail.apply(self, [body.data, xhr]);
					break;
				case STATUS_ERROR:
					self.onError.apply(self, [body.message, xhr]);
					break;
			}
		}

		/**
		 * Tracks the HTTP request based on beforeSend / success callback and exposes the elapsed time to a public member
		 * @param {String} phase either start or stop
		 * @private
		 */
		function _trackRequest(phase) {
			switch (phase) {
				case 'start':
					startTime = new Date().getMilliseconds();
					break;
				case 'stop':
					endTime = new Date().getMilliseconds();
					self.elapsedTime = (endTime - startTime) + 'ms';
					break;
				default:
					throw new Error('_trackRequest only accepts a `start` or `stop` phase');
			}
		}

		/**
		 * Main init that checks if there is an object passed on to the JSend constructor.
		 * If so, it directly invokes the xhr method. Please note that all other methods in the chain wont be executed.
		 * @private
		 */
		function _init() {
			if ( args.length && args[0].constructor === Object ) {
				self.xhr( args[0] );
			}

			defaults = {
				success: _validateResponse,
				error: _httpError,
				beforeSend: function () {
					_trackRequest('start');
					self.processing = true;
				},
				complete: function () {
					self.processing = false;
				}
			};
		}

		/*
		 * Useful methods that are convenient when using the chaining pattern.
		 */

		/**
		 * Easy way to add extra parameters to the Ajax call.
		 *
		 * @example
		 * JSend().setup({url:'xhr.php'}).get(data, callback);
		 *
		 * @param {mixed} obj Either a serialized string or an object literal
		 */
		self.setup = function (obj) {
			self.config = $.extend(true, self.config, obj);
			return self;
		};

		/**
		 * Assigns a custom success callback.
		 *
		 * @example
		 * JSend().success(function () {}).dispatch();
		 *
		 * @param {object} fn
		 */
		self.success = function (fn) {
			self.onSuccess = fn;
			return self;
		};

		/**
		 * Assigns a custom fail callback.
		 *
		 * @example
		 * JSend().fail(function () {}).dispatch();
		 *
		 * @param {object} fn
		 */
		self.fail = function (fn) {
			self.onFail = fn;
			return self;
		};

		/**
		 * Assigns a custom error callback.
		 *
		 * @example
		 * JSend().error(function () {}).dispatch();
		 *
		 * @param {object} fn
		 */
		self.error = function (fn) {
			self.onError = fn;
			return self;
		};

		/**
		 * Main method that triggers the actual Ajax call.
		 * This needs to be called explicitly when using methods like .success, .error etc)
		 *
		 * @example
		 * JSend().success(function () { console.log(this); }).dispatch();
		 *
		 */
		self.dispatch = function () {
			self.xhr();
			return self;
		};

		/**
		 * Low-level XHR wrapper that initiates the actual Ajax call.
		 *
		 * @example
		 * JSend().xhr({url:'xhr.php', data:'qry=string'});
		 *
		 * @param {object} options Options object
		 */
		self.xhr = function (options) {
			var setup = self.config;

			if ( options ) {
				setup = $.extend(true, self.config, options);

				// Register callbacks
				if ( 'success' in setup ) {
					self.onSuccess = setup.success;
				}
				
				if ( 'fail' in setup ) {
					self.onFail = setup.fail;
				}
				
				if ( 'error' in setup ) {
					self.onError = setup.error;
				}

				// Set back the correct success and error handler
				setup.error = _httpError;
				setup.success = _validateResponse;
			}

			// Always force JSON datatype
			setup.dataType = 'json';

			// Initiate XHR
			$.ajax( $.extend(true, setup, defaults) );

			return self;
		};

		/**
		 * GET abstraction
		 *
		 * @example
		 * JSend().get('foo=bar', function () {});
		 *
		 * @param {mixed} data Serialized string / object literal (or callback!)
		 * @param {object} success Success callback
		 */
		self.get = function (url, data, success) {
			self.config.type = 'GET';
			self.config.data = data;
			self.config.url = url;
			self.onSuccess = success;
			self.xhr();
			return self;
		};

		/**
		 * POST abstraction
		 *
		 * @example
		 * JSend().post('foo=bar', function () {});
		 *
		 * @param {mixed} data Serialized string or object literal
		 * @param {object} success Success callback
		 */
		self.post = function (url, data, success) {
			self.config.type = 'POST';
			self.config.url = url;
			self.config.data = data;
			self.onSuccess = success;
			self.xhr();
			return self;
		};

		// Initialize
		_init();

		return self;
	}

	// Expose JSend (and it's alias) to the global scope
	window.JSend = window.Jsend = JSend;
	window.J$ = new JSend();

}(window, window.jQuery || null));