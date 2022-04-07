/*
*  Background workers
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var url = require('url');
var path = require('path');
var http = require('http');
var https = require('https');
var _data = require('./data');
var helper = require('./helpers');
var _log = require('./log');
var util = require('util');
var debug = util.debuglog('workers');

//Container for workers
var workers = {};

//Look up all checks, get their data, send to a validator
workers.gatherAllChecks = function(){
    //get all checks
    _data.list('checks', function(err, checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(check => {
                _data.read('checks', check, function(err, originalCheckData){
                    if(!err && originalCheckData){
                        //Pass it to the check validator, and let that function continue or log error as needed
                        workers.validateCheckData(originalCheckData)
                    } else {
                        debug('Error reading one of the checks data')
                    }
                });
            });
        } else {
            debug('Error: Could not find any checks to process')
        }
    });
};

//Sanity check the check data
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    //Set the keys that may not be set if workers have never seen this check before
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // debug(originalCheckData)
    //if all the checks pass, pass it to the next step
    if(
        originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ){  
        workers.performCheck(originalCheckData);
    } else {
        debug('Error: one of the checks is not properly formatted, skipping it')
    }
};

//Perform the check, send the originalCheckData and the outcome of the check process
workers.performCheck = function(originalCheckData){
    //prepare the initial check outcome
    var checkOutcome = {
        'error' : false,
        'responseCode' : false
    };

    //Mark that the outcome has not been sent yet
    var outcomeSent = false;

    //Parse the hostname and the path out of the originalCheckData
    var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; //We are choosing path instead of pathname because we want queryString

    //Construct the request
    var requestDetails = {
        'protocol' : originalCheckData.protocol + ':',
        'hostname' : hostName,
        'method' : originalCheckData.method,
        'path' : path,
        'timeout' : originalCheckData.timeoutSeconds * 1000
    };

    //Instantiate the request object either http or https modules
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res){
        //Grab the status of the sent request
        var status = res.statusCode;

        //update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }        
    });

    //Bind to the error event so that it doesn't get thrown and this will pass params to processCheckOutcome if outcomeSent is false
    req.on('error', function(e){
        //update checkOutcome and pass data along
        checkOutcome.error = {
            'error' : true,
            'value' : e
        };
        
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        };
    });

    //Bind to the timeout event, when time exceeds the limit user has mentioned this will catch timeout err
    req.on('timeout', function(e){
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout'
        };

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        };
    });

    //The above conditions will catch error or timeout or status and send it to processCheckOutcome()

    //End the request, this will send the req
    req.end();
};

//Process the checkOutcome, update the checkData as needed and trigger an alert to the user
//Special logic for accomodating a check that has never been tested before.
workers.processCheckOutcome = function(originalCheckData, checkOutcome){
    //decide if the check is considered up or down
    var state = !checkOutcome.error && 
                checkOutcome.responseCode && 
                originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ?
                'up' : 'down';

    //decide if alert is warranted    
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;
    
    var timeOfCheck = Date.now();

    //update the check in the DB
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    console.log(checkOutcome) //--------------
    console.log(newCheckData)

    //Logging data to file
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    //Save the update
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            //send the new check data to the next step
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug('Check outcome has not changed, no alert needed');
            }
        } else { 
            debug('Error trying to save updates to one of the checks');
        }
    })
};

//Function to create log files and update them
workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
    //Create a log data
    var logData = {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' : alertWarranted,
        'time' : timeOfCheck
    };
    //Covert the data to string
    var logString = JSON.stringify(logData);

    //File name under which log files should be created
    var fileName = originalCheckData.id;

    _log.append(fileName, logString, function(err){
        if(!err){
            debug('Logging to file success');
        } else {
            debug('Logging to file failed')
        }
    });
};

//Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+ newCheckData.method +' '+ newCheckData.protocol +'://'+ newCheckData.url + ' is currenly '+ newCheckData.state;
    helper.sendTwilioSms(newCheckData.userPhone, msg, function(err){
        if(!err){
            debug('Success: User was alerted for thier check with msg', msg);
        } else {
            debug('Error: Could not send sms alert to user for thier check to '+newCheckData.url);
        }
    })
};

//Rotate (compress) the log files
workers.rotateLogs = function(){
    //list all the non-compressed log files
    _log.list(false, function(err, logs){
        if(!err && logs && logs.length > 0){
            logs.forEach(function(logName){
                //compress the data to a different file
                var logId = logName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();
                _log.compress(logId, newFileId, function(err){
                    if(!err){
                        //Delete the log after compressing
                        _log.truncate(logId, function(err){
                            if(!err){
                                debug('Success truncating the logFile: ', logId);
                            } else {
                                debug('Error truncating the logFile: ', logId);
                            }
                        })
                    } else {
                        debug('Error compressing one of the logs', err);
                    }
                })
            })
        } else {
            debug('Error listing log files from the folder');
        }
    });
}



//Timer to execute the worker process once per minute
workers.loop = function (){
    setInterval(function(){
        workers.gatherAllChecks()
    }, 1000 * 60)
};

//Timer to execute the log-rotation process once a day
workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs()
    }, 1000 * 60 * 60 * 24);
    // }, 1000 * 60 * 5);

};

//Init script
workers.init = function(){
    //Console logging
    console.log('\x1b[33m%s\x1b[0m','Background worker is running')

    //Execute all the checks immediately
    workers.gatherAllChecks();

    //Call the loop so checks will execute later on
    workers.loop();

    //Compress all the logs immediately
    workers.rotateLogs();

    //Call the compression loop so lofs will be compressed once in 24 hrs
    workers.logRotationLoop();
};

//Exporting workers to other files
module.exports = workers;