# Image Generator
This is a sample NodeJS application for generating images using phrases. The generation is provided using OpenAI's [ChatGPT API](https://openai.com/api/).

## Prerequisites
To get started you will need:
- [Docker](https://docs.docker.com/install/) installed on your local machine.
- [Node](https://nodejs.org/en/), version v16.16 or later.
- [NPM](https://www.npmjs.com/) package manager, version 8.11 or later.
- An IDE for building the application such as [Visual Studio](https://visualstudio.microsoft.com/)

## Running Locally

To get started, first install dependencies:

```sh
npm i
```

Then, start the application:

```sh
npm run start
```

## Running on ECS Fargate

<!-- The [AWS CDK](https://aws.amazon.com/cdk/) is used to deploy the application to [ECS Fargate](https://aws.amazon.com/fargate/) and is protected with [AWS WAF](https://aws.amazon.com/waf/) via the CDK for C#. Follow the instructions in the [README.md](CdkGeoLocationApi/README.md).

Alternatively, you can use the [Docker Compose for Amazon ECS](https://docs.docker.com/cloud/ecs-integration/) integration to launch the application to ECS Fargate by using the Docker CLI. You can look at [docker-compose-ecs-demo.yml](docker-compose-ecs-demo.yml) to see a simple example. **Note:** the GeoLocationAPI project uses [OpenTelemetry](https://opentelemetry.io/) and since the Docker Compose for Amazon ECS integration currently doesn't support creating sidecars in the task definition, this simple example doesn't showcase the [aws-otel-collector](https://github.com/aws-observability/aws-otel-collector). To see that functionality, deploy with the CDK instead as mentioned above in the [README.md](CdkGeoLocationApi/README.md). -->

## Running on Kubernetes

To deploy to an existing Kubernetes cluster:

```sh
kubectl apply -f kubernetes-manifests/
```

<!-- The [geolocationapi.yaml](/templates/geolocationapi.yaml) manifest doesn't expose the service via a load balancer so in order to test do something like this:

```sh
kubectl exec -it busybox -n default -- wget -qO- http://{Service-IP}:{Port}/api/v1/geolocation/8.8.8.8
``` -->