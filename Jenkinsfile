pipeline {
    agent any
    environment {
        AWS_REGION = "ap-southeast-1"
        ECR_REPO = "591313757404.dkr.ecr.ap-southeast-1.amazonaws.com/test1"
        CLUSTER_NAME = "test1"
        SERVICE_NAME = "test-service-8k1bg1mo"
        IMAGE_TAG = ""
        TASK_DEF_ARN = ""
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm  // Chỉ checkout từ repo my-project.git
            }
        }
        stage('Get Commit Hash') {
            steps {
                script {
                    def tag = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE_TAG = tag
                    echo "Using image tag: ${env.IMAGE_TAG}"
                }
            }
        }
        stage('Build Docker') {
            steps {
                sh "docker build -t $$ {env.ECR_REPO}: $${env.IMAGE_TAG} ."
            }
        }
        stage('Login to ECR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${env.ECR_REPO}
                    """
                }
            }
        }
        stage('Tag & Push') {
            steps {
                sh "docker tag $$ {env.ECR_REPO}: $${env.IMAGE_TAG} ${env.ECR_REPO}:latest"
                sh "docker push $$ {env.ECR_REPO}: $${env.IMAGE_TAG}"
                sh "docker push ${env.ECR_REPO}:latest"
            }
        }
        stage('Register ECS Task Definition') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    script {
                        def taskDefFile = "ecs-task-def-${env.IMAGE_TAG}.json"
                        sh """
                            sed 's|<FULL_IMAGE>|$$ {env.ECR_REPO}: $${env.IMAGE_TAG}|g' ecs-task-def-template.json > ${taskDefFile}
                        """
                        def arn = sh(script: """
                            aws ecs register-task-definition \
                                --cli-input-json file://${taskDefFile} \
                                --query taskDefinition.taskDefinitionArn \
                                --output text
                        """, returnStdout: true).trim()
                        env.TASK_DEF_ARN = arn
                        echo "TASK_DEF_ARN: ${env.TASK_DEF_ARN}"
                    }
                }
            }
        }
        stage('Deploy ECS') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws ecs update-service \
                            --cluster ${CLUSTER_NAME} \
                            --service ${SERVICE_NAME} \
                            --task-definition ${env.TASK_DEF_ARN} \
                            --force-new-deployment
                    """
                }
            }
        }
    }
    post {
        success {
            echo "CI/CD pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed! Check logs."
        }
        always {
            sh 'docker logout'
            sh 'rm -f *.json'
        }
    }
}