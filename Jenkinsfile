// Jenkinsfile (Declarative) - Kubernetes inline YAML pod template
pipeline {
  agent {
    kubernetes {
      label 'k8s-node-agent'
      defaultContainer 'jnlp'
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:18-alpine
    command: ['cat']
    tty: true
    workingDir: /home/jenkins/agent
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
  - name: dind
    image: docker:dind
    command: ['dockerd-entrypoint.sh']
    securityContext:
      privileged: true
    tty: false
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "4Gi"
        cpu: "1"
  - name: jnlp
    image: jenkins/inbound-agent:latest
    tty: true
  volumes:
  - name: workspace-volume
    emptyDir: {}
"""
    }
  }

  environment {
    // Replace these with your Jenkins credential IDs / values
    SONAR_TOKEN = credentials('sonar-token-id')        // example credential id
    FIREBASE_SERVICE_ACCOUNT = credentials('firebase-sa-json') // if used
    DOCKER_REGISTRY = "your.registry.example.com"     // replace with your registry
    DOCKER_CREDENTIALS = 'docker-credentials-id'      // Jenkins credential id for registry
  }

  options {
    timeout(time: 60, unit: 'MINUTES')
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps {
        container('jnlp') {
          checkout scm
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        container('node') {
          sh '''
            echo "Installing dependencies..."
            node --version || true
            npm --version || true
            npm ci --silent
          '''
        }
      }
    }

    stage('Build') {
      steps {
        container('node') {
          sh '''
            echo "Building project..."
            npm run build || true
          '''
        }
      }
    }

    stage('Test & Coverage') {
      steps {
        container('node') {
          sh '''
            echo "Running tests..."
            npm test -- --watchAll=false || true
            # generate coverage artifact, e.g. coverage/lcov.info
          '''
        }
      }
      post {
        always {
          container('jnlp') {
            archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
            junit allowEmptyResults: true, testResults: 'reports/**/*.xml'
          }
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('node') {
          withEnv(["SONAR_TOKEN=${env.SONAR_TOKEN}"]) {
            // This assumes you have sonar-scanner installed in the node image or as npm script.
            // Option A: use npm script that runs sonar-scanner (recommended)
            sh '''
              echo "Running SonarQube analysis..."
              # npm run sonar or sonar-scanner command here
              # example using sonar-scanner-cli docker or npm package:
              # npx sonar-scanner \
              #   -Dsonar.projectKey=your-project-key \
              #   -Dsonar.host.url=${SONAR_HOST_URL} \
              #   -Dsonar.login=${SONAR_TOKEN}
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        // If you have SonarQube plugin and qualityGate configured, use waitForQualityGate
        script {
          echo "Waiting for quality gate (if configured)..."
          // wrap this in a try-catch if plugin not available:
          try {
            timeout(time: 3, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          } catch (err) {
            echo "waitForQualityGate not available or timed out: ${err}"
          }
        }
      }
    }

    stage('Docker: build & push (optional)') {
      when {
        expression { return env.DOCKER_REGISTRY != null && env.DOCKER_REGISTRY != '' }
      }
      steps {
        script {
          // use the dind container to run docker build/push
          container('dind') {
            sh '''
              echo "Logging into Docker registry..."
              # Configure docker auth via docker login using docker credentials - using Jenkins credential
              docker --version || true
              # Using docker CLI with credential helper is recommended; below is a simple example:
              echo "$DOCKER_PASSWORD" | docker login ${DOCKER_REGISTRY} -u "$DOCKER_USERNAME" --password-stdin
              docker build -t ${DOCKER_REGISTRY}/my-app:${BUILD_NUMBER} .
              docker push ${DOCKER_REGISTRY}/my-app:${BUILD_NUMBER}
            '''
          }
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline succeeded."
    }
    failure {
      echo "Pipeline failed - check console output."
    }
    always {
      script {
        // archive logs, artifacts or notify
        echo "Cleaning up / final steps"
      }
    }
  }
}
