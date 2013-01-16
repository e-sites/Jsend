/**
 * It might be necessary to constantly check the server to see if a certain value has been altered.
 * Since JSend doesn't provides this functionality out of the box, we can add this via prototyping.
 *
 * @usage  JSend().polling(2000, 5).dispatch();
 *
 * @param  {Number} interval - timer interval
 * @param  {Number} max - max amount of polling cycles
 * @return {Object}
 */
JSend.prototype.polling = function (interval, max) {
	this.dispatch = function () {
		var self = this,
			amount = 1,
			timer = 0;

		timer = window.setInterval(function () {
			if ( amount && amount === max ) {
				window.clearInterval(timer);
			}
			self.amount = amount++;
			self.xhr();
		}, interval);

		return self;
	};
	return this;
};