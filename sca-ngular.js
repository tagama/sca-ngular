'use strict';

angular.module('sca-ngular', ['http-auth-interceptor'])
    .constant('scangularConfig', {
        applicationName: 'scangularConfig.applicationName'

    })
    .controller('loginController', ['$scope', 'loginService', 'authService', '$document', '$sanitize', function ($scope, loginService, authService, $document, $sanitize) {

        $scope.authenticationError = false;

        function sanitizeCredentials(credentials) {
            return {
                username: $sanitize($scope.username),
                password: $sanitize($scope.password),
                ignoreAuthModule: 'ignoreAuthModule'
            };
        }

        $scope.submit = function () {

            $scope.authenticationError = false;

            loginService.login(sanitizeCredentials(), function (data) {
                loginService.activateLogin(data);
            }, function (data) {
                loginService.logout(data);
                $scope.authenticationError = true;
            });
        };

    }])
    .controller('userController', ['$scope', 'loginService', '$document',  function ($scope, loginService) {

        $scope.logout = function () {
            loginService.logout();

        };

        $scope.changePerfil = function (perfil) {
            //TODO: depende de alteração do sca
        };

        $scope.$on('event:userDetailsPrepared', function () {
            $scope.user = loginService.getCurrentUser().userDetails;
        });

        $scope.$on('event:userLogout', function () {
            $scope.user = {};
        });

    }])
    .factory('loginService', ['$resource', 'authService', '$rootScope','scangularConfig',
        function ($resource, authService, $rootScope, scangularConfig) {
            var service = $resource('/'+ scangularConfig.applicationName +'/api/authentication', {'username': '@username', 'password': '@password'}, {
                'login': {
                    method: 'POST',
                    isArray: false,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'logoutApi': {
                    method: 'GET',
                    url: '/'+ scangularConfig.applicationName +'/api/logout',
                    isArray: true,
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'authenticate': {
                    method: 'GET',
                    url: '/'+ scangularConfig.applicationName +'/api/authenticate',
                    isArray: false,
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'user': {
                    method: 'GET',
                    url: '/'+ scangularConfig.applicationName +'/api/user',
                    isArray: false},
                'goToPerfil': {
                    method: 'GET',
                    url: '/'+ scangularConfig.applicationName +'/api/goToPerfil/:codigo',
                    params: {codigo: '@codigo'},
                    isArray: false
                }
            });

            var currentUser = null;

            service.getCurrentUser = function () {
                return currentUser;
            };

            service.activateLogin = function (obj) {
                authService.loginConfirmed(obj);
                currentUser = {username: obj.username, permissions: {}, userDetails: {}};
                service.authenticate({}, function (userDetails) {
                    service.setUserDetails(userDetails);
                });
            };

            service.logout = function (data) {
                authService.loginCancelled(data);
                currentUser = null;
                service.logoutApi(function (success) {
                    $rootScope.$broadcast('event:userLogout');
                });

            };

            service.setUserDetails = function (data) {
                if (!currentUser) currentUser = {username: data.username, permissions: {}, userDetails: {}};
                currentUser.userDetails = data.userDetails;
                currentUser.permissions = data.permissions;
                $rootScope.$broadcast('event:userDetailsPrepared');
            };

            return service;
        }
    ])
    .directive('authenticatedApplication', function (loginService, $document, $location) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {

                scope.isAuthenticated = false;

                if (loginService.getCurrentUser() === null || loginService.getCurrentUser().username === null || loginService.getCurrentUser().username === '') {
                    loginService.authenticate({}, function (data) {
                        scope.isAuthenticated = true;
                        loginService.setUserDetails(data);
                    }, function (data) {
                        scope.isAuthenticated = false;
                    });
                }
                elem.removeClass('waiting-for-angular');

                scope.$on('event:auth-loginRequired', function () {
                    scope.isAuthenticated = false;
                });
                scope.$on('event:auth-loginConfirmed', function () {
                    scope.isAuthenticated = true;
                });
                scope.$on('event:userLogout', function () {
                    $location.path("/");
                });
            }
        }
    })
    .directive('loginPanel', function (loginService, $document, $location) {
        return {
            restrict: 'A',
            templateUrl: 'bower_components/sca-ngular/login.html'
        }
    })
    .directive('userPanel', function (loginService, $document, $location) {
        return {
            restrict: 'A',
            templateUrl: 'bower_components/sca-ngular/user.html'
        }
    });