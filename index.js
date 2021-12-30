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
  

    //Respond to request
    res.end('Hello Narendra\n');

    //Log the requested path
    console.log('Requested path from URL: '+trimmedPath+ ' with method: '+method + ' and with query: ', queryObject);
    // console.log({req});
    console.log('Headers: ',headers)
  });

});

//The server should listen on a port
server.listen(8080, function(){
  console.log('The server is listening on port 8080 now');
});