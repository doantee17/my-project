pipeline {
  agent any
  environment {
    AWS_REGION = "ap-southeast-1"
    ECR_REGISTRY = "591313757404.dkr.ecr.ap-southeast-1.amazonaws.com"
    ECR_REPO = "${ECR_REGISTRY}/test1"
    CLUSTER_NAME = "test1"
    SERVICE_NAME = "test2-service"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Get Commit Hash') {
      steps {
        script {
          def IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          if (!IMAGE_TAG) { error "IMAGE_TAG is empty – aborting pipeline" }
          echo "Using image tag: ${IMAGE_TAG}"
          env.IMAGE_TAG = IMAGE_TAG
        }
      }
    }

    stage('Build Docker') {
      steps {
        sh """
          set -e
          docker build -t ${ECR_REPO}:${IMAGE_TAG} .
        """
      }
    }

    stage('Login to ECR') {
      steps {
        withCredentials([usernamePassword(credentialsId: '1707', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
          sh '''
            set -e
            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
          '''
        }
      }
    }

    stage('Tag & Push') {
      steps {
        sh """
          set -e
          docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_REPO}:latest
          docker push ${ECR_REPO}:${IMAGE_TAG}
          docker push ${ECR_REPO}:latest
        """
      }
    }

    stage('Prepare Task Definition') {
      steps {
        script {
          def taskDefFile = "ecs-task-def-${IMAGE_TAG}.json"
          def tpl = ''
          if (fileExists('ecs-task-def-template.json')) {
            tpl = readFile('ecs-task-def-template.json')
          } else {
            echo "WARNING: template not found in workspace — using embedded fallback"
            tpl = '''{
  "family": "test2",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "container1",
      "image": "<FULL_IMAGE>",
      "memory": 512,
      "cpu": 256,
      "essential": true,
      "portMappings": [
        { "containerPort": 3000, "hostPort": 3000, "protocol": "tcp" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/test1",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::591313757404:role/ecsTaskExecutionRole"
}'''
          }
          def replaced = tpl.replaceAll('<FULL_IMAGE>', "${ECR_REPO}:${IMAGE_TAG}")
          writeFile file: taskDefFile, text: replaced
          sh "echo '---- TASK DEF ----'; cat ${taskDefFile}; echo '------------------'"
        }
      }
    }

    stage('Register & Deploy') {
      steps {
        withCredentials([usernamePassword(credentialsId: '1707', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
          script {
            def taskDefFile = "ecs-task-def-${IMAGE_TAG}.json"
            def arn = sh(script: """
              set -e
              aws ecs register-task-definition --cli-input-json file://${taskDefFile} --query 'taskDefinition.taskDefinitionArn' --output text || true
            """, returnStdout: true).trim()
            echo "register returned: '${arn}'"
            if (!arn || arn == "None") {
              echo "Register failed — dumping debug output:"
              sh "aws ecs register-task-definition --cli-input-json file://${taskDefFile} --debug || true"
              error "Register-task-definition failed, aborting"
            }
            sh """
              aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --task-definition ${arn} --force-new-deployment
            """
          }
        }
      }
    }
  } // stages
  post {
    success { echo "CI/CD pipeline completed successfully!" }
    failure { echo "Pipeline failed! Check logs." }
    always {
      sh 'docker logout || true'
      sh 'rm -f ecs-task-def-*.json || true'
    }
  }
}
