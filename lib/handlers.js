/*
* This file contains handlers of different routes
*
*/

//Dependencies
var config = require('./config');
var _data = require('./data');
var helpers = require('./helpers');

//Container 
var handlers = {};

//define handlers
handlers.sample = function (data, callback) {
  callback(201, {name: 'This is a response for sample page'})
}

handlers.ping = function(data, callback) {
  callback(200)
}

handlers.notFound = function(data, callback){
  callback(404)
}

handlers.users = function(data, callback) {
    //requests must be of the following type
    var acceptableMethods = ['POST','GET','PUT','DELETE'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }
}

handlers._users = {};

//Users - POST
handlers._users.POST = function(data, callback) {
    //Sanity check to make sure all fields are filled
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 10 ? data.payload.phoneNumber.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phoneNumber && password && tosAgreement){
        _data.read('users', phoneNumber, function(err){
            if(err){
                //For security purpose Hashing the password
                var hashedPassword = helpers.hash(password);

                if(hashedPassword) {
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phoneNumber': phoneNumber,
                        'password': hashedPassword,
                        'tosAgreement': tosAgreement,
                    }
                    _data.create('users', phoneNumber, userObject, function(err){
                        if(!err){
                            callback(200,{'Success':`Created a new user for ${phoneNumber}`})
                        } else {
                            callback(500,{'Error':`Could not create a new user for ${phoneNumber}`})
                        }
                    })
                } else {
                    callback(500, {'Error':'Could not encrypt the password'})
                }

            } else {
                callback(400, {'Error':`User with phone number: ${phoneNumber} already exists`})
            }
        })
        
    } else {
        callback(405, {'Error': 'Required fields are missing'})
    }
}

//Users - GET
handlers._users.GET = function(data, callback){
    //Validate phoneNumber
    var phone = typeof(data.queryObject.phone) == 'string' && data.queryObject.phone.trim().length == 10 ? data.queryObject.phone.trim() : false;

    if(phone){
        //Adding authentication mechanism
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        
        //Verify if the tokenId has not expired and belongs to the requester
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){

                //Read the file from users
                _data.read('users', phone, function(err, data){
                    if(!err && data){
                        //Remove password as its secret
                        delete data.password
                        callback(200, data)
                    } else {
                        callback(404, {'Error': 'User does not exist'})
                    }
                })
            } else {
                callback(403, {'Error':'Token is either missing from the header or invalid'})
            }
        })
    } else {
        callback(400, {'Error':'Query parameter is not valid'})
    }
}

//Users - PUT
//required filed - phoneNumber
//optional fileds - firstName, lastName, password (at least one must be present to update)
handlers._users.PUT = function(data, callback){
    //validate required and optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 10 ? data.payload.phoneNumber.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phoneNumber){
        if(firstName || lastName || password){
             //Adding authentication mechanism
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            //Verify if the tokenId has not expired and belongs to the requester
            handlers._tokens.verifyToken(token, phoneNumber, function(tokenIsValid){
                if(tokenIsValid){
                    //Read the file and update it's contents here, if not present send error
                    _data.read('users', phoneNumber, function(err, userData){
                        if(!err && userData){
                            if(firstName){
                                userData.firstName = firstName
                            }
                            if(lastName){
                                userData.lastName = lastName
                            }
                            if(password){
                                userData.password = helpers.hash(password)
                            }
                            //Update the file with modified userData from read function
                            _data.update('users', phoneNumber, userData, function(err){
                                if(!err){
                                    callback(200, {'Success':`File ${phoneNumber} is updated successfully`})
                                } else {
                                    console.log(err);
                                    callback(500, {'Error':`Could not update the file ${phoneNumber}`})
                                }
                            })
                        } else {
                            callback(400, {'Error':`The specified user ${phoneNumber} does not exist`})
                        }
                    })
                } else {
                    callback(403, {'Error':'Token is either missing from the header or invalid'})
                }
            })        
        } else {
            //Error if none of the fields are available to update
            callback(400, {'Error':'One or more fields is requried to update the file'})
        }
    } else {
        //Error if phone number is invalid
        callback(400, {'Error':'Phone number is either invalid or missing'})
    }
}

