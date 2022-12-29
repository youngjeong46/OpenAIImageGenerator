import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export interface EcsStackProps {
  vpc: ec2.Vpc,
  enableDockerAuth: boolean
  secretName: string
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, stackProps: EcsStackProps, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = stackProps.vpc;
    const docker = stackProps.enableDockerAuth;
    const secret = stackProps.secretName;

    // Creates S3 bucket and uploads the env file to be used.
    const envFileBucket = new s3.Bucket(this, 'env-file-bucket',{
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    new s3deploy.BucketDeployment(this, 'deploy-env-file', {
      sources: [s3deploy.Source.asset(path.join(__dirname,'../../.env.zip'))],
      destinationBucket: envFileBucket
    });

    // Retrieve the Docker credential secret;
    let dockerSecret;
    if (docker) {
      dockerSecret = secrets.Secret.fromSecretNameV2(this, 'docker-secret', secret);
    }

    const dockerCredential = { credentials: dockerSecret } || {};

    // Set up ADOT Roles
    const [adotRole, adotExecutionRole] = this.setUpAdotRoles(docker, dockerSecret, envFileBucket);
    
    // Create the ECS Cluster
    const cluster = new ecs.Cluster(this, id, {
      enableFargateCapacityProviders: true,
      vpc: stackProps.vpc,
      containerInsights: true,
    });

    // ECS task definition
    const def = new ecs.FargateTaskDefinition(
      this, id + '-taskdef', {
        family: 'image-generator-task-family',
        cpu: 1024,
        memoryLimitMiB: 4096,
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.ARM64
        },
        taskRole: adotRole,
        executionRole: adotExecutionRole
      }
    );
      
    // Add application container to the task definition
    def.addContainer(id + '-appcon', {
      containerName: 'chatgpt-image-generator',
      image: ecs.ContainerImage.fromRegistry("youngjeong46/chatgpt-image-generator:alpine", dockerCredential),
      environmentFiles: [ecs.EnvironmentFile.fromBucket(envFileBucket, '/.env')],
      portMappings: [
        { 
          containerPort: 3000
        }
      ],
    });

    // ADOT Containers to the task definition
    const collectorContainerDef = def.addContainer('collector', {
      containerName: 'aws-otel-collector',
      image: ecs.ContainerImage.fromRegistry('amazon/aws-otel-collector', dockerCredential),
      command:[
        '--config=/etc/ecs/container-insights/otel-task-metrics-config.yaml'
      ],
      essential: true,
      logging: new ecs.AwsLogDriver({
        logGroup: new logs.LogGroup(this,'collector-log-group',{
          logGroupName: '/ecs/ecs-aws-otel-sidecar-collector'
        }),
        streamPrefix: 'ecs',
      }),
    });

    const emitterContainerDef = def.addContainer('emitter', {
      containerName: 'aws-otel-emitter',
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-otel-test/aws-otel-goxray-sample-app'),
      essential: false,
      logging: new ecs.AwsLogDriver({
        logGroup: new logs.LogGroup(this, 'emitter-log-group', {
          logGroupName: '/ecs/ecs-aws-otel-sidecar-app'
        }),
        streamPrefix: 'ecs',
      })
    });
    emitterContainerDef.addContainerDependencies({container: collectorContainerDef, condition: ecs.ContainerDependencyCondition.START});

    const nginxDef = def.addContainer('nginx', {
      containerName: 'nginx',
      image: ecs.ContainerImage.fromRegistry('nginx:latest', dockerCredential),
      essential: false
    });
    nginxDef.addContainerDependencies({container: collectorContainerDef, condition: ecs.ContainerDependencyCondition.START});

    const statsdDef = def.addContainer('socat', {
      containerName: 'aoc-statsd-emmitter',
      image: ecs.ContainerImage.fromRegistry('alpine/socat:latest', dockerCredential),
      essential: false,
      cpu: 256,
      memoryLimitMiB: 512,
      logging: new ecs.AwsLogDriver({
        logGroup: new logs.LogGroup(this, 'statsd-log-group', {
          logGroupName: '/ecs/statsd-emitter'
        }),
        streamPrefix: 'ecs',
      }),
      entryPoint: [
        "/bin/sh",
        "-c",
        "while true; do echo 'statsdTestMetric:1|c' | socat -v -t 0 - UDP:127.0.0.1:8125; sleep 1; done"
      ],
    });
    statsdDef.addContainerDependencies({container: collectorContainerDef, condition: ecs.ContainerDependencyCondition.START});

    // Start the application service
    const appService = new ecs.FargateService(this, id + '-appsvc', {
      serviceName: 'image-generator-svc',
      cluster: cluster,
      taskDefinition: def,
      desiredCount: 2,
    });

    // Load Balancer for the app
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', { vpc, internetFacing: true });
    const listener = lb.addListener('Listener', { port: 80 });
    listener.addTargets('lb-app-target', {
      port: 80,
      targets: [
        appService.loadBalancerTarget({
          containerName: 'chatgpt-image-generator',
          containerPort: 3000,
        })
      ],
      healthCheck: {
        healthyThresholdCount: 5,
        path: '/',
        interval: cdk.Duration.seconds(5),
        timeout: cdk.Duration.seconds(2)
      }
    });

    new cdk.CfnOutput(this, 'loadbalancer-output', {
      exportName: 'ApplicationLoadBalancerDNS',
      value: lb.loadBalancerDnsName
    });
  }

  private setUpAdotRoles(docker: boolean, dockerSecret: secrets.ISecret | undefined, 
    bucket: s3.Bucket): [iam.Role, iam.Role] {
    // Create IAM Policy
    const AdotPolicyDoc = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement(
        {
          actions: [
            "logs:PutLogEvents",
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogStreams",
            "logs:DescribeLogGroups",
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords",
            "xray:GetSamplingRules",
            "xray:GetSamplingTargets",
            "xray:GetSamplingStatisticSummaries",
            "cloudwatch:PutMetricData",
            "ec2:DescribeVolumes",
            "ec2:DescribeTags",
            "ssm:GetParameters"
          ],
          resources:["*"],
          effect: iam.Effect.ALLOW
        }
      )]
    });
    const AdotPolicy = new iam.Policy(this, 'adot-policy', {
      document: AdotPolicyDoc,
    });

    // Create Task Role for Adot
    const AdotTaskRole = new iam.Role(this, 'adot-task-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    // Create Task Execution Role for Adot
    const AdotTaskExecutionRole = new iam.Role(this, 'adot-task-exec-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
      ]
    });

    AdotTaskRole.attachInlinePolicy(AdotPolicy);
    AdotTaskExecutionRole.attachInlinePolicy(AdotPolicy);

    // Set up Docker Credential permissions if enabled
    if (docker){
      const secret = dockerSecret!;
      const dockerDoc = new iam.PolicyDocument({
        statements: [new iam.PolicyStatement(
          {
            actions: [
              "secretsmanager:GetSecretValue",
            ],
            resources:[secret.secretArn],
            effect: iam.Effect.ALLOW
          }
        )]
      });

      const dockerPolicy = new iam.Policy(this, 'docker-policy', {
        document: dockerDoc,
      });

      AdotTaskExecutionRole.attachInlinePolicy(dockerPolicy);
    }

    //Set up S3 permissions for env variable retrieval
    const s3Doc = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement(
          {
            actions: [
              "s3:GetObject",
            ],
            resources:[bucket.bucketArn+'/.env'],
            effect: iam.Effect.ALLOW
          },
        ),
        new iam.PolicyStatement(
          {
            actions: ["s3:GetBucketLocation"],
            resources: [bucket.bucketArn],
            effect: iam.Effect.ALLOW
          }
        )
      ]
    });

    const s3Policy = new iam.Policy(this, 's3-policy', {
      document: s3Doc,
    });

    AdotTaskExecutionRole.attachInlinePolicy(s3Policy);
    
    return [AdotTaskRole, AdotTaskExecutionRole];
  }
}
