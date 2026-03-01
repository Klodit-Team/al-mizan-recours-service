# Al-Mizan – Service Recours

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS" />
</p>

<p align="center">
  Microservice de gestion des recours des soumissionnaires<br/>
  <strong>Loi 23-12 – Articles 82 à 84 – Marchés publics algériens</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10-red?logo=nestjs" />
  <img src="https://img.shields.io/badge/Prisma-7-blue?logo=prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/RabbitMQ-3.13-orange?logo=rabbitmq" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
</p>

---

## Description

Microservice responsable de la gestion complète du cycle de vie des **recours** dans le système Al-Mizan. Un recours est une contestation déposée par un soumissionnaire non retenu suite à une attribution provisoire de marché public.

**Cadre légal :** Loi 23-12 relative aux marchés publics, Articles 82-84 :

- Délai de dépôt : 10 jours après notification de l'attribution provisoire
- Délai de réponse de la Commission : 10 jours ouvrables
- Décision : acceptation ou rejet motivé

---

## Architecture

```
recours-service/
├── src/
│   ├── main.ts                          # Bootstrap + Swagger
│   ├── app.module.ts
│   ├── config/                          # Configuration app & RabbitMQ
│   ├── prisma/                          # PrismaService (connexion BDD)
│   ├── health/                          # Endpoints de santé
│   ├── common/
│   │   ├── constants/                   # Constantes métier
│   │   ├── decorators/                  # @CurrentUser
│   │   ├── exceptions/                  # Exceptions métier personnalisées
│   │   ├── filters/                     # Filtre global d'exceptions HTTP
│   │   ├── interceptors/                # Logging + format de réponse uniforme
│   │   └── pipes/                       # Validation pagination
│   └── recours/
│       ├── controllers/                 # RecoursController (REST)
│       ├── dto/                         # CreateRecoursDto, FilterRecoursDto...
│       ├── entities/                    # RecoursEntity, PaginatedRecoursEntity
│       ├── events/                      # RecoursEventPublisher (RabbitMQ)
│       ├── interfaces/                  # IRecoursRepository
│       ├── repositories/                # RecoursRepository (Prisma)
│       ├── services/                    # RecoursService + services SOLID
│       └── recours.module.ts
├── prisma/
│   ├── schema.prisma                    # Modèles : Recours, ExamenRecours, HistoriqueStatut
│   ├── migrations/                      # Migrations SQL
│   └── seed.ts                          # Données de test
├── test/                                # Tests E2E
├── k8s/                                 # Manifestes Kubernetes
├── Dockerfile
└── docker-compose.yml
```

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- Yarn 4 (`corepack enable`)
- Docker Desktop
- PostgreSQL (local ou [Neon](https://neon.tech))
- RabbitMQ (via Docker ou local)

### Installation

```bash
# 1. Cloner et installer les dépendances
yarn install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir les valeurs dans .env (DATABASE_URL, RABBITMQ_URL...)

# 3. Générer le client Prisma
yarn prisma generate

# 4. Créer les tables en base
yarn prisma db push

# 5. Insérer les données de test (optionnel)
yarn prisma:seed
```

### Lancer en développement

```bash
yarn start:dev
```

Le service démarre sur `http://localhost:8008`

---

## Docker (l'option préférable pour démare le service)

```bash
# Lancer tous les services (NestJS + PostgreSQL + RabbitMQ)
docker-compose up -d --build

# Appliquer les migrations
docker-compose exec recours-service yarn prisma migrate deploy

# Insérer les données de test
docker-compose exec recours-service yarn prisma:seed

# Voir les logs
docker-compose logs -f recours-service

# Arrêter
docker-compose down
```

## API REST

**Base URL :** `http://localhost:8008/recours-service/v1`

| Méthode | Endpoint                  | Description                                     |
| ------- | ------------------------- | ----------------------------------------------- |
| `POST`  | `/recours`                | Déposer un recours                              |
| `GET`   | `/recours`                | Lister les recours (avec filtres et pagination) |
| `GET`   | `/recours/:id`            | Détail d'un recours avec historique             |
| `PATCH` | `/recours/:id`            | Modifier un recours (statut DEPOSE uniquement)  |
| `PATCH` | `/recours/:id/examiner`   | Ouvrir l'examen du recours                      |
| `PATCH` | `/recours/:id/statuer`    | Rendre la décision finale (ACCEPTE / REJETE)    |
| `GET`   | `/recours/delais-expires` | Recours dont le délai légal est dépassé         |
| `GET`   | `/recours/statistiques`   | Compteurs par statut                            |
| `GET`   | `/health`                 | Santé du service                                |

### Documentation Swagger

```
http://localhost:8008/recours-service/v1/docs
```

### Cycle de vie d'un recours

```
DEPOSE ──► EN_EXAMEN ──► ACCEPTE
                    └──► REJETE
```

---

## Base de données

### Modèles Prisma

| Table               | Description                          |
| ------------------- | ------------------------------------ |
| `recours`           | Recours principal                    |
| `examen_recours`    | Examen par la Commission des marchés |
| `historique_statut` | Traçabilité complète des transitions |

### Commandes utiles

```bash
# Générer le client après modification du schema
yarn prisma generate

# Créer une migration
yarn prisma migrate dev --name nom_migration

# Appliquer les migrations (production)
yarn prisma migrate deploy

# Interface visuelle
yarn prisma studio
```

---

## Événements RabbitMQ

Le service publie les événements suivants sur l'exchange `al_mizan_events` :

| Événement           | Déclencheur                     |
| ------------------- | ------------------------------- |
| `recours.depose`    | Nouveau recours déposé          |
| `recours.en_examen` | Examen ouvert par la Commission |
| `recours.accepte`   | Recours accepté                 |
| `recours.rejete`    | Recours rejeté                  |

---

## Tests

```bash
# Tests unitaires
yarn test

# Tests unitaires en mode watch
yarn test:watch

# Couverture de code
yarn test:cov

# Tests E2E
yarn test:e2e
```

## Kubernetes

```bash
# Créer le namespace
kubectl create namespace al-mizan-core

# Déployer
kubectl apply -f k8s/deployment.yaml -n al-mizan-core

# Vérifier
kubectl get pods -n al-mizan-core
```

---

## Stack technique

| Technologie | Version | Rôle              |
| ----------- | ------- | ----------------- |
| NestJS      | 10      | Framework HTTP    |
| Prisma      | 7       | ORM               |
| PostgreSQL  | 16      | Base de données   |
| RabbitMQ    | 3.13    | Message broker    |
| TypeScript  | 5       | Langage           |
| Swagger     | 7       | Documentation API |
| Jest        | 29      | Tests             |
| Docker      | -       | Conteneurisation  |

---

## Équipe

**KLODIT Team** – Projet Al-Mizan
Système de gestion des marchés publics – République Algérienne Démocratique et Populaire

---

## Licence

UNLICENSED – Usage interne uniquement.
