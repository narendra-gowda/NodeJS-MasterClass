
//Dependencies
var server = require('./lib/server');
// var workers = require('./lib/workers');

//Declare the app
var app = {};

//Init function
app.init = function(){
  //start the server
  server.init();

  //start the worker
  // workers.init();
}

//Execute the app
app.init();

//Export the app
module.exports = app;