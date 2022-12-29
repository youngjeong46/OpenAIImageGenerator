#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import ImageGeneratorConstruct from '../lib/index';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION!;
const env = {
  account: account,
  region: region,
};

new ImageGeneratorConstruct(app, 
  { 
    id: 'cdk-image-gen-app', 
    cidrBlock: '128.46.0.0/16',
    enableDockerAuth: true,
    dockerSecretName: 'dockerSecret', 
  }, 
  { env }
);