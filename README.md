# NovaPulse

Démonstrateur de suivi de la santé d’un équipage à partir de télémétrie simulée. Le tableau de bord React, l’API FastAPI, le simulateur Python et le module IA sont réunis dans ce dossier.

## Démarrer sous Windows

Extraire l’archive complète et utiliser Python 3.13, la version testée. Exécuter les commandes dans PowerShell depuis le dossier qui contient ce `README.md`.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Laisser PowerShell ouvert pendant l’utilisation. L’archive contient l’interface déjà compilée dans `frontend/dist` et les six modèles entraînés. Ouvrir [NovaPulse](http://127.0.0.1:8000/) ou la [documentation interactive de l’API](http://127.0.0.1:8000/docs).

### Compiler l’interface

Installer Node.js 24 et pnpm. Exécuter ces commandes depuis le dossier du projet.

```powershell
Push-Location frontend
pnpm install --frozen-lockfile
pnpm run build
Pop-Location
```

### Modifier l’interface avec Vite

Laisser l’API tourner sur le port `8000`. Dans un autre terminal, lancer les commandes suivantes depuis le dossier du projet, puis ouvrir [Vite](http://localhost:3000/).

```powershell
Set-Location frontend
pnpm run dev
```

Vite redirige `/api/v1` vers `http://127.0.0.1:8000`. La variable `NOVAPULSE_API_TARGET` permet d’utiliser un autre port si nécessaire. Si l’API est inaccessible, Vite permet toujours d’ouvrir l’interface avec les données de démonstration locales.

## Déployer sur Microsoft Azure

Le [guide Azure](deploy/azure/README.md) décrit le déploiement de la démo publique sur Azure App Service Linux avec le plan gratuit F1.

## Fonctionnement

- L’API fournit la mission simulée, l’équipage, la télémétrie et les événements. L’interface calcule les scores et les alertes à partir des données reçues.
- Les boutons de scénario génèrent 200 jours de relevés pour les trois astronautes et envoient les 600 relevés préparés à l’API de prédiction. Le jour et l’astronaute sélectionnés déterminent les résultats affichés dans le tableau de bord, les fiches équipage, l’historique, les anomalies et les alertes. Le bouton de réinitialisation recharge la mission du serveur.
- Les graphiques de télémétrie et les alertes à seuils utilisent les relevés simulés du scénario. Le mode hors ligne affiche aussi les relevés simulés, avec un indicateur si les modèles sont indisponibles.
- Le serveur utilise la base SQLite dans `backend/data` et la crée avec des relevés simulés au premier démarrage si elle est absente. Pour choisir un autre fichier, définir `$env:NOVAPULSE_DB_PATH = 'backend/data/local.db'` avant de lancer Uvicorn. La variable `NASA_API_KEY` permet de configurer le proxy de météo spatiale côté serveur. Le snapshot DONKI fourni sert de repli.

## Module IA et données

`ai_engine/models/saved_models` contient six modèles entraînés et le fichier qui décrit leurs entrées. Dans **Risk Prediction → Trained Model Predictions**, sélectionne un scénario pour calculer automatiquement le score de santé, les risques de fatigue, cardiovasculaire et du sommeil, le statut et l’anomalie. **Model inputs sent to the API** affiche les entrées du jour et de l’astronaute sélectionnés. Le modèle de sommeil utilise notamment `sleep_quality`, estimé à partir de l’efficacité du sommeil mesurée dans le scénario. Les entrées de capteurs absents, comme l’EEG, utilisent des valeurs de simulation.

Sur la mission chargée depuis le serveur, **Run prediction** relit les données de l’astronaute sélectionné. Tu peux aussi modifier les 35 entrées JSON sous **Model inputs**, puis lancer le calcul. `POST /api/v1/predict` calcule un relevé et `POST /api/v1/predict/batch` accepte jusqu’à 600 relevés et renvoie les résultats dans le même ordre. `GET /api/v1/predict/status` vérifie la présence des fichiers. La section **72-Hour Telemetry Trend Estimate** calcule les tendances sur la télémétrie.

Consulter le [guide du module IA](docs/ai-data/README.md) pour les sources et la structure d’origine. Les dépendances de cette branche sont dans `requirements-ai.txt`.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
Push-Location frontend
pnpm run lint
pnpm run test
pnpm run build
Pop-Location
```

La [spécification technique](<docs/NovaPulse Technical Specification (NASA Space Apps 2026).pdf>) décrit la cible du projet. Les données de santé affichées dans ce démonstrateur sont simulées.
