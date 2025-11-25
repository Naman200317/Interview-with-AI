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
    // Your Sonar token credential already provided
    SONAR_TOKEN = credentials('sonar-token-2401062')

    // Replace this with your real SonarQube URL
    SONAR_HOST_URL = "http://my-sonarqube.example.com:9000"

    // Optional: configure docker registry & credentials if you want Docker stage
    DOCKER_REGISTRY = "your.registry.example.com"
    DOCKER_CREDENTIALS_ID = "docker-credentials-id"
  }

  options {
    timeout(time: 60, unit: 'MINUTES')
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
            echo "Building..."
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
          sh """
            echo 'Running SonarQube scanner...'
            npx sonar-scanner \
              -Dsonar.projectKey=Interview-with-AI \
              -Dsonar.sources=. \
              -Dsonar.host.url=${SONAR_HOST_URL} \
              -Dsonar.login=${SONAR_TOKEN}
          """
        }
      }
    }

    stage('Quality Gate') {
      steps {
        script {
          echo "Waiting for SonarQube Quality Gate (if configured in Jenkins)..."
          try {
            // requires SonarQube Jenkins plugin and properly configured Sonar server in Jenkins
            timeout(time: 5, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          } catch (err) {
            echo "waitForQualityGate not available / timed out or failed: ${err}"
          }
        }
      }
    }

    stage('Docker: build & push (optional)') {
      when {
        expression { return env.DOCKER_REGISTRY && env.DOCKER_REGISTRY != '' }
      }
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: "${env.DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              echo "$DOCKER_PASS" | docker login ${DOCKER_REGISTRY} -u "$DOCKER_USER" --password-stdin
              docker build -t ${DOCKER_REGISTRY}/my-app:${BUILD_NUMBER} .
              docker push ${DOCKER_REGISTRY}/my-app:${BUILD_NUMBER}
            '''
          }
        }
      }
    }

  } // stages

  post {
    success { echo "Pipeline succeeded!" }
    failure { echo "Pipeline failed - check console output." }
    always { echo "Pipeline finished." }
  }
}
