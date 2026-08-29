"""
generate.py — Synthetic data generator for failed-payment recovery project.

Implements DATA_SCHEMA.md exactly:
  - Transaction, Retry Attempt, Customer entities
  - Amount distribution calibrated from Kaggle "Online Payments Fraud Detection Dataset"
  - Success probability formula: base × attempt × timing × payday × segment + noise
  - Hard-fail transactions: 1 row, outcome = not_attempted, no retry sequence

Usage:
    python generate.py                          # primary, 5000 transactions
    python generate.py --n-transactions 2000 --perturbed   # perturbed batch
    python generate.py --help

Outputs (in data/):
    primary_dataset.csv     flat attempt rows for training
    customers.csv           normalized Customer table
    transactions.csv        normalized Transaction table
    attempts.csv            normalized Retry Attempt table

    If --perturbed:
    perturbed_dataset.csv

NOTE: Amount distributions are calibrated against a real payments dataset
(Kaggle). Retry/dunning behavior is fully synthetic — no public dataset for
retry-sequence/dunning data exists.
"""

import argparse
import os
import sys
import warnings
import uuid
from datetime import datetime, timedelta
import math

import numpy as np
import pandas as pd
from scipy import stats

# ---------------------------------------------------------------------------
# Constants — all from DATA_SCHEMA.md and ORCHESTRATOR_RULES.md
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KAGGLE_CSV = os.path.join(SCRIPT_DIR, "kaggle", "onlinefraud.csv")

HARD_FAIL_REASONS = {"card_expired", "card_stolen", "account_closed"}
TRANSIENT_REASONS = {
    "insufficient_funds", "issuer_declined", "do_not_honor",
    "processing_error", "network_timeout",
}
ALL_FAILURE_REASONS = list(TRANSIENT_REASONS | HARD_FAIL_REASONS)

# Failure reason weights (realistic distribution)
FAILURE_REASON_WEIGHTS = {
    "insufficient_funds": 0.28,
    "issuer_declined":    0.20,
    "do_not_honor":       0.15,
    "processing_error":   0.15,
    "network_timeout":    0.12,
    "card_expired":       0.05,
    "card_stolen":        0.03,
    "account_closed":     0.02,
}

# Base success probabilities per failure_reason (DATA_SCHEMA.md)
BASE_PROBABILITY = {
    "insufficient_funds": 0.35,
    "issuer_declined":    0.20,
    "do_not_honor":       0.18,
    "processing_error":   0.60,
    "network_timeout":    0.65,
}

# Escalating backoff schedule — ORCHESTRATOR_RULES.md
# attempt_number → hours to wait after first_failure_timestamp
BACKOFF_HOURS = {1: 6, 2: 24, 3: 72, 4: 168}
MAX_ATTEMPTS = 4

# Customer segments
SEGMENTS = ["new", "returning", "high_value"]
SEGMENT_WEIGHTS = [0.40, 0.40, 0.20]

SEGMENT_MODIFIER = {"new": 0.85, "returning": 1.0, "high_value": 1.20}

# payment_method proportions — loosely from Kaggle type proportions
# (CASH_OUT/CASH_IN → upi/netbanking, PAYMENT/TRANSFER → card, DEBIT → netbanking)
PAYMENT_METHOD_WEIGHTS = {"card": 0.55, "upi": 0.28, "netbanking": 0.17}

# merchant_category weights
MERCHANT_CATEGORY_WEIGHTS = {
    "saas":               0.40,
    "d2c_subscription":   0.35,
    "ecommerce_one_time": 0.25,
}

# Payday days (days 1 and 28-31 of month)
PAYDAY_DAYS = {1, 28, 29, 30, 31}

# Kaggle dataset is USD; convert to INR
USD_TO_INR = 83.0

# Fallback log-normal params (if Kaggle file absent): mean ~₹1500
FALLBACK_LOGNORM_MEAN_INR = 1500.0
FALLBACK_LOGNORM_SIGMA = 1.1

# Amount cap at 99th percentile to avoid extreme outliers
AMOUNT_CAP_PERCENTILE = 99


# ---------------------------------------------------------------------------
# Primary generation parameters — can be perturbed for eval batch
# ---------------------------------------------------------------------------

