(function () {
	'use strict';

	var select = document.querySelector.bind( document ),
		tests = [
			// JSend response tests
			'success','error','fail','data','long','timeout',

			// HTTP status code response tests
			'http301','http302','http400','http403','http404','http500'
		];

	tests.forEach(function (test) {
		var btn = select('.btn-test-' + test),
			resultContainer = select('.test-result-' + test);


		btn.onclick = function (e) {
			e.preventDefault();

			JSend
				.get('xhr.php?m=' + test + '&name=' + test)
				.then(
					// Success
					function (response) {
						resultContainer.innerHTML = 'Success: ' + JSON.stringify(response);
					},
					// Fail
					function (response) {
						resultContainer.innerHTML = 'Fail/error: ' + JSON.stringify(response);
					}
				);
		}
	});

	document.querySelector('.btn-test-all').onclick = function (e) {
		var event = document.createEvent("HTMLEvents");

		e.preventDefault();

	    event.initEvent('click', true, true);

		tests.forEach(function (test) {
			var btn = select('.btn-test-' + test);

			btn.dispatchEvent(event);
		});
	}

}())