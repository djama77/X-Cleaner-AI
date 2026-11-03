# Workflow de nettoyage avec validation obligatoire

## État de cette branche

Cette étape prépare une politique conservatrice et une liste de candidats. Elle ne supprime aucune publication et ne se connecte pas au compte X.

## Périmètre initial

- Détecter uniquement les marqueurs explicites `automatically checked by fllwrs.com` et `automatically checked by fillwrs.com`.
- Ne jamais considérer un tweet personnel comme supprimable sur la seule base de son âge, de sa brièveté ou d'une classification IA.
- Afficher le texte intégral, la date et l'identifiant de chaque candidat.
- Exiger une sélection manuelle et une seconde confirmation écrite.
- Rejeter tout identifiant qui ne figure pas dans la liste de candidats affichée.
- Dédupliquer les identifiants.

## Architecture avant toute suppression réelle

1. Importer l'archive officielle X localement et conserver l'original intact.
2. Générer la liste de candidats avec `lib/cleanup-policy.ts`.
3. L'utilisateur coche individuellement les publications à examiner.
4. Afficher un écran récapitulatif avec texte, date, identifiant et nombre exact.
5. Demander la phrase exacte `JE CONFIRME LA SUPPRESSION`.
6. Dans une phase ultérieure seulement, utiliser l'API officielle X avec OAuth 2.0 et le droit de suppression documenté.
7. Juste avant chaque action, revérifier le compte propriétaire, l'identifiant, le jeton et la présence de l'approbation.
8. Enregistrer le résultat de chaque tentative sans enregistrer de jeton secret.

## Garde-fous non négociables

- Aucun traitement en arrière-plan et aucune suppression en lot sans écran récapitulatif.
- Aucun endpoint de suppression n'est activé dans cette branche.
- Aucun secret OAuth ou clé API dans Git, le navigateur ou les journaux.
- Les catégories IA « automatisée », « personnelle » et « incertaine » sont des aides au tri, jamais une autorisation de suppression.
- Les tweets personnels, professionnels et incertains sont exclus par défaut.
- Si l'API X ou les permissions nécessaires ne sont pas disponibles, le produit reste en mode analyse/export et explique la limite.

## Vérifications à effectuer

- Cas positif : marqueur fllwrs exact.
- Cas positif : marqueur fillwrs exact.
- Cas négatif : texte similaire sans domaine exact.
- Cas négatif : tweet personnel sans marqueur.
- Identifiants dupliqués.
- Sélection vide.
- Identifiant qui n'est pas dans la liste des candidats.
- Phrase de confirmation absente ou incorrecte.

Aucune fusion dans `main` ni activation d'une suppression réelle n'est incluse dans cette étape.
