pipeline {
    agent any
    environment {
        AWS_REGION = "ap-southeast-1"  // Sửa theo thông tin trước (region của ECR/ECS)
        ECR_REPO = "591313757404.dkr.ecr.ap-southeast-1.amazonaws.com/test1"  // ECR repo từ lab trước
        CLUSTER_NAME = "test1"  // Tên ECS Cluster từ thông tin trước
        SERVICE_NAME = "test-service-8k1bg1mo"  // Tên ECS Service từ thông tin trước
        CONTAINER_NAME = "container1"  // Tên container từ script trước (thay "container1")
        IMAGE_TAG = ""  // Khai báo trước để dùng toàn pipeline
        TASK_DEF_ARN = ""  // Khai báo luôn
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/doantee17/my-project.git'  // Sửa repo theo lab (shoppemini)
            }
        }
        stage('Get Commit Hash') {
            steps {
                script {
                    IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    echo "Using image tag: ${IMAGE_TAG}"
                }
            }
        }
        stage('Build Docker') {
            steps {
                sh "docker build -t ${ECR_REPO}:${IMAGE_TAG} ."  // Sửa tag trực tiếp ECR URI (không dùng "exam2")
            }
        }
        stage('Login to ECR') {
            steps {
                withCredentials([usernamePassword(credentialsId: '1707', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
                    """  // Sửa multi-line để tránh conflict $
                }
            }
        }
        stage('Tag & Push') {
            steps {
                sh "docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_REPO}:latest"  // Thêm tag latest cho ECS dễ pull
                sh "docker push ${ECR_REPO}:${IMAGE_TAG}"
                sh "docker push ${ECR_REPO}:latest"
            }
        }
        stage('Register ECS Task Definition') {
            steps {
                withCredentials([usernamePassword(credentialsId: '1707', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    script {
                        def taskDefFile = "ecs-task-def-${IMAGE_TAG}.json"
                        sh """
                            sed 's|<IMAGE_TAG>|${ECR_REPO}:${IMAGE_TAG}|g' ecs-task-def-template.json > ${taskDefFile}
                        """  // Sửa: Thay placeholder bằng full image URI (ECR + tag)
                        TASK_DEF_ARN = sh(script: """
                            aws ecs register-task-definition \
                                --cli-input-json file://${taskDefFile} \
                                --query taskDefinition.taskDefinitionArn \
                                --output text
                        """, returnStdout: true).trim()  // Sửa multi-line sh
                        echo "TASK_DEF_ARN: ${TASK_DEF_ARN}"
                    }
                }
            }
        }
        stage('Deploy ECS') {
            steps {
                withCredentials([usernamePassword(credentialsId: '1707',
                                                  usernameVariable: 'AWS_ACCESS_KEY_ID',
                                                  passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    script {
                        sh """
                            aws ecs update-service \
                                --cluster ${CLUSTER_NAME} \
                                --service ${SERVICE_NAME} \
                                --task-definition ${TASK_DEF_ARN} \
                                --force-new-deployment
                        """
                    }
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
            sh 'docker logout'  // Cleanup login
            sh 'rm -f *.json'  // Cleanup task def file
        }
    }
}
