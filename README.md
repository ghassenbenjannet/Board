# Board — Plan pour un whiteboard collaboratif type Figma / Miro / Confluence

Ce dépôt contient un **plan de construction concret** pour créer une application de whiteboard collaborative orientée produit + architecture + roadmap d'exécution.

## Objectif
Construire une application qui combine :
- la liberté de canvas de **Miro**,
- la fluidité de design de **Figma**,
- l'intégration documentaire de **Confluence Whiteboard**.

## Contenu
- `docs/product-spec.md` : spécification produit (fonctionnelle) complète.
- `docs/technical-architecture.md` : architecture technique recommandée (frontend, backend, sync, infra).
- `docs/roadmap.md` : plan de livraison en 4 phases avec priorités.

## Démarrage conseillé
1. Valider la phase MVP (`docs/roadmap.md`).
2. Cadrer les limites du scope V1 (éviter de vouloir tout faire d'un coup).
3. Lancer un POC de synchronisation temps réel (CRDT + WebSocket) avant d'implémenter toute l'UI.

