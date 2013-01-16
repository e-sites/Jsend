<?php
/**
 * Server. Handles the request by returning a valid response
 */

class Server
{
	protected function error403()
	{
		header('HTTP/1.1 403 Forbidden', true, 403);
		echo Jsend::createError("No or invalid token given.");
		exit;
	}

	protected function error404($sMessage)
	{
		header('HTTP/1.1 404 Not Found', true, 404);
		echo Jsend::createError($sMessage);
		exit;
	}

	protected static function checkRequiredFields(Request $oRequestData, $sField)
	{
		$aMissingFields = array();
		$iNumArgs = func_num_args();
		for ($i = 1; $i < $iNumArgs; $i++) {
			$sField = func_get_arg($i);
			if (empty($oRequestData->$sField)) {
				$aMissingFields[$sField] = "The field '$sField' is missing from the request.";
			}
		}

		if (!empty($aMissingFields)) {
			$oJsend = Jsend::createFail();
			$oJsend->importData($aMissingFields);
			echo $oJsend;
			exit;
		}
	}

	public static function test(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->input);
		echo $oJsend;
	}

	public static function indicator(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->test = array('test' => 'test', 'input' => $oRequestData->name);
		sleep(2);
		echo $oJsend;
	}

	public static function form(Request $oRequestData)
	{
		$oJsend = Jsend::createSuccess();
		$oJsend->formdata = array(
			'name' => $oRequestData->name,
			'message' => $oRequestData->message
		);
		echo $oJsend;
	}

	public static function doFail(Request $oRequestData)
	{
		$oJsend = Jsend::createFail();
		$oJsend->data = 'Epic fail!1';
		echo $oJsend;
	}

	public static function doError(Request $oRequestData)
	{
		$oJsend = Jsend::createError('Epic error!1');
		echo $oJsend;
	}

	public static function customError(Request $oRequestData)
	{
		$oJsend = Jsend::createError('Epic error!1');
		echo $oJsend;
	}

}
?>