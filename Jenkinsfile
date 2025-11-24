// Jenkinsfile - Ready for your Next.js project
// Assumptions:
// - Kubernetes agent pod template contains a container named "node" with node/npm installed (as in your logs).
// - Sonar token stored as Secret text with ID: sonar-token-2401062
// - Firebase service account JSON stored as Secret text with ID: firebase-service-account
// - SonarQube server entry in Jenkins Configure System named 'sonarqube' (or change withSonarQubeEnv name)
// - If you want Docker push, create username/password credential with id 'nexus-creds' and set BUILD_DOCKER=true

pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token-2401062')   // your Sonar token credential id
    SONAR_HOST  = 'http://sonarqube.imcc.com'          // change if different
    PROJECT_KEY = 'QIVO-interview-with-AI'            // change to your Sonar project key
    PROJECT_NAME = 'QIVO-interview-with-AI'
    FIREBASE_SERVICE_ACCOUNT = credentials('firebase-service-account') // JSON secret (string)
    DOCKER_IMAGE = "sonar-registry.example.com/qivo/interview-with-ai" // change for Nexus
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
          // If your app needs certain env like NEXT_PUBLIC_* for build, set them here via environment or credentials
          // We pass FIREBASE_SERVICE_ACCOUNT as env so your app can parse it at build-time if required.
          withEnv(["FIREBASE_SERVICE_ACCOUNT=${env.FIREBASE_SERVICE_ACCOUNT}"]) {
            sh 'npm run build'
          }
        }
      }
    }

    stage('Test & Coverage') {
      steps {
        container('node') {
          // run tests; tolerates failing tests if you prefer sonar to still run
          sh 'npm test -- --coverage || true'
        }
      }
      post {
        always { archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('node') {
          withSonarQubeEnv('sonarqube') {
            // If sonar-scanner is not installed, uncomment Docker-run alternative below
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
            # Docker alternative (if scanner not installed):
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
          // This step expects docker client available in agent (dind container), or adjust accordingly.
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
  } // stages

  post {
    success { echo "Build Succeeded" }
    failure { echo "Build Failed" }
    always {
      junit allowEmptyResults: true, testResults: '**/test-results-*.xml'
    }
  }
}
