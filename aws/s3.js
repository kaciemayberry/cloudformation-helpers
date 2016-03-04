var Promise = require('bluebird'),
    AWS = require('aws-sdk'),
    base = require('lib/base'),
    helpers = require('lib/helpers'),
    s3 = Promise.promisifyAll(new AWS.S3());

// Exposes the SNS.subscribe API method
function PutObject(event, context) {
  base.Handler.call(this, event, context);
}
PutObject.prototype = Object.create(base.Handler.prototype);
PutObject.prototype.handleCreate = function() {
  var p = this.event.ResourceProperties;
  delete p.ServiceToken;
  return s3.putObjectAsync(p);
}
PutObject.prototype.handleDelete = function(referenceData) {
  var p = this.event.ResourceProperties;
  var deleteSubObjects =
    (p.Key.endsWith("/"))
    ? s3.listObjectsAsync({
        Bucket: p.Bucket,
        Prefix: p.Key
      })
      .then(function(subObjects) {
        return Promise
        .map(
          subObjects.Contents,
          function(item) {
            return s3.deleteObjectAsync({
              Bucket: p.Bucket,
              Key: item.Key
            })
          }
        )
      })
    : helpers.futureSuccessful();
  return deleteSubObjects
  .then(function() {
    return s3.deleteObjectAsync({
      Bucket: p.Bucket,
      Key: p.Key
    });
  });
}
exports.putObject = function(event, context) {
  handler = new PutObject(event, context);
  handler.handle();
}
