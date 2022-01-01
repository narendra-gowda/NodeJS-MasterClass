/*
* This is the root of the app
*
*/

//importing dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

//The server should respond with a string when requested
let server = http.createServer(function(req, res){
  //Parse the URL received from the request
  let parsedUrl = url.parse(req.url,true);

  //Extracting the path from the parsed data
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+s/g,'');

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
    }

    chosenHandler(data, function(statusCode, payload){
      //Checking if statusCode is passed, if passed it remains same else default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200

      //Checking if payload is passed, if passed it remains same else default to empty object
      payload = typeof(payload) === 'object' ? payload : {}

      //Converting object to string
      var payloadString = JSON.stringify(payload);

      //Respond to request
      res.writeHead(statusCode);
      res.end(payloadString);
  
      //Log the requested path
      console.log('Requested path from URL: '+trimmedPath+ ' with method: '+method + ' and with query: ', queryObject);
      console.log('Returning response: ', statusCode, payloadString)
      // console.log({req});
      console.log('Headers: ',headers)

    });
  });
});

//The server should listen on a port
server.listen(8080, function(){
  console.log('The server is listening on port 8080 now');
});

var handlers = {}

//define handlers
handlers.sample = function (data, callback) {
  callback(201, {name: 'This is a response for sample page'})
}

handlers.notFound = function(data, callback){
  callback(404)
}

//define router
var router = {
  'sample': handlers.sample
}