# Streaming Platform on Kubernetes

A containerized streaming platform deployed to **Amazon EKS** with a Jenkins CI/CD pipeline, Amazon ECR image storage, Helm-based Kubernetes deployment, MongoDB persistence, S3-backed video uploads, and NGINX Ingress routing.

> **Project status:** The recorded Jenkins build **#11** completed successfully, and the captured Kubernetes checks show two worker nodes in `Ready` state, application pods running, the ingress endpoint provisioned, and the MongoDB persistent volume claim bound. Screenshots document the state observed during the project; live AWS resources may change or incur charges.

## Table of contents

- [Project overview](#project-overview)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [CI/CD pipeline](#cicd-pipeline)
- [AWS and Kubernetes deployment](#aws-and-kubernetes-deployment)
- [Application features and validation](#application-features-and-validation)
- [Troubleshooting notes](#troubleshooting-notes)
- [Security notes](#security-notes)
- [Cleanup and cost control](#cleanup-and-cost-control)
- [Screenshots](#screenshots)

## Project overview

The goal of this project is to package a multi-service streaming application into Docker images and deploy it to Kubernetes on AWS. Jenkins automates checkout, environment checks, ECR repository preparation, image builds and pushes, and image verification. Helm manages the Kubernetes application release.

The application includes a React frontend, Node.js backend services, MongoDB, and video object storage in Amazon S3.

## Architecture

```mermaid
flowchart TB
    User[Browser / User] --> Ingress[NGINX Ingress Controller]
    Ingress --> Frontend[Frontend Service]
    Ingress --> Auth[Authentication Service]
    Ingress --> Streaming[Streaming Service]
    Ingress --> Admin[Admin Service]
    Ingress --> Chat[Chat Service]
    Auth --> Mongo[(MongoDB StatefulSet)]
    Admin --> Mongo
    Streaming --> Mongo
    Streaming --> S3[(Amazon S3 video objects)]
    Jenkins[Jenkins CI/CD] --> ECR[Amazon ECR]
    ECR --> EKS[Amazon EKS cluster]
    Helm[Helm chart] --> EKS
```

The diagram is a high-level logical view. Actual routing and service configuration are defined by the repository's Kubernetes/Helm manifests and environment values.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React / JavaScript |
| Backend | Node.js and Express microservices |
| Database | MongoDB |
| Containerization | Docker |
| CI/CD | Jenkins |
| Container registry | Amazon ECR |
| Kubernetes platform | Amazon EKS |
| Deployment packaging | Helm |
| Ingress | NGINX Ingress Controller |
| Video object storage | Amazon S3 |
| Persistent database storage | Kubernetes PVC using `gp3-csi` |

## Repository structure

The repository contains the frontend, backend microservices, and Helm deployment chart. The exact file list may evolve as the project changes.

```text
StreamingApp/
├── backend/
│   ├── adminService/
│   ├── authService/
│   ├── chatService/
│   └── streamingService/
├── frontend/
│   ├── public/
│   └── src/
└── helm/
    └── streamingapp/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

## CI/CD pipeline

The Jenkins job is named **`StreamingAppCode-CI-CD`**. The captured successful run is **build #11**.

The visible stages include:

1. Checkout source from GitHub.
2. Verify AWS access.
3. Verify Docker.
4. Create/check ECR repositories.
5. Authenticate to Amazon ECR.
6. Build and push the authentication service image.
7. Build and push the streaming service image.
8. Build and push the admin service image.
9. Build and push the chat service image.
10. Build and push the frontend image.
11. Verify images in ECR.

The Jenkins screenshot shows the displayed stages green for build #11. The run time shown in the screenshot is approximately nine minutes.

## AWS and Kubernetes deployment

### AWS resources observed

- EKS cluster: `streamingapp-eks`
- Worker node group: `streamingapp-workers`
- AWS Region: `us-east-1`
- ECR repositories for authentication, streaming, admin, chat, and frontend images
- S3 bucket configured for video uploads
- IAM role/service-account permissions for S3 access (IRSA)
- NGINX Ingress Controller and an external AWS load balancer

### Kubernetes resources observed

The captured command output showed:

- **2 worker nodes** in `Ready` state.
- Application pods for admin, auth, chat, frontend, MongoDB, and streaming.
- ClusterIP services for the application components and MongoDB.
- An ingress named `streamingapp-ingress`.
- MongoDB pod `mongo-0`.
- PVC `mongo-data-mongo-0` in `Bound` state, with **5 GiB** capacity and storage class `gp3-csi`.
- Helm release `streamingapp` in namespace `default`, status `deployed`, chart `streamingapp-1.0.0`, revision 4 at the time captured.

These are point-in-time observations from the screenshots, not a guarantee that the resources are still running.

### Useful verification commands

Run these from a terminal with the appropriate AWS and Kubernetes context configured:

```bash
aws sts get-caller-identity
kubectl get nodes
kubectl get pods -o wide
kubectl get services
kubectl get ingress
kubectl get pvc
helm list
helm status streamingapp
```

To inspect a workload or recent events:

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name> --tail=100
kubectl get events --sort-by=.metadata.creationTimestamp
```

## Application features and validation

The captured application screenshots show the admin interface, video upload form, and video management table. The project testing recorded in the conversation included successful video upload and playback, and MongoDB persistence.

The admin interface supports:
- Admin login and access to the admin panel.
- Video metadata entry, including title, description, genre, and release year.
- Uploading a video and thumbnail.
- Viewing and managing uploaded video records.

Only use media you own or have permission to upload and distribute.

## Troubleshooting notes

### Video upload returned HTTP 413

A captured browser Network panel showed the `video` request returning **HTTP 413**. This status usually means the request body exceeded a configured upload-size limit. During this project, the NGINX Ingress annotation was configured in `helm/streamingapp/templates/ingress.yaml` as:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "200m"
```

After changing Helm templates or values, apply the release update using the deployment process for this repository, then retry with a suitably sized test file. Also check any limits configured in the frontend, backend, ingress controller, or object-storage upload flow.

### MongoDB connectivity

Historical logs showed a MongoDB connection refusal, while a later MongoDB ping returned `{ ok: 1 }` and the pod was running. This indicates the database responded at the later check; it does not establish the precise cause of the earlier transient failure.

Useful checks:

```bash
kubectl get pod mongo-0
kubectl get service mongo
kubectl get pvc
kubectl logs mongo-0 --tail=100
kubectl logs deployment/auth --tail=100
```

### Phone versus laptop login

Laptop login was reported working. A phone login issue remained unresolved in the recorded troubleshooting, so this README does not claim that mobile login has been fixed. When investigating, check the exact browser origin, CORS configuration, cookies/credentials, and browser Network response without sharing tokens or passwords.

## Security notes

- **Never commit** AWS access keys, secret keys, JWT secrets, passwords, production `.env` files, or Kubernetes Secret values.
- Use IAM roles and least-privilege permissions rather than embedding AWS credentials in source code or images.
- Keep private configuration in an appropriate secret manager or Kubernetes Secret workflow.
- Use HTTPS and a properly configured domain/TLS certificate for a production deployment. The captured ingress URL used HTTP and the browser marked it “Not secure.”
- Review screenshots before publishing to ensure they do not expose credentials, personal data, tokens, or sensitive account details.

## Cleanup and cost control

EKS clusters, EC2 worker nodes, load balancers, EBS volumes, and other AWS resources may incur charges even when the application is not being used.

When the project is no longer needed:
1. Confirm whether you need to retain database data or uploaded videos.
2. Uninstall the Helm release if appropriate.
3. Remove the EKS cluster and associated node groups using the method used to create them.
4. Check for leftover load balancers, EBS volumes, ECR images, S3 objects, and other billable resources.
5. Verify the AWS billing console after cleanup.

Do not delete the cluster or persistent storage until any required data has been backed up.

## Screenshots

The screenshots below are grouped by the project workflow. They are embedded using relative paths so they render in GitHub after the `docs/screenshots/` folder is committed.


### Project Setup and Repository

**Screenshot 1**

![Screenshot 1](docs/screenshots/Screenshot1.png)

**Screenshot 2**

![Screenshot 2](docs/screenshots/Screenshot2.png)

**Screenshot 3**

![Screenshot 3](docs/screenshots/Screenshot3.png)

**Screenshot 4**

![Screenshot 4](docs/screenshots/Screenshot4.png)

**Screenshot 5**

![Screenshot 5](docs/screenshots/Screenshot5.png)

**Screenshot 6**

![Screenshot 6](docs/screenshots/Screenshot6.png)

**Screenshot 7**

![Screenshot 7](docs/screenshots/Screenshot7.png)

**Screenshot 8**

![Screenshot 8](docs/screenshots/Screenshot8.png)


### AWS and Container Registry

**Screenshot 9**

![Screenshot 9](docs/screenshots/Screenshot9.png)

**Screenshot 10**

![Screenshot 10](docs/screenshots/Screenshot10.png)

**Screenshot 11**

![Screenshot 11](docs/screenshots/Screenshot11.png)

**Screenshot 12**

![Screenshot 12](docs/screenshots/Screenshot12.png)

**Screenshot 13**

![Screenshot 13](docs/screenshots/Screenshot13.png)

**Screenshot 14**

![Screenshot 14](docs/screenshots/Screenshot14.png)

**Screenshot 15**

![Screenshot 15](docs/screenshots/Screenshot15.png)

**Screenshot 16**

![Screenshot 16](docs/screenshots/Screenshot16.png)

**Screenshot 17**

![Screenshot 17](docs/screenshots/Screenshot17.png)

**Screenshot 18**

![Screenshot 18](docs/screenshots/Screenshot18.png)


### Docker Images and Jenkins CI/CD

**Screenshot 19**

![Screenshot 19](docs/screenshots/Screenshot19.png)

**Screenshot 20**

![Screenshot 20](docs/screenshots/Screenshot20.png)

**Screenshot 21**

![Screenshot 21](docs/screenshots/Screenshot21.png)

**Screenshot 22**

![Screenshot 22](docs/screenshots/Screenshot22.png)

**Screenshot 23**

![Screenshot 23](docs/screenshots/Screenshot23.png)

**Screenshot 24**

![Screenshot 24](docs/screenshots/Screenshot24.png)

**Screenshot 25**

![Screenshot 25](docs/screenshots/Screenshot25.png)

**Screenshot 26**

![Screenshot 26](docs/screenshots/Screenshot26.png)

**Screenshot 27**

![Screenshot 27](docs/screenshots/Screenshot27.png)

**Screenshot 28**

![Screenshot 28](docs/screenshots/Screenshot28.png)

**Screenshot 29**

![Screenshot 29](docs/screenshots/Screenshot29.png)

**Screenshot 30**

![Screenshot 30](docs/screenshots/Screenshot30.png)

**Screenshot 31**

![Screenshot 31](docs/screenshots/Screenshot31.png)

**Screenshot 32**

![Screenshot 32](docs/screenshots/Screenshot32.png)

**Screenshot 33**

![Screenshot 33](docs/screenshots/Screenshot33.png)


### EKS and Kubernetes Deployment

**Screenshot 34**

![Screenshot 34](docs/screenshots/Screenshot34.png)

**Screenshot 35**

![Screenshot 35](docs/screenshots/Screenshot35.png)

**Screenshot 36**

![Screenshot 36](docs/screenshots/Screenshot36.png)

**Screenshot 37**

![Screenshot 37](docs/screenshots/Screenshot37.png)

**Screenshot 38**

![Screenshot 38](docs/screenshots/Screenshot38.png)

**Screenshot 39**

![Screenshot 39](docs/screenshots/Screenshot39.png)

**Screenshot 40**

![Screenshot 40](docs/screenshots/Screenshot40.png)

**Screenshot 41**

![Screenshot 41](docs/screenshots/Screenshot41.png)

**Screenshot 42**

![Screenshot 42](docs/screenshots/Screenshot42.png)

**Screenshot 43**

![Screenshot 43](docs/screenshots/Screenshot43.png)

**Screenshot 44**

![Screenshot 44](docs/screenshots/Screenshot44.png)

**Screenshot 45**

![Screenshot 45](docs/screenshots/Screenshot45.png)

**Screenshot 46**

![Screenshot 46](docs/screenshots/Screenshot46.png)

**Screenshot 47**

![Screenshot 47](docs/screenshots/Screenshot47.png)

**Screenshot 48**

![Screenshot 48](docs/screenshots/Screenshot48.png)


### Services, Ingress, and Persistent Storage

**Screenshot 49**

![Screenshot 49](docs/screenshots/Screenshot49.png)

**Screenshot 50**

![Screenshot 50](docs/screenshots/Screenshot50.png)

**Screenshot 51**

![Screenshot 51](docs/screenshots/Screenshot51.png)

**Screenshot 52**

![Screenshot 52](docs/screenshots/Screenshot52.png)

**Screenshot 53**

![Screenshot 53](docs/screenshots/Screenshot53.png)

**Screenshot 54**

![Screenshot 54](docs/screenshots/Screenshot54.png)

**Screenshot 55**

![Screenshot 55](docs/screenshots/Screenshot55.png)

**Screenshot 56**

![Screenshot 56](docs/screenshots/Screenshot56.png)

**Screenshot 57**

![Screenshot 57](docs/screenshots/Screenshot57.png)

**Screenshot 58**

![Screenshot 58](docs/screenshots/Screenshot58.png)


### Application Validation and Troubleshooting

**Screenshot 59**

![Screenshot 59](docs/screenshots/Screenshot59.png)

**Screenshot 60**

![Screenshot 60](docs/screenshots/Screenshot60.png)

**Screenshot 61**

![Screenshot 61](docs/screenshots/Screenshot61.png)

**Screenshot 62**

![Screenshot 62](docs/screenshots/Screenshot62.png)

**Screenshot 63**

![Screenshot 63](docs/screenshots/Screenshot63.png)

**Screenshot 64**

![Screenshot 64](docs/screenshots/Screenshot64.png)

**Screenshot 65**

![Screenshot 65](docs/screenshots/Screenshot65.png)

**Screenshot 66**

![Screenshot 66](docs/screenshots/Screenshot66.png)

**Screenshot 67**

![Screenshot 67](docs/screenshots/Screenshot67.png)

**Screenshot 68**

![Screenshot 68](docs/screenshots/Screenshot68.png)

**Screenshot 69**

![Screenshot 69](docs/screenshots/Screenshot69.png)

**Screenshot 70**

![Screenshot 70](docs/screenshots/Screenshot70.png)

**Screenshot 71**

![Screenshot 71](docs/screenshots/Screenshot71.png)

**Screenshot 72**

![Screenshot 72](docs/screenshots/Screenshot72.png)


## License

Add the license required by your assignment or organization before distributing this project publicly.
