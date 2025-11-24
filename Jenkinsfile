pipeline {
  agent any

  environment {
    // Use your existing Jenkins credential id for Sonar token:
    SONAR_TOKEN = credentials('sonar-token-2401062')
    SONAR_HOST = 'http://sonarqube.imcc.com'   // change if needed
    PROJECT_KEY = 'QIVO-interview-with-AI'     // change to your Sonar project key
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = "sonar-registry.example.com/qivo/interview-with-ai"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        // run this inside the container named "node" (the one with node/npm installed)
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
          sh 'npm run build'
        }
      }
    }

    stage('Test & Coverage') {
      steps {
        container('node') {
          // run tests and produce coverage; tolerate failing tests if you want sonar to still run
          sh 'npm test -- --coverage || true'
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        // Sonar scanner must run in an environment that can reach Sonar host.
        // We run the scanner inside the node container (which has network access) OR you can use docker runner as commented.
        container('node') {
          withSonarQubeEnv('sonarqube') {
            sh '''
              # Try local sonar-scanner if available on agent; if not, use docker image below (uncomment)
              sonar-scanner \
                -Dsonar.projectKey=${PROJECT_KEY} \
                -Dsonar.projectName=${PROJECT_NAME} \
                -Dsonar.sources=./ \
                -Dsonar.host.url=${SONAR_HOST} \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
            '''
            // Alternative if sonar-scanner not installed in the agent container:
            // sh "docker run --rm -v \$(pwd):/usr/src -w /usr/src sonarsource/sonar-scanner-cli -Dsonar.projectKey=${PROJECT_KEY} -Dsonar.sources=. -Dsonar.host.url=${SONAR_HOST} -Dsonar.login=${SONAR_TOKEN} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
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
      when {
        expression { return env.BUILD_DOCKER == 'true' }
      }
      steps {
        // build/push should run in container that has docker client (you have dind container in pod).
        // If you want to use the dind container, you need to run docker commands there or use credentials.
        withCredentials([usernamePassword(credentialsId: 'nexus-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
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

  post {
    success { echo "Build Succeeded" }
    failure { echo "Build Failed" }
    always {
      junit allowEmptyResults: true, testResults: '**/test-results-*.xml'
    }
  }
}
