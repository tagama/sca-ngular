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
            template: '<div class="form-box" id="login-box" ng-controller="loginController" ng-hide="isAuthenticated"><div class="header"><i class="fa fa-lock"></i> Área Restrita</div><form name="loginForm"><div class="body bg-gray"><div class="form-group" show-errors><input type="text" name="username" ng-model="username" class="form-control" placeholder="Login"/><span class="help-block" ng-show="loginForm.username.$error.required">Obrigatório</span></div><div class="form-group" show-errors><input type="password" name="password" ng-model="password" class="form-control" placeholder="Senha"/><span class="help-block" ng-show="loginForm.password.$error.required">Obrigatório</span></div></div><div class="footer bg-gray"><button type="submit" ng-click="submit()" class="btn btn-primary btn-block">Autenticar</button><div class="alert alert-danger alert-dismissable" ng-show="authenticationError"><b>Usuário ou senha inválido!</b></div></div></form></div>'
        }
    })
    .directive('userPanel', function (loginService, $document, $location) {
        return {
            restrict: 'A',
            template: '<div class="navbar-right" ng-controller="userController" ng-show="isAuthenticated"><ul class="nav navbar-nav"><li class="dropdown user user-menu"><a href="" class="dropdown-toggle" data-toggle="dropdown"> <i class="glyphicon glyphicon-user"></i> <span class="user-name">{{user.login}}<i class="caret"></i></span></a><ul class="dropdown-menu"><li class="user-header bg-light-blue"><img src="images/avatar5.png" class="img-circle" alt="User Image"><p>{{user.nome}}<small>Perfil: {{user.perfil}}</small></p></li><li class="user-footer"><div class="pull-right"><a href="" ng-click="logout()" class="btn btn-default"> Sair</a></div></li></ul></li></ul></div>'
        }
    });

