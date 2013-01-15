Jsend
=====

JSend is a layer on top of jQuery's `$.ajax` method that handles JSON data exchange according to the non-official JSend spec. Whilst the spec provides rules for a consistent JSON response, our script gives developers the functionality to handle the actual communication based on this format.

## The spec
Never heard of the JSend spec? As stated on the [OmniTI Labs site](http://labs.omniti.com/labs/jsend):

> Put simply, JSend is a specification that lays down some rules for how JSON responses from web servers should be formatted. JSend focuses on application-level (as opposed to protocol- or transport-level) messaging which makes it ideal for use in REST-style applications and APIs.

A basic JSend-compliant response is as simple as this:

```js
{
	status : "success",
	data : {
		"post" : { "id" : 1, "title" : "A blog post", "body" : "content" }
	}
}
```

Internally we handle all the necessary validation, for example if the corresponding keys (i.e. status and data) are present and if their values are allowed (in case of the status key: either succes, fail or error). This means you can skip the validation logic in your callbacks and focus directly on handling the data. Out of the box we also provide error handling when XHR fails for some reason.

### Why JSend?
Well, the guys at OmniTI sum it up quite nicely:

> If you're a library or framework developer, this gives you a consistent format which your users are more likely to already be familiar with, which means they'll already know how to consume and interact with your code. If you're a web app developer, you won't have to think about how to structure the JSON data in your application, and you'll have existing reference implementations to get you up and running quickly.


## Implementation
The implementation is easy as pie. You'll need to (at least) add the following two scripts in your HTML (preferbly just before the `</body>` closing tag):

```html
<script src="/library/assets/jquery-1.8.3.min.js"></script>
<script src="/library/assets/jsend-1.2.min.js"></script>
```

Initiating an actual XHR can be accomplished as follows:

```js
JSend({
	url: 'url.php',
	data: 'foo=bar',
	success: function (data) {
		console.log(data); // contains the value of the data-key
		console.log(this); // Jsend instance
	}
});
```

Perhaps you prefer to work directly with an instance? Got that.
```js
var xhr = new JSend();
xhr.config.type = 'POST';
xhr.config.url = 'xhr.php';
	
// Somewhere in your event delegation logic…
$('#adminpanel').on('click', '.btn', function (e) {
	xhr.post({foo: 'bar'}, function (data) {
		// handle data
	});
	e.preventDefault();
});
```

Also, we have some low-level abstractions:
```js
JSend()
	post('xhr.php', {'foo': 'bar'}, function (data) {
		// Do something with `data`
	});
		
JSend()
	get('xhr.php', 'foo=bar', function (data) {
		// Do something with `data`
	});	
```
## Plugins
You want more cool JSend stuff? Well, just add it yourself :). You can easily extend the Jsend constructor. At the moment we already have three additional plugins ready, check out the plugins directory.

### How to extend?
As stated above, by simply by prototyping the JSend constructor. Check out the following snippet:

```js
/**
   * A handy .delay method
  * We simply override the .dispatch() method and calling .xhr() in a setTimeout
  *
  * @usage  JSend().delay(2000).dispatch();
  *
  * @param  {number} ms delay in milliseconds
  * @return {object}
  */
JSend.prototype.delay = function (ms) {
	this.dispatch = function () {
		setTimeout(this.xhr, ms);
		return this;
	}
	return this;
};
```

Please note that, to maintain 'chainability', you'll need to return the `this` context at the end of your function.

## PHP entrypoint
In our repo we have included a single entrypoint named `xhr.php`, all communication will go through this file. Inside this file we just use a couple classes to handle the different scenario's. Now, it doesn't really matter how simple (or complex) this code is. As long as you return valid JSON (i.e. compliant with the Jsend spec), you're good to go.

## Roadmap
At the moment we

* more unit tests
* write more documentation
* add more demo's (e.g. how to handle errors et cetera)
* perhaps remove jQuery depency?
* …any other suggestions? Mail us at github [at] e-sites.nl or fork JSend :)

## Credits
Big shout out to the devs at OmniTI 'for speccing out' a consistent JSON format.
