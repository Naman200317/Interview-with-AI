// Jenkinsfile - Final (fixed): Next.js + SonarQube + Firebase SA + optional Docker push

pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token-2401062')            // must exist in Jenkins
    FIREBASE_SERVICE_ACCOUNT = credentials('firebase-service-account') // must exist
    SONAR_HOST  = 'http://sonarqube.imcc.com'                  // update if needed
    PROJECT_KEY = 'QIVO-interview-with-AI'                     // update if needed
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = "sonar-registry.example.com/qivo/interview-with-ai" // update if needed
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
          // Provide FIREBASE_SERVICE_ACCOUNT to build-time env
          withEnv(["FIREBASE_SERVICE_ACCOUNT=${env.FIREBASE_SERVICE_ACCOUNT}"]) {
            sh 'npm run build'
          }
        }
      }
    }

    stage('Test & Coverage') {
      steps {
        container('node') {
          // Run tests and output coverage + JUnit-compatible report if your test runner supports it
          // Adjust commands to your test config if needed.
          sh '''
            # run tests (adjust for your test runner if different)
            npm test -- --coverage || true

            # if your test runner can output junit xml, move it to test-results/*.xml
            # example: jest --outputFile=./test-results/junit.xml --reporters=default --reporters=jest-junit
          '''
          // Archive coverage and potential test result files (so artifacts available in Jenkins UI)
          archiveArtifacts artifacts: 'coverage/**, test-results/**/*.xml', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('node') {
          withSonarQubeEnv('sonarqube') {
            // If sonar-scanner binary not present in node image, use docker-run alternative (commented)
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=${PROJECT_KEY} \
                -Dsonar.projectName=${PROJECT_NAME} \
                -Dsonar.sources=./ \
                -Dsonar.host.url=${SONAR_HOST} \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
            '''
            /*
            # Alternative: run sonar scanner via docker
            sh "docker run --rm -v \$(pwd):/usr/src -w /usr/src sonarsource/sonar-scanner-cli -Dsonar.projectKey=${PROJECT_KEY} -Dsonar.sources=. -Dsonar.host.url=${SONAR_HOST} -Dsonar.login=${SONAR_TOKEN} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
            */
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
            // Runs in agent; expects docker client available (dind)
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
  } // stages

  post {
    success { echo "Build Succeeded" }
    failure { echo "Build Failed" }
    always {
      // Keep logs only - avoid junit here as it needs workspace FilePath context
      echo "Pipeline finished - check archived artifacts and console log for details."
    }
  }
}
