# serverless-plugin-apig-role

[Serverless framework](https://www.serverless.com) plugin to create execute-api role with a specific stable role identifier instead of a changable identifier created by serverless.

## Installation

Install to the Serverless project via npm

```bash
$ npm install --save serverless-plugin-apig-role
```

## Usage

Add the plugin to your `serverless.yml`

```yaml
# serverless.yml

plugins:
  - serverless-plugin-apig-role

custom:
  executeApiRole: "test-ExecuteApiRole"
  allowedAccounts: [ "arn:aws:iam::xxxxxxxxxxxx:root" ]  # except the current account
```