//Users - Delete
handlers._users.DELETE = function(data, callback){
    //Validate phoneNumber
    var phone = typeof(data.queryObject.phone) == 'string' && data.queryObject.phone.trim().length == 10 ? data.queryObject.phone.trim() : false;
    
    if(phone){
        //Adding authentication mechanism
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
        //Verify if the tokenId has not expired and belongs to the requester
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                _data.read('users', phone, function(err, userData){
                    if(!err && userData){
                        _data.delete('users', phone, function(err){
                            if(!err){
                                callback(200, {'Success':`User ${phone} has been deleted`})
                            } else {
                                callback(500, {'Error':`Could not delete user ${phone}`})
                            }
                        })
                    } else {
                        callback(400, {'Error': `User ${phone} does not exist`})
                    }
                })
            } else {
                callback(403, {'Error':'Token is either missing from the header or invalid'})
            }
        })
    } else {
        callback(400, {'Error': `Query parameter is not valid`})
    }
}

//TOKENS
handlers.tokens = function(data, callback){
    //requests must be of the following type
    var acceptableMethods = ['POST','GET','PUT','DELETE'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}

//Container for sub-tokens
handlers._tokens = {};

//Tokens - POST
handlers._tokens.POST = function(data, callback){
    //required fields - phoneNumber and password
    //Validating phone and password
    var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 10 ? data.payload.phoneNumber.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phoneNumber && password){
        //Read if the user exists
        _data.read('users', phoneNumber, function(err, userData){
            if(!err && userData){
                //compare the password to authenticate user
                var hashedPassword = helpers.hash(password)
                if(userData.password == hashedPassword){
                    //create a tokenID
                    var tokenId = helpers.createRandomString(20)
                    var expires = Date.now() + 1000 * 60 * 60
                    var tokenObject = {
                        'phoneNumber': phoneNumber,
                        'tokenId': tokenId,
                        'expires': expires,
                    }
                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject)
                        } else {
                            callback(500, {'Error':'Unable to create token'})
                        }
                    })
                } else {
                    callback(400, {'Error':'You have entered incorrect password'})
                }
            } else {
                callback(400, {'Error': `User ${phoneNumber} does not exist`})
            }
        })
    } else {
        callback(400, {'Error':'Phone Number or password is not valid'})
    }
}

//Tokens - GET
handlers._tokens.GET = function(data, callback){
    //Validate TokenId query param
    var tokenId = typeof(data.queryObject.tokenId) == 'string' && data.queryObject.tokenId.trim().length == 20 ? data.queryObject.tokenId.trim() : false;

    //Read the file from users
    if(tokenId){
        _data.read('tokens', tokenId, function(err, data){
            if(!err && data){                
                callback(200, data)
            } else {
                callback(404, {'Error': 'token does not exist'})
            }
        })
    } else {
        callback(400, {'Error':'tokenId query parameter is not valid'})
    }
}

//Tokens - PUT
handlers._tokens.PUT = function(data, callback) {
    //validate tokenId and extend params
    var tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(tokenId && extend){
        _data.read('tokens', tokenId, function(err, tokenData){
            if(!err && tokenData){
                //Check if token has not expired yet
                if(tokenData.expires > Date.now()){
                    tokenData.expires = Date.now() + 1000 * 60 * 60
                    //Update the contents in the tokens file
                    _data.update('tokens', tokenId, tokenData, function(err){
                        if(!err){
                            callback(200,{'Success':'Token extended by 1 hour from now'})
                        } else {
                            callback(500,{'Error':'Could not extend the token expiry'})
                        }
                    })
                } else {
                    callback(400,{'Error':'Token has already expired'})
                }

            } else {
                callback(400, {'Error':'Token does not exist'})
            }
        })
    } else {
        callback(400, {'Error':'Update body has missing or invalid fields'})
    }    
}

//Token - Delete
handlers._tokens.DELETE = function(data, callback){
    //Validate phoneNumber
    var tokenId = typeof(data.queryObject.tokenId) == 'string' && data.queryObject.tokenId.trim().length == 20 ? data.queryObject.tokenId.trim() : false;
    
    if(tokenId){
        _data.read('tokens', tokenId, function(err, tokenData){
            if(!err && tokenData){
                _data.delete('tokens', tokenId, function(err){
                    if(!err){
                        callback(200, {'Success':`Token: ${tokenId} has been deleted`})
                    } else {
                        callback(500, {'Error':`Could not delete Token: ${tokenId}`})
                    }
                })
            } else {
                callback(400, {'Error': `Token: ${tokenId} does not exist`})
            }
        })
    } else {
        callback(400, {'Error': `Query parameter is not valid`})
    }
}

//Handler to verify Token of a user
handlers._tokens.verifyToken = function(token, phoneNumber, callback){
    //Lookup the token in directory
    _data.read('tokens', token, function(err, tokenData){
        if(!err && tokenData){
            //Validate if token has not expired and matches the phoneNumber
            if(tokenData.phoneNumber == phoneNumber && tokenData.expires > Date.now()){
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

module.exports = handlers;