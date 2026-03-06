# Board SaaS — Whiteboard collaboratif temps réel

Application full-stack prête pour exécution locale et déploiement, inspirée de Miro/FigJam.

## Stack
- **Frontend**: React + TypeScript + Vite + React Konva
- **Backend**: Express + TypeScript + Socket.IO + Prisma
- **DB**: SQLite en local (PostgreSQL possible en prod via Prisma)
- **Temps réel**: Socket.IO (présence, curseurs, sync)
- **Stockage fichiers**: disque local (`apps/server/uploads`) en dev

## Fonctionnalités implémentées
- Authentification (inscription / connexion / déconnexion)
- Gestion des boards (CRUD + lien de partage)
- Canvas infini (pan/zoom)
- Objets : sticky notes, texte, rectangle, cercle, ligne, flèche, connecteur, emoji, sticker, image, widgets graphiques
- Multi-sélection, déplacement, redimensionnement, rotation
- Undo / redo
- Autosave board (toutes les 2.5s)
- Collaboration temps réel (sync, présence, curseurs)
- Gestion d’images (paste, drag&drop, upload)
- Gestion de fichiers (upload, listing, suppression ; PDF/PNG/JPG supportés)
- Widgets graphiques (bar/line/pie) à partir de datasets manuels par défaut

## Lancer en local
```bash
npm install
cp apps/server/.env.example apps/server/.env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Compte seed: `demo@board.local` / `demo1234`

## Scripts
```bash
npm run dev
npm run build
npm run lint
npm run db:migrate
```

## Déploiement production
### Option rapide (1 VM / Docker)
1. Build:
```bash
npm ci
npm run db:generate
npm run build
```
2. Variables d’environnement backend (`apps/server/.env`):
- `PORT`
- `DATABASE_URL` (PostgreSQL recommandé en prod)
- `JWT_SECRET`
- `CORS_ORIGIN`
- `UPLOAD_DIR` (ou mount volume persistant)

3. Exécuter migrations Prisma en prod:
```bash
npm run prisma:migrate -w apps/server
```
4. Démarrer serveur API:
```bash
npm run start -w apps/server
```
5. Servir frontend build (`apps/web/dist`) via Nginx/Cloudflare Pages/Vercel (en configurant `VITE_API_URL`).

### Architecture recommandée en prod
- API + Socket.IO sur une même cible avec sticky sessions (ou adapter via Redis adapter Socket.IO)
- PostgreSQL managé
- Stockage fichiers S3 compatible (remplacer disque local)
- Reverse proxy TLS (Nginx/Caddy)
- Monitoring (Sentry + logs centralisés)
