# Roleplay It Yourself - UX Flows

## Objectif UX

L'application doit etre simple a comprendre des la premiere visite :

- le MJ comprend qu'il ouvre un bac a sable vierge
- le joueur comprend qu'il rejoint une partie avec un code
- la creation et la partie sont reliees, mais bien distinctes

## Principe UX global

Le parcours doit devenir :

1. ouvrir l'app
2. arriver dans un bac a sable vide
3. construire rapidement le board
4. cliquer sur `Lancer la partie`
5. faire rejoindre les joueurs

Pas de compte.
Pas de sauvegardes.
Pas de tableau de projets.

## Parcours principal MJ

### Ecran 1 - Accueil

But :

- faire choisir entre creer et rejoindre

Blocs recommandes :

- hero avec promesse claire
- bouton `Creer un board RPG`
- bouton `Rejoindre une partie`

Texte recommande :

- `Cree ton board RPG, lance la partie, fais rejoindre tes joueurs.`

### Ecran 2 - Creation rapide

But :

- ouvrir le bac a sable sans friction

Champs minimum :

- nom de la partie ou du board
- univers
- ton
- nombre de joueurs

CTA :

- `Ouvrir le bac a sable`

### Ecran 3 - Studio MJ

But :

- offrir le vrai bac a sable de creation

Layout recommande :

- colonne gauche : navigation
- zone centrale : edition
- colonne droite : apercu et actions rapides

Navigation studio recommandee :

- Projet
- Joueurs
- Board
- Contenu
- Regles
- Assets
- Lancement

### Onglet Projet

Contient :

- titre
- pitch
- theme
- ton
- nombre de joueurs

CTA :

- `Reinitialiser`

### Onglet Joueurs

Contient :

- liste des slots
- nom du slot
- avatar
- nom de personnage de base
- role suggere

CTA :

- `Ajouter un slot`

### Onglet Board

Contient :

- map de depart
- placements initiaux
- grille
- fog
- zones cliquables

CTA :

- `Previsualiser`

### Onglet Contenu

Sections :

- Maps
- PNJ
- Mobs
- Documents
- Quetes
- Scenes

Chaque section doit permettre :

- ajouter
- modifier
- supprimer
- previsualiser

### Onglet Regles

Contient :

- stats
- types de jets
- progression
- regles maison

### Onglet Assets

Contient :

- images
- sons
- portraits

### Onglet Lancement

Contient :

- checklist minimale
- bouton `Previsualiser comme joueur`
- bouton `Lancer la partie`

Checklist minimum :

- une map de depart
- au moins un slot joueur

## Parcours de lancement MJ

### Ecran 4 - Pre-lancement

But :

- transformer le sandbox en session

Champs :

- nom de session
- nombre de slots ouverts
- mode de join `code`

CTA :

- `Creer la session`

### Ecran 5 - Lobby de session

But :

- attendre les joueurs

Elements :

- code de partie tres visible
- bouton copier code
- liste des slots
- statut de connexion
- bouton `Demarrer la partie`

### Ecran 6 - Partie MJ

But :

- piloter la session en direct

Layout recommande :

- board central
- barre d'outils
- panneau narratif
- panneau combat
- panneau joueurs

Actions frequentes :

- changer de map
- reveler un document
- deplacer des tokens
- ouvrir un combat
- envoyer une annonce
- revenir au studio

CTA secondaires :

- `Appliquer au live`
- `Terminer la session`

## Parcours principal joueur

### Ecran 1 - Rejoindre une partie

But :

- entrer dans la session sans friction

Champ minimum :

- code de partie

CTA :

- `Rejoindre`

### Ecran 2 - Choix du slot

But :

- laisser choisir une place

Chaque slot affiche :

- nom du slot
- personnage associe si defini
- libre / occupe

CTA :

- `Choisir ce slot`

### Ecran 3 - Salle d'attente joueur

But :

- patienter avant le debut

Elements :

- nom de la session
- slot choisi
- statut `En attente du MJ`

### Ecran 4 - Partie joueur

But :

- offrir une vue lisible et simple

Layout recommande :

- zone principale : map
- panneau lateral : fiche
- panneau bas : des / inventaire / documents

Actions joueur :

- voir sa fiche
- lancer un de
- lire les documents reveles
- voir les messages du MJ

## Raccourcis UX importants

### Toujours montrer le contexte

En haut de l'ecran, afficher :

- nom du board
- nom de la session
- role courant `MJ` ou `Joueur`

### Toujours montrer l'etat

Pour le MJ :

- sandbox actif
- session ouverte / non ouverte

Pour le joueur :

- slot choisi
- en attente / en cours

### Toujours avoir un CTA principal unique

Exemples :

- dans le studio : `Lancer la partie`
- dans le pre-lancement : `Creer la session`
- dans le lobby : `Demarrer la partie`
- pour le joueur : `Rejoindre`

## Conseils d'UX produit

### 1. Eviter le vocabulaire trompeur

Utilise toujours :

- `Bac a sable` = creation
- `Session` = partie en cours
- `Slot joueur` = place a la table
- `Lancer la partie` = demarrer la session

Evite :

- `Projet`
- `Sauvegarder`
- `Charger`
- `Connexion`

### 2. Le bac a sable doit sembler vide mais accueillant

Quand on ouvre le studio, il faut voir :

- une map vide ou fond neutre
- un message de demarrage
- quelques CTA clairs

Exemple :

- `Ajoute une map`
- `Configure les joueurs`
- `Lance une session quand tu es pret`

### 3. Les joueurs ne doivent jamais voir le studio

Leur porte d'entree est uniquement :

- code de partie
- choix du slot
- vue joueur

## MVP UX recommande

Pour une premiere version propre :

1. accueil simple
2. creation rapide
3. studio MJ avec 4 onglets
4. lancement de session
5. join joueur par code
6. vue joueur simplifiee

Les 4 onglets MVP :

- Projet
- Joueurs
- Board
- Contenu

## Ce que ton interface actuelle fait deja bien

Ta base actuelle couvre deja une partie du besoin :

- entree creation / joueur
- studio de creation
- board interactif

Ce qui doit disparaitre cote UX :

- `Charger projet`
- `Connexion joueur`
- `Connexion MJ`
- toute logique de sauvegardes visibles

## Priorites UX pour la suite

1. remplacer `Nouveau projet` par `Nouveau bac a sable`
2. supprimer `Charger projet`
3. creer un vrai ecran `Rejoindre une partie`
4. ajouter un `Lobby de session`
5. simplifier la vue joueur
