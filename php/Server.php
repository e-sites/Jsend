<?php
/**
 * Server. Handles the request by returning a valid response
 */

class Server
{
	// JSend responses
	public static function success(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		echo $oJsend;
	}

	public static function error(Request $oRequestData)
	{
		$oJsend = Jsend::createError('An error occurred');
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		echo $oJsend;
	}

	public static function fail(Request $oRequestData)
	{
		$oJsend = Jsend::createFail();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		echo $oJsend;
	}

	public static function data(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->formdata = array(
			'name' => $oRequestData->name,
			'message' => $oRequestData->message
		);
		echo $oJsend;
	}

	public static function long(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		sleep(2);
		echo $oJsend;
	}
	
	public static function timeout(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		sleep(10);
		echo $oJsend;
	}

	// HTTP responses
	public static function http301()
	{
		header('Location: xhr.php?m=success', true, 301);
		exit;
	}

	public static function http302()
	{
		header('Location: xhr.php?m=success', true, 302);
		exit;
	}

	public static function http400($oRequestData)
	{
		header('HTTP/1.1 400 Bad Request', true, 400);
		echo 'Bad Request';
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