class GenParams:
    """All tunable generation parameters in one place."""

    def __init__(self, perturbed: bool = False):
        if not perturbed:
            # ---- PRIMARY parameters ----
            self.payday_boost = 1.30
            self.attempt_decay_exponent = 0.40   # attempt_modifier = 1 / n^exp
            self.timing_peak_hours = 36.0         # gaussian peak
            self.timing_sigma_hours = 30.0
            self.timing_floor = 0.60              # minimum timing modifier
            self.timing_ceil = 1.20               # maximum timing modifier
            self.noise_range = 0.04               # uniform ±
            self.base_probability = dict(BASE_PROBABILITY)
        else:
            # ---- PERTURBED parameters (shifted for eval — MODEL_SPEC.md) ----
            self.payday_boost = 1.10              # weaker payday signal
            self.attempt_decay_exponent = 0.60   # stronger attempt decay
            self.timing_peak_hours = 48.0         # peak shifts later
            self.timing_sigma_hours = 28.0
            self.timing_floor = 0.60
            self.timing_ceil = 1.20
            self.noise_range = 0.04
            self.base_probability = {
                "insufficient_funds": 0.30,       # slightly lower base
                "issuer_declined":    0.20,
                "do_not_honor":       0.18,
                "processing_error":   0.60,
                "network_timeout":    0.70,       # slightly higher base
            }


# ---------------------------------------------------------------------------
# Kaggle amount distribution calibration
# ---------------------------------------------------------------------------

def load_amount_distribution(kaggle_csv: str):
    """
    Load Kaggle CSV, fit a log-normal to the amount column.
    Returns (shape, loc, scale) from scipy.stats.lognorm.fit.
    Falls back to hard-coded params if file is absent.
    """
    if not os.path.exists(kaggle_csv):
        warnings.warn(
            f"Kaggle CSV not found at {kaggle_csv}. "
            "Falling back to hard-coded log-normal (mean ≈ ₹1500, σ=1.1). "
            "Place onlinefraud.csv in data/kaggle/ for realistic amounts.",
            UserWarning,
            stacklevel=2,
        )
        # Derive scipy lognorm params from desired mean/sigma in INR
        sigma = FALLBACK_LOGNORM_SIGMA
        mu = math.log(FALLBACK_LOGNORM_MEAN_INR) - (sigma ** 2) / 2
        scale = math.exp(mu)
        return sigma, 0, scale, None  # shape, loc, scale, cap

    print(f"Loading Kaggle dataset from {kaggle_csv} ...")
    df = pd.read_csv(kaggle_csv, usecols=["amount"])
    amounts_usd = df["amount"].dropna()
    amounts_usd = amounts_usd[amounts_usd > 0]
    amounts_inr = amounts_usd * USD_TO_INR
    cap = float(np.percentile(amounts_inr, AMOUNT_CAP_PERCENTILE))
    amounts_inr = amounts_inr[amounts_inr <= cap]

    shape, loc, scale = stats.lognorm.fit(amounts_inr, floc=0)
    print(
        f"  Fitted log-normal: shape={shape:.4f}, scale={scale:.2f} (INR), cap={cap:.0f} INR"
    )
    return shape, loc, scale, cap


def make_amount_sampler(shape, loc, scale, cap, rng: np.random.Generator):
    """Returns a callable that samples a realistic INR transaction amount."""
    dist = stats.lognorm(s=shape, loc=loc, scale=scale)

    def sample(n: int = 1):
        vals = dist.rvs(size=n, random_state=rng.integers(2**31))
        if cap is not None:
            vals = np.clip(vals, 1.0, cap)
        else:
            vals = np.clip(vals, 1.0, FALLBACK_LOGNORM_MEAN_INR * 20)
        return np.round(vals, 2)

    return sample


# ---------------------------------------------------------------------------
# Entity generators
# ---------------------------------------------------------------------------

def short_id() -> str:
    return uuid.uuid4().hex[:10]


