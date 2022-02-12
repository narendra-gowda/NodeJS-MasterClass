/*
* Contains all server operations
*
*/

//importing dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var _data = require('./data');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

//Testing the create FS
// _data.create('test','newFile',{name: 'Narendra'},function(err){
//   console.log('Error received: ',err);
// })

//Testing Twilio
// helpers.sendTwilioSms('9980636388', 'Hello Naren', function(err){
//   console.log('This was the error: ', err)
// })

//Create a server module object
var server = {};


//Instantiating HTTP server
server.httpServer = http.createServer(function(req, res){
  server.unifiedServer(req, res);
});



//Instantiating HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem')),
}
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
  server.unifiedServer(req, res);
});



//A generic function that applies generic features to both servers
server.unifiedServer = function(req, res) {

  //Parse the URL received from the request
  let parsedUrl = url.parse(req.url,true);

  //Extracting the path from the parsed data
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/|\/$/g, '');

  //Get http method requested
  let method = req.method;

  //Get query string
  let queryObject = parsedUrl.query

  //Get headers
  let headers = req.headers;

  //Instantiate a decode from stringDecoder
  let decoder = new StringDecoder('utf-8');
  let buffer = ''
  req.on('data', function(data){
    buffer += decoder.write(data);
  });
  req.on('end', function(){
    buffer += decoder.end();
    console.log('Requested payload: '+buffer);

    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    var data = {
      trimmedPath: trimmedPath,
      method: method,
      queryObject: queryObject,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer),
    }

    chosenHandler(data, function(statusCode, payload){
      //Checking if statusCode is passed, if passed it remains same else default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200

      //Checking if payload is passed, if passed it remains same else default to empty object
      payload = typeof(payload) === 'object' ? payload : {}

      //Converting object to string
      var payloadString = JSON.stringify(payload);

      //Respond to request and the following must be in this order to work
      res.setHeader('Content-Type','application/json');
      res.writeHead(statusCode);
      res.end(payloadString);
  
      //Log the requested path
      console.log('Requested path from URL: '+trimmedPath+ ' with method: '+method + ' and with query: ', queryObject);
      console.log('Returning response: ', statusCode, payloadString)
      // console.log({req});
      console.log('Headers: ',headers)

    });
  });
};

//define router
server.router = {
  'sample': handlers.sample,
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
}

//Server init function that starts the servers
server.init = function() {
    //Starts HTTP server
    //The server should listen on a httpport 
    server.httpServer.listen(config.httpPort, function(){
    console.log('The server is listening on port '+config.httpPort+' in '+config.envName+' environment now');
  });

  //Starts HTTPS server
  //The server should listen on a httpsport
    server.httpsServer.listen(config.httpsPort, function(){
    console.log('The server is listening on port '+config.httpsPort+' in '+config.envName+' environment now');
  });
}

//Export the server
module.exports = server;