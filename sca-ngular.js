(function () {

'use strict';

angular.module('sca-ngular', ['http-auth-interceptor', 'base64'])
    .constant('scangularConfig', {
        applicationName: 'scangularConfig.applicationName'

    })
    .controller('loginController', ['$scope', 'loginService', 'authService', '$document', '$sanitize','$base64', function ($scope, loginService, authService, $document, $sanitize,$base64) {
        $scope.authenticationError = false;

        function sanitizedCredentials() {
            return {
                username: $sanitize($scope.username),
                password: $base64.encode($sanitize($scope.password)),
                ignoreAuthModule: 'ignoreAuthModule'
            };
        }

        $scope.submit = function () {

            $scope.authenticationError = false;

            loginService.login(sanitizedCredentials(),
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
    .constant('secureResource', {
            name: function (name){
                return 'ROLE_' + name;
            }
    })

    .factory('permissionService', ['loginService', 'secureResource',
            function (loginService, secureResource) {
                var service = {
                    hasPermission : function (name){
                         if(loginService.getCurrentUser()){
                            return loginService.getCurrentUser().permissions[secureResource.name(name)];
                         }
                         return false;
                    }
                }
                return service;
            }
     ])

    .directive('authenticatedApplication',['loginService', '$document', '$location', 'permissionService', function (loginService, $document, $location, permissionService) {
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

                scope.hasPermission = function(resource){
                    return permissionService.hasPermission(resource)
                }
            }
        }
    }])
    .directive('loginPanel', function () {
        return {
            restrict: 'A',
             template: '<div block-ui block-ui-pattern="/.*\/api\/authentication/"><div class="content-field-total" ng-controller="loginController"  ng-hide="isAuthenticated || loadingPanel"><div class="content-field"><h3><i class="mdi mdi-lock"></i> Área Restrita</h3><div class="alarm alarm-alizarin" ng-show="authenticationError">Usuário ou senha inválido(s)</div><div id="login-box"  ><form name="loginForm" autocomplete="off"><div class="content-login" show-errors><label>Login</label><input type="text" name="username" ng-model="username"/><div class="alarm alarm-alizarin" ng-show="loginForm.username.$error.required">Obrigatório</div></div><div class="content-pass" show-errors><label>Senha</label><input type="password" name="password" ng-model="password" /><div class="alarm alarm-alizarin" ng-show="loginForm.password.$error.required">Obrigatório</div></div><div class="content-buttons"><button type="submit" ng-click="submit()" class="bt bt-lime"><i class="mdi mdi-check"></i> Autenticar</button></div></form></div></div>'
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
    })

    .run(['$rootScope','loginService', '$location', '$route', 'secureResource', function($rootScope, loginService, $location,  $route, secureResource) {
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            //nenhuma permissão necessária
            if (next.requiredPermission == undefined) return

            //loginService.getCurrentUser() só será undefined com F5 na página, e o usuário não conseguirá dar F5 em pagina q não pode ver
            if (loginService.getCurrentUser() && !loginService.getCurrentUser().permissions[secureResource.name(next.requiredPermission)]) {
                //console.log(secureResource.name(next.requiredPermission))
                $location.path( "/" );
            }
        });

        //se realizar o login direto na pagina ex /#/documentos-analise, não dispara $routeChangeStart,
        //pois não á mudança de rota. É disparado manualmente nesses casos para verificar se pode ou nao exibir
        $rootScope.$on('event:userDetailsPrepared', function (event, next, current) {
            $rootScope.$broadcast('$routeChangeStart', $route.current);

        });
     }]);

})();


