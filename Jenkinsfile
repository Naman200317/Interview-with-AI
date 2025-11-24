// Jenkinsfile - container('node') version (recommended)
pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token-2401062')
    FIREBASE_SERVICE_ACCOUNT = credentials('firebase-service-account')
    SONAR_HOST  = 'http://sonarqube.imcc.com'
    PROJECT_KEY = 'QIVO-interview-with-AI'
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = 'sonar-registry.example.com/qivo/interview-with-ai'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install Dependencies') {
      steps {
        container('node') {
          sh 'node --version || true'
          sh 'npm --version || true'
          sh 'npm ci'
        }
      }
    }

    stage('Build') {
      steps {
        container('node') {
          withEnv(["FIREBASE_SERVICE_ACCOUNT=${env.FIREBASE_SERVICE_ACCOUNT}"]) {
            sh 'npm run build'
          }
        }
      }
    }

    stage('Test & Coverage') {
      steps {
        container('node') {
          sh 'npm test -- --coverage || true'
          archiveArtifacts artifacts: 'coverage/**, test-results/**/*.xml', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('node') {
          withSonarQubeEnv('sonarqube') {
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=${PROJECT_KEY} \
                -Dsonar.projectName=${PROJECT_NAME} \
                -Dsonar.sources=./ \
                -Dsonar.host.url=${SONAR_HOST} \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 2, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Docker: build & push (optional)') {
      when { expression { return env.BUILD_DOCKER == 'true' } }
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: 'nexus-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
            // run docker commands in dind container if you configure access, else adjust
            sh """
              docker build -t ${DOCKER_IMAGE}:${env.BUILD_NUMBER} .
              echo "$NEXUS_PASS" | docker login sonar-registry.example.com -u "$NEXUS_USER" --password-stdin
              docker push ${DOCKER_IMAGE}:${env.BUILD_NUMBER}
              docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:latest
              docker push ${DOCKER_IMAGE}:latest
            """
          }
        }
      }
    }
  }

  post {
    success { echo "Build Succeeded" }
    failure { echo "Build Failed" }
    always { echo "Pipeline finished - check archived artifacts and console log for details." }
  }
}
