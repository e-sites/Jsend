(function () {
	'use strict';

	var select = document.querySelector.bind( document ),
		tests = [
			// JSend response tests
			'success','error','fail', 'long','timeout', 'cors',

			// HTTP status code response tests
			'http301','http302','http400','http403','http404','http500'
		];

	tests.forEach(function (test) {
		var btn = select('.btn-test-' + test),
			resultContainer = select('.test-result-' + test),
			url = 'xhr.php?m=' + test + '&name=' + test;

		test === 'cors' ? url = '//xhr.localhost:8888/JSend/' + url : null;

		btn.onclick = function (e) {
			e.preventDefault();

			resultContainer.innerHTML = '';
			
			JSend
				.get(url)
				.then(
					// Success
					function (response) {
						resultContainer.innerHTML = 'Success: ' + JSON.stringify(response.data);
					},

					// Fail
					function (response) {
						if ( response.data.status === 'fail' ) {
							resultContainer.innerHTML = 'Fail: ' + JSON.stringify(response.data);
						}
						else if ( response.data.status === 'error' ) {
							resultContainer.innerHTML = 'Error: ' + JSON.stringify(response.data);
						}
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