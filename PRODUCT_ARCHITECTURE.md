# Roleplay It Yourself - Architecture Produit

## Contrainte produit

Cette version doit partir sur une base tres simple :

- pas d'authentification MJ
- pas d'authentification joueur
- pas de sauvegardes de projet
- pas de liste de projets
- ouverture directe sur un bac a sable vierge

L'app doit etre pensee comme un outil de creation instantanee, puis de lancement de partie.

## Vision

L'application doit permettre a un MJ de :

- ouvrir un board vierge
- construire son board RPG en direct
- modifier librement maps, joueurs, PNJ, mobs, documents et regles
- lancer une partie a partir de ce board
- continuer a ajuster le board meme pendant la partie

L'application doit permettre a un joueur de :

- rejoindre une partie avec un code
- choisir un slot disponible
- voir uniquement l'interface joueur
- interagir en temps reel avec la session

## Principe central

Il faut separer 3 notions :

1. `Sandbox`
Le board de creation courant du MJ. Il vit dans l'app ouverte.

2. `Session`
La partie en cours, lancee depuis le sandbox.

3. `LiveBoardState`
L'etat temps reel de la partie.

Si ces 3 blocs restent distincts, on gagne :

- un bac a sable toujours vierge au demarrage
- une session propre pour les joueurs
- une logique claire entre creation et jeu
- moins de confusion dans le code

## Modele de donnees recommande

### 1. Sandbox

Le sandbox ne doit pas etre un projet persistant.

Base recommandee :

`window.__sandboxState`

Structure recommandee :

```json
{
  "meta": {
    "title": "",
    "theme": "medieval_fantasy",
    "tone": "",
    "playerCount": 4,
    "description": ""
  },
  "players": {
    "slot1": {
      "label": "Joueur 1",
      "characterName": "",
      "image": "",
      "roleHint": ""
    },
    "slot2": {
      "label": "Joueur 2"
    },
    "slot3": {
      "label": "Joueur 3"
    },
    "slot4": {
      "label": "Joueur 4"
    }
  },
  "content": {
    "maps": {},
    "pnjs": {},
    "mobs": {},
    "documents": {},
    "items": {},
    "quests": {},
    "scenes": {}
  },
  "boardDefaults": {
    "startMapId": null,
    "fogEnabled": true,
    "gridEnabled": true,
    "music": null
  },
  "permissions": {
    "joinMode": "code",
    "allowObservers": false
  }
}
```

Le sandbox est remis a zero quand on clique sur `Nouveau bac a sable`.

### 2. Session

Chemin Firebase conseille :

`sessions/{sessionId}`

Structure recommandee :

```json
{
  "id": "sess_001",
  "status": "lobby",
  "createdAt": 1710000000000,
  "startedAt": null,
  "endedAt": null,
  "joinCode": "ARKEN42",
  "name": "Partie en cours",
  "settings": {
    "maxPlayers": 4,
    "allowRejoin": true,
    "autoAssignSlots": false
  }
}
```

La session ne depend pas d'un compte utilisateur.

### 3. Session Players

Chemin Firebase conseille :

`sessions/{sessionId}/players/{presenceId}`

Structure recommandee :

```json
{
  "presenceId": "player_abc123",
  "slotId": "slot1",
  "displayName": "Joueur",
  "role": "player",
  "connected": true,
  "lastSeenAt": 1710000000000,
  "ready": true
}
```

Et pour l'occupation des slots :

`sessions/{sessionId}/slots/{slotId}`

```json
{
  "claimedBy": "player_abc123",
  "locked": false
}
```

### 4. Live Board State

Chemin Firebase conseille :

`sessionStates/{sessionId}`

Structure recommandee :

```json
{
  "map": {
    "currentMapId": "map_village",
    "fog": {
      "enabled": true,
      "revealedZones": {}
    }
  },
  "tokens": {
    "slot1": { "x": 320, "y": 420, "visible": true },
    "mob_001": { "x": 770, "y": 300, "visible": true }
  },
  "combat": {
    "active": false,
    "turnOrder": [],
    "currentTurn": null
  },
  "reveals": {
    "documents": {},
    "quests": {},
    "journalEntries": {}
  },
  "ui": {
    "activeSceneId": null,
    "announcement": ""
  },
  "updatedAt": 1710000000000
}
```

Ce bloc contient uniquement le live.

## Regles de fonctionnement

### Bac a sable MJ

Le studio MJ travaille sur `window.__sandboxState`.

Le MJ peut :

- changer le titre du board
- choisir un theme
- configurer les slots joueurs
- ajouter maps, PNJ, mobs, objets et documents
- definir une map de depart
- reinitialiser le board

### Lancer la partie

Le bouton `Lancer la partie` fait ceci :

1. cree une `session`
2. copie les valeurs utiles du sandbox dans `sessionStates/{sessionId}`
3. genere un `joinCode`
4. ouvre la vue MJ de la partie