def generate_customers(n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate Customer entity table."""
    segments = rng.choice(SEGMENTS, size=n, p=SEGMENT_WEIGHTS)
    failure_rates = []
    for seg in segments:
        if seg == "new":
            rate = rng.beta(2, 8)
        elif seg == "returning":
            rate = rng.beta(1.5, 8)
        else:  # high_value
            rate = rng.beta(1, 9)
        failure_rates.append(round(float(rate), 4))

    return pd.DataFrame({
        "customer_id": [f"cust_{short_id()}" for _ in range(n)],
        "segment": segments,
        "historical_failure_rate": failure_rates,
    })


def generate_transactions(
    n: int,
    customers: pd.DataFrame,
    amount_sampler,
    rng: np.random.Generator,
    reference_date: datetime,
) -> pd.DataFrame:
    """Generate Transaction entity table."""
    failure_reasons_list = list(FAILURE_REASON_WEIGHTS.keys())
    failure_reason_probs = [FAILURE_REASON_WEIGHTS[r] for r in failure_reasons_list]

    failure_reasons = rng.choice(
        failure_reasons_list, size=n, p=failure_reason_probs
    )

    payment_methods_list = list(PAYMENT_METHOD_WEIGHTS.keys())
    payment_method_probs = [PAYMENT_METHOD_WEIGHTS[m] for m in payment_methods_list]
    payment_methods = rng.choice(payment_methods_list, size=n, p=payment_method_probs)

    merchant_cats_list = list(MERCHANT_CATEGORY_WEIGHTS.keys())
    merchant_cats_probs = [MERCHANT_CATEGORY_WEIGHTS[c] for c in merchant_cats_list]
    merchant_categories = rng.choice(merchant_cats_list, size=n, p=merchant_cats_probs)

    # is_recurring: 80% if saas/d2c_subscription, 20% otherwise
    is_recurring = [
        bool(rng.random() < 0.80) if mc in ("saas", "d2c_subscription") else bool(rng.random() < 0.20)
        for mc in merchant_categories
    ]

    # Sample amounts from Kaggle-calibrated distribution
    amounts = amount_sampler(n)

    # first_failure_timestamp: uniform within last 14 days
    offsets_seconds = rng.integers(0, 14 * 24 * 3600, size=n)
    first_failure_timestamps = [
        reference_date - timedelta(seconds=int(s)) for s in offsets_seconds
    ]

    customer_ids = rng.choice(customers["customer_id"].values, size=n)

    return pd.DataFrame({
        "transaction_id": [f"txn_{short_id()}" for _ in range(n)],
        "customer_id": customer_ids,
        "amount": amounts,
        "currency": "INR",
        "failure_reason": failure_reasons,
        "is_hard_fail": [r in HARD_FAIL_REASONS for r in failure_reasons],
        "first_failure_timestamp": first_failure_timestamps,
        "payment_method": payment_methods,
        "is_recurring": is_recurring,
        "merchant_category": merchant_categories,
    })


def compute_timing_modifier(
    time_since_last_attempt_hours: float, params: GenParams
) -> float:
    """
    Gaussian timing modifier peaked at params.timing_peak_hours.
    Too soon (< ~6h) or too long (> ~120h) gives a lower modifier.
    Clipped to [timing_floor, timing_ceil].
    """
    peak = params.timing_peak_hours
    sigma = params.timing_sigma_hours
    raw = math.exp(-0.5 * ((time_since_last_attempt_hours - peak) / sigma) ** 2)
    # Scale raw [0,1] into [timing_floor, timing_ceil]
    modifier = params.timing_floor + raw * (params.timing_ceil - params.timing_floor)
    return float(np.clip(modifier, params.timing_floor, params.timing_ceil))


def compute_final_probability(
    failure_reason: str,
    attempt_number: int,
    time_since_last_attempt_hours: float,
    is_near_payday: bool,
    segment: str,
    params: GenParams,
    rng: np.random.Generator,
) -> float:
    """
    DATA_SCHEMA.md generation formula:
      final_probability = clamp(
          base * attempt_modifier * timing_modifier * payday_modifier * segment_modifier + noise,
          0.01, 0.99
      )
    """
    base = params.base_probability[failure_reason]
    attempt_modifier = 1.0 / (attempt_number ** params.attempt_decay_exponent)
    timing_modifier = compute_timing_modifier(time_since_last_attempt_hours, params)
    payday_modifier = (
        params.payday_boost
        if (is_near_payday and failure_reason == "insufficient_funds")
        else 1.0
    )
    segment_modifier = SEGMENT_MODIFIER[segment]
    noise = float(rng.uniform(-params.noise_range, params.noise_range))

    prob = (
        base
        * attempt_modifier
        * timing_modifier
        * payday_modifier
        * segment_modifier
        + noise
    )
    return float(np.clip(prob, 0.01, 0.99))


def assign_channel(attempt_number: int) -> str:
    """
    Rule-based channel assignment per DIFFERENTIATORS.md:
      attempt 1 → auto_retry
      attempt 2 → email_prompt
      attempt 3+ → sms_prompt
    """
    if attempt_number == 1:
        return "auto_retry"
    elif attempt_number == 2:
        return "email_prompt"
    else:
        return "sms_prompt"


def generate_attempts(
    transactions: pd.DataFrame,
    customers: pd.DataFrame,
    params: GenParams,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """
    Generate Retry Attempt entity table.
    Hard-fail transactions: 1 row, outcome = not_attempted.
    Transient transactions: up to MAX_ATTEMPTS rows, stop on first success.
    """
    customer_lookup = customers.set_index("customer_id")[
        ["segment", "historical_failure_rate"]
    ].to_dict("index")

    rows = []

    for _, txn in transactions.iterrows():
        txn_id = txn["transaction_id"]
        first_failure_ts = txn["first_failure_timestamp"]
        failure_reason = txn["failure_reason"]
        is_hard_fail = txn["is_hard_fail"]
        customer_info = customer_lookup[txn["customer_id"]]
        segment = customer_info["segment"]

        if is_hard_fail:
            # DATA_SCHEMA.md: hard-fails → exactly 1 row, outcome = not_attempted
            rows.append({
                "attempt_id": f"att_{short_id()}",
                "transaction_id": txn_id,
                "attempt_number": 1,
                "attempt_timestamp": first_failure_ts,
                "time_since_last_attempt": 0.0,
                "time_since_first_failure": 0.0,
                "is_near_payday": first_failure_ts.day in PAYDAY_DAYS,
                "outcome": "not_attempted",
                "channel": "auto_retry",
                "success": 0,
            })
            continue

        # Transient: up to MAX_ATTEMPTS attempts
        prev_ts = first_failure_ts
        for attempt_number in range(1, MAX_ATTEMPTS + 1):
            backoff_hours = BACKOFF_HOURS[attempt_number]
            jitter_hours = float(rng.uniform(-1.0, 1.0))
            attempt_ts = first_failure_ts + timedelta(
                hours=backoff_hours + jitter_hours
            )

            time_since_last = (attempt_ts - prev_ts).total_seconds() / 3600
            time_since_first = (attempt_ts - first_failure_ts).total_seconds() / 3600
            is_near_payday = attempt_ts.day in PAYDAY_DAYS

            prob = compute_final_probability(
                failure_reason=failure_reason,
                attempt_number=attempt_number,
                time_since_last_attempt_hours=time_since_last,
                is_near_payday=is_near_payday,
                segment=segment,
                params=params,
                rng=rng,
            )

            outcome_draw = rng.random()
            if outcome_draw < prob:
                outcome = "success"
                success = 1
            else:
                outcome = "fail"
                success = 0

            rows.append({
                "attempt_id": f"att_{short_id()}",
                "transaction_id": txn_id,
                "attempt_number": attempt_number,
                "attempt_timestamp": attempt_ts,
                "time_since_last_attempt": round(time_since_last, 4),
                "time_since_first_failure": round(time_since_first, 4),
                "is_near_payday": is_near_payday,
                "outcome": outcome,
                "channel": assign_channel(attempt_number),
                "success": success,
            })

            prev_ts = attempt_ts

            if outcome == "success":
                # No further attempts after a success
                break

    return pd.DataFrame(rows)


def build_flat_dataset(
    transactions: pd.DataFrame,
    attempts: pd.DataFrame,
    customers: pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge Transaction + Customer + Retry Attempt into a single flat row per attempt.
    This is the ML training surface. Not-attempted rows are included (for
    completeness) but will be excluded from model training in Phase 2.
    """
    df = attempts.merge(transactions, on="transaction_id", how="left")
    df = df.merge(
        customers.rename(columns={
            "segment": "customer_segment",
            "historical_failure_rate": "customer_historical_failure_rate",
        }),
        on="customer_id",
        how="left",
    )
    return df


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic failed-payment retry dataset."
    )
    parser.add_argument(
        "--n-transactions", type=int, default=5000,
        help="Number of transactions to generate (default: 5000)"
    )
    parser.add_argument(
        "--n-customers", type=int, default=None,
        help="Number of unique customers (default: n_transactions // 5)"
    )
    parser.add_argument(
        "--perturbed", action="store_true",
        help="Use perturbed generation parameters (for model evaluation batch)"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)"
    )
    parser.add_argument(
        "--output-dir", type=str, default=SCRIPT_DIR,
        help="Output directory for CSV files"
    )
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    params = GenParams(perturbed=args.perturbed)
    n_transactions = args.n_transactions
    n_customers = args.n_customers or max(100, n_transactions // 5)
    output_dir = args.output_dir
    reference_date = datetime(2024, 3, 15, 12, 0, 0)  # fixed for reproducibility

    prefix = "perturbed" if args.perturbed else "primary"
    print(f"\n{'='*60}")
    print(f"  Synthetic Data Generator -- {prefix} batch")
    print(f"  n_transactions={n_transactions}, n_customers={n_customers}, seed={args.seed}")
    print(f"  perturbed={args.perturbed}")
    print(f"{'='*60}\n")

    # Step 1: Load Kaggle amount distribution
    shape, loc, scale, cap = load_amount_distribution(KAGGLE_CSV)
    amount_sampler = make_amount_sampler(shape, loc, scale, cap, rng)

    # Step 2: Generate customers
    print(f"Generating {n_customers} customers ...")
    customers = generate_customers(n_customers, rng)

    # Step 3: Generate transactions
    print(f"Generating {n_transactions} transactions ...")
    transactions = generate_transactions(
        n_transactions, customers, amount_sampler, rng, reference_date
    )
    hard_fail_count = transactions["is_hard_fail"].sum()
    transient_count = n_transactions - hard_fail_count
    print(f"  Hard-fail: {hard_fail_count} ({hard_fail_count/n_transactions:.1%})")
    print(f"  Transient: {transient_count} ({transient_count/n_transactions:.1%})")

    # Step 4: Generate retry attempts
    print("Generating retry attempts ...")
    attempts = generate_attempts(transactions, customers, params, rng)
    total_attempts = len(attempts)
    success_rate = attempts[attempts["outcome"] != "not_attempted"]["success"].mean()
    print(f"  Total attempt rows: {total_attempts}")
    print(f"  Overall success rate (transient attempts): {success_rate:.3f}")

    # Step 5: Build flat dataset
    print("Building flat training dataset ...")
    flat = build_flat_dataset(transactions, attempts, customers)

    # Step 6: Save outputs
    os.makedirs(output_dir, exist_ok=True)

    flat_path = os.path.join(output_dir, f"{prefix}_dataset.csv")
    customers_path = os.path.join(output_dir, "customers.csv")
    transactions_path = os.path.join(output_dir, "transactions.csv")
    attempts_path = os.path.join(output_dir, "attempts.csv")

    flat.to_csv(flat_path, index=False)
    print(f"  Saved: {flat_path}  ({len(flat)} rows)")

    if not args.perturbed:
        # Save normalized tables only for primary batch (used by backend)
        customers.to_csv(customers_path, index=False)
        transactions.to_csv(transactions_path, index=False)
        attempts.to_csv(attempts_path, index=False)
        print(f"  Saved: {customers_path}  ({len(customers)} rows)")
        print(f"  Saved: {transactions_path}  ({len(transactions)} rows)")
        print(f"  Saved: {attempts_path}  ({len(attempts)} rows)")

    print(f"\nDone. Run `python validate.py` to verify sanity checks.\n")


if __name__ == "__main__":
    main()
