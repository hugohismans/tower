# Sniper

Tower defense pour mobile (et PC). L'écran est la fenêtre du sniper : il voit le désert
en perspective, le bâtiment à défendre et le mur devant. Des stickmen arrivent par la
gauche le long d'un couloir, se répartissent le long du mur et l'attaquent.
Tu dois tenir le plus de jours possible.

Deux styles graphiques au choix dans le menu : **Désert** (couleurs) et **Papier** (stylo bleu).

Pour jouer : ouvre `index.html` dans un navigateur (pas de build, pas de dépendance).

## Mode test

Bouton **Mode test** dans le menu : argent illimité (∞ $) et bouton **Jour suivant** en haut
pour sauter directement à la nuit. Le record n'est pas enregistré dans ce mode.

## Boucle de jeu

- **Jour** = un niveau. Les ennemis arrivent par la gauche pendant toute la journée
  (le soleil traverse le ciel). Le jour se termine quand tous sont morts.
- **Nuit** = boutique. Tu touches une prime (40 $ + 15 $ × jour) en plus de l'argent
  gagné en tuant des ennemis.
- **Défaite** quand le bâtiment tombe à 0 PV. Le mur protège le bâtiment tant qu'il tient.

## Contrôles

- Toucher un ennemi = tirer. Tête = ×2,5 dégâts (+2 $).
- Toucher une roquette en vol = l'intercepter (+4 $).
- Armes automatiques : garder le doigt appuyé.
- Toucher l'encadré de l'arme (ou `R`) = recharger. `P` / Échap = pause.

## Ennemis

| Ennemi | Arrive au jour | PV | Comportement |
|---|---|---|---|
| Épéiste | 1 | 40 | Frappe le mur au corps à corps |
| Mitrailleur | 2 | 65 | S'arrête à distance aléatoire (150-290 px) et tire en rafales |
| Cavalier | 4 | 90 | Très rapide, frappe fort au corps à corps |
| Colosse | 5 | 280 | Lent, énorme dégâts au mur |
| Lance-roquettes | 6 | 75 | Tire au-dessus du mur, directement sur le bâtiment |
| Tank | 8 | 1200 | Obus lourds sur le mur puis le bâtiment |

Les PV augmentent de 7 % par jour, le nombre d'ennemis aussi.

## Boutique de nuit

- **Bâtiment** : réparer le mur, renforcer le mur (Palissade → Béton armé, 6 niveaux),
  réparer le bâtiment, construire des étages (1 à 5, +300 PV chacun).
- **Tireurs** : tous cachés dans la maison, nombre illimité, prix fixe (achat par 1 ou par 10).
  Chaque type est débloqué par un étage et tire depuis cet étage.

  | Type | Étage requis | Prix | Tir |
  |---|---|---|---|
  | Tireur | 1 | 80 $ | 1 balle / 5 s, 25 dégâts, touche toujours |
  | Sniper | 2 | 250 $ | 1 balle / 5 s, 80 dégâts, 35 % de tirs à la tête (×2,5) |
  | Lance-roquettes | 3 | 600 $ | 1 roquette / 7 s, 160 dégâts de zone, vise les groupes et les tanks |
- **Ton arme** : dégâts, cadence, rechargement, et évolution
  Fusil de sniper → Sniper lourd (traverse 3 ennemis) → Fusil d'assaut → Minigun.
