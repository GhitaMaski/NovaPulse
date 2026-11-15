# NovaPulse — Backend & Simulation Service (NASA Space Apps 2026)

> **"Your crew's health, understood before it becomes an emergency."**

NovaPulse est une plateforme d'assistance médicale autonome et *offline-first* pour équipages en mission spatiale lointaine (transit martien). 

Ce sous-projet comprend le **backend Python (FastAPI)**, le **moteur de simulation stochastique (AR(1))**, le proxy avec cache de la météo spatiale **NASA DONKI**, le système de **rapports sol signés (ECDSA P-256) avec latence simulée**, le système d'**audit infalsifiable chaîné par hachage (SHA-256)** et le second avis par **Machine Learning (Isolation Forest)**.

---

## 1. Architecture du Backend

```
novapulse/
├── sim/
│   ├── simulate.py             # Simulateur autorégressif AR(1) 200 jours (3 astronautes)
│   ├── scenarios.yaml          # Bibliothèque des effets directionnels et règles d'escalade
│   └── __init__.py
├── backend/
│   ├── app/
│   │   ├── main.py             # Application FastAPI & définition des 15 routes REST (/api/v1)
│   │   └── __init__.py
│   ├── data/
│   │   ├── novapulse.db        # Base SQLite (crew, readings, events, audit, ground_reports)
│   │   ├── mission.json        # Télémétrie exportée des 200 jours pour PWA offline
│   │   ├── events.json         # Événements scénarisés et météo spatiale
│   │   ├── donki_snapshot.json # Snapshot de repli NASA DONKI
│   │   └── config.json         # Paramètres de simulation et graines (seed 42)
│   ├── models.py               # Modèles Pydantic & validation stricte des bornes (Section 13.3)
│   ├── database.py             # Gestionnaire SQLite avec batch insert (executemany)
│   ├── donki.py                # Service NASA DONKI (cache mémoire 1h + fallback snapshot)
│   ├── anomaly.py              # Second avis ML Isolation Forest (scikit-learn)
│   ├── ground.py               # Station sol : réception différée & vérification ECDSA P-256
│   ├── audit.py                # Journal d'audit infalsifiable avec chaîne de hachage SHA-256
│   ├── requirements.txt        # Dépendances Python (FastAPI, scikit-learn, cryptography, etc.)
│   └── tests/
│       ├── test_backend.py     # Suite de tests complète pytest (15/15 tests validés)
│       └── __init__.py
└── README.md
```

---

## 2. Spécification des Endpoints de l'API (`/api/v1`)

| Méthode | Route | Description | Statut |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Vérification de vitalité et version du service | `200` |
| `GET` | `/api/v1/mission` | Configuration de mission (seed, date début, délai sol, limite 600 mSv) | `200` |
| `GET` | `/api/v1/crew` | Profils et baselines individuelles des 3 astronautes | `200` |
| `GET` | `/api/v1/readings` | Lectures physiologiques filtrées par `crewId`, `from` et `to` | `200` |
| `POST` | `/api/v1/readings` | Ingestion d'une lecture (validation stricte des bornes physiologiques) | `201` |
| `POST` | `/api/v1/checkins` | Envoi du bilan quotidien astronaute (humeur, fatigue, stress, symptômes) | `201` |
| `GET` | `/api/v1/events` | Liste unifiée des événements (DONKI + scénarios injectés) | `200` |
| `GET` | `/api/v1/space-weather`| Proxy vers l'API NASA DONKI (cache 1h + repli instantané) | `200` |
| `POST` | `/api/v1/scenarios/inject` | Injection dynamique d'anomalie (infection, tempête, déconditionnement) | `200` |
| `POST` | `/api/v1/scenarios/reset` | Réinitialisation complète à la trame de référence 200 jours | `200` |
| `GET` | `/api/v1/anomaly-scores` | Scores de détection d'anomalie multivariée par *Isolation Forest* | `200` |
| `POST` | `/api/v1/ground/reports` | Soumission d'un rapport de bord signé (renvoie l'heure de livraison estimée) | `202` |
| `GET` | `/api/v1/ground/reports` | Vue de la Terre : uniquement les rapports dont le délai luminique est écoulé | `200` |
| `POST` | `/api/v1/audit` | Ancrage de la tête du journal d'audit dans la base sol | `201` |
| `GET` | `/api/v1/audit/verify` | Vérification cryptographique séquentielle de la chaîne d'audit | `200` |

---

## 3. Installation et Démarrage

### Prérequis
* Python 3.11+
* PowerShell ou terminal Unix

### 1. Installation des dépendances
```bash
pip install -r backend/requirements.txt
```

### 2. Lancement du serveur API
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

* **Swagger UI interactif :** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc :** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 4. Tests et Validation

Une suite de tests rigoureuse (`backend/tests/test_backend.py`) valide l'ensemble des exigences fonctionnelles et non-fonctionnelles :
- Reproductibilité par graine (NFR-09).
- Respect des bornes physiologiques (Section 13.3).
- Ingestion, filtrage et bilans de santé.
- Détection d'anomalies multivariées (Isolation Forest).
- Intégrité de la chaîne de hachage SHA-256 et détection immédiate de toute falsification de données (NFR-04).
- Vérification des signatures asymétriques ECDSA P-256 et calcul du délai de communication sol avec compression temporelle.

Exécution des tests :
```bash
pytest backend/tests/test_backend.py -v
```
*(Résultat : 15/15 tests réussis).*
