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

//---------------USERS------------------
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
//This will delete all the checks associated with that user
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
                                //My logic
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                var checksToDelete = userChecks.length

                                //Proceed if checks array consists of any item
                                if(checksToDelete > 0){
                                    var checksDeleted = 0
                                    var deletionErrors = false

                                    userChecks.forEach(element => {                                           
                                                _data.delete('checks', element, function(err){
                                                    //If error was surfaced
                                                    if(err){
                                                        deletionErrors = true
                                                    }
                                                    checksDeleted++;
                                                    //If no.of iterations match length of the array and no deletionErrors
                                                    if(checksDeleted == checksToDelete){
                                                        if(!deletionErrors){
                                                            callback(200, {'Success':'Deleted all checks',userChecks})
                                                        } else {
                                                            callback(500, {'Error':'Could not delete check: '+element})
                                                        }
                                                    }
                                                })    
                                    });
                                } else {
                                    callback(200, {'Message': `user ${phone} deleted, but there were no checks associated with it to delete`})
                                }
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

//--------------TOKENS----------------
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

//-----------------CHECKS------------------
handlers.checks = function(data, callback){
    //requests must be of the following type
    var acceptableMethods = ['POST','GET','PUT','DELETE'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405)
    }
}

//Container for checks
handlers._checks={};

//Checks - POST
//Require fields: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.POST = function(data, callback){
    //Validate the payload
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var method = typeof(data.payload.method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(protocol && method && url && successCodes && timeoutSeconds){
        //Get the token from the header and use it to identify the user
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        //Look up the .data/tokens to check if token exists
        _data.read('tokens', token, function(err, tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phoneNumber

                //Using this userPhone we will check if phoneNumber exists in the users
                _data.read('users', userPhone, function(err, userData){
                    if(!err && userData){
                        //If checks is available from userData, read it, if not create empty array
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                        //verify user has less than no.of max-checks allowed
                        if(userChecks.length < config.maxChecks){
                            //create random string for check IDs
                            var checkId = helpers.createRandomString(20)

                            //create the check object with users's phone number
                            var checkObject = {
                                'id': checkId,
                                'protocol': protocol,
                                'method': method,
                                'url': url,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds,
                                'userPhone': userPhone
                            }
                            //save the object
                            _data.create('checks', checkId, checkObject, function(err){
                                if(!err){
                                    //Add checkId to user object
                                    userData.checks = userChecks  //creating new property in the retrieved user object
                                    userData.checks.push(checkId)

                                    //Add this checks data into user object by writing into the file
                                    _data.update('users', userPhone, userData, function(err){
                                        if(!err){
                                            //Return the check data
                                            callback(200, checkObject)
                                        } else {
                                            callback(500, {'Error':`Could not update ${userPhone} with new check IDs`})
                                        }
                                    })
                                } else {
                                    callback(500, {'Error':'Could not create new check object'})
                                }
                            })
                        } else {
                            callback(400, {'Error':'User has reached max checks of limit ('+config.maxChecks+')'})
                        }
                    } else {
                        callback(404, {'Error':`User: ${userPhone} does not exist`})
                    }
                })
            } else {
                callback(400, {'Error':'token is invalid or does not exist'})
            }
        })
    } else {
        callback(400,{'Error':'Required fields are missing or invalid'})
    }    
}

//Checks - GET
handlers._checks.GET = function(data, callback){
    //Validate checkId
    var id = typeof(data.queryObject.id) == 'string' && data.queryObject.id.trim().length == 20 ? data.queryObject.id.trim() : false;

    if(id){
        //Look up checks data, if check id passed is valid
        _data.read('checks', id, function(err, checksData){
            if(!err && checksData){
                //Adding authentication mechanism
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        
                //Verify if the tokenId has not expired and belongs to the requester
                handlers._tokens.verifyToken(token, checksData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        callback(200, checksData)
                    } else {
                        callback(403,{'Error':'Token is invalid or expired or missing'})
                    }
                })
            } else {
                callback(400,{'Error':'Could not find checks with ID: '+id})
            }
        })
    } else {
        callback(400, {'Error':'Query parameter is not valid'})
    }
}

//Checks - PUT
handlers._checks.PUT = function(data, callback){
    //Required field: id
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    
    //Optional field: protocol, url, method, successCodes, timeoutSeconds
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var method = typeof(data.payload.method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(id){
        if(protocol || url || method || successCodes || timeoutSeconds){
            //Look up checks data
            _data.read('checks', id, function(err, checkData){
                if(!err && checkData){
                    //Fetch the token and verify it
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                        if(tokenIsValid){
                            //Check if optional fields are passed in and update them in checkData obj
                            if(protocol){
                                checkData.protocol = protocol
                            }
                            if(method){
                                checkData.method = method
                            }
                            if(url){
                                checkData.url = url
                            }
                            if(successCodes){
                                checkData.successCodes = successCodes
                            }
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds
                            }
                            //Update in the files
                            _data.update('checks', id, checkData, function(err){
                                if(!err){
                                    callback(200, {'Success':`Check details updated for ${id}`})
                                } else {
                                    callback(500, {'Error':'Could not update check details of '+id})
                                }
                            })
                        } else {
                            callback(404, {'Error':'Token is missing or expired or invalid'})
                        }
                    })
                } else {
                    callback(404, {'Error': `Check id: ${id} does not exist`})
                }
            })
        } else {
            callback(400, {'Error':'Data fields required for update is missing, at least one should be present'})
        }
    } else {
        callback(400, {'Error':'Check ID passed is missing or invalid'})
    }
}

//Checks - DELETE
handlers._checks.DELETE = function(data, callback){
    //Validate id from query
    var id = typeof(data.queryObject.id) == 'string' && data.queryObject.id.trim().length == 20 ? data.queryObject.id.trim() : false;

    if(id){
        _data.read('checks', id, function(err, checkData){
            if(!err && checkData){
                //Fetch token and validate it
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        //Delete checks
                        _data.delete('checks', id, function(err){
                            if(!err){
                                //Look up that user and delete the id from the checks array
                                _data.read('users', checkData.userPhone, function(err, userData){
                                    if(!err && userData){
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                                        //Perform splice on the array
                                        var checkPosition = userChecks.indexOf(id)
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition, 1)

                                            //Update new array in the user data
                                            _data.update('users', checkData.userPhone, userData, function(err){
                                                if(!err){
                                                    callback(200, {'Success':'Successfully deleted check id: '+id})
                                                } else {
                                                    callback(500, {'Error':'Could not update the checks array'})
                                                }
                                            })
                                        } else {
                                            callback(400, {'Error':'Check id '+id+' does not exist in the Array'})
                                        }
                                    } else {
                                        callback(404, {'Error': `User ${checkData.userPhone} does not exist`})
                                    }
                                })
                            } else {
                                callback(500, {'Error':`Could not delete check ${id}`})
                            }
                        })
                    } else {
                        callback(403, {'Error':'Token is either invalid or missing or expired'})
                    }
                })
            } else {
                callback(400, {'Error': 'Check id '+id+' does not exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Check id missing or invalid'})
    }
}


module.exports = handlers;