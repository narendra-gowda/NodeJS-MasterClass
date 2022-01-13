/*
* This is the root of the app
*
*/

//importing dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var _data = require('./lib/data');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');

//Testing the create FS
// _data.create('test','newFile',{name: 'Narendra'},function(err){
//   console.log('Error received: ',err);
// })

//Instantiating HTTP server
let httpServer = http.createServer(function(req, res){
  unifiedServer(req, res);
});

//The server should listen on a httpport 
httpServer.listen(config.httpPort, function(){
  console.log('The server is listening on port '+config.httpPort+' in '+config.envName+' environment now');
});

//Instantiating HTTPS server
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem'),
}
let httpsServer = https.createServer(httpsServerOptions, function(req, res){
  unifiedServer(req, res);
});

//The server should listen on a httpsport
httpsServer.listen(config.httpsPort, function(){
  console.log('The server is listening on port '+config.httpsPort+' in '+config.envName+' environment now');
});

//A generic function that applies generic features to both servers
var unifiedServer = function(req, res) {

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

    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
var router = {
  'sample': handlers.sample,
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
}