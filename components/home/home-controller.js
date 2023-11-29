/* global angular, dhis2, art, activityBudget */

'use strict';

//Controller for settings page
activityBudget.controller('HomeController',
        function($scope,
        $translate,
        $filter,
        MetaDataFactory,
        PeriodService,
        ProgramFactory,
        NotificationService,
        SessionStorageService) {

    $scope.model = {
        metaDataCached: false,
        optionSets: null,
        optionSetsById: null,
        validGroups: [],
        dataElementGroupSetsByCode: {},
        selectedPeriod: null,
        periods: [],
        periodType: 'Yearly',
        periodOffset: 0,
        openFuturePeriods: 3,
        categoryCombosById: {},
        selectedAttributeCategoryCombo: null,
        selectedCategoryCombo: null,
        listSize: 20,
        dataElementsWithGroup: {},
        formState: null,
        fillingOrganization: null,
        showFillingOrganization: true,
        costCategoryItems: [],
        dataElementsByCode: [],
        dataElementsById: [],
        optionGroups: [],
        selectedProgram: null,
        actvityGroupSet: [],
        budgetGroupSet: null,
        coa: [],
        hstp: [],
        horizontalMenus: []
    };

    $scope.newActivity = {};
    $scope.treeLoaded = false;

    //watch for selection of org unit from tree

    var getOptionGroupSetMembers = function( ogs ){
        var groupSetMembers = [];
        groupSetMembers.push( {id: ogs.id, code: ogs.code, displayName: ogs.displayName, type: 'groupSet'} );
        angular.forEach(ogs.optionGroups, function(_og){
            var og = $scope.model.optionGroupsById[_og.id];
            if ( og && og.options && og.options.length > 0 ){
                groupSetMembers.push( {id: og.id, code: og.code, displayName: og.displayName, type: 'group'} );
                angular.forEach(og.options, function(_op){
                    var ops = $scope.model.optionSetsById[ogs.optionSet.id];
                    if ( ops ){
                        for( var i=0; i<ops.options.length; i++){
                            if ( ops.options[i].id === _op ){
                                groupSetMembers.push( {id: ops.options[i].id, code: ops.options[i].code, displayName: ops.options[i].displayName, type: 'member'} );
                            }
                        }
                    }
                });
            }
        });
        return groupSetMembers;
    };

    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if ( !$scope.model.optionSets ){
                $scope.model.optionSets = [];
                MetaDataFactory.getAll('optionSets').then(function(optionSets){
                    $scope.model.optionSets = optionSets;
                    $scope.model.optionSetsById = optionSets.reduce( function(map, obj){
                        map[obj.id] = obj;
                        return map;
                    }, {});

                    MetaDataFactory.getAll('optionGroups').then(function(ogs){
                        $scope.model.optionGroups = ogs;
                        $scope.model.optionGroupsById = ogs.reduce( function(map, obj){
                            map[obj.id] = obj;
                            return map;
                        }, {});

                        MetaDataFactory.getAll('optionGroupSets').then(function(ogss){

                            angular.forEach(ogss, function(ogs){
                                var ops = $scope.model.optionSetsById[ogs.optionSet.id];
                                if( ops && ops.optionSetType ){
                                    if ( ops.optionSetType === 'coa' ){
                                        $scope.model.coa = $scope.model.coa.concat( getOptionGroupSetMembers( ogs ) );
                                    }
                                    else if ( ops.optionSetType === 'hstp' ){
                                        $scope.model.hstp = $scope.model.hstp.concat( getOptionGroupSetMembers( ogs ) );
                                    }
                                }
                            });

                            MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                                angular.forEach(ccs, function(cc){
                                    $scope.model.categoryCombosById[cc.id] = cc;
                                });

                                MetaDataFactory.getAll('dataElements').then(function(dataElements){
                                    angular.forEach(dataElements, function(de){
                                        $scope.model.dataElementsById[de.id] = de;
                                        if( de.code ){
                                            $scope.model.dataElementsByCode[de.code] = de;
                                        }
                                    });

                                    MetaDataFactory.getAll('dataElementGroups').then(function( dataElementGroups ){

                                        $scope.model.dataElementGroups = dataElementGroups;

                                        MetaDataFactory.getDataElementGroupSets('dataElementGroupSets').then(function( dataElementGroupSets ){

                                            $scope.model.actvityGroupSet = $filter('getFirst')(dataElementGroupSets, {mappingTemplate: 'activityWorkplan' });
                                            $scope.model.budgetGroupSet = $filter('getFirst')(dataElementGroupSets, {mappingTemplate: 'activityBudget'});

                                            if(!$scope.model.actvityGroupSet){
                                                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_activity_workplan"));
                                                return;
                                            }

                                            if(!$scope.model.budgetGroupSet){
                                                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_budget_workplan"));
                                                return;
                                            }

                                            var activityMenu = angular.copy( $scope.model.actvityGroupSet );
                                            activityMenu.dataElements = [];
                                            activityMenu.dataEntry = true;
                                            activityMenu.class = 'main-horizontal-menu';
                                            angular.forEach( $scope.model.actvityGroupSet.dataElementGroups, function(deg){
                                                angular.forEach(deg.dataElements, function(de){
                                                    activityMenu.dataElements.push( $scope.model.dataElementsById[de.id] );
                                                });
                                            });

                                            var budgetMenu = angular.copy( $scope.model.budgetGroupSet );
                                            budgetMenu.dataElements = [];
                                            budgetMenu.dataEntry = true;
                                            budgetMenu.class = 'main-horizontal-menu';
                                            angular.forEach( $scope.model.budgetGroupSet.dataElementGroups, function(deg){
                                                angular.forEach(deg.dataElements, function(de){
                                                    budgetMenu.dataElements.push( $scope.model.dataElementsById[de.id] );
                                                });
                                            });

                                            $scope.model.horizontalMenus.push( activityMenu );
                                            $scope.model.horizontalMenus.push( budgetMenu );

                                            if ( $scope.model.coa.length > 0 ){
                                                $scope.model.horizontalMenus.push( {coaSummary: true, displayName: 'budget_summary_gov', class: 'main-horizontal-menu'});
                                            }

                                            if ( $scope.model.hstp.length > 0 ){
                                                $scope.model.horizontalMenus.push( {hstpSummary: true, displayName: 'budget_summary_hstp', class: 'main-horizontal-menu'});
                                            }

                                            $scope.model.periodType = 'Yearly';
                                            $scope.model.periods = PeriodService.getPeriods( $scope.model.periodType, $scope.model.periodOffset,  $scope.model.openFuturePeriods );
                                        });
                                    });
                                });
                            });
                        });
                    });
                    $scope.loadPrograms();
                });
            }
            else{
                $scope.loadPrograms();
            }
        }
    });

    $scope.getPeriods = function(mode){
        $scope.model.selectedPeriod = null;
        $scope.model.periodOffset = mode === 'NXT' ? ++$scope.model.periodOffset : --$scope.model.periodOffset;
        $scope.model.periods = PeriodService.getPeriods( $scope.model.periodType, $scope.model.periodOffset,  $scope.model.openFuturePeriods );
    };

    //load programs associated with the selected org unit.
    $scope.loadPrograms = function() {
        $scope.model.programs = [];
        $scope.model.trackedEntityAccess = false;
        $scope.model.selectedOptionSet = null;
        $scope.model.cellValidity = [];
        $scope.model.arts = [];
        if (angular.isObject($scope.selectedOrgUnit)) {
            ProgramFactory.getByOuAndProperty( $scope.selectedOrgUnit, $scope.model.selectedProgram, 'mappingTemplate', 'activityBudget' ).then(function(res){
                $scope.model.programs = res.programs || [];
                $scope.model.selectedProgram = res.selectedProgram || null;
            });
        }
    };

    $scope.getMenuStyle = function( menu ){
        var style = menu.class + ' horizontal-menu font-16';
        if( menu.active ){
            style += ' active-horizontal-menu';
        }
        return style;
    };
});
