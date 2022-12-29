import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface vpcStackProps {
    id: string,
    cidrBlock: string,
}

export class vpcStack extends cdk.Stack {

    readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, vpcProps: vpcStackProps, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPC
        this.vpc = new ec2.Vpc(this, vpcProps.id,{
            ipAddresses: ec2.IpAddresses.cidr(vpcProps.cidrBlock)
        });
    }
}