<?php
/**
 * Entrypoint: JSend
 */

require_once 'php/Jsend.php';
require_once 'php/Request.php';
require_once 'php/Server.php';

# Emulate request; allows for easy testing
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = $_GET;
##

// Always reply in JSON
header('Content-Type: application/json; charset="utf-8"');

// Inform the client about the type of request he should be making
header('Allow: POST');
header('Accept: application/x-www-form-urlencoded');
header('Accept-Charset: utf-8');

// All requests should be POSTS
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	header('HTTP/1.1 405 Method Not Allowed', true, 405);
	echo Jsend::createError('Server only accepts POST requests');
	exit;
} elseif (empty($_GET['m']) || !method_exists('Server', $_GET['m'])) {
	header('HTTP/1.1 404 Not Found', true, 404);
	echo Jsend::createError('Can not route request');
	exit;
}

// Envelope the provided data into a readonly object
$oRequestData = new Request($_REQUEST);

// The server handles further handles the request
Server::$_GET['m']($oRequestData);

?>