<?php
/**
 * Simple Jsend data object
 *
 * @see http://labs.omniti.com/labs/jsend
 */
class Jsend
{
	const STATUS_SUCCESS = 'success';
	const STATUS_FAIL = 'fail';
	const STATUS_ERROR = 'error';

	/**
	 * The type of response, either "success", "fail" or "error"
	 *
	 * @var string
	 */
	protected $sStatus = null;

	/**
	 * Acts as the wrapper for any data returned by the API call.
	 *
	 * @var array
	 */
	protected $aData = null;

	/**
	 * In case the status is "error", a meaningful, end-user-readable (or at the least log-worthy) message,
	 * explaining what went wrong.
	 *
	 * @var string
	 */
	protected $sMessage = null;

	/**
	 * In case the status is "error", a numeric code corresponding to the error, if applicable
	 *
	 * @var int
	 */
	protected $iCode = null;

	/**
	 * All went well, and (usually) some data was returned.
	 *
	 * @return Jsend
	 */
	public static function createSuccess()
	{
		return new self(self::STATUS_SUCCESS);
	}

	/**
	 * There was a problem with the data submitted, or some pre-condition of the API call wasn't satisfied
	 *
	 * @return Jsend
	 */
	public static function createFail()
	{
		return new self(self::STATUS_FAIL);
	}

	/**
	 * An error occurred in processing the request, i.e. an exception was thrown
	 *
	 * @param string $sMessage
	 * @param int $iCode Optional. 
	 * @return Jsend
	 */
	public static function createError($sMessage, $iCode = null)
	{
		$oJsend = new self(self::STATUS_ERROR);
		$oJsend->sMessage = (string) $sMessage;

		if (null !== $iCode) {
			if (!is_int($iCode) || $iCode < 0) {
				throw new InvalidArgumentException('Code should be a numeric code corresponding to the error');
			}
			$oJsend->iCode = $iCode;
		}
		return $oJsend;
	}

	/**
	 * Protected construct so only one of the available static create*-method is abled to
	 * create a new instance, forcing the required parameters to be present.
	 *
	 * @param string $sStatus
	 */
	protected function __construct($sStatus)
	{
		$this->sStatus = $sStatus;
	}

	/**
	 * Sets a value to be returned inside the data-element of the response
	 *
	 * @param name $sName
	 * @param mixed $mValue
	 */
	public function __set($sName, $mValue)
	{
		$this->aData[$sName] = $mValue;
	}

	/**
	 * Returns the Jsend object, serialized in json
	 *
	 * @return string
	 */
	public function __toString()
	{
		$oResponse = new stdClass;
		$oResponse->status = $this->sStatus;

		if (self::STATUS_ERROR == $this->sStatus) {
			$oResponse->message = $this->sMessage;
			if (null !== $this->iCode) {
				$oResponse->code = $this->iCode;
			}
		}
		
		if ($this->aData) {
			$oResponse->data = $this->aData;
		} elseif (self::STATUS_ERROR != $this->sStatus) {
			// Key 'data' is required for status 'success' and 'fail'
			$oResponse->data = null;
		}

		return json_encode($oResponse, JSON_FORCE_OBJECT);
	}

	/**
	 * Sets multiple values in bulk from an array
	 *
	 * @param array $aData
	 */
	public function importData(array $aData)
	{
		if ($this->aData) {
			$this->aData = array_merge($this->aData, $aData);
		} else {
			$this->aData = $aData;
		}
	}
}
?>