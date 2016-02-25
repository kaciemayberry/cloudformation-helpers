# cloudformation-helpers
A collection of AWS Lambda funtions that fill in the gaps that existing CloudFormation resources do not cover.

AWS CloudFormation supports Custom Resources (http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html),
which can be used to call AWS Lambda functions. CloudFormation covers much of the AWS API landscape, but
does leave some gaps unsupported. AWS Lambda can contain any sort of logic, including interacting with the
AWS API in ways not covered by CloudFormation. By combining the two, CloudFormation deploys should be able
to approach the full resource support given by the AWS API.

Warning: most of these functions require fairly wide permissions, since they need access to resources in a
general manner - much the same way CloudFormation itself has permission to do almost anything.


## Usage
1. Use https://s3.amazonaws.com/com.gilt.public.backoffice/cloudformation_templates/create_cloudformation_helper_functions.template
   to deploy a stack that creates the Lambda functions for you. Remember the stack name.
2. Include the following resources in your CloudFormation template. These will create a) a nested stack that
   looks up the ARNs from the previous step and b) a custom resource that allows your template to read those ARNs.
   
   ```
   "CFHelperStack": {
     "Type": "AWS::CloudFormation::Stack",
     "Properties": {
       "TemplateURL": "https://s3.amazonaws.com/com.gilt.public.backoffice/cloudformation_templates/lookup_stack_outputs.template"
     }
   },
   "CFHelper": {
     "Type": "Custom::CFHelper",
     "Properties": {
       "ServiceToken": { "Fn::GetAtt" : ["CFHelperStack", "Outputs.LookupStackOutputsArn"] },
       "StackName": "your-helper-stack-name-here"
     },
     "DependsOn": [
       "CFHelperStack"
     ]
   }
   ```
   
   You can either hardcode the stack name of your helper functions, or request it as a parameter.
3. Use the ARNs from the previous step in a custom resource, to call those Lambda functions:

   ```
   "PopulateTable": {
     "Type": "Custom::PopulateTable",
     "Properties": {
       "ServiceToken": { "Fn::GetAtt" : ["CFHelper", "DynamoDBPutItemsFunctionArn"] },
       "TableName": "your-table-name",
       "Items": [
         {
           "key": "foo1",
           "value": {
             "bar": 1.5,
             "baz": "qwerty"
           }
         },
         {
           "key": "foo2",
           "value": false
         }
       ]
     },
     "DependsOn": [
       "CFHelper"
     ]
   }
   ```


## Included functions

### Insert items into DynamoDB

Pass in a list of items to be inserted into a DynamoDB table. This is useful to provide a template for the
content of the table, or to populate a config table. There is no data-checking, so it is up to the client
to ensure that the format of the data is correct.

Warning: it is a PUT, so it will overwrite any items that already exist for the table's primary key.

This will delete the items when the corresponding stack is deleted.

#### Parameters

##### TableName
The name of the DynamoDB table to insert into. Must exist at the time of the insert, i.e. will not create if
it does not already exist.

##### Items
A JSON array of items to be inserted, in JSON format (not DynamoDB format).

#### Output
The list of TableName/Key pairs of items created.

#### Reference Output Name
DynamoDBPutItemsFunctionArn

#### Example/Test Template
[dynamo.putItems.template](test/aws/dynamo.putItems.template)


### Put S3 Objects

Mirrors the [S3.putObject API method](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property).

This will delete the objects when the corresponding stack is deleted.

#### Parameters

##### Bucket
The S3 bucket to put the object into

##### Key
The name of the object. Can include a "path" for organization in S3.

##### Body
The content of the object being put into S3 (a string).

##### Other
Please see the reference above for further parameters - these are only the most commonly-used ones.

#### Output
The result of the S3.PutObject API method.

#### Reference Output Name
S3PutObjectFunctionArn

#### Example/Test Template
[s3.putObject.template](test/aws/s3.putObject.template)



### Subscribe to SNS topics

Mirrors the [SNS.Subscribe API method](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html#subscribe-property).
To be used when the SNS topic already exists (since CloudFormation allows subscriptions to be created when creating SNS
topics only).

This will delete the subscription when the corresponding stack is deleted.

#### Parameters

##### Endpoint
The endpoint that receives the SNS messages.

##### Protocol
The type of endpoint. Can be one of the following values: application, email, email-json, http, https, lambda, sms, sqs.

##### TopicArn
The SNS topic to subscribe to.

#### Output
The result of the SNS.Subscribe API method, i.e. SubscriptionArn

#### Reference Output Name
SnsSubscribeFunctionArn

#### Example/Test Template
[sns.subscribe.template](test/aws/sns.subscribe.template)


## Deployment (contributors)
After making changes (i.e. adding a new helper function), please do the following:

1. Upload this zipped repo to the com.gilt.public.backoffice/lambda_functions bucket. To produce the .zip file:

   ```
     zip -r cloudformation-helpers.zip . -x *.git* -x *cloudformation-helpers.zip*
   ```

   Unfortunately we can't use the Github .zip file directly, because it zips the code into a subdirectory named after
   the repo; AWS Lambda then can't find the .js file containing the helper functions because it is not on the top-level.

2. Upload the edited create_cloudformation_helper_functions.template to com.gilt.public.backoffice/cloudformation_templates


## License
Copyright 2016 Gilt Groupe, Inc.

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0