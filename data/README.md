# Data — synthetic generator

This directory contains the data generation and validation scripts for the
failed-payment recovery project.

## Kaggle dataset (required for amount calibration)

The generator uses the real **Kaggle "Online Payments Fraud Detection Dataset"**
to calibrate transaction amount distributions, so amounts look statistically
realistic rather than arbitrary.

1. Download from:
   https://www.kaggle.com/datasets/rupakroy/online-payments-fraud-detection-dataset
2. Place the CSV at:
   ```
   data/kaggle/onlinefraud.csv
   ```
   (The `data/kaggle/` directory is in `.gitignore` and must never be committed.)

If the file is absent the generator falls back to a hard-coded log-normal
(mean ≈ ₹1 500, σ = 1.1) and prints a warning — useful for CI.

> **Disclaimer:** amount distributions are calibrated against a real payments
> dataset (Kaggle). Retry/dunning behavior is **fully synthetic** — no public
> dataset exists for retry-sequence/dunning data; this is the core
> project-specific contribution.

## Install

```powershell
cd data
pip install -r requirements.txt
```

## Generate data

```powershell
# Primary dataset (~5 000 transactions)
python generate.py --n-transactions 5000

# Perturbed-parameter batch for model evaluation (~2 000 transactions)
python generate.py --n-transactions 2000 --perturbed

# Custom output prefix
python generate.py --n-transactions 5000 --output-prefix primary
```

### Output files

| File | Contents |
|---|---|
| `primary_dataset.csv` | Flat attempt rows for training — ~12 000–15 000 rows |
| `perturbed_dataset.csv` | Shifted-parameter batch for eval — ~5 000–6 000 rows |
| `customers.csv` | Normalized Customer entity table |
| `transactions.csv` | Normalized Transaction entity table |
| `attempts.csv` | Normalized Retry Attempt entity table |

All CSV files are in `.gitignore` (regenerable from this script).

## Validate

```powershell
python validate.py
```

Runs 4 sanity checks against `primary_dataset.csv`:
1. Recovery rate: `network_timeout`/`processing_error` > `issuer_declined`/`do_not_honor`
2. Recovery rate declines monotonically with `attempt_number`
3. `insufficient_funds` recovery bumps near payday vs away from payday
4. `amount` distribution shape resembles Kaggle reference

Exits non-zero if any check fails. **Do not start Phase 2 until this exits 0.**
