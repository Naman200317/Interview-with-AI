// Jenkinsfile for Next.js / Node project (fixed - removed empty tools block)
// IMPORTANT: Replace placeholders (URLs, project keys, image names) with your actual values.

pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token-2401062')   // Secret text: Sonar token
    // If you use Nexus username/password, create a usernamePassword credential id 'nexus-creds'
    SONAR_HOST = 'http://sonarqube.imcc.com'   // change to your SonarQube URL
    PROJECT_KEY = 'QIVO-interview-with-AI'     // change to your Sonar project key
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = "sonar-registry.example.com/qivo/interview-with-ai" // change if using Docker push
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Test & Coverage') {
      steps {
        sh 'npm test -- --coverage || true'
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('sonarqube') {
          sh """
            sonar-scanner \
              -Dsonar.projectKey=${PROJECT_KEY} \
              -Dsonar.projectName=${PROJECT_NAME} \
              -Dsonar.sources=./ \
              -Dsonar.host.url=${SONAR_HOST} \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
          """
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
      when {
        expression { return env.BUILD_DOCKER == 'true' }
      }
      steps {
        script {
          sh "docker build -t ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ."
          withCredentials([usernamePassword(credentialsId: 'nexus-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
            sh """
              docker login -u "$NEXUS_USER" -p "$NEXUS_PASS" sonar-registry.example.com || exit 1
              docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:latest
              docker push ${DOCKER_IMAGE}:${env.BUILD_NUMBER}
              docker push ${DOCKER_IMAGE}:latest
            """
          }
        }
      }
    }
  }

  post {
    success { echo "Build Succeeded" }
    unstable { echo "Build Unstable" }
    failure { echo "Build Failed" }
    always {
      junit allowEmptyResults: true, testResults: '**/test-results-*.xml'
    }
  }
}
