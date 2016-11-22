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
var socket_game_arr = new Array();
var myClient;

// load service url
soap.createClient(urlSevice, function (err, client) {
    myClient = client;
});

/* --------------------------------------------- on Lobby ------------------------------------------------------ */
var socketLobby = io.of('/lobby').on('connection', function (socket) {
    console.log("=================== Connect LOBBY ! =================== "+socket.handshake.url);
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

    if(_args.pUserType == "DEALER")
    {
        console.log("=========== Logged in as DEALER ==========");
        var _tmpArgs ={
            pUserId: _args.pUserId,
            pSessionToken: _args.pPassword
        }
        myClient.ValidateToken(_tmpArgs, function (err, result) {
            if(err)
            {
                console.log("ERR ValidateToken :"+err.message);
                //socket.emit('logMeOut','LoginFail');
                socket.disconnect();

            } else
            {
                console.log("RESULT ValidateToken :"+result.ValidateTokenResult);
                var result = result.ValidateTokenResult;
                if (result.substr(POS_SUCCESS_BIT, LEN_SUCCESS_BIT) == SUCCESS) {
                    console.log("LOGIN SUCCESS DEALER TO LOBBY :"+tmpArgs.pTableNo);
                    socket.args = _args;
                    socket_arr.push(socket);
                    console.log("There have "+socket_arr.length+" user connect to Lobby");
                } else {
                    console.log("ValidateToken Fail !");
                    socket.disconnect();
                }
            }
        });
    } else if(_args.pUserType == "MEMBER"){
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
                        socket.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID+"@"+socket.args.pUserid+"@"+socket.args.pNickName);// this only
                        //socketLobby.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID+"@"+socket.args.pUserid+"@"+socket.args.pNickName);// send all
                        //socket.broadcast.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID+"@"+socket.args.pUserid+"@"+socket.args.pNickName); // send all except this
                    }

                } else {
                    socket.emit('logMeOut',result.substr(POS_SUCCESS_BIT + 1, result.length));
                    socket.disconnect();
                }
            }

            //socketLobby.emit('setSessionToken',result);
        });
    }

    socket.on('getPersonInfo',function(_pSessionToken){
        console.log("getPersonInfo :"+_pSessionToken);
        var _args = {
            pSessionToken : _pSessionToken
            }
        myClient.MemberBetInfo(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getPersonInfo :"+err.message);
            } else {
                //console.log("RESULT getPersonInfo :"+Object.keys(result));
                console.log("RESULT getPersonInfo :"+result.MemberBetInfoResult);
            }
        });
    });


    socket.on('getExpired',function(_pUserId,_pSessionToken){
        console.log("getExpired :"+_pUserId+" &&& "+_pSessionToken);
        var _args = {
            userID: _pUserId
            }
        myClient.IsNoneLogOutUser(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getExpired :"+err.message);
            } else {
                console.log("RESULT getExpired :"+result.IsNoneLogOutUserResult);
            }
        });
    });

    socket.on('getAccInfoByUserN',function(_pSessionToken,_pUserId){
        console.log("getAccInfoByUserN :"+_pUserId+" &&& "+_pSessionToken);
        var _args = {
            pSessionToken: _pSessionToken
        }
        myClient.getAccInfoByUserN(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getAccInfoByUserN :"+err.message);
            } else {
                //console.log("RESULT getAccInfoByUserN :"+Object.keys(result));
                console.log("RESULT getAccInfoByUserN :"+result.getAccInfoByUserNResult);
            }
        });
    });

    socket.on('getExchange',function(_pSessionToken,_pUserId){
        console.log("getExchange :"+_pUserId+" &&& "+_pSessionToken);
        var _args = {
            pSessionToken: _pSessionToken
        }
        myClient.getExchangeRate(_args, function (err, result) {
            if(err)
            {
                console.log("ERR getExchange :"+err.message);
            } else {
                //console.log("RESULT getExchange :"+Object.keys(result));
                console.log("RESULT getExchange :"+result.getExchangeRateResult);
            }
        });
    });


    socket.on('disconnect', function () {
        removeASocket(socket,socket_arr);
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

/* --------------------------------------------- on Game ------------------------------------------------------ */

var socketGame = io.of('/game').on('connection', function (socket) {
    console.log("=================== Connect GAME ! =================== "+socket.handshake.url);

    var queryObj = url.parse(socket.handshake.url,true).query;
    var tmpArgs = {
        pTableNo: queryObj.pTableNo,
        pUserType: queryObj.pUserType,
        pUserId: queryObj.pUserId,
        pSessionId: queryObj.pSessionId,
        memberBetLtdSeq: queryObj.memberBetLtdSeq,
        pCasinoId: queryObj.casinoID,
        pCountryCode: queryObj.CountryCode,
        pLang: queryObj.pLang
    }
    showObject(tmpArgs);

    if(tmpArgs.pUserType == "DEALER")
    {
        console.log("=========== Logged in as DEALER ==========");
        var _args ={
            pUserid: tmpArgs.pUserid,
            pUserType: tmpArgs.pUserType,
            pPassword: tmpArgs.pSessionId,// if Dealer this is password that dealer input
            pSessionId: "0",
            pClientIp: "",
            pRoomId: tmpArgs.pTableNo,
            pLang: tmpArgs.pLang,
            isMain: "NA",
            siteName: "local",
            casinoID: tmpArgs.casinoID,
            countryCode: tmpArgs.pCountryCode,
            iLoginTypeID: 1,
            iParentSID: 0
        }
        myClient.UserLogin(_args, function (err, result) {
            if(err)
            {
                console.log("ERR UserLogin :"+err.message);
                //socket.emit('logMeOut','LoginFail');
                socket.disconnect();

            } else
            {
                console.log("RESULT UserLogin :"+result.UserLoginResult);
                var result = result.UserLoginResult;
                if (result.substr(POS_SUCCESS_BIT, LEN_SUCCESS_BIT) == SUCCESS) {
                    console.log("LOGIN SUCCESS DEALER TO GAME ID :"+tmpArgs.pTableNo);

                    var sessionArr = result.substr(1, result.length - 1).split("@");

                    socket.args = _args;
                    socket.args.pSessionId = sessionArr[0];
                    socket.args.iParentSID = sessionArr[1];
                    socket.args.pUserid = sessionArr[2];
                    socket.args.pNickName = sessionArr[3];
                    socket.args.pTableNo = tmpArgs.pTableNo;

                    socket_game_arr.push(socket);
                    socket.join(socket.args.pTableNo);

                    socket.emit('setSessionToken',socket.args.pSessionId+"@"+socket.args.iParentSID);

                    Dealer_TableStatus(socket);
                    Dealer_GetBetStatus(socket);

                } else {
                    console.log("UserLogin Dealer Fail !");
                    socket.disconnect();
                }
            }
        });
    } else if(tmpArgs.pUserType == "MEMBER"){
        console.log("=========== Logged in as MEMBER ==========");
        var _args ={
            pUserId: tmpArgs.pUserId,
            pSessionToken: tmpArgs.pSessionId,
            pTableNo:tmpArgs.pTableNo,
            pBetLtdSeq:tmpArgs.memberBetLtdSeq

        }
        showObject(_args);
        myClient.CurrTableSet(_args, function (err, result) {
            if(err)
            {
                console.log("ERR CurrTableSet :"+err.message);
                socket.emit('logMeOut','LoginFail');
                socket.disconnect();
            } else {
                //console.log("RESULT getExchange :"+Object.keys(result));
                console.log("RESULT CurrTableSet :"+result.CurrTableSetResult);
                var result = result.CurrTableSetResult;
                if( result.substr(POS_SUCCESS_BIT,LEN_SUCCESS_BIT) == SUCCESS )
                {
                    console.log("LOGIN SUCCESS GAME ID :"+_args.pTableNo);
                    socket.args = tmpArgs;
                    socket_game_arr.push(socket);
                    socket.join(socket.args.pTableNo);

                    socket.emit('confirmedConnection','0');

                    //socket.emit('setTableLimit',result);
                    socket.in(socket.args.pTableNo).broadcast.emit('setTableLimit',result);

                    console.log("There have "+socket_game_arr.length+" user connect to Game");

                } else {
                    console.log("CurrTableSet Fail !");
                    socket.emit('logMeOut','LoginFail');
                    socket.disconnect();
                }
            }
        });
    }


    socket.on('disconnect', function () {
        removeASocket(socket,socket_game_arr);
        socket.leave(socket.args.pTableNo);
        socket.disconnect();
        console.log("Game on disconnect Server");
        console.log("There have "+socket_game_arr.length+" user connect to Game");
    });
    socket.on('disconnecting', function () {
        console.log("Game on disconnecting Server");
    });
});

/* --------------------------------------------- my Functions ------------------------------------------------------ */

function showObject(_obj)
{
    console.log("{");
    for (var key in _obj) {
        if (Object.prototype.hasOwnProperty.call(_obj, key)) {
            var val = _obj[key];
            console.log(key+":"+val);
        }
    }
    console.log("}");
}

function removeASocket(_socket,_socket_arr)
{
    if(_socket.args != undefined) {
        for (var i = 0; i < _socket_arr.length; i++) {
            if (_socket.args.pSessionId == _socket_arr[i].args.pSessionId) {
                console.log("REMOVE SOCKET _socket :" + _socket.args.pSessionId + " socket_arr " + _socket_arr[i].args.pSessionId)
                _socket_arr.splice(i, 1);
            }
        }
    }
}

function Dealer_TableStatus(_socket)
{

    var _args ={
        pTableNo:_socket.args.pTableNo
    }

    myClient.TableStatus(_args, function (err, result) {
        if(err){
            console.log("ERR TableStatus :"+err.message);
        } else {
            var result = result.TableStatusResult;
            _socket.emit('initTableStatus',result);
            console.log("Result TableStatus :"+result);
        }
    });
}

function Dealer_GetBetStatus(_socket)
{
    var _args ={
        pSessionToken:_socket.args.pSessionId,
        pTableNo:_socket.args.pTableNo
    }
    myClient.BetStatus(_args, function (err, result) {
        if(err){
            console.log("ERR BetStatus :"+err.message);
        } else {
            var result = result.BetStatusResult;
            if (result.substr(POS_SUCCESS_BIT, LEN_SUCCESS_BIT) == SUCCESS) {
                _socket.broadcast.emit('showResult', result, _socket.args.pTableNo);

                console.log("Result BetStatus :"+result);

                // REFRESH THE BETSTATUS
                var POS_GAME_SET = 21;
                var LEN_GAME_SET = 4;
                var POS_GAME_NO = 25;
                var LEN_GAME_NO = 5;
                Client_GetCurrentPool( _socket, _socket.args.pSessionId, parseInt(result.substr( POS_GAME_SET, LEN_GAME_SET ), 10), parseInt(result.substr( POS_GAME_NO, LEN_GAME_NO ), 10));
            }
        }
    });
}

function Client_GetCurrentPool(_pSocket, _pSessionId, _pGameSet, _pGameNo) {
    if(_pSocket.args.pTableNo != 0)
    {
        var _args ={
            pSessionToken:_pSessionId,
            pTableNo:_socket.args.pTableNo,
            pGameSet:_pGameSet,
            pGameNo:_pGameNo
        }
        myClient.TableBetPool(_args, function (err, result) {
            if(err){
                console.log("ERR TableBetPool :"+err.message);
            } else {
                var result = result.TableBetPoolResult;
                _socket.emit('currentBetPool',result);
                console.log("Result TableBetPool :"+result);
            }
        });
    }
}

console.log("Listening on port " + port);