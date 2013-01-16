<?php
/**
 * Envelopes the request for easy access to given variables
 */
class Request
{
	protected $aData = array();

	public function __construct(array $aData)
	{
		$this->aData = $aData;
	}

	public function exists($sName)
	{
		return array_key_exists($sName, $this->aData);
	}

	public function __get($sName)
	{
		if (!$this->exists($sName)) {
			return null;
		}

		return $this->aData[$sName];
	}

	public function __isset($sName)
	{
		return isset($this->aData[$sName]);
	}
}
?>