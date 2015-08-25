'use strict';

angular.module('sca-ngular', ['http-auth-interceptor', 'base64'])
    .constant('scangularConfig', {
        applicationName: 'scangularConfig.applicationName'

    })
    .controller('loginController', ['$scope', 'loginService', 'authService', '$document', '$sanitize','$base64', function ($scope, loginService, authService, $document, $sanitize,$base64) {

        $scope.authenticationError = false;

        function sanitizeCredentials() {
            return {
                username: $sanitize($scope.username),
                password: $base64.encode($sanitize($scope.password)),
                ignoreAuthModule: 'ignoreAuthModule'
            };
        }

        $scope.submit = function () {

            $scope.authenticationError = false;

            loginService.login(sanitizeCredentials(),
                function (data) {
                    loginService.activateLogin(data);
                    limpaForm();
                }, function (data) {
                    loginService.logout(data);
                    limpaForm();
                    $scope.authenticationError = true;
                });
        };

        function limpaForm() {
            $scope.username = null;
            $scope.password = null;

        }

    }])
    .controller('userController', ['$scope', 'loginService', '$document', function ($scope, loginService) {

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
    .factory('loginService', ['$resource', 'authService', '$rootScope', 'scangularConfig',
        function ($resource, authService, $rootScope, scangularConfig) {
            var service = $resource('/' + scangularConfig.applicationName + '/api/authentication', {
                'username': '@username',
                'password': '@password'
            }, {
                'login': {
                    method: 'POST',
                    isArray: false,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'logoutApi': {
                    method: 'GET',
                    url: '/' + scangularConfig.applicationName + '/api/logout',
                    isArray: true,
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'authenticate': {
                    method: 'GET',
                    url: '/' + scangularConfig.applicationName + '/api/authenticate',
                    isArray: false,
                    ignoreAuthModule: 'ignoreAuthModule'
                },
                'user': {
                    method: 'GET',
                    url: '/' + scangularConfig.applicationName + '/api/user',
                    isArray: false
                },
                'goToPerfil': {
                    method: 'GET',
                    url: '/' + scangularConfig.applicationName + '/api/goToPerfil/:codigo',
                    params: {codigo: '@codigo'},
                    isArray: false
                }
            });

            var currentUser = null;

            service.getCurrentUser = function () {
                return currentUser;
            };

            service.activateLogin = function (obj) {
                currentUser = {username: obj.username, permissions: {}, userDetails: {}};
                service.authenticate({}, function (userDetails) {
                    service.setUserDetails(userDetails);
                    authService.loginConfirmed(obj);
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
                scope.loadingPanel = true;

                if (loginService.getCurrentUser() === null || loginService.getCurrentUser().username === null || loginService.getCurrentUser().username === '') {
                    loginService.authenticate({}, function (data) {
                        scope.isAuthenticated = true;
                        loginService.setUserDetails(data);
                        scope.loadingPanel = false;
                    }, function (data) {
                        scope.isAuthenticated = false;
                        scope.loadingPanel = false;
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
                    scope.isAuthenticated = false;
                });
            }
        }
    })
    .directive('loginPanel', function () {
        return {
            restrict: 'A',
            template: '<div block-ui block-ui-pattern="/.*\/api\/authentication/"><div class="form-box" id="login-box" ng-controller="loginController" ng-hide="isAuthenticated || loadingPanel"><div class="header"><i class="fa fa-lock"></i> Área Restrita</div><form name="loginForm" autocomplete="off"><div class="body bg-gray"><div class="form-group" show-errors><input type="text" name="username" ng-model="username" class="form-control" placeholder="Login"/><span class="help-block" ng-show="loginForm.username.$error.required">Obrigatório</span></div><div class="form-group" show-errors><input type="password" name="password" ng-model="password" class="form-control" placeholder="Senha"/><span class="help-block" ng-show="loginForm.password.$error.required">Obrigatório</span></div></div><div class="footer bg-gray"><button type="submit" ng-click="submit()" class="btn btn-primary btn-block">Autenticar</button><div class="alert alert-danger alert-dismissable" ng-show="authenticationError"><b>Usuário ou senha inválida!</b></div></div></form></div></div>'
        }
    })
    .directive('userPanel', function () {
        return {
            restrict: 'A',
            template:
            '<div class="navbar-right" ng-controller="userController" ng-show="isAuthenticated">' +
            '<ul class="nav navbar-nav">' +
            '<li class="dropdown user user-menu">' +
            '<a href="" class="dropdown-toggle" data-toggle="dropdown"> <i class="glyphicon glyphicon-user"></i></a>' +
            '<ul class="dropdown-menu">' +
            '<li class="user-header bg-light-blue"  style="height: auto;"><p><small>{{user.login}}</small></p><p>{{user.nome}}<small>Perfil: {{user.perfil}}</small></p></li>' +
            '<li class="user-footer"><div class="pull-right"><a href="" ng-click="logout()" class="btn btn-danger" style="color:white;"> Sair</a></div></li>' +
            '</ul>' +
            '</li>' +
            '</ul>' +
            '</div>'
        }
    });

