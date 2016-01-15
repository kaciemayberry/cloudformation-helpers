var AWS = require('aws-sdk');
var dynamoDB = new AWS.DynamoDB(),
    response = require('./lib/cfn-response'),
    s3 = new AWS.S3(),
    sns = new AWS.SNS();

exports.dynamoDBPutItems = function(event, context) {
  var p = event.ResourceProperties;
  if (event.RequestType == 'Delete') {
    response.send(event, context, response.SUCCESS);
    return;
  }

  if (!Array.isArray(p.Items)) {
    error("Must specify a list of items to insert.", event, context);
  } else if (!p.TableName) {
    error("Must specify a table to insert into.", event, context);
  } else {
    putItems(p.Items, p.TableName, event, context, []);
  }
}

// Puts an object into S3.
exports.s3PutObject = function(event, context) {
  var p = event.ResourceProperties;
  if (event.RequestType == 'Delete') {
    s3.deleteObject({
      Bucket: p.Bucket,
      Key: p.Key,
      RequestPayer: p.RequestPayer
    }, function(err, data) {
      if (err) {
        error(err, event, context);
      } else {
        response.send(event, context, response.SUCCESS);
      }
    });
    return;
  }

  delete p.ServiceToken;
  s3.putObject(p, function(err, data) {
    if (err) {
      error(err, event, context);
    } else {
      response.send(event, context, response.SUCCESS, { "data": data });
    }
  });
}

// Exposes the SNS.subscribe API method
exports.snsSubscribe = function(event, context) {
  const allowedProtocols = ['application', 'email', 'email-json', 'http', 'https', 'lambda', 'sms', 'sqs'];
  var p = event.ResourceProperties;
  if (event.RequestType == 'Delete') {
    // TODO: Would be nice to delete the subscription here, which likely requires persisting the
    // SubscriptionArn for later lookup.
    response.send(event, context, response.SUCCESS);
    return;
  }

  if (!p.TopicArn) {
    error("Must specify a TopicArn to subscribe to.", event, context);
  } else if (!p.Endpoint) {
    error("Must specify an Endpoint that receives messages.", event, context);
  } else if (allowedProtocols.indexOf(p.Protocol) < 0) {
    error("Must speficy one of these supported protocols: " + allowedProtocols, event, context);
  } else {
    sns.subscribe({
      Endpoint: p.Endpoint,
      Protocol: p.Protocol,
      TopicArn: p.TopicArn
    }, function(err, data) {
      if (err) {
        error(err, event, context);
      } else {
        response.send(event, context, response.SUCCESS, { "SubscriptionArn": data.SubscriptionArn });
      }
    });
  }
}

// Puts items into DynamoDB, iterating over the list recursively.
function putItems(items, tableName, event, context, itemsInserted) {
  if(items.length > 0){
    var item = items.pop();
    console.log('Putting item [' + item.key + '] into DB [' + tableName + ']');
    dynamoDB.putItem(
      {
        TableName: tableName,
        Item: formatForDynamo(item, true)
      },
      function(err,data) {
        if (err) {
          error(err, event, context);
        } else {
          itemsInserted.push(item.key);
          putItems(items, tableName, event, context, itemsInserted);
        }
      }
    );
  } else {
    response.send(event, context, response.SUCCESS, { "ItemsInserted": itemsInserted });
  }
}

// Translates from raw JSON into DynamoDB-formatted JSON. This is more than a
// convenience thing: the original iteration of this accepted DyanamoDB-JSON Items,
// to avoid complications in translation. But when CloudFormation passes the parameters
// throught the event model, all non-string values get wrapped in quotes. For Booleans
// specifically, this is a problem - because DynamoDB does not allow a string (even if
// it is 'true' or 'false') as a 'BOOL' value. So some translation was needed, and
// it seemed best to then simplify things for the client by accepting raw JSON.
function formatForDynamo(value, topLevel) {
  var result = undefined;
  if (value == 'true' || value == 'false') {
    result = {'BOOL': value == 'true'}
  } else if (!isNaN(value) && value.trim() != '') {
    result = {'N': value}
  } else if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      arr.push(formatForDynamo(value[i], false));
    }
    result = {'L': arr};
  } else if (typeof value  === "object") {
    var map = {};
    Object.keys(value).forEach(function(key) {
      map[key] = formatForDynamo(value[key], false)
    });
    if (topLevel) result = map;
    else result = {'M': map}
  } else {
    result = {'S': value}
  }
  return result;
}

function error(message, event, context) {
  console.error(message);
  response.send(event, context, response.FAILED, { Error: message });  
}
