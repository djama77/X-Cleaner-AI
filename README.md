# X-Cleaner-AI

Application Next.js pour connecter un compte X, retrouver les publications anciennes et préparer leur nettoyage.

## Fonctionnalités

- Connexion officielle X avec OAuth 2.0 Authorization Code + PKCE.
- Lecture du compte connecté et de ses publications.
- Cible de nettoyage fixée aux publications datées **avant le 1er janvier 2023**.
- Suppression par lots de 10 après confirmation explicite.
- Vérification côté serveur de l'identifiant du propriétaire et de la date réelle auprès de X avant chaque suppression.
- Jetons stockés dans un cookie HttpOnly chiffré AES-256-GCM; aucun jeton transmis au navigateur JavaScript.
- Déconnexion et suppression du cookie de session.
- Les publications à partir du 1er janvier 2023 sont refusées par le serveur.

## Configuration X Developer

Créer un projet et une application X avec OAuth 2.0 activé. Configurer le type d'application en Web App (client confidentiel) ou un client public compatible PKCE.

Dans les paramètres d'authentification X, enregistrer exactement cette URL de callback :

`https://VOTRE-DOMAINE-VERCEL/api/x/callback`

Scopes minimaux demandés :
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

## Variables Vercel

Configurer côté serveur (Production et Preview si nécessaire) :

- `X_CLIENT_ID` : Client ID fourni par X.
- `X_CLIENT_SECRET` : Client Secret si l'application X est un client confidentiel; ne jamais l'exposer côté navigateur.
- `X_REDIRECT_URI` : URL exacte ci-dessus.
- `X_TOKEN_ENCRYPTION_KEY` : 64 caractères hexadécimaux (32 octets aléatoires).
- `GROQ_API_KEY` : facultative, pour l'ancien module d'analyse d'archive.

Ne jamais publier de clés ou jetons dans GitHub, dans le code client ou dans une capture d'écran.

## Limites importantes

La timeline API ne garantit pas de fournir l'intégralité de l'historique ancien d'un compte. L'interface récupère jusqu'à 3 200 publications par pagination; si le compte en possède davantage, certaines publications anciennes peuvent manquer. L'archive officielle X pourra être nécessaire pour compléter la liste. Les droits d'accès, quotas et coûts éventuels dépendent de l'offre API X du compte développeur.

La suppression est définitive. Le mode automatique ne commence qu'après une confirmation qui affiche le nombre de publications ciblées. Les appels de suppression sont ensuite envoyés par lots de 10. Chaque identifiant est revalidé côté serveur; les publications récentes et celles qui n'appartiennent pas au compte connecté ne peuvent pas être supprimées par cette route.

## Tests

`npm test`

Les tests vérifient notamment la date limite, la propriété du compte et le rejet des identifiants/dates invalides.
