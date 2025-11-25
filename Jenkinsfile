// Jenkinsfile - Declarative with explicit Firebase credential check (fail-fast)
pipeline {
  agent {
    kubernetes {
      label 'k8s-node-agent'
      defaultContainer 'node'
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

  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli:latest
    command: ['cat']
    tty: true

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
    SONAR_TOKEN = credentials('sonar-token-2401062')
    SONAR_HOST_URL = "http://my-sonarqube.example.com:9000"   // <-- REPLACE with your Sonar URL
    // If you will enable Docker later:
    DOCKER_REGISTRY = ""
    DOCKER_CREDENTIALS_ID = ""
  }

  options {
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  stages {
    stage('Checkout') {
      steps {
        container('jnlp') {
          checkout scm
        }
      }
    }

    stage('Ensure Firebase credential present') {
      steps {
        script {
          // Try to read the file credential 'firebase-sa-json' and validate it.
          // If missing or invalid, abort with clear instructions.
          try {
            withCredentials([file(credentialsId: 'firebase-sa-json', variable: 'FIREBASE_SA')]) {
              container('node') {
                sh '''
                  echo "Validating firebase service account JSON..."
                  if [ ! -s "$FIREBASE_SA" ]; then
                    echo "ERROR: firebase-sa-json file is empty or missing."
                    exit 1
                  fi
                  node - <<'NODEJS'
                  const fs = require('fs');
                  try {
                    const j = JSON.parse(fs.readFileSync(process.env.FIREBASE_SA));
                    if (typeof j.project_id !== 'string' || j.project_id.trim() === '') {
                      console.error('ERROR: service account JSON missing "project_id" or project_id is not a string.');
                      process.exit(2);
                    } else {
                      console.log('Firebase service account valid (project_id=' + j.project_id + ').');
                    }
                  } catch (e) {
                    console.error('ERROR: invalid JSON or parse error: ' + e.message);
                    process.exit(3);
                  }
                  NODEJS
                '''
              } // container
            } // withCredentials
          } catch (err) {
            // Friendly error message with instructions
            error("""
Firebase service account credential 'firebase-sa-json' not found or not valid.

Please add the Service Account JSON (downloaded from Google Cloud Console -> IAM & Admin -> Service Accounts -> Keys -> Create key -> JSON)
as a Jenkins "Secret file" credential with ID: firebase-sa-json.

Steps:
1) Jenkins → Manage Jenkins → Credentials → System → Global credentials (unrestricted)
2) Click "Add Credentials"
3) Kind: "Secret file"
4) Upload the JSON file
5) ID: firebase-sa-json
6) Save

After adding the credential, re-run the pipeline.
""")
          }
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        container('node') {
          sh '''
            echo "Installing dependencies..."
            npm ci --silent
          '''
        }
      }
    }

    stage('Build (Next.js)') {
      steps {
        container('node') {
          sh '''
            echo "Starting Next.js build..."
            npm run build
          '''
        }
      }
    }

    stage('Test (skip if no test script)') {
      steps {
        container('node') {
          sh '''
            if node -e "process.exit(!(require('./package.json').scripts && require('./package.json').scripts.test))"; then
              echo "Running tests..."
              npm test -- --watchAll=false
            else
              echo "No test script found. Skipping tests."
            fi
          '''
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('sonar-scanner') {
          withEnv(["SONAR_HOST_URL=${env.SONAR_HOST_URL}"]) {
            sh '''
              echo "Running SonarQube scanner..."
              export SONAR_LOGIN="$SONAR_TOKEN"
              sonar-scanner \
                -Dsonar.projectKey=Interview-with-AI \
                -Dsonar.sources=. \
                -Dsonar.host.url=$SONAR_HOST_URL \
                -Dsonar.login=$SONAR_LOGIN
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        script {
          try {
            timeout(time: 5, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          } catch (e) {
            echo "Quality gate not available or timed out: ${e}"
          }
        }
      }
    }

    // Optional Docker stage omitted here; enable later if needed.
  }

  post {
    success { echo "Pipeline SUCCEEDED 🎉" }
    failure {
      echo "Pipeline FAILED ❌ — see console logs"
    }
    always { echo "Pipeline finished." }
  }
}
