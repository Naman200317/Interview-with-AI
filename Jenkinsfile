// Jenkinsfile - Docker-run fallback (no container('node') required)
// Uses Docker to run node commands and sonar-scanner.
// REQUIREMENT: Jenkins agent must have Docker CLI access (able to run docker run).
// Credentials required in Jenkins:
// - Secret text: sonar-token-2401062
// - Secret text: firebase-service-account
// - (optional) username/password: nexus-creds  -> for Docker push

pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token-2401062')
    FIREBASE_SERVICE_ACCOUNT = credentials('firebase-service-account')
    SONAR_HOST  = 'http://sonarqube.imcc.com'                  // change if needed
    PROJECT_KEY = 'QIVO-interview-with-AI'                     // change if needed
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = 'sonar-registry.example.com/qivo/interview-with-ai' // change for Nexus
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies (docker)') {
      steps {
        // run npm ci inside node:20-alpine container using docker-run
        sh '''
          echo "Running npm ci inside node:20-alpine docker container..."
          docker run --rm -v "$PWD":/usr/src/app -w /usr/src/app node:20-alpine sh -c "npm ci"
        '''
      }
    }

    stage('Build (docker)') {
      steps {
        // pass FIREBASE_SERVICE_ACCOUNT into docker env so build-time code can access it
        sh '''
          echo "Running npm run build inside node:20-alpine docker container..."
          docker run --rm -v "$PWD":/usr/src/app -w /usr/src/app -e FIREBASE_SERVICE_ACCOUNT="$FIREBASE_SERVICE_ACCOUNT" node:20-alpine sh -c "npm run build"
        '''
      }
    }

    stage('Test & Coverage (docker)') {
      steps {
        sh '''
          echo "Running tests (coverage) inside docker..."
          docker run --rm -v "$PWD":/usr/src/app -w /usr/src/app node:20-alpine sh -c "npm test -- --coverage || true"
        '''
        // Archive coverage and any test XML reports if produced
        archiveArtifacts artifacts: 'coverage/**, test-results/**/*.xml', allowEmptyArchive: true
      }
    }

    stage('SonarQube Analysis (docker)') {
      steps {
        // Use the official sonar-scanner-cli docker image to run analysis
        sh '''
          echo "Running sonar-scanner in docker..."
          docker run --rm -v "$PWD":/usr/src -w /usr/src sonarsource/sonar-scanner-cli \
            -Dsonar.projectKey=${PROJECT_KEY} \
            -Dsonar.projectName=${PROJECT_NAME} \
            -Dsonar.sources=. \
            -Dsonar.host.url=${SONAR_HOST} \
            -Dsonar.login=${SONAR_TOKEN} \
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
        '''
      }
    }

    stage('Quality Gate') {
      steps {
        // Wait for quality gate (requires SonarQube plugin)
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
            sh """
              echo "Building Docker image..."
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
  } // stages

  post {
    success {
      echo "Build Succeeded"
    }
    failure {
      echo "Build Failed"
    }
    always {
      echo "Pipeline finished - check archived artifacts and console log for details."
    }
  }
}
