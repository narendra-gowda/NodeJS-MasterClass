/*
* This is a helper file that provides extra functions
*/

//Dependecies
var crypto = require('crypto');
var config = require('./config');
const querystring = require('querystring');
var https = require('https');

//Container
var helpers = {};

//Function for hashing the password
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hashedPassword = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hashedPassword
    } else {
        return false;
    }
}

//Parse the payload without throwing error
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str)
        return obj
    } catch (e) {
        return {}
    }
}

//Create a token consisting of alphanumerical values
helpers.createRandomString = function(strLength){
    //validate strLength
    var strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
        var str = ''
        for(var i=1; i<=strLength; i++){
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter
        }
        return str
    } else {
        return false
    }
}

//Function to send SMS
helpers.sendTwilioSms = function(phone, msg, callback){
    var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    var msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if(phone && msg){ 
        //configure the request payload to send to Twilio via Post 
        var payload = {
            'MessagingServiceSid': config.twilio.messagingServiceSid,
            'To': '+91'+phone,
            'Body': msg
        };
        //Stringify the payload with queryString instead of JSON
        const param = new URLSearchParams(payload)
        var stringifyPayload = param.toString()
        // var stringifyPayload = querystring.stringify(payload)

        //configure the request details, contains all the details of https
        var requestDetails = {
            'protocol':'https:',
            'hostname':'api.twilio.com',
            'method':'POST',
            'path': '/2010-04-01/Accounts/'+ config.twilio.accountSid +'/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringifyPayload)
            }
        }

        //Instantiate the request object
        var req = https.request(requestDetails, function(res){
            //Grab the status of the sent request
            var status = res.statusCode;

            //callback successfully if the request went through
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned was: ' + status);
            }
        });

        //Bind to an error event so it doesn't get thrown
        req.on('error', function(e){
            callback(e);  //When request emits an event called error
        });

        //Add payload
        req.write(stringifyPayload);

        //End the request
        req.end();   //Ending request means sending off the request. When interpreter reaches this line it sends the req

    } else {
        callback('Given parameters are missing or invalid')
    }
}

module.exports = helpers;