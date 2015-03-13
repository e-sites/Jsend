<?php
/**
 * Entrypoint: JSend
 */

require_once 'php/Jsend.php';
require_once 'php/Request.php';
require_once 'php/Server.php';

$aData = $_REQUEST;

// Always reply in JSON
header('Content-Type: application/json; charset="utf-8"');

// Inform the client about the type of request he should be making
header('Allow: POST');
header('Accept: application/x-www-form-urlencoded');
header('Accept-Charset: utf-8');

// All requests should be POSTS
if (empty($aData['m']) || !method_exists('Server', $aData['m'])) {
	header('HTTP/1.1 404 Not Found', true, 404);
	echo Jsend::createError('Can not route request');
	exit;
}

// Envelope the provided data into a readonly object
$oRequestData = new Request($aData);

// The server further handles the request
Server::$aData['m']($oRequestData);

?>