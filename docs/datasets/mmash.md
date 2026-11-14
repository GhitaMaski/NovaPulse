# MMASH Dataset

## 1. Informations générales

**Nom :** MMASH (Multilevel Monitoring of Activity and Sleep in Healthy People)

**Source officielle :**
https://physionet.org/content/mmash/

**Publication :**
https://doi.org/10.1038/sdata.2018.140

**Licence :**
(à compléter selon la licence indiquée sur PhysioNet)

**Version téléchargée :**
14/11/2026

---

# 2. Description

Le dataset MMASH contient des données physiologiques et comportementales collectées sur des adultes en bonne santé pendant 24 heures.

Les données proviennent de plusieurs sources :

- Actigraph
- Cardiofrequencemètre
- Intervalles RR
- Questionnaires
- Données de sommeil
- Informations démographiques
- Salive (cortisol et mélatonine)

---

# 3. Organisation du dataset

```
MMASH/
└── DataPaper/
    ├── user_1/
    ├── user_2/
    ├── ...
    └── user_22/
```

Chaque dossier utilisateur contient :

- Actigraph.csv
- Activity.csv
- RR.csv
- sleep.csv
- questionnaire.csv
- saliva.csv
- user_info.csv

---

# 4. Description des fichiers

## Actigraph.csv

### Colonnes

- Axis1
- Axis2
- Axis3
- Steps
- HR
- Inclinometer Off
- Inclinometer Standing
- Inclinometer Sitting
- Inclinometer Lying
- Vector Magnitude
- day
- time

### Utilisation dans NovaPulse

- Heart Rate
- Steps
- Niveau d'activité
- Timestamp

---

## RR.csv

### Colonnes

- ibi_s
- day
- time

### Utilisation

- Calcul du RMSSD
- Calcul du HRV
- Calcul du SDNN

---

## sleep.csv

### Colonnes

- In Bed Date
- In Bed Time
- Out Bed Date
- Out Bed Time
- Onset Date
- Onset Time
- Latency
- Efficiency
- Total Minutes in Bed
- Total Sleep Time (TST)
- Wake After Sleep Onset (WASO)
- Number of Awakenings
- Average Awakening Length
- Movement Index
- Fragmentation Index
- Sleep Fragmentation Index

### Utilisation

- Sleep Hours
- Sleep Efficiency
- Sleep Quality

---

## Activity.csv

### Colonnes

- Activity
- Start
- End
- Day

### Utilisation

- Exercise Minutes
- Activité quotidienne

---

## questionnaire.csv

### Colonnes

- MEQ
- STAI1
- STAI2
- Pittsburgh
- Daily_stress
- BISBAS_bis
- BISBAS_reward
- BISBAS_drive
- BISBAS_fun
- PANAS (positif et négatif)

### Utilisation

- Stress
- Mood
- Fatigue
- Qualité du sommeil

---

## saliva.csv

### Colonnes

- Cortisol NORM
- Melatonin NORM

### Utilisation

Non utilisée dans NovaPulse V1.
Peut servir pour des validations futures.

---

## user_info.csv

### Colonnes

- Gender
- Weight
- Height
- Age

### Utilisation

Métadonnées de l'utilisateur.

---

# 5. Mapping vers le schéma NUBD

| Champ NUBD | Source MMASH |
|------------|--------------|
| subject_id | Nom du dossier |
| date | day |
| resting_hr | HR |
| hrv_rmssd | Calculé depuis ibi_s |
| sleep_hours | Total Sleep Time (TST) |
| sleep_efficiency | Efficiency |
| steps | Steps |
| exercise_minutes | Activity |
| stress | Daily_stress |
| mood | PANAS |
| fatigue | À calculer |
| age | Age |
| sex | Gender |
| weight | Weight |
| height | Height |
| dataset_source | Constante = "MMASH" |

---

# 6. Variables absentes

Le dataset ne contient pas :

- SpO₂
- Pression artérielle
- Température corporelle
- Fréquence respiratoire

Ces champs seront remplis avec d'autres datasets.

---

# 7. Prétraitements prévus

- Suppression de la colonne `Unnamed: 0`
- Fusion des colonnes `day` et `time`
- Calcul du RMSSD à partir des intervalles RR
- Agrégation journalière
- Vérification des valeurs aberrantes
- Export au format NUBD

---

# 8. Remarques

Premier dataset utilisé pour développer et valider le pipeline Data Engineering de NovaPulse.