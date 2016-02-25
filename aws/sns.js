var Promise = require('bluebird'),
    AWS = require('aws-sdk'),
    base = require('lib/base'),
    sns = Promise.promisifyAll(new AWS.SNS());

// Exposes the SNS.subscribe API method
function Subscribe(event, context, functionIdentifier) {
  base.Handler.call(this, event, context, functionIdentifier);
}
Subscribe.prototype = Object.create(base.Handler.prototype);
Subscribe.prototype.handleCreate = function() {
  var p = this.event.ResourceProperties;
  return sns.subscribeAsync({
    Endpoint: p.Endpoint,
    Protocol: p.Protocol,
    TopicArn: p.TopicArn
  });
}
Subscribe.prototype.handleDelete = function(referenceData) {
  if (referenceData) {
    return sns.unsubscribeAsync({
      SubscriptionArn: referenceData.SubscriptionArn
    });
  } else {
    return Promise.try(function() {});
  }
}
exports.subscribe = function(event, context) {
  handler = new Subscribe(event, context, "SnsSubscribeFunction");
  handler.handle();
}
