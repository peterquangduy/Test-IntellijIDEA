/**
 * Created by peter on 11/16/2016.
 */
var port = 8055;
var io = require('socket.io').listen(port);
var soap = require('soap');
var url = require('url');
var urlSevice = "http://local.bw838.com:5555/service-fms/ServiceFMS.asmx?WSDL";

var POS_SUCCESS_BIT = 0;
var LEN_SUCCESS_BIT = 1;
var SUCCESS = "0";

var socket_arr = new Array();
var myClient;

// load service url
soap.createClient(urlSevice, function (err, client) {
    myClient = client;
});

/* --------------------------------------------- on Connect ------------------------------------------------------ */

var socketLobby = io.of('/lobby').on('connection', function (socket) {
    console.log("=================== Connect success LOBBY ! ===================");
    var queryObj = url.parse(socket.handshake.url,true).query;
    //console.log("socket "+url.parse(socket.handshake.url,true).query.pUserid);
    console.log("User:"+queryObj.pUserid+ " pass:"+queryObj.pPassword + " pUserType:"+queryObj.pUserType + " pRoomId:"+queryObj.pRoomId);

    var _args = {
        pUserid: queryObj.pUserid,
        pUserType: queryObj.pUserType,
        pPassword: queryObj.pPassword,
        pSessionId: queryObj.pSessionId,
        pClientIp: queryObj.pClientIp,
        pRoomId: queryObj.pRoomId,
        pLang: queryObj.pLang,
        isMain: queryObj.isMain,
        siteName: queryObj.siteName,
        casinoID: queryObj.casinoID,
        countryCode: queryObj.countryCode,
        iLoginTypeID: queryObj.iLoginTypeID,
        iParentSID: queryObj.iParentSID
    }

    if(_args.isMain == true || _args.isMain =="true")
    {

        for( var i = 0; i < socket_arr.length; i++)
        {
            if(socket_arr[i].args.pUserid != null && socket_arr[i].args.pPassword != null
            && socket_arr[i].args.pUserid.toUpperCase() == _args.pUserid.toUpperCase()
            && socket_arr[i].args.pPassword.toUpperCase() == _args.pPassword.toUpperCase()
            && (socket_arr[i].args.isMain == true || socket_arr[i].args.isMain == "true"))
            {
                socket_arr[i].emit('logMeOut','RepeatedLogin');
                socket_arr[i].disconnect();
            }

        }
    }

    console.log("userLogin ");
    showObject(_args);
    myClient.UserLogin(_args, function (err, result) {
        if(err)
        {
            console.log("ERR UserLogin:"+err.message);
            socket.emit('logMeOut','LoginFail');
            socket.disconnect();
        } else
        {
            console.log("RESULT UserLogin :"+result.UserLoginResult);
            var result = result.UserLoginResult;
            if( result.substr(POS_SUCCESS_BIT,LEN_SUCCESS_BIT) == SUCCESS )
            {
                var sessionArr = result.substr(1, result.length - 1).split("@");

                socket.args = _args;
                socket.args.pSessionId = sessionArr[0];
                socket.args.iParentSID = sessionArr[1];
                socket.args.pUserid = sessionArr[2];
                socket.args.pNickName = sessionArr[3];

                socket_arr.push(socket);

                console.log("There have "+socket_arr.length+" user connect to Lobby");

                if(socket.args.pUserType == "MEMBER")
                {
                    socket.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID+"@"+socket.args.pUserid+"@"+socket.args.pNickName);
                } else if(socket.args.pUserType == "DEALER")
                {
                    socket.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID);
                }

            } else {
                socket.emit('logMeOut',result.substr(POS_SUCCESS_BIT + 1, result.length));
                socket.disconnect();
            }
        }

        //socketLobby.emit('setSessionToken',result);
    });

    socket.on('getPersonInfo',function(pSessionToken){
        console.log("getPersonInfo :"+pSessionToken);
        var _args = {
            _pSessionToken : pSessionToken
            }
        myClient.MemberBetInfo(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getPersonInfo :"+err.message);
            } else {
                console.log("RESULT getPersonInfo :"+showObject(result));
            }
        });
    });

    socket.on('getExpired',function(pUserId,pSessionToken){
        console.log("getExpired :"+pUserId+" &&& "+pSessionToken);
        var _args = {
            _pUserId : pUserId
            }
        myClient.MemberBetInfo(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getExpired :"+err.message);
            } else {
                console.log("RESULT getExpired :"+showObject(result));
            }
        });
    });

    socket.on('disconnect', function () {
        removeASocket(socket);
        socket.disconnect();
        console.log("Lobby on disconnect Server");
        console.log("There have "+socket_arr.length+" user connect to Lobby");
    });
    socket.on('disconnecting', function () {
        console.log("Lobby on disconnecting Server");
    });
    socket.on('letServerDisConnect', function () {
        console.log("Server call disconnect ");
        socket.disconnect();
    });
});

var socketGame = io.of('/game').on('connection', function (socket) {
    console.log("=================== Connect success GAME ! ===================");


    socket.on('disconnect', function () {
        console.log("Game on disconnect Server");
    });
    socket.on('disconnecting', function () {
        console.log("Game on disconnecting Server");
    });
});

/* --------------------------------------------- my Functions ------------------------------------------------------ */

function showObject(obj)
{
    console.log("{");
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            var val = obj[key];
            console.log(key+":"+val);
        }
    }
    console.log("}");
}

function removeASocket(_socket)
{
    for(var i=0;i < socket_arr.length;i++)
    {
        if(_socket.args.pSessionId == socket_arr[i].args.pSessionId)
        {
            socket_arr.splice(i,1);
        }
    }
}

console.log("Listening on port " + port);