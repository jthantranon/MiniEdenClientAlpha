var EDEN = {
    CACHE: {
        user: {},
        noty: {}
    }
};
var UID;
var KEY;
var meClient = angular.module('meClient', []);
var SERVER =
//    'ws://minieden.nodejitsu.com';
        'ws://localhost:8080';
var baseURL = "https://minieden.firebaseio.com";
var baseRef = new Firebase(baseURL);
var pubRef = baseRef.child('public');
var pubUsersRef = pubRef.child('users');
var priUsersRef = baseRef.child('private').child('users');
var uRef;
var uVal;
var pRef;
var console = window.console;

var AUTH = (function (auth) {
    var fire_auth;

    function fetchUser(user){
        UID = user.uid;
        console.log('Logged in as User' + user.uid);
        EDEN.CACHE.user.uid = user.uid;
        EDEN.CACHE.user.email = user.email;
        pRef = priUsersRef.child(user.uid);
        uRef = pubUsersRef.child(user.id);
        uRef.once('value',function(data){
            var dat = data.val();
            console.log(dat);
        });
        pRef.once('value',function(data){
            var dat = data.val();
            WS.pns({
                authType: 'authReq',
                data: 'auth request test',
                uid: user.uid
            },'auth');
            pRef.child('actions').child('rollDice').on('value',function(data){
                noty({
                    text: 'You rolled: ' + data.val(),
                    type: 'success',
                    layout: 'bottomRight',
                    timeout: 500
                });
            });


        });
    }

    function fire_login(email,password){
        fire_auth.login('password', {
            email: email,
            password: password,
            rememberMe: true
        });
    }

    auth = {};
    auth.fire_auth = function(){ // Client initialized
        fire_auth = new FirebaseSimpleLogin(baseRef,function(error,user){
            if(error){console.log(error);}
            if(user){ fetchUser(user);}else{
                // Show login if no user returned
                var appElement = document.querySelector('[ng-controller=meController]');
                var $scope = angular.element(appElement).scope();
                $scope.$apply(function() {
                    $scope.loading = false;
                });
            }
        });
    };
    auth.login = function(email,password){
        fire_auth.createUser(email, password, function(error, user) {
            if (!error) {
                console.log('Registering user...');
                fire_login(email,password);
            } else {
                if(error.code == "EMAIL_TAKEN"){
                    console.log('User Already Registered... Attempting Login...');
                    fire_login(email,password);
                }
            }
        });
    };

    auth.logout = function(){
        fire_auth.logout();
    };
    auth.router = { // Server initialized
        requestKey: function(msg){
            pRef.child('seshKey').on('value',function(data){
                var dat = data.val();
                KEY = dat;
                WS.pns({
                    authType: 'keyReply',
                    key: dat,
                    uid: UID
                },'auth')
            })
        },
        authenticated: function(msg){
            console.log('AUTHED!');
            var appElement = document.querySelector('[ng-controller=meController]');
            var $scope = angular.element(appElement).scope();
            $scope.$apply(function() {
                $scope.uid = EDEN.CACHE.user.uid;
                $scope.email = EDEN.CACHE.user.email;
                $scope.test = 20;
                $scope.hideSplash = true;
                $scope.greeting001 = 'HELLO DAVE';
            });

//            noty({
//                text: 'test',
//                buttons: [
//                    {addClass: 'btn btn-primary', text: 'Ok', onClick: function($noty) {
//
//                        // this = button element
//                        // $noty = $noty element
//
//                        $noty.close();
//                        noty({text: 'You clicked "Ok" button', type: 'success'});
//                        $scope.$apply(function(){
//                            $scope.showLogout = true;
//                        });
//                    }
//                    }
//                ]
//            });
        }
    };
    return auth;
}(AUTH || {}));

var UI = (function(ui){
    ui = {};

    ui.router = {
        closeNoty: function(data){
            if(EDEN.CACHE && EDEN.CACHE.noty[data.uuid]){
                EDEN.CACHE.noty[data.uuid].close();
            }
        },
        feedback: function(data){
            noty({text: data.msg,layout: 'center',timeout: 2000});
        }
    };

    return ui;
}(UI||{}));

var PROJECTILES = (function(proj){
    proj = {};

    proj.router = {
        atkWord: function(data){
            console.log('yep');
            EDEN.CACHE.noty[data.word] = noty({text: data.word,layout: 'center'});
            console.log(data);
        }
    };

    return proj;
}(PROJECTILES||{}));


var WS = (function (ws,auth,ui,projectiles) {
    ws = {};
    var websocket = new WebSocket(SERVER);


    /// PRIVATE
    ///////////
    function packrouter(dat){
        var routes = {
            auth: auth.router[dat.authType],
            ui: ui.router[dat.uiType],
            projectile: projectiles.router[dat.projectileType]
        };
        if(routes[dat.type]){
            routes[dat.type](dat);
        }else{
            console.log('UNSUPPORTED TYPE:');
            console.log(dat);
        }
    }

    /// EVENTS
    ////////////
    websocket.onopen = function(){
        auth.fire_auth();
    };

    websocket.onmessage = function(evt){
        var dat = JSON.parse(evt.data);
        console.log(dat);
        packrouter(dat);
    };

    /// RETURN
    /////////////
    ws.pns = function (data,type){
//        console.log(data);
        type = type || 'misc';
        if((typeof data) !== 'object'){
            var oldData = data;
            data = {
                dataType: typeof oldData,
                data: oldData
            };
        }
        data.type = type;
        data.creds = {
            sender: UID,
            seshKey: KEY
        };
        websocket.send(JSON.stringify(data));

    };

    return ws;
}(WS || {},AUTH,UI,PROJECTILES));

meClient.controller('meController', function ($scope) {
    $scope.hideSplash = false;
    $scope.loading = true;
    $scope.test = window.test || 'lala';

    pubRef.child('worldState').on('value',function(data){
        var dat = data.val();
        EDEN.CACHE.worldState = dat;
        $scope.$apply(function(){
            $scope.weather = dat.weather;
            $scope.mobs = dat.mobs;
            $scope.time = dat.time;
        });
    });

    (function bindPRef(){
        if(pRef){
            pRef.on('value',function(data){
                var dat = data.val();
                $scope.$apply(function(){
                    $scope.bits = dat.bits;
                });

            });
        } else {
            setTimeout(bindPRef,100);
        }
    }());



    $scope.regButton = function(){
        AUTH['login']($scope.email,$scope.password);
    };

    $scope.attack = function(target){
        WS.pns({
            actionType: 'attack',
            target: target.uuid
        },'action');
        $('#atkWordField').focus();
    };

    $scope.deflectAtkWord = function(){
        WS.pns({
            actionType: 'deflectAtkWord',
            target: $scope.atkWord
        },'action');
        $scope.atkWord = '';
    };

    $scope.mobInfo = function(mob){
        mob = $scope.mobs[mob.uuid];
        EDEN.CACHE.noty[mob.uuid] = noty({
            layout: 'centerLeft',
            text: JSON.stringify(mob),
            buttons: [
                {addClass: 'btn btn-primary', text: 'Attack It', onClick: function($noty) {
                    $scope.attack(mob);
                    // this = button element
                    // $noty = $noty element
//                    console.log('you attack');


//                    $noty.close();
//                    noty({text: 'You clicked "Ok" button', type: 'success'});

                }},
                {addClass: 'btn btn-primary', text: 'Do Nothing', onClick: function($noty) {

                    // this = button element
                    // $noty = $noty element

                    $noty.close();
                }}
            ]
        });

    };

    $scope.action = function(action){
        $(".welcome").textillate({
            in: {
                delayScale: 10,
                delay: 100
            }
        });
        $scope.showGreet = true;
//        $(".welcome").lettering();
        WS.pns({
            actionType: action
        },'action')
    };

    $scope.logout = function(action){
        KEY = null; // need to code server logout confirmation
        AUTH.logout();
    };

    function wsWrapper(){

//        var auth = new FirebaseSimpleLogin(baseRef,function(error,user){
//            if(error){
//                console.log(error);
//            }
//            if(user){
//                UID = user.uid;
//
//                console.log('Logged in as User' + user.uid);
//                pRef = priUsersRef.child(user.uid);
//                uRef = pubUsersRef.child(user.id);
//                uRef.once('value',function(data){
//                    var dat = data.val();
//                    console.log(dat);
////            setInterval(EDEN.mainLoop,EDEN.FPS);
//                });
//                uRef.on('value',function(data){
//                    $scope.$apply(function(){
//                        $scope.uVal = data.val();
//                    });
//                    uVal = data.val();
//                });
//                uRef.child('actions').on('value',function(data){
//                    $scope.$apply(function(){
//                        $scope.actions = data.val();
//                    });
//                });
//
//                pRef.once('value',function(data){
//                    var dat = data.val();
//                    if(dat){
//                        console.log('there is a key');
//                        console.log(dat);
//                        dat.id = user.uid;
//                        pns(dat);
//                        pns({
//                            authType: 'authReq',
//                            data: 'auth request test',
//                            uid: user.uid
//                        },'auth');
//                    } else{
//                        console.log('no key');
//                        console.log(user);
//                        pRef.child('seshKey').set('test');
//                    }
//
//                });
////            $scope.displayName = 'test';
////            openSocket(user);
//
//            }
//
//        });
//        $scope.actions = ['search','build'];
//    auth = new FirebaseSimpleLogin(baseRef,function(error,user){
//        if(error){
//            console.log(error);
//        }
//        if(user){
//            console.log(user.id);
//            pRef = priUsersRef.child(user.id);
//            uRef = pubUsersRef.child(user.id);
//            uRef.once('value',function(data){
//                var dat = data.val();
//                console.log(dat);
//                setInterval(EDEN.mainLoop,EDEN.FPS);
//            });
//            uRef.on('value',function(data){
//                $scope.$apply(function(){
//                    $scope.uVal = data.val();
//                });
//                uVal = data.val();
//            });
//            uRef.child('actions').on('value',function(data){
//                $scope.$apply(function(){
//                    $scope.actions = data.val();
//                });
//            });
////            $scope.displayName = 'test';
////            openSocket(user);
//
//        }
//
//    });
//    function drawBoard(){
////        var bw = 400;
////        var bh = 400;
////        var p = 20;
////        var cw = bw + (p*2) + 1;
////        var ch = bh + (p*2) + 1;
////
////        var canvas = document.getElementById("canvas");
////        var context = canvas.getContext("2d");
////        for (var x = 0; x <= bw; x += 40) {
////            context.moveTo(0.5 + x + p, p);
////            context.lineTo(0.5 + x + p, bh + p);
////        }
////
////
////        for (var x = 0; x <= bh; x += 40) {
////            context.moveTo(p, 0.5 + x + p);
////            context.lineTo(bw + p, 0.5 + x + p);
////        }
////
////        context.strokeStyle = "black";
////        context.stroke();
//    }
//
//    function actionFeedback(msg){
//        console.log(msg);
////        alert(msg.data);
//        if(msg.wasSuccessful){
//            noty({
//                text: msg.msg,
//                buttons: [
//                    {addClass: 'btn btn-primary', text: 'Ok', onClick: function($noty) {
//
//                        // this = button element
//                        // $noty = $noty element
//
//                        $noty.close();
////                        noty({text: 'You clicked "Ok" button', type: 'success'});
//                        $scope.$apply(function(){
//                           $scope.showLogout = true;
//                        });
//                    }
//                    }
//                ]
//            });
//        }else{
//            noty({text: msg.msg});
//        }
//
//        $scope.$apply(function(){
//            $scope.canSearch = false;
//            setTimeout(function(){
//                $scope.$apply(function(){
//                    $scope.canSearch = true;
//                })
//            },2000)
//        });
//
//    }
//
////    auth.login('password');
//
//
//    var ws = new WebSocket('ws://localhost:8080');
  //
//    $scope.testButton = function(){
//        pns($scope.sessionToken,'test');
//    };
//
//    $scope.sendAction = function(name){
////        console.log(name);
//        pns(name,'action');
//    };
//
//
//    packRouter = {
//        token: token,
//        actionFeedback: actionFeedback,
//        echo: echo
//    };
//
//    function echo(msg){
//        console.log(msg);
//    }
//
//
//
//    function unpack(msg){
//        return JSON.parse(msg.data);
//    }
//
//    function token(msg){
//        msg = unpack(msg);
//        console.log('bleh');
//        console.log(document.cookie);
//        console.log(msg);
//        document.cookie = 'token=' + msg.token;
//        console.log(document.cookie);
//        $scope.$apply(function(){
//            $scope.loggedIn = true;
//            $scope.sessionToken = msg.token;
//            $scope.displayName = msg.name;
//        });
//        drawBoard();
//    }
//
//
//
//    function connect(user){
//
//
//        pns({
//            uuid: user.id,
//            email: $scope.email || null,
//            password: $scope.password || readCookie('token')
//        },'register');
//    }
//
//    $scope.cheatConnect = function(){
//        pns({
//            uuid: 2,
//            email: 'a@b.com',
//            password: 'test'
//        },'register');
//    }
    }

});
