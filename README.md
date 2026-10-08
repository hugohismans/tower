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

| Ennemi | Jour | PV | Comportement |
|---|---|---|---|
| Épéiste | 1 | 40 | Frappe le mur au corps à corps |
| Mitrailleur | 2 | 65 | S'arrête à distance aléatoire et tire en rafales |
| Cavalier | 4 | 90 | Très rapide, frappe fort |
| Colosse | 5 | 280 | Lent, énormes dégâts au mur |
| Lance-roquettes | 6 | 75 | Roquettes par-dessus le mur, sur le bâtiment (interceptables) |
| Bouclier | 7 | 90 | Corps protégé (15 % des dégâts) : viser la tête ou les explosions |
| Tank | 8 | 1200 | Obus lourds |
| Dynamiteur | 9 | 45 | Pose sa dynamite contre le mur (110 dégâts). Abattu avant : il explose sur ses voisins |
| Rampant | 11 | 18 | Petite araignée mécanique, en essaim de 8, explose contre le mur |
| Médecin | 12 | 60 | Reste en arrière et soigne les ennemis autour de lui |
| Drone | 13 | 50 | Vole au-dessus du toit et lâche des bombes. Seul le joueur peut le toucher |
| Arachnide | 15 | 350 | Araignée mécanique rapide, zigzague, salves de 4 missiles. Œil = point faible. En mourant, explose et lâche 3 rampants |
| Mortier | 17 | 70 | Tout au fond, obus en cloche sur le toit (interceptables) |
| Hélicoptère | 18 | 600 | Reste en l'air et tire des roquettes. Seul le joueur peut le toucher |

Les PV augmentent de 7 % par jour, le nombre d'ennemis aussi.

## Boss (tous les 10 jours, à l'infini)

| Jours | Boss | Comment le battre |
|---|---|---|
| 10, 40, 70… | Marcheur | Casser ses deux jambes : il tombe, la cabine devient vulnérable (avant : blindée, 30 % des dégâts) |
| 20, 50, 80… | Ver des sables | Invulnérable sous le sable, il sort près du mur pour frapper. Gueule = point faible |
| 30, 60, 90… | Reine arachnide | Pond des rampants, tire des salves de 6 missiles. Œil = point faible |

À chaque retour, le boss gagne un rang (II, III…), plus de vie et **un module de plus** :
- rang II : arachnide passager (Marcheur), un deuxième ver (Ver), escorte de Marcheur (Reine) ;
- rangs suivants : un module tiré parmi nacelles de missiles, trappe à rampants,
  générateur de bouclier (dégâts ÷2 autour), mortier, blindage, escorte de drones.

## Jeu infini

- **Cycles de 30 jours** affichés dans le HUD.
- **Mutations** à partir du jour 31, une de plus tous les 10 jours, cumulables :
  Enragés, Blindés, Régénération, Essaim, Ciel saturé, Tempête de sable.
- **Élites** à partir du jour 25 : dorés, ×3 PV, ×4 récompense.
- **Plafond** de 150 ennemis par jour : au-delà, ils sont plus résistants et plus souvent élites.

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
