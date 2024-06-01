<?php

class TrainingVideos_ApplicationController extends Application_Controller_Default {

    public function viewAction() {
        $this->loadPartials();
    }

    public function loadAction(){
        $payload = [
            'title' => __('Training Videos Pro'),
            'icon' => 'fa-image',
        ];

        $this->_sendJson($payload);
    }
}