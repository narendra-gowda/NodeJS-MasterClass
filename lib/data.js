/*
* This contains functions to create and edit data
*
*/

//Dependencies
var fs = require('fs');
var path = require('path');

//Container
var lib = {};

//Function to create a file
lib.baseDir = path.join(__dirname,'/../.data/');

lib.create = function(dir, file, data, callback){
    //Open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDirectory){
        if(!err && fileDirectory){
            //Convert the data from JSON obj to string
            var stringData = JSON.stringify(data)

            //write the data into the file
            fs.writeFile(fileDirectory,stringData,function(err){
                if(!err){
                    fs.close(fileDirectory,function(err){
                        if(!err){
                            callback(false)
                        } else {
                            callback('Error closing the file')
                        }
                    })
                } else {
                    callback('Error writing data into file')
                }
            })
        } else {
            callback('Could not create a new file, it may already exist')
        }
    })
};

//Reading data from file
lib.read = function(dir,file,callback){
    fs.readFile(lib.baseDir + dir +'/'+ file +'.json', 'utf8', function(err, data){
        callback(err,data)
    });
};

//Updating a file
lib.update = function(dir,file,data,callback){
    //Open the file
    fs.open(lib.baseDir + dir +'/'+ file +'.json', 'r+', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            //Convert the data from JSON obj to string
            var stringData = JSON.stringify(data)

            //Truncating the file as to not write on top of existing data
            fs.ftruncate(fileDescriptor, function(err){
                if(!err){
                    fs.writeFile(fileDescriptor, stringData, function(err){
                        if(!err){
                            fs.close(fileDescriptor, function(err){
                                if(!err){
                                    callback(false)
                                } else {
                                    callback('Error closing existing file')
                                }
                            })
                        } else {
                            callback('Error writing to existing file')
                        }
                    })
                } else {
                    callback('Error truncating the existing file')
                }
            })
        } else {
            callback('Could not open requested file, it might not exist!')
        }
    })
}

//Deleting file by unlinking it
lib.delete = function(dir,file,callback){
    fs.unlink(lib.baseDir + dir + '/' + file +'.json', function(err){
        if(!err){
            callback(false)
        } else {
            callback('Error deleting the file')
        }
    })
}




//Exporting the module
module.exports = lib;