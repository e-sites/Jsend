<?php
/**
 * Server. Handles the request by returning a valid response
 */

class Server
{
	private static function response($response) {
		if ( isset($_REQUEST['callback']) ) {
			$response = $_REQUEST['callback'] . '(' . $response . ')';
		}

		echo $response;
	}

	// JSend responses
	public static function success(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->input = $oRequestData->name;
		Server::response($oJsend);
	}

	public static function error(Request $oRequestData)
	{
		$oJsend = Jsend::createError('An error occurred');
		$oJsend->input = $oRequestData->name;
		Server::response($oJsend);
	}

	public static function fail(Request $oRequestData)
	{
		$oJsend = Jsend::createFail();
		$oJsend->input = $oRequestData->name;
		Server::response($oJsend);
	}

	public static function long(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->input = $oRequestData->name;
		sleep(2);
		Server::response($oJsend);
	}
	
	public static function timeout(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->input = $oRequestData->name;
		sleep(10);
		Server::response($oJsend);
	}

	public static function cors(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->input = $oRequestData->name;
		Server::response($oJsend);
	}

	// HTTP responses
	public static function http301()
	{
		header('Location: xhr.php?m=success&name=301', true, 301);
		exit;
	}

	public static function http302()
	{
		header('Location: xhr.php?m=success&name=302', true, 302);
		exit;
	}

	public static function http400()
	{
		header('HTTP/1.1 400 Bad Request', true, 400);
		exit;
	}

	public static function http403()
	{
		header('HTTP/1.1 403 Forbidden', true, 403);
		exit;
	}

	public static function http404()
	{
		header('HTTP/1.1 404 Not Found', true, 404);
		exit;
	}

	public static function http500()
	{
		header('HTTP/1.1 500 Internal Server Error', true, 500);
		exit;
	}
}
?>