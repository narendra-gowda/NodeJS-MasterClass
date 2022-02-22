/*
 * library to create logs in the file system
*/

//Dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

//Container for logs
var lib = {};

//Base directory of the logs folder
lib.baseDir = path.join(__dirname, '../.log/');

//Append a string to a file. Create a file if it doesn't exist
lib.append = function(fileName, logString, callback){
    //open the file for appending
    fs.open(lib.baseDir + fileName + '.log', 'a', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            fs.appendFile(fileDescriptor, logString + '\n', function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false);
                        } else {
                            callback('Error closing the file that was being appended')
                        }
                    })
                } else {
                    callback('Error appending string to file')
                }
            })
        } else {
            callback('Error could not open file for appending')
        }
    })
}

//List all the logs and optionally include compressed logs
lib.list = function(includeCompressedLogs, callback){
    fs.readdir(lib.baseDir, function(err, data){
        if(!err && data && data.length > 0){
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                //Add the .log files
                if(fileName.indexOf('.log') > -1){ // debugg this
                    trimmedFileNames.push(fileName.replace('.log', ''));
                } 

                //Add .gz files
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data)
        }
    });
};

//Compress the contents of .log file into a .gz.b64 within the same directory
lib.compress = function(logId, newFileId, callback){
    var sourceFile = logId + '.log';
    var destFile = newFileId + '.gz.b64';

    //Read the source file
    fs.readFile(lib.baseDir + sourceFile, 'utf8', function(err, inputString){
        if(!err && inputString){
            //compress the data using zlib's gzip
            zlib.gzip(inputString, function(err, buffer){
                if(!err && buffer){
                    //Send the data to destination file
                    fs.open(lib.baseDir + destFile, 'wx', function(err, fileDescriptor){
                        if(!err && fileDescriptor){
                            //Write to destination file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err){
                                if(!err){
                                    //Close the destination file
                                    fs.close(fileDescriptor, function(err){
                                        if(!err){
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
};

//Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback){
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8', function(err, str){
        if(!err && str){
            //Decompress the data
            var inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer){
                if(!err && outputBuffer){
                    //convert to string
                    var str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
}

//Truncate log file
lib.truncate = function(logId, callback){
    fs.truncate(lib.baseDir + logId + '.log', 0, function(err){
        if(!err){
            callback(false);
        } else {
            callback(err);
        }
    })
};




//Export the module
module.exports = lib