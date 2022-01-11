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

module.exports = helpers;