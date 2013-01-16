/** 
 * A nice spiffy indicator that tells the user there's a process ongoing.
 *
 * @usage  JSend().indicator().dispatch();
 *
 * @param  {Object} target - Target that triggers the indicator (e.g. a button)
 * @return {Object}
 */
Jsend.prototype.indicator = function (target) {
	var $loader = $('<img id="loader" />').attr('src', '//cdn.e-sites.nl/images/icons/esites-preloader.gif');

	$(document)
		.ajaxStart(function () {
			$(target)
				.after($loader)
				.attr('disabled', 'disabled')
				.css({'cursor': 'default', 'opacity': 0.5});
		}) 
		.ajaxStop(function () { 
			$loader.remove();
			$(target)
				.removeAttr('disabled')
				.removeAttr('style');
		});

	return this;
};