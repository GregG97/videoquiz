# Quiz·Vidéo

Application web en un seul fichier HTML qui génère un quiz interactif à partir d'une vidéo YouTube, grâce à l'API Claude (Anthropic).

## Fonctionnalités

- **QCM** : 5 questions, 3, 4 ou 5 choix par question, correction instantanée avec explication.
- **Réponse libre** : 5 questions ouvertes, corrigées par Claude sur le sens (l'orthographe n'est pas pénalisée).
- Interface sombre façon pellicule, suivi des étapes (Lien → Format → Génération → Quiz).
- Score final avec code couleur.

## Fonctionnement

1. Coller le lien d'une vidéo YouTube (formats `watch?v=`, `youtu.be/`, `shorts/`, `embed/`).
2. Choisir le format du quiz.
3. Claude (`claude-sonnet-4-6`) recherche des informations sur la vidéo via l'outil de recherche web et génère les questions au format JSON.

## Limites connues

- **Clé API** : l'application appelle `https://api.anthropic.com/v1/messages` sans clé. Elle fonctionne telle quelle dans un artefact Claude.ai ; ailleurs (GitHub Pages, ouverture locale), il faut passer par un petit serveur intermédiaire qui ajoute la clé — ne jamais mettre de clé API dans ce fichier public.
- **Vidéos peu connues ou récentes** : si la vidéo n'est pas indexée par la recherche web, la génération échoue (« pas assez d'informations »). Solution de contournement : copier la transcription YouTube (« Afficher la transcription ») et la fournir à Claude.

## Fichiers

- `index.html` — toute l'application (HTML, CSS, JavaScript).
