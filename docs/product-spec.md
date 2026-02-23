# Spécification Produit — Whiteboard collaboratif

## 1) Positionnement
Un canvas infini collaboratif permettant de:
- brainstormer,
- structurer (diagrammes, mapping),
- créer des wireframes,
- reviewer et commenter en temps réel.

## 2) Personas
- **Product Manager**: ateliers, priorisation, user journey.
- **Designer**: wireframes, composants, flows.
- **Engineering**: architecture, RFC visuelles.
- **Leadership**: synthèse et prise de décision.

## 3) Fonctionnalités cœur (MVP)
1. **Canvas infini** (pan/zoom fluide, grille, snap).
2. **Objets de base**: sticky notes, rectangles, texte, flèches, image upload.
3. **Sélection/manipulation**: multi-select, alignement, duplication, grouping.
4. **Collaboration temps réel**: curseurs live, présence, édition simultanée.
5. **Commentaires**: threads par objet/canvas.
6. **Historique**: undo/redo local + versioning de board.
7. **Permissions**: owner/editor/viewer + partage par lien.

## 4) Fonctionnalités V2
- templates (retro, user story map, architecture).
- composants réutilisables + bibliothèques.
- mode présentation.
- import/export (PNG, SVG, PDF).
- widgets (timer, vote, tableau kanban léger).

## 5) Fonctionnalités "niveau Figma/Miro"
- multiplayer performant sur gros boards (>10k objets).
- smart connectors et auto-layout board-level.
- API + intégrations (Jira, Notion, Confluence, Slack).
- intelligence assistée (regroupement auto, résumé, naming).

## 6) Exigences non-fonctionnelles
- Latence collaboration cible: <120ms perçue.
- Reconnexion transparente + offline queue.
- Sauvegarde incrémentale continue.
- Sécurité entreprise: SSO SAML/OIDC, audit logs.

## 7) KPI
- Time-to-first-board < 60s.
- Taux de collaboration multi-utilisateur > 40% des boards.
- Rétention équipe (WAU/MAU) > 45%.

