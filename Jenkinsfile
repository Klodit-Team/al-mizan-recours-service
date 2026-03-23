pipeline {

  agent any

  // ── Variables globales ────────────────────────────────────────────────
  environment {
    SERVICE_NAME    = 'recours-service'
    IMAGE_NAME      = "harbor.almizan.dz/al-mizan/${SERVICE_NAME}"
    K8S_NAMESPACE   = 'al-mizan-core'
    REGISTRY_CREDS  = 'harbor-registry-credentials'
    KUBECONFIG_CRED = 'kubeconfig-al-mizan'
    NOTIFY_EMAIL    = 'klodit-na@esi.dz'
    NODE_ENV        = 'test'
  }

  // ── Outils ───────────────────────────────────────────────────────────
  tools {
    nodejs 'NodeJS-20'
  }

  // ── Options ──────────────────────────────────────────────────────────
  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  // ── Paramètres ───────────────────────────────────────────────────────
  parameters {
    string(
      name: 'IMAGE_TAG',
      defaultValue: '',
      description: 'Tag image Docker (vide = numéro de build automatique)'
    )
    booleanParam(
      name: 'SKIP_TESTS',
      defaultValue: false,
      description: 'Passer les tests (urgence uniquement)'
    )
    booleanParam(
      name: 'DEPLOY_TO_K8S',
      defaultValue: true,
      description: 'Déployer sur Kubernetes après le build'
    )
  }

  stages {

    // ── Stage 1: Checkout ───────────────────────────────────────────────
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = bat(
            script: 'git rev-parse --short HEAD',
            returnStdout: true
          ).trim()
          env.IMAGE_TAG = params.IMAGE_TAG ?:
            "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
          env.IMAGE_FULL = "${env.IMAGE_NAME}:${env.IMAGE_TAG}"
          echo "Image: ${env.IMAGE_FULL}"
        }
      }
    }

    // ── Stage 2: Install ────────────────────────────────────────────────
    stage('Install') {
      steps {
        bat 'node --version && npm --version'
        bat 'npm ci --legacy-peer-deps'
      }
    }

    // ── Stage 3: Lint ───────────────────────────────────────────────────
    stage('Lint') {
      when { expression { !params.SKIP_TESTS } }
      steps {
        bat 'npm run lint'
      }
    }

    // ── Stage 4: Tests unitaires ────────────────────────────────────────
    stage('Tests') {
      when { expression { !params.SKIP_TESTS } }
      steps {
        bat 'npx prisma generate'
        bat 'npm run test:cov -- --forceExit'
      }
      post {
        always {
          junit(
            testResults: 'coverage/junit*.xml',
            allowEmptyResults: true
          )
          publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'coverage/lcov-report',
            reportFiles: 'index.html',
            reportName: 'Coverage Report'
          ])
        }
      }
    }

    // ── Stage 5: Build Docker ───────────────────────────────────────────
    stage('Build Docker') {
      steps {
        script {
          docker.build(
            env.IMAGE_FULL,
            "--label git-commit=${env.GIT_COMMIT_SHORT} ."
          )
        }
      }
    }

    // ── Stage 6: Push Harbor ────────────────────────────────────────────
    stage('Push Harbor') {
      steps {
        script {
          docker.withRegistry(
            "https://harbor.almizan.dz",
            env.REGISTRY_CREDS
          ) {
            def img = docker.image(env.IMAGE_FULL)
            img.push()
            img.push('latest')
          }
        }
      }
    }

    // ── Stage 7: Deploy Kubernetes ──────────────────────────────────────
    stage('Deploy K8s') {
      when { expression { params.DEPLOY_TO_K8S } }
      steps {
        withKubeConfig([credentialsId: env.KUBECONFIG_CRED]) {
          // Appliquer Redis si pas déjà présent
          bat "kubectl apply -f k8s/redis.yaml -n ${env.K8S_NAMESPACE}"

          // Mettre à jour l'image du deployment
          bat """
            kubectl set image deployment/${env.SERVICE_NAME} \
              ${env.SERVICE_NAME}=${env.IMAGE_FULL} \
              -n ${env.K8S_NAMESPACE}
          """

          // Patcher l'imagePullPolicy pour toujours tirer la nouvelle image
          bat """
            kubectl patch deployment ${env.SERVICE_NAME} \
              -n ${env.K8S_NAMESPACE} \
              -p '{"spec":{"template":{"spec":{"containers":[{"name":"${env.SERVICE_NAME}","imagePullPolicy":"Always"}]}}}}'
          """

          // Attendre que le rollout soit terminé (timeout 5 min)
          bat """
            kubectl rollout status deployment/${env.SERVICE_NAME} \
              -n ${env.K8S_NAMESPACE} \
              --timeout=300s
          """
        }
      }
    }

    // ── Stage 8: Smoke Test ─────────────────────────────────────────────
    stage('Smoke Test') {
      when { expression { params.DEPLOY_TO_K8S } }
      steps {
        withKubeConfig([credentialsId: env.KUBECONFIG_CRED]) {
          script {
            // Port-forward temporaire pour tester le health check
            bat """
              kubectl port-forward svc/${env.SERVICE_NAME} 18008:8008 \
                -n ${env.K8S_NAMESPACE} &
              sleep 5
              curl -f http://localhost:18008/recours-service/v1/health/live \
                || (kill %1 && exit 1)
              kill %1
            """
          }
        }
      }
    }

  }

  // ── Post-actions ──────────────────────────────────────────────────────
  post {

    success {
      echo "Pipeline réussi: ${env.IMAGE_FULL}"
      emailext(
        subject: "Al-Mizan] ${env.SERVICE_NAME} déployé — Build #${env.BUILD_NUMBER}",
        body: """
<h2>Déploiement réussi</h2>
<table>
  <tr><td><b>Service</b></td><td>${env.SERVICE_NAME}</td></tr>
  <tr><td><b>Image</b></td><td>${env.IMAGE_FULL}</td></tr>
  <tr><td><b>Commit</b></td><td>${env.GIT_COMMIT_SHORT}</td></tr>
  <tr><td><b>Build</b></td><td>#${env.BUILD_NUMBER}</td></tr>
  <tr><td><b>Durée</b></td><td>${currentBuild.durationString}</td></tr>
  <tr><td><b>Logs</b></td><td><a href="${env.BUILD_URL}">${env.BUILD_URL}</a></td></tr>
</table>
        """,
        mimeType: 'text/html',
        to: env.NOTIFY_EMAIL
      )
    }

    failure {
      echo "Pipeline échoué: Build #${env.BUILD_NUMBER}"
      emailext(
        subject: "[Al-Mizan] ÉCHEC ${env.SERVICE_NAME} — Build #${env.BUILD_NUMBER}",
        body: """
<h2>Échec du pipeline</h2>
<table>
  <tr><td><b>Service</b></td><td>${env.SERVICE_NAME}</td></tr>
  <tr><td><b>Build</b></td><td>#${env.BUILD_NUMBER}</td></tr>
  <tr><td><b>Commit</b></td><td>${env.GIT_COMMIT_SHORT}</td></tr>
  <tr><td><b>Stage échoué</b></td><td>${env.STAGE_NAME}</td></tr>
  <tr><td><b>Logs</b></td><td><a href="${env.BUILD_URL}console">${env.BUILD_URL}console</a></td></tr>
</table>
<p>L'ancienne version reste active sur Kubernetes.</p>
        """,
        mimeType: 'text/html',
        to: env.NOTIFY_EMAIL
      )
    }

    always {
      // Nettoyer les images Docker locales pour libérer l'espace
      bat "docker rmi ${env.IMAGE_FULL} || true"
      cleanWs()
    }

  }
}