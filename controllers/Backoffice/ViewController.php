<?php

class TrainingVideos_Backoffice_ViewController extends Backoffice_Controller_Default
{

    public function loadAction() {
		$filename = Core_Model_Directory::getBasePathTo('/app/local/modules/TrainingVideos/resources/var/web/modules/trainingvideos/settings.txt');
		$settings = Siberian_Json::decode(file_get_contents($filename));

        $payload = [
            'title' => __('Training Videos Pro'),
            'icon' => 'fa-desktop',
            'apikey' =>$settings['apikey'],
            'channel' =>$settings['channel'],
            'headervisible' =>$settings['headervisible'],
            'headerlayout' =>$settings['headerlayout'],
            'headerinfo' =>$settings['headerinfo'],
            'headerchannelname' =>$settings['headerchannelname'],
            'headerchannelescription' =>$settings['headerchannelescription'],
            'headerchannellogo' =>$settings['headerchannellogo'],
            'headerchannelbanner' =>$settings['headerchannelbanner'],
            'contentcolumns' =>$settings['contentcolumns'],
            'contentrows' =>$settings['contentrows'],
            'videoinfo' =>$settings['videoinfo'],
            'colorscheme' =>$settings['colorscheme'],
        	'videolayout' =>$settings['videolayout'],
        ];

        $this->_sendJson($payload);
    }
    
    public function saveAction() {
		if ($data = Siberian_Json::decode($this->getRequest()->getRawBody())) {
			$filename = Core_Model_Directory::getBasePathTo('/app/local/modules/TrainingVideos/resources/var/web/modules/trainingvideos/settings.txt');
			file_put_contents($filename,json_encode($data));
            $payload = [
	            'title' => __('Training Videos Settings'),
	            'icon' => 'fa-desktop',
                'apikey' =>$data['apikey'],
	            'channel' =>$data['channel'],
                'headervisible' =>$data['headervisible'],
                'headerlayout' =>$data['headerlayout'],
                'headerinfo' =>$data['headerinfo'],
                'headerchannelname' =>$data['headerchannelname'],
                'headerchannelescription' =>$data['headerchannelescription'],
                'headerchannellogo' =>$data['headerchannellogo'],
                'headerchannelbanner' =>$data['headerchannelbanner'],
                'contentcolumns' =>$data['contentcolumns'],
                'contentrows' =>$data['contentrows'],
                'videoinfo' =>$data['videoinfo'],
	            'colorscheme' =>$data['colorscheme'],
                'videolayout' =>$data['videolayout'],
            
	        ];
		} else {
		    $payload = [
		        'error' => true,
                'message' => __('An unknown error occured.')
            ];
        }

        $this->_sendJson($payload);
    }
}