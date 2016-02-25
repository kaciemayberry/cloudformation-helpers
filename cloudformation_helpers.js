var AWS = require('aws-sdk');
var Promise = require('bluebird');
var apiGateway = Promise.promisifyAll(new AWS.APIGateway()),
    response = require('./lib/cfn-response');

exports.apiGatewayCreateRestApi = function(event, context) {
  var p = event.ResourceProperties;
  if (event.RequestType == 'Delete') {
    // TODO: deleteRestApi here
    response.send(event, context, response.SUCCESS);
  } else {
    apiGateway.createRestApiAsync({
      name: p.name,
      cloneFrom: p.cloneFrom,
      description: p.description
    })
    .then(function(data) {
      response.send(event, context, response.SUCCESS, { "data": data });
    })
    .catch(function(err) {
      error(err, event, context);
    });
  }
}

function error(message, event, context) {
  console.error(message);
  response.send(event, context, response.FAILED, { Error: message });  
}
