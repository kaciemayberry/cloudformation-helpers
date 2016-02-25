var Promise = require('bluebird'),
    AWS = require('aws-sdk'),
    base = require('lib/base'),
    dynamoDB = Promise.promisifyAll(new AWS.DynamoDB()),
    s3 = Promise.promisifyAll(new AWS.S3());

// Exposes the SNS.subscribe API method
function PutObject(event, context, functionIdentifier) {
  base.Handler.call(this, event, context, functionIdentifier);
}
PutObject.prototype = Object.create(base.Handler.prototype);
PutObject.prototype.handleCreate = function() {
  var p = this.event.ResourceProperties;
  delete p.ServiceToken;
  return s3.putObjectAsync(p);
}
PutObject.prototype.handleDelete = function(referenceData) {
  var p = this.event.ResourceProperties;
  return s3.deleteObjectAsync({
    Bucket: p.Bucket,
    Key: p.Key
  });
}
exports.putObject = function(event, context) {
  handler = new PutObject(event, context, "S3PutObjectFunction");
  handler.handle();
}
