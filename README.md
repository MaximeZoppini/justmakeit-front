# JustMakeIt - Frontend (Next.js)

Interface utilisateur interactive pour la production musicale collaborative assistée par IA.

---

## Stack Technique

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router)
- **Audio Engine** : [Tone.js](https://tonejs.github.io/) pour le séquençage et le rendu audio.
- **Collaboration** : SockJS & STOMP pour la synchronisation temps réel.
- **Styling** : Tailwind CSS 4.
- **Composants** : React 19 avec support complet du TypeScript.

---

Créer un fichier `.env.local` à la racine de ce dossier.

> Ce fichier est ignoré par Git pour des raisons de sécurité. Pour le développement, vous pouvez vous baser sur les valeurs du fichier `.env.example` situé dans le dossier `justmakeit-back/`.

```env
# Dev local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws-justmakeit

# Production (via Traefik + Cloudflare)
# NEXT_PUBLIC_WS_URL=wss://ton-domaine/ws-justmakeit
```

---

## Fonctionnalités Front

- **Grille de séquençage 16-step** : Interface intuitive pour composer des patterns.
- **Support Audio Temps Réel** : Lecture fluide sans latence grâce à Tone.js.
- **Collaboration Visuelle** : Les notes s'activent/désactivent en direct selon les actions des autres utilisateurs du salon.
- **Gestion des Samples** : Upload de fichiers `.wav` et visualisation immédiate.

---

## Démarrage Local

1.  Installer les dépendances :
    ```bash
    npm install
    ```
2.  Lancer le serveur de développement :
    ```bash
    npm run dev
    ```
    > L'interface sera accessible sur [http://localhost:3000](http://localhost:3000).

_Built by [Maxime Zoppini] - 2026_
