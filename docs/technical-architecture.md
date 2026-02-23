# Architecture technique recommandée

## 1) Frontend
- **React + TypeScript**.
- Rendu canvas: **WebGL (PixiJS)** ou **Canvas 2D optimisé**.
- Store local: Zustand/Redux Toolkit + normalized entities.
- Command pattern pour undo/redo.

## 2) Synchronisation temps réel
- Modèle de données événementiel + **CRDT (Yjs)**.
- Transport: WebSocket (ou WebRTC pour présence ponctuelle).
- Backend sync server dédié (rooms par board).
- Persistence CRDT snapshots + updates incrémentaux.

## 3) Backend applicatif
- API REST/GraphQL pour auth, boards, permissions, exports.
- Service permissions (RBAC + link sharing).
- Service commentaires / notifications.
- Queue asynchrone pour exports et traitement lourd.

## 4) Base de données
- PostgreSQL pour entités métiers (users, workspaces, boards, ACL).
- Stockage objets (S3 compatible) pour assets image/fichiers.
- Redis pour présence temps réel et sessions rapides.

## 5) Infra / DevOps
- Docker + déploiement Kubernetes (ou Fly/Render en phase early).
- Observabilité: OpenTelemetry + Grafana + Sentry.
- Feature flags pour rollout progressif.

## 6) Modèle de données simplifié
- Workspace
- Board
- BoardObject (type, style, geometry, zIndex, metadata)
- CommentThread / Comment
- PermissionGrant
- Snapshot / EventLog

## 7) Risques & mitigations
- **Performance canvas**: virtualisation + culling + batching draw calls.
- **Conflits d'édition**: CRDT + lock visuel optimiste uniquement pour UX.
- **Coût infra**: limiter fréquence snapshots et compacter events.

