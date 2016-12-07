var AWS = require('aws-sdk'),
    base = require('lib/base');

// Exposes the SNS.subscribe API method
function Create(event, context) {
    base.Handler.call(this, event, context);
}
Create.prototype = Object.create(base.Handler.prototype);
Create.prototype.handleCreate = function () {
    var p = this.event.ResourceProperties;
    delete p.ServiceToken;
    return buildConfig(
        p.Prefix,
        p.S3Bucket,
        p.Endpoints
    ).then(function(data) {
        console.log("Config Successfully retrieved, returning data");
        return {
            data : data 
        };
    });
}
Create.prototype.handleDelete = function (referenceData) {
    return true;
}
exports.create = function (event, context) {
    handler = new Create(event, context);
    handler.handle();
}

buildConfig = function (pre, s3bucket, endpoints) {
    var eVars = {
        DYNAMO_ENDPOINT: "AWS_DYNAMODB_ENDPOINT",
        S3_ENDPOINT: "AWS_S3_ENDPOINT",
        KINESIS_ENDPOINT: "AWS_KINESIS_ENDPOINT",
        LAMBDA_ENDPOINT: "AWS_LAMBDA_ENDPOINT"
    };

    var envPrefix = "";
    if (pre) envPrefix = pre + "_";

    var cfg = {
        cache: {
            endpoint: {
                host: endpoints.cache.host,
                port: endpoints.cache.port
            }
        },
        dynamodb: {
            endpoint: {},
            defaultReadCapacity: 1,
            defaultWriteCapacity: 1
        },
        kinesis: {
            endpoint: {},
            defaultShardCount: 1
        },
        s3: {
            endpoint: {},
            bucketName: s3bucket
        },
        lambda: {
            endpoint: {}
        },
        tables: {
            idReservations: {
                name: envPrefix + "Storage_IdReservations"
            },
            events: {
                name: envPrefix + "Storage_Events"
            },
            snapshots: {
                name: envPrefix + "Storage_Snapshots"
            },
            undispatchedEvents: {
                name: envPrefix + "Storage_UndispatchedEvents"
            },
            subscriptions: {
                name: envPrefix + "Custodian_Subscriptions"
            },
            fileKey: {
                name: envPrefix + "Storage_FileKey"
            },
            file: {
                name: envPrefix + "Storage_File",
                indexes: {
                    state: "State",
                    lifecycle: "LifeCycleKey"
                }
            },
            fileIndex: {
                name: envPrefix + "Storage_FileIndex"
            },
            fileMetadata: {
                name: envPrefix + "Storage_FileMetadata"
            },
            accountModel: {
                name: envPrefix + "Storage_AccountModel",
                indexes: {
                    usernamePassword: "UserName-Password-index"
                }
            },
            credentials: {
                name: envPrefix + "Storage_Credentials"
            },
            componentStatus: {
                name: envPrefix + "Storage_ComponentStatus"
            },
            businessUnitInfo: {
                name: envPrefix + "Storage_BusinessUnitInfo"
            },
            lifecycle: {
                name: envPrefix + "Storage_Lifecycle"
            }
        },
        lambdas: {
            finalizeFileArchive: envPrefix + "Storage_FinalizeFileArchive",
            finalizeFileDelete: envPrefix + "Storage_FinalizeFileDelete",
            cacheReader: envPrefix + "Storage_CacheReader"
        },
        streams: {
            poisonMessages: {
                StreamName: envPrefix + "Storage_PoisonMessages",
            },
            lifecycleIntervals: {
                StreamName: envPrefix + "Storage_LifecycleIntervals",
            },
            lifecycleFiles: {
                StreamName: envPrefix + "Storage_LifecycleFiles",
            },
            Subscriber1: {
                StreamName: envPrefix + "Storage_Subscriber1",
            },
            Subscriber2: {
                StreamName: envPrefix + "Storage_Subscriber2"
            },
            Subscriber3: {
                StreamName: envPrefix + "Storage_Subscriber3"
            }
        }
    };

    if (endpoints.dynamo) {
        dynamodb.endpoint.endpoint = endpoints.dynamo;
    }
    if (endpoints.kinesis) {
        kinesis.endpoint.endpoint = endpoints.kinesis;
    }
    if (endpoints.s3) {
        s3.endpoint.endpoint = endpoints.s3;
    }
    if (endpoints.lambda) {
        lambda.endpoint.endpoint = endpoints.lambda;
    }

    console.log("conf output: %s", cfg);

    var config = cfg;

    var s3 = new AWS.S3();

    var params = {
        Bucket: pre.toLowerCase() + "-ic-storage-config",
        Key: "app-configuration.json",
        Body: JSON.stringify(config),
        ContentType: "application/json"
    };
    console.log("Saving config to S3: %s", JSON.stringify(params));

    return new Promise(function (resolve, reject) {
        s3.putObject(params, function (err, data) {
            if (err) {
                console.log("Failed to save configuration to S3: %s", JSON.stringify(err));
                return reject(err);
            }
            console.log("Successfully saved config to S3: %s", JSON.stringify(config));
            resolve(data);
        });
    });
};
