'use strict';
const _ = require('lodash');

module.exports = class ExecuteApiRole {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');
    this.region = this.options.region ? this.options.region : 'us-east-1';

    this.apiGateway = new this.provider.sdk.APIGateway({
      region: this.region
    });
    this.iam = new this.provider.sdk.IAM({
      region: this.region
    });

    this.hooks = {
      'after:aws:deploy:deploy:updateStack': this.createExecuteApiRole.bind(this),
    };
  }

  createExecuteApiRole(){
    this.serverless.cli.log('[serverless-plugin-apig-role]: Creating execute-api role...');
    const roleName = this.serverless.service.custom.executeApiRole ? this.serverless.service.custom.executeApiRole : `service-${this.options.stage}-ExecuteApiRole`;

    Promise.resolve()
      .then(()=>{
        return this.iam.getRole({
          RoleName: roleName
        })
        .promise()
        .then(() =>{
          this.serverless.cli.log(`[serverless-plugin-apig-role]: execute api role ${roleName} already exists.`);
        })
        .catch(e => {
          if (e.statusCode === 404 || e.code === 'NoSuchEntity') {
            return this.getRoleParams(roleName)
              .then((roleParams) => {
                return this.iam.createRole(roleParams)
                  .promise();
              })
              .then((data) => {
                return this.getPolicyParams(roleName);
              })
              .then((policyParams) => {
                return this.iam.putRolePolicy(policyParams)
                  .promise();
              })
              .then((data) => {
                this.serverless.cli.log(`[serverless-plugin-apig-role]: execute api role ${roleName} created.`);
              });
          }
          throw e;
        });
      });
  }

  getRoleParams(roleName) {
    let allowedAccounts = this.serverless.service.custom.allowedAccounts ? this.serverless.service.custom.allowedAccounts : [];

    return this.getAccountId()
      .then((accountId) => {
        const accountArn = `arn:aws:iam::${accountId}:root`;
        allowedAccounts.push(accountArn);

        const assumeRolePolicy = {
          "Version" : "2012-10-17",
          "Statement": [ {
            "Effect": "Allow",
            "Principal": {
              "Service": [ "apigateway.amazonaws.com" ],
              "AWS": allowedAccounts
            },
            "Action": [ "sts:AssumeRole" ]
          } ]
        };

        const roleParams = {
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy), 
          Path: "/", 
          RoleName: roleName
        };
        return roleParams;
      });
  }

  getPolicyParams(roleName) {
    return this.getExecuteApiArn()
      .then((executeApiArn) => {
        const policy = {
          "Version" : "2012-10-17",
          "Statement": [ {
            "Effect": "Allow",
            "Action": "execute-api:Invoke",
            "Resource": [ executeApiArn ]
          } ]
        };

        const policyParams = {
          PolicyDocument: JSON.stringify(policy), 
          PolicyName: "ExecuteApiIAMPolicy", 
          RoleName: roleName
        };
        return policyParams;
      });
  }

  getExecuteApiArn() {
    const apiName = this.provider.naming.getApiGatewayName();
    let accountId;

    return this.getAccountId()
      .then((id) =>{
        accountId = id;
        return this.apiGateway.getRestApis()
          .promise();
      })
      .then( apis => {
        const restApiId = apis.items.find(api => api.name === apiName).id;
        const executeApiArn = `arn:aws:execute-api:${this.region}:${accountId}:${restApiId}/*`;

        return executeApiArn;
      });
  }
    
  getAccountId() {
    return this.iam.getUser({})
      .promise()
      .then((data) => {
        return data.User.Arn.split(':')[4];
      });
  }

}
