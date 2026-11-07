# Sécurité

## Signaler une faille

Merci de **ne pas ouvrir d'issue publique**. Utilisez le signalement privé de GitHub
(onglet *Security* → *Report a vulnerability*) en décrivant le problème et comment le reproduire.
Je réponds sous 7 jours.

## Ce que l'application protège

SolidWave tourne entièrement dans le navigateur : pas de serveur applicatif, pas de base de données,
aucun fichier envoyé chez nous.

- **Fichiers importés** : lus localement, jamais exécutés (un SVG est analysé comme géométrie puis
  affiché en image, ses scripts ne tournent pas). Taille limitée (SVG 5 Mo, images 25 Mo, 40 Mpx).
- **Photo → 3D, mode Rapide** : tout reste sur l'appareil.
- **Photo → 3D, mode IA 360°** : la photo est envoyée au service de calcul externe, avec la propre
  connexion du visiteur (OAuth 2 + PKCE, sans secret). Le jeton est conservé 8 h maximum dans le
  navigateur et supprimé à la déconnexion.
- **En-têtes** : Content-Security-Policy stricte avec nonce par requête (`proxy.ts`), HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`).

## Pour les contributeurs

- Aucun secret dans le code : variables d'environnement uniquement, `.env*` est ignoré par git.
- Toute nouvelle origine externe doit être ajoutée explicitement à la CSP dans `proxy.ts`.
- `npm audit` avant chaque mise en production ; Dependabot propose les mises à jour chaque semaine.
