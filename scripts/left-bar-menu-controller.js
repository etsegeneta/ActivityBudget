/* global activityBudget, selection */

//Controller for column show/hide
activityBudget.controller('LeftBarMenuController',
        function($scope, $location) {
    $scope.showDataEntry = function(){
        selection.load();
        $location.path('/home').search();
    };

    $scope.showReports = function(){
        selection.load();
        $location.path('/reports').search();
    };
});