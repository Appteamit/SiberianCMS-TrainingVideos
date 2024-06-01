App.factory('TrainingVideos', function($http, Url) {
    var factory = {};
	
    factory.loadData = function () {
        return $http({
            method: 'GET',
            url: Url.get('trainingvideos/backoffice_view/load'),
            cache: false,
            responseType: 'json'
        });
    };
    
    factory.saveData = function (
    		     apikey,
    		     channel, 
                 headervisible,
                 headerlayout,
                 headerinfo, 
                 headerchannelname,
                 headerchannelescription,
                 headerchannellogo,
                 headerchannelbanner,
                 contentcolumns,
                 contentrows,
                 videoinfo,
                 videolayout, 
                 colorscheme
                 
                
                ) 
    
    
    {
        return $http({
            method: 'POST',
            data: {
            	apikey: apikey,
            	channel: channel,
                headervisible: headervisible,
                headerlayout: headerlayout,          
                headerinfo: headerinfo,
                headerchannelname: headerchannelname,
                headerchannelescription: headerchannelescription,
                headerchannellogo: headerchannellogo,
                headerchannelbanner: headerchannelbanner,
                contentcolumns: contentcolumns,
                contentrows: contentrows,
                videoinfo: videoinfo,
                videolayout: videolayout,
                colorscheme: colorscheme,
            },
            url: Url.get('trainingvideos/backoffice_view/save'),
            cache: false,
            responseType: 'json'
        });
    };
    
    return factory;
});
