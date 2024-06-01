<?php

$init = function($bootstrap) {
    Siberian_Module::addEditorMenu(
        'TrainingVideos',
        'trainingvideos',
        __('Training Videos'),
        'trainingvideos/application/view',
        'icofont icofont-ui-video-play'
    );
    Siberian_Module::addMenu(
        'TrainingVideos',
        'trainingvideos',
        __('Training'),
        'trainingvideos/backoffice_view',
        'icofont icofont-ui-video-play'
    );
};