Important :

- on ne sauvegarde pas le sandbox
- on ne charge pas d'ancien projet
- le sandbox courant sert juste de source de lancement

### Partie modifiable

Pendant la session, il faut distinguer 2 types de changements :

1. contenu structurel
Exemples : ajouter une nouvelle map, un nouveau document, un nouveau PNJ

Effet recommande :

- le sandbox est mis a jour
- la session peut proposer `Appliquer au live`

2. etat live
Exemples : positions, brouillard revele, tour de combat

Effet recommande :

- ecriture directe dans `sessionStates/{sessionId}`
- pas dans le sandbox

## Flux produit recommande

### 1. Accueil

Deux portes principales :

- `Creer un board`
- `Rejoindre une partie`

### 2. Studio MJ

Le studio remplace l'idee de dashboard de projets.

Onglets recommandes :

- `Projet`
- `Joueurs`
- `Board`
- `Contenu`
- `Regles`
- `Assets`
- `Lancement`

### 3. Lobby de session

Avant la vraie partie, afficher :

- code de partie
- slots joueurs
- joueurs connectes
- bouton `Demarrer`

### 4. Vue Partie MJ

Le MJ retrouve :

- board principal
- outils de reveal
- outils de combat
- narration
- joueurs connectes

Le MJ peut toujours :

- revenir au studio
- appliquer des changements au live

### 5. Vue Partie Joueur

Le joueur voit seulement :

- rejoindre avec code
- choisir un slot
- voir sa fiche
- voir la map
- voir les documents reveles
- lancer des des

## Ecrans minimum pour un MVP propre

1. `Accueil`
2. `Studio MJ`
3. `Lobby de session`
4. `Partie MJ`
5. `Rejoindre une partie`
6. `Partie joueur`

## Regles d'autorisations

### MJ

Le MJ peut :

- creer une session
- modifier le board live
- reveler du contenu
- attribuer les slots

### Joueur

Le joueur peut :

- lire les donnees de sa session
- prendre un slot libre si autorise
- agir uniquement sur sa zone ou sa fiche si prevu

### Recommendation Firebase Rules

Idee simple :

- `sessions/*` lisible par les participants de la session
- `sessionStates/*` lisible par les participants de la session
- certaines branches joueur peuvent etre ecrites par le joueur qui a le slot

## Evolution technique depuis ton code actuel

Ton code a deja :

- un studio de creation
- un board temps reel
- une entree MJ / joueur

Ce qui doit disparaitre :

- auth MJ
- auth joueur
- sauvegardes de projet Firebase
- sauvegardes de projet localStorage
- bouton `Charger projet`

L'evolution conseillee est :

1. renommer mentalement le studio actuel en `Sandbox Editor`
2. remplacer `Nouveau projet` par `Nouveau bac a sable`
3. supprimer `Charger projet`
4. supprimer les ecrans de connexion
5. introduire une vraie `session`
6. faire rejoindre les joueurs par `joinCode`

## Plan de mise en oeuvre

### Phase 1 - nettoyer l'existant

- retirer `firebase-auth.js`
- retirer `requestGM()`
- retirer `requestPlayerAuth()`
- retirer `saveGame()`
- retirer `loadGame()`
- retirer `loadSave()`
- retirer `deleteSave()`

### Phase 2 - creer le sandbox vierge

- definir un etat initial unique
- faire ouvrir l'app sur cet etat
- ajouter un bouton `Reinitialiser le sandbox`

### Phase 3 - lancer une session

- bouton `Lancer la partie`
- creation du `joinCode`
- creation du lobby

### Phase 4 - experience joueur

- page `Rejoindre une partie`
- prise de slot
- vue joueur simplifiee

### Phase 5 - qualite produit

- reprise propre de session active
- synchronisation selective sandbox -> live
- permissions Firebase fines

## Decisions produit recommandees

Je te conseille de suivre ces choix :

- un seul sandbox actif a la fois
- aucune dependance a un compte
- une seule session active a la fois pour le MVP
- les joueurs rejoignent avec un code court
- l'edition et le live sont deux modes differents de la meme app

## Traduction concrete pour ton interface actuelle

Dans ton app actuelle :

- `Nouveau projet` doit devenir `Nouveau bac a sable`
- `Charger projet` doit disparaitre
- `Connexion joueur` doit disparaitre
- `MJ` dans le selecteur doit disparaitre
- `Studio MJ` doit travailler sur un etat vierge courant
- `Entrer cote joueur` doit mener a `Rejoindre une partie`
- le board en direct doit lire `sessionStates/{sessionId}`

## Conclusion

La bonne base pour ton produit est :

- `Sandbox` pour la creation
- `Session` pour la partie
- `SessionState` pour le temps reel

Avec cette direction, ton app sera beaucoup plus lisible : on ouvre, on cree, on lance, les joueurs rejoignent.
