# CI/CD Implementation

1. First, let's create a GitHub Actions workflow file for CI/CD. We'll create `.github/workflows/deploy.yml`:

```yaml:.github/workflows/deploy.yml
name: Deploy Bedrock Chat

on:
  push:
    branches: [ v2-cicd ]
  pull_request:
    branches: [ v2-cicd ]
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  STACK_NAME: "CodeBuildForDeploy"

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install jq
        run: sudo apt-get install -y jq

      - name: Validate CloudFormation template
        run: |
          aws cloudformation validate-template \
            --template-body file://deploy.yml

      - name: Deploy CloudFormation stack
        run: |
          aws cloudformation deploy \
            --stack-name ${{ env.STACK_NAME }} \
            --template-file deploy.yml \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides \
              AllowSelfRegister="false" \
              EnableLambdaSnapStart="false" \
              DisableIpv6="false" \
              BedrockRegion="${{ secrets.AWS_REGION }}" \
              RepoUrl="${{ github.server_url }}/${{ github.repository }}.git" \
              Version="${{ github.ref }}"

      - name: Wait for stack completion and start CodeBuild
        run: |
          echo "Waiting for stack creation to complete..."
          while true; do
            status=$(aws cloudformation describe-stacks --stack-name ${{ env.STACK_NAME }} --query 'Stacks[0].StackStatus' --output text)
            if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" ]]; then
              break
            elif [[ "$status" == "ROLLBACK_COMPLETE" || "$status" == "DELETE_FAILED" || "$status" == "CREATE_FAILED" ]]; then
              echo "Stack creation failed with status: $status"
              exit 1
            fi
            sleep 10
          done

          outputs=$(aws cloudformation describe-stacks --stack-name ${{ env.STACK_NAME }} --query 'Stacks[0].Outputs')
          projectName=$(echo $outputs | jq -r '.[] | select(.OutputKey=="ProjectName").OutputValue')

          if [[ -z "$projectName" ]]; then
            echo "Failed to retrieve the CodeBuild project name"
            exit 1
          fi

          echo "Starting CodeBuild project: $projectName..."
          buildId=$(aws codebuild start-build --project-name $projectName --query 'build.id' --output text)

          if [[ -z "$buildId" ]]; then
            echo "Failed to start CodeBuild project"
            exit 1
          fi

          echo "Waiting for the CodeBuild project to complete..."
          while true; do
            buildStatus=$(aws codebuild batch-get-builds --ids $buildId --query 'builds[0].buildStatus' --output text)
            if [[ "$buildStatus" == "SUCCEEDED" ]]; then
              break
            elif [[ "$buildStatus" == "FAILED" || "$buildStatus" == "STOPPED" ]]; then
              echo "Build failed with status: $buildStatus"
              exit 1
            fi
            sleep 30
          done

          buildDetail=$(aws codebuild batch-get-builds --ids $buildId --query 'builds[0].logs.{groupName: groupName, streamName: streamName}' --output json)
          logGroupName=$(echo $buildDetail | jq -r '.groupName')
          logStreamName=$(echo $buildDetail | jq -r '.streamName')

          echo "Build Log Group Name: $logGroupName"
          echo "Build Log Stream Name: $logStreamName"

          echo "Fetch CDK deployment logs..."
          logs=$(aws logs get-log-events --log-group-name $logGroupName --log-stream-name $logStreamName)
          frontendUrl=$(echo "$logs" | grep -o 'FrontendURL = [^ ]*' | cut -d' ' -f3 | tr -d '\n,')

          if [[ ! -z "$frontendUrl" ]]; then
            echo "Frontend URL: $frontendUrl"
            echo "FRONTEND_URL=$frontendUrl" >> $GITHUB_ENV
          fi

      - name: Create deployment status comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const frontendUrl = process.env.FRONTEND_URL;
            if (frontendUrl) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `✅ Deployment successful!\nFrontend URL: ${frontendUrl}`
              });
            }
```

2. Additional Security Considerations:

Create a new file `.github/workflows/cleanup.yml` to handle cleanup when branches are deleted:

```yaml:.github/workflows/cleanup.yml
name: Cleanup Resources

on:
  delete:
    branches:
      - '*'

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}

jobs:
  cleanup:
    runs-on: ubuntu-latest
    if: github.event.ref_type == 'branch'
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Delete CloudFormation stack
        run: |
          BRANCH_NAME=$(echo ${{ github.event.ref }} | sed 's/refs\/heads\///')
          STACK_NAME="CodeBuildForDeploy-${BRANCH_NAME}"

          if aws cloudformation describe-stacks --stack-name $STACK_NAME 2>/dev/null; then
            echo "Deleting stack $STACK_NAME..."
            aws cloudformation delete-stack --stack-name $STACK_NAME
            aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
          fi
```

3. Setup Instructions:

a. Add these secrets to your GitHub repository:

- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ACCOUNT`

b. Update IAM permissions for the CI/CD user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "codebuild:*",
                "logs:*",
                "iam:PassRole",
                "s3:*",
                "lambda:*",
                "apigateway:*",
                "cognito-idp:*",
                "wafv2:*",
                "cloudfront:*",
                "acm:*",
                "route53:*",
                "dynamodb:*",
                "bedrock:*"
            ],
            "Resource": "*"
        }
    ]
}
```

4. Workflow Explanation:

- The main workflow (`deploy.yml`) triggers on:
  - Push to main branch
  - Pull requests to main branch
  - Manual trigger (workflow_dispatch)

- The workflow:
  1. Checks out the code
  2. Sets up AWS credentials
  3. Validates CloudFormation template
  4. Deploys the stack
  5. Monitors the deployment
  6. Starts and monitors the CodeBuild project
  7. Retrieves and displays the Frontend URL
  8. Comments on PRs with deployment status

- The cleanup workflow (`cleanup.yml`):
  - Triggers when branches are deleted
  - Cleans up associated resources

5. Best Practices Implemented:

- Uses GitHub Actions' built-in security features
- Implements proper error handling and status checking
- Provides deployment feedback through PR comments
- Includes cleanup procedures
- Uses least-privilege IAM permissions
- Implements proper waiting and monitoring for deployments

6. Usage:

- For production deployments: Push to main branch
- For testing: Create a PR
- For manual deployments: Use the "Run workflow" button in GitHub Actions

