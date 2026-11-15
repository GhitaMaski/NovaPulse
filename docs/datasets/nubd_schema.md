# NovaPulse Unified Biomedical Dataset (NUBD)

## Version

Version : 1.0

Dernière mise à jour : 14/11/2026

---

# Objectif

Le NUBD (NovaPulse Unified Biomedical Dataset) est le format standard utilisé dans NovaPulse.

Tous les datasets (MMASH, LifeSnaps, Wearable Device Dataset, PMData, etc.) doivent être convertis vers ce schéma avant d'être fusionnés.

Le résultat final est un fichier :

```
data/processed/nubd_daily.parquet
```

Chaque ligne représente **un sujet pour une journée**.

---

# Granularité

**Une ligne = un sujet + un jour**

Clé primaire :

```
(subject_id, date)
```

---

# Schéma

| Colonne | Type | Unité | Obligatoire | Source principale | Description |
|----------|------|--------|-------------|-------------------|-------------|
| subject_id | string | - | Oui | Tous | Identifiant unique du participant |
| date | date | YYYY-MM-DD | Oui | Tous | Date de la mesure |
| resting_hr | float | bpm | Oui | MMASH / LifeSnaps | Fréquence cardiaque moyenne au repos |
| hrv_rmssd | float | ms | Oui | MMASH | HRV calculée à partir des intervalles RR |
| spo2 | float | % | Non | LifeSnaps | Saturation en oxygène |
| resp_rate | float | respirations/min | Non | Wearable Dataset | Fréquence respiratoire |
| sleep_hours | float | heures | Oui | MMASH / LifeSnaps | Durée totale du sommeil |
| sleep_efficiency | float | % | Non | MMASH | Efficacité du sommeil |
| steps | int | pas | Oui | MMASH / LifeSnaps | Nombre total de pas |
| exercise_minutes | float | minutes | Non | MMASH / LifeSnaps | Durée d'activité physique |
| stress | float | score | Non | MMASH / LifeSnaps | Niveau de stress |
| mood | float | score | Non | MMASH | Score d'humeur |
| fatigue | float | score | Non | Calculé | Niveau de fatigue |
| age | int | années | Oui | user_info | Âge |
| sex | string | M/F | Oui | user_info | Sexe |
| height | float | cm | Oui | user_info | Taille |
| weight | float | kg | Oui | user_info | Poids |
| dataset_source | string | - | Oui | Tous | Nom du dataset d'origine |

---

# Colonnes dérivées (Phase 2)

Ces colonnes seront calculées après la fusion.

| Colonne | Calcul |
|----------|---------|
| hr_zscore | Baseline individuelle |
| sleep_debt | Déficit de sommeil |
| stress_trend | Moyenne glissante |
| resting_hr_trend | Moyenne glissante |
| anomaly_score | Isolation Forest |
| health_score | Score global NovaPulse |

---

# Valeurs manquantes

Toutes les colonnes non disponibles dans un dataset doivent être remplies avec :

```
NaN
```

Exemple :

MMASH ne possède pas :

- SpO₂
- Pression artérielle
- Température corporelle

Ces colonnes seront donc à `NaN`.

---

# Contraintes

## subject_id

Unique par participant.

---

## date

Format :

```
YYYY-MM-DD
```

---

## resting_hr

Valeurs attendues :

```
30 ≤ HR ≤ 220 bpm
```

---

## hrv_rmssd

Valeurs attendues :

```
5 ≤ RMSSD ≤ 250 ms
```

---

## spo2

Valeurs attendues :

```
70 ≤ SpO₂ ≤ 100 %
```

---

## sleep_hours

Valeurs attendues :

```
0 ≤ sommeil ≤ 24 h
```

---

## sleep_efficiency

Valeurs attendues :

```
0 ≤ efficacité ≤ 100 %
```

---

## steps

Valeurs attendues :

```
0 ≤ steps ≤ 100000
```

---

# Pipeline

Tous les datasets suivent exactement ce pipeline :

```
Dataset brut
        │
        ▼
parse_xxx.py
        │
        ▼
DataFrame NUBD
        │
        ▼
build_nubd.py
        │
        ▼
nubd_daily.parquet
        │
        ▼
Feature Engineering
        │
        ▼
Modèles IA
```

---

# Datasets prévus

| Dataset | Statut |
|----------|---------|
| MMASH | ✅ |
| LifeSnaps | À intégrer |
| Wearable Device Dataset | À intégrer |
| PMData | Optionnel |
| DREAMT | Version 2 |

---

# Remarques

Ce document est la référence officielle du format NUBD.

Tous les parseurs doivent produire un DataFrame conforme à ce schéma avant toute fusion.