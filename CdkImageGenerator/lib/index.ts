import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcsStack } from './ecs';
import { vpcStack } from './vpc';
import assert from 'assert';

export interface ImageGeneratorConstructProps {
    id: string, 
    cidrBlock: string,
    enableDockerAuth: boolean,
    dockerSecretName?: string,
}

export default class ImageGeneratorConstruct {
    constructor(scope: Construct, constructProps: ImageGeneratorConstructProps, props: cdk.StackProps){
        const auth = constructProps.enableDockerAuth;
        const secretName = constructProps.dockerSecretName || '';

        assert(auth && (secretName.length > 0), 'You must include the name of the Secret for Docker auth.');

        const vpc = new vpcStack(scope, constructProps.id + '-vpc-stack', 
        {
            id: constructProps.id + '-vpc', 
            cidrBlock: constructProps.cidrBlock
        }, 
        { 
            env: props.env 
        });
        new EcsStack(scope, constructProps.id + '-ecs-stack', 
        {
            vpc: vpc.vpc,
            enableDockerAuth: auth,
            secretName: secretName
        }, 
        { 
            env: props.env 
        });
    }
}