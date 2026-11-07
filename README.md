# SolidWave

**Votre logo, en relief.** SolidWave transforme un SVG ou un PNG en objet 3D à taille réelle, éclairé comme en studio photo, directement dans le navigateur.

- Volumes extrudé, empilé, gonflé ou en relief, en vrais millimètres
- 29 finitions (verre, liquide, métal, couleur) ou les couleurs mêmes du logo
- Ambiances en un clic, éclairage de studio, ombres douces et sols miroirs
- Exports PNG jusqu’en 4K, vidéo 360° en MP4, GLB (web, RA) et STL (impression 3D)
- Tout tourne en local : aucun fichier n’est envoyé à un serveur

Créé par [Josué Agbeta](https://github.com/Josueagbeta0).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres commandes : `npm run build`, `npm run lint`, `npm run typecheck`.

## Technique

Next.js 16, React 19, Tailwind CSS v4, three.js avec React Three Fiber et drei. Le pipeline (vectorisation, géométrie, matières, éclairage, rendu et exports) est décrit dans [CLAUDE.md](CLAUDE.md).

## Licence

[MIT](LICENSE) © 2026 Josué Agbeta
