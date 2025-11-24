// Jenkinsfile for Next.js / Node project
// Reference screenshot (SonarQube setup): /mnt/data/Screenshot 2025-11-24 143625.png
// IMPORTANT: Replace placeholders (URLs, project keys, image names) with your actual values.

pipeline {
  agent any

  environment {
    // Jenkins credentials IDs (create these in Jenkins > Credentials)
    SONAR_TOKEN = credentials('sonar-token-2401062')   // Secret text: Sonar token
    NEXUS_USER  = credentials('NEXUS_USER')    // Username/password credential id for Nexus (username)
    // If you store username/password as separate credentials, change usage accordingly
    NEXUS_PASS  = credentials('NEXUS_PASS')    // Secret text or password - if using two separate entries
    // Or use a single "username/password" credential and retrieve as below (see notes)
    SONAR_HOST = 'http://sonarqube.imcc.com'   // change to your SonarQube URL
    PROJECT_KEY = 'QIVO-interview-with-AI'     // change to your Sonar project key
    PROJECT_NAME = 'QIVO-interview-with-AI'
    DOCKER_IMAGE = "sonar-registry.example.com/qivo/interview-with-ai" // change to your Nexus Docker repo
  }

  tools {
    // Optional: If Jenkins has NodeJS tool configured, put the tool name here
    // nodejs 'NodeJS' 
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
        // Next.js build
        sh 'npm run build'
      }
    }

    stage('Test & Coverage') {
      steps {
        // run tests (do not fail pipeline on test errors if you want sonar to still run: adjust as needed)
        sh '''
          npm test -- --coverage || true
        '''
      }
      post {
        always {
          // Try to archive coverage report (if produced)
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        // Use the SonarQube plugin context. The name here must match SonarQube server name in Jenkins Configure System.
        // If you didn't add Sonar server in Jenkins, you'll need to set SONAR_HOST & SONAR_TOKEN directly.
        withSonarQubeEnv('sonarqube') {
          sh """
            # If sonar-scanner is installed on agent:
            sonar-scanner \
              -Dsonar.projectKey=${PROJECT_KEY} \
              -Dsonar.projectName=${PROJECT_NAME} \
              -Dsonar.sources=./ \
              -Dsonar.host.url=${SONAR_HOST} \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
          """
        }
        // If your agent does not have sonar-scanner installed, use the Docker image instead:
        // sh "docker run --rm -v \$(pwd):/usr/src -w /usr/src sonarsource/sonar-scanner-cli -Dsonar.projectKey=${PROJECT_KEY} -Dsonar.sources=. -Dsonar.host.url=${SONAR_HOST} -Dsonar.login=${SONAR_TOKEN} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
      }
    }

    stage('Quality Gate') {
      steps {
        // wait for SonarQube Quality Gate result (requires SonarQube plugin)
        timeout(time: 2, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Docker: build & push (optional)') {
      when {
        expression { return env.BUILD_DOCKER == 'true' } // set BUILD_DOCKER=true as pipeline parameter or env to enable
      }
      steps {
        script {
          // If Nexus uses docker registry, login and push
          sh """
            echo "Building Docker image..."
            docker build -t ${DOCKER_IMAGE}:${env.BUILD_NUMBER} .
          """
          // Login to Nexus docker registry (example). If Nexus requires username/password, use credentials binding:
          // If you stored Nexus credentials as "username/password" type with id 'nexus-creds', use:
          // withCredentials([usernamePassword(credentialsId: 'nexus-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) { ... }
          withCredentials([usernamePassword(credentialsId: 'nexus-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
            sh """
              echo "Logging in to Nexus Docker registry..."
              docker login -u "$NEXUS_USER" -p "$NEXUS_PASS" sonar-registry.example.com || exit 1
              docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:latest
              docker push ${DOCKER_IMAGE}:${env.BUILD_NUMBER}
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
    unstable {
      echo "Build Unstable"
    }
    failure {
      echo "Build Failed"
    }
    always {
      // Archive logs, test reports, etc.
      junit allowEmptyResults: true, testResults: '**/test-results-*.xml'
    }
  }
}
