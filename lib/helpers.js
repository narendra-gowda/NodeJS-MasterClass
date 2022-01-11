/*
* This is a helper file that provides extra functions
*/

//Dependecies
var crypto = require('crypto');
var config = require('./config');

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

module.exports = helpers;