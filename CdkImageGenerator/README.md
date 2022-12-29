# CDK Project for Image Generator
This is the CDK project that will deploy the Image Generator application. It will deploy the application, along with AWS Distro for OpenTelemetry (ADOT) containers for observability of your application, on Amazon Elastic Container Service (ECS). ECS Service is ran using Fargate, a Serverless compute option.

## Prerequisites
To get started you will need the following:
- [AWS CDK](https://docs.docker.com/install/) installed on your local machine, version 2.51.1 as of this writing.
- [awscli](https://aws.amazon.com/cli/) installed and configured with `aws configure`, version 2.7.35 or later.
- [Node](https://nodejs.org/en/) and [NPM](https://www.npmjs.com/)
- zip your `.env` file in the top directory and name it `.env.zip`
- A SecretsManager secret holding your Docker credentials. This is optional, but helpful to increase the pull limit for the Docker Hub hosted images. See [here](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/private-auth.html#private-auth-enable) for the Secret format to store your Docker credentials. ***This must be stored in the same account/region as the CDK project.***

## Project Components
This CDK project will deploy the following resources:
- A VPC with user-provided CIDR block (in its own stack)
- S3 Bucket that stores the environment variable (i.e. your OpenAI API key)
- ECS Cluster, Task Definition with your application container, and containers needed for Amazon Distro for OpenTelemetry (ADOT)
- IAM roles and policies needed for the ECS Cluster and Task Definition
- ECS Service within the ECS Cluster created using the Task Definition, and
- Load Balancer fronting the ECS Service with DNS provided as output 

## Deploying 

To get started, first install your dependencies:

```sh
npm i
```

Looking at your `bin/app.ts`, you will notice some parameters you can set:
- env: You can set your account and regions (by default they are CDK-default based on your AWS profile)
- id: Your CDK application ID
- cidrBlock: CIDR block for your VPC which hosts the ECS Fargate
- enableDockerAuth: To use your docker credentials, set this to True.
- dockerSecretName: Name of your secrets in Secrets Manager that stores your docker credentials.

Once finished, save and then list all available CDK Stacks by running the following command:

```sh
cdk list
```

You should get an output like the following:

```
cdk-image-gen-app-vpc-stack
cdk-image-gen-app-ecs-stack
```

You will need both stacks deployed to be able to access the application. run the following command, and enter `y` when prompted to deploy both stacks:

```sh
cdk deploy --all
```

Once deployed, at the end of the ECS stack deployment, you will get an Output printed on your Terminal (similar to the below) that shows the DNS for the load balancer, which you can use to access the application page:

```
Outputs:
cdk-image-gen-app-ecs-stack.loadbalanceroutput = cdk-i-XXXXX-AWEBWEBQA-2309480930.us-west-2.elb.amazonaws.com
```