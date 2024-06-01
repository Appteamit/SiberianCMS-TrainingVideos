App.config(function($routeProvider) {
    $routeProvider
        .when(BASE_URL + '/trainingvideos/backoffice_view', {
            controller: 'TrainingVideosViewController',
            templateUrl: BASE_URL + '/trainingvideos/backoffice_view/template'
        });
}).controller('TrainingVideosViewController', function($scope, $window, Header, TrainingVideos) {
    $scope.header = new Header();
    $scope.header.button.left.is_visible = false;
    $scope.header.loader_is_visible = false;
    $scope.content_loader_is_visible = true;
    

    TrainingVideos.loadData()
        .success(function(data) {
            $scope.header.title = data.title;
            $scope.header.icon = data.icon;
            $scope.header.apikey = data.apikey;
            $scope.header.channel = data.channel;
            $scope.header.headervisible = data.headervisible;
    		$scope.header.headerlayout = data.headerlayout;
            $scope.header.headerinfo = data.headerinfo;
            $scope.header.headerchannelname = data.headerchannelname;
    		$scope.header.headerchannelescription = data.headerchannelescription;
    		$scope.header.headerchannellogo = data.headerchannellogo;
   			$scope.header.headerchannelbanner = data.headerchannelbanner;
    		$scope.header.contentcolumns = data.contentcolumns;
    		$scope.header.contentrows = data.contentrows;
    		$scope.header.videoinfo = data.videoinfo;
            $scope.header.videolayout = data.videolayout;
    		$scope.header.colorscheme = data.colorscheme;
        }).finally(function() {
            $scope.content_loader_is_visible = false;
            $scope.$apply();
        });
    
    $scope.saveSettings = function() {
    	$scope.content_loader_is_visible = true;
    	
    	TrainingVideos.saveData(
        
    	$scope.header.apikey,		
        $scope.header.channel,
        $scope.header.headervisible,
        $scope.header.headerlayout,
        $scope.header.headerinfo, 		
        $scope.header.headerchannelname,
        $scope.header.headerchannelescription,
        $scope.header.headerchannellogo,
        $scope.header.headerchannelbanner,
        $scope.header.contentcolumns,
        $scope.header.contentrows,
        $scope.header.videoinfo,
        $scope.header.videolayout,
        $scope.header.colorscheme
        
        )
            .success(function(data) {
                $scope.header.title = data.title;
                $scope.header.icon = data.icon;
            }).finally(function() {
                $scope.content_loader_is_visible = false;
            });
    }
});
