# al-mizan-recours-service

> **Service de Gestion des Recours** — Traitement des recours légaux des opérateurs économiques contre les attributions provisoires, conformément aux Art. 82-84 de la loi algérienne 23-12.

---

## Table des matières

1. [Aperçu](#aperçu)
2. [Technologies](#technologies)
3. [Architecture & Réseau](#architecture--réseau)
4. [Base de données](#base-de-données)
5. [Variables d'environnement](#variables-denvironnement)
6. [API REST](#api-rest)
7. [Messagerie RabbitMQ](#messagerie-rabbitmq)
8. [Commandes utiles](#commandes-utiles)
9. [Docker](#docker)

---

## Aperçu

`al-mizan-recours-service` gère la procédure légale de recours d'un opérateur économique (OE) non retenu qui conteste une attribution provisoire dans le cadre d'un appel d'offres.

Conformément aux **Art. 82-84 de la Loi 23-12** :
- Un OE dispose de **10 jours** après la publication de l'attribution provisoire pour déposer un recours.
- Chaque recours est examiné par un examinateur désigné.
- À l'expiration des 10 jours (avec ou sans recours), l'attribution provisoire devient **définitive**.

Le service :
- Gère les recours (dépôt, examen, décision).
- Lance un **timer légal de 10 jours** à la réception de l'événement `ao.attribution.provisoire`.
- Émet `recours.periode.expired` au terme du délai → `appel-offres-service` clôture l'AO.

Le service fonctionne en **NestJS** avec **Prisma ORM** sur **MySQL** et un cache **Redis**.

---

## Technologies

| Technologie         | Version  | Rôle                                             |
|---------------------|----------|--------------------------------------------------|
| Node.js             | 20 LTS   | Runtime                                          |
| TypeScript          | ^5.3     | Langage                                          |
| NestJS              | ^10.3    | Framework (modules, DI, microservices)           |
| Prisma ORM          | 7.4.2    | ORM + migrations MySQL (via `prisma migrate`)    |
| MySQL               | 8.x      | Base de données principale (`recours_db`)        |
| Redis (ioredis)     | ^5.3     | Cache (TTL configurable, sessions)               |
| amqplib             | ^0.10    | Client RabbitMQ                                  |
| amqp-connection-manager | ^4.1 | Reconnexion automatique RabbitMQ               |
| class-validator     | ~0.14    | Validation des DTOs                              |
| @nestjs/swagger     | ^7.3     | Documentation OpenAPI                            |
| Jest                | ^29.7    | Tests unitaires & e2e                            |
| Yarn (Berry)        | 4.9.2    | Gestionnaire de paquets                          |

---

## Architecture & Réseau

```
API Gateway (:3000) ──► recours-service (:8009)
                                │
                                ├── MySQL    (mysql:3306 → recours_db)
                                ├── Redis    (redis:6379)
                                └── RabbitMQ (rabbitmq:5672)
```

> ⚠️ **Note** : Le Dockerfile expose le port `8008`, mais le service écoute sur `8009` (configuré via `PORT`). La variable `PORT=8009` dans le `.env` prend le dessus.

- **Port exposé** : `8009`
- **Réseau Docker** : `al-mizan-network`
- **Nom du conteneur** : `recours-service`
- **Swagger UI** : `http://localhost:8009/api`

---

## Base de données

**Moteur** : MySQL 8 · **Schema** : `recours_db`

> ⚠️ Ce service utilise `prisma migrate deploy` (migrations versionnées), pas `prisma db push`.

### Modèles Prisma

#### `Recours`
| Champ                  | Type           | Description                                     |
|------------------------|----------------|-------------------------------------------------|
| `id`                   | String (UUID)  | PK                                              |
| `appelOffreId`         | String         | Réf. externe vers appel-offres-service          |
| `operateurId`          | String         | Réf. externe vers users-service                 |
| `attributionProvisoireId` | String      | Réf. externe vers attribution (appel-offres)    |
| `reference`            | String         | Référence unique du recours                     |
| `motif`                | String         | Motif textuel du recours                        |
| `piecesJointesUrls`    | Json?          | URLs MinIO présignées des pièces jointes        |
| `dateDepot`            | DateTime       | Date de dépôt                                   |
| `dateLimiteReponse`    | DateTime       | Date limite légale (+10j Art. 83)               |
| `statut`               | StatutRecours  | DEPOSE → EN_EXAMEN → ACCEPTE/REJETE             |
| `decision`             | String?        | Texte de la décision finale                     |
| `motifDecision`        | String?        | Motif de la décision                            |
| `dateDecision`         | DateTime?      | Date de la décision                             |

#### `ExamenRecours`
| Champ          | Type     | Description                                   |
|----------------|----------|-----------------------------------------------|
| `id`           | String   | PK                                            |
| `recoursId`    | String   | FK → Recours (unique, 1:1)                    |
| `examinateurId`| String   | Réf. externe vers users-service               |
| `notes`        | String?  | Notes d'examen                                |
| `recommandation`| String? | Recommandation de l'examinateur               |
| `dateExamen`   | DateTime?| Date d'examen                                 |

#### `HistoriqueStatut`
| Champ         | Type          | Description                       |
|---------------|---------------|-----------------------------------|
| `recoursId`   | String        | FK → Recours                      |
| `ancienStatut`| StatutRecours?|                                   |
| `nouveauStatut`| StatutRecours|                                   |
| `acteurId`    | String        | Qui a effectué la transition      |
| `commentaire` | String?       |                                   |

### Cycle de vie d'un recours

```
DEPOSE → EN_EXAMEN → ACCEPTE
                   → REJETE
```

---

## Variables d'environnement

```env
PORT=8009
NODE_ENV=development

# Délai légal de réponse (Art. 83)
RECOURS_DELAI_REPONSE_JOURS=10

# MySQL
DATABASE_URL=mysql://root:password@localhost:3306/recours_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CACHE_TTL=300

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=al-mizan.events
```

> ⚠️ En production (Docker), remplacer `localhost` par les noms de conteneurs : `mysql`, `redis`, `rabbitmq`.

---

## API REST

Base URL (via Gateway) : `http://localhost:3000/recours`  
Base URL (directe) : `http://localhost:8009`  
Swagger : `http://localhost:8009/api`

### Recours

| Méthode  | Endpoint                   | Auth | Description                                        |
|----------|----------------------------|------|----------------------------------------------------|
| `POST`   | `/recours`                 | Oui  | Déposer un recours (OE non retenu)                 |
| `GET`    | `/recours/:id`             | Oui  | Détail d'un recours                                |
| `GET`    | `/recours?aoId={id}`       | Oui  | Lister les recours pour un AO                      |
| `GET`    | `/recours?operateurId={id}`| Oui  | Lister les recours d'un opérateur                  |

### Examen & Décision

| Méthode  | Endpoint                     | Auth | Description                                      |
|----------|------------------------------|------|--------------------------------------------------|
| `POST`   | `/recours/:id/examen`        | Oui  | Initier l'examen du recours (passage EN_EXAMEN)  |
| `PATCH`  | `/recours/:id/decision`      | Oui  | Rendre une décision (ACCEPTE / REJETE)           |

### Historique

| Méthode  | Endpoint                     | Auth | Description                     |
|----------|------------------------------|------|---------------------------------|
| `GET`    | `/recours/:id/historique`    | Oui  | Historique des transitions      |

---

## Messagerie RabbitMQ

**Exchange** : `al-mizan.events` (type: `topic`, durable: `true`)

### Événements publiés

| Routing Key                 | Déclencheur                           | Payload clés                                    |
|-----------------------------|---------------------------------------|--------------------------------------------------|
| `recours.depose`            | Recours déposé                        | `recoursId`, `appelOffreId`, `operateurId`, `reference` |
| `recours.en_examen`         | Recours passé EN_EXAMEN               | `recoursId`, `statut`, `timestamp`               |
| `recours.accepte`           | Recours accepté                       | `recoursId`, `appelOffreId`, `decision`          |
| `recours.rejete`            | Recours rejeté                        | `recoursId`, `appelOffreId`, `decision`          |
| `recours.periode.expired`   | Timer 10j expiré (sans recours ou après décision) | `aoId` → `appel-offres-service` clôture l'AO |

### Événements consommés

| Routing Key                    | Source               | Action réalisée                                            |
|--------------------------------|----------------------|------------------------------------------------------------|
| `ao.attribution.provisoire`    | appel-offres-service | Démarrage du timer légal de 10 jours pour l'AO            |

#### Flux légal complet :

```
appel-offres-service
  └─[ao.attribution.provisoire]──► recours-service
                                        │
                                        ├─ Timer 10j démarré
                                        │
                                        ├─ Si recours déposé : processus DEPOSE → EN_EXAMEN → ACCEPTE/REJETE
                                        │                        [recours.*] ──► notification-service
                                        │
                                        └─ À expiration (10j) :
                                           [recours.periode.expired {aoId}] ──► appel-offres-service
                                                                                    │
                                                                              AO : ATTRIBUE → CLOTURE
                                                                              [ao.attribution.definitive] ──► notification-service
```

---

## Commandes utiles

### Développement local

```bash
# Installer les dépendances (Yarn Berry)
yarn install

# Démarrer en mode dev (hot-reload NestJS)
yarn start:dev

# Compiler TypeScript
yarn build

# Démarrer en production
yarn start:prod
```

### Base de données

```bash
# Générer le client Prisma
yarn prisma:generate

# Créer et appliquer une migration versionnée
yarn prisma:migrate:dev

# Déployer les migrations en production
yarn prisma:migrate:deploy

# Seeder les données initiales
yarn prisma:seed

# Ouvrir Prisma Studio
yarn prisma:studio
```

### Tests

```bash
yarn test               # Tests unitaires
yarn test:e2e           # Tests end-to-end
yarn test:cov           # Couverture de code
```

---

## Docker

### Build de l'image

```bash
docker build -t al-mizan-recours-service .
```

### Notes importantes sur le Dockerfile

- Image de base : `node:20-alpine`
- **`openssl` installé explicitement** pour Prisma sur Alpine.
- Utilise `npm install --legacy-peer-deps` pour la compatibilité des dépendances.
- Au démarrage : `npx prisma migrate deploy && node dist/src/main`
- Utilise les **migrations versionnées** (pas `prisma db push`), idéal pour la production.

### Déploiement via docker-compose

```bash
docker-compose up -d recours-service
docker-compose logs -f recours-service
```

---

*Maintenu par l'équipe Al-Mizan — voir `al-mizan-deployments` pour la configuration de déploiement complète.*
