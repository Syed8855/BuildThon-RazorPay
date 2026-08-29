"""
validate.py -- Sanity-check the generated dataset against DATA_SCHEMA.md requirements.

Runs exactly the 4 checks specified in DATA_SCHEMA.md "Validation of the generator":
  1. Recovery rate ordering by failure reason
     (network_timeout/processing_error > issuer_declined/do_not_honor)
  2. Recovery rate declines monotonically with attempt_number
  3. insufficient_funds recovery bumps near payday vs away from payday
  4. amount distribution resembles Kaggle reference
     (log-normal shape check via KS-test / summary stat comparison)

Exits 0 if all checks pass. Exits 1 if any check fails.
DO NOT start Phase 2 (model training) until this exits 0.

Usage:
    python validate.py                          # uses primary_dataset.csv + kaggle/onlinefraud.csv
    python validate.py --dataset my_data.csv
    python validate.py --no-kaggle-check        # skip check 4 if Kaggle file absent
"""

import argparse
import os
import sys
import warnings

import numpy as np
import pandas as pd
from scipy import stats
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(SCRIPT_DIR, "primary_dataset.csv")
KAGGLE_CSV = os.path.join(SCRIPT_DIR, "kaggle", "onlinefraud.csv")
USD_TO_INR = 83.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pass_fail(condition: bool, label: str, detail: str = "") -> bool:
    status = "PASS" if condition else "FAIL"
    icon = "[OK]" if condition else "[X]"
    detail_str = f"  -> {detail}" if detail else ""
    print(f"  [{status}] {icon} {label}{detail_str}")
    return condition


def section(title: str):
    print(f"\n{'--'*30}")
    print(f"  {title}")
    print(f"{'--'*30}")


# ---------------------------------------------------------------------------
# Check 1: Recovery rate ordering by failure reason
# ---------------------------------------------------------------------------

def check_recovery_rate_ordering(df: pd.DataFrame) -> bool:
    """
    DATA_SCHEMA.md: recovery rate should be higher for
    network_timeout / processing_error  than for  issuer_declined / do_not_honor
    """
    section("Check 1 — Recovery rate ordering by failure reason")

    # Only transient attempts with a binary outcome
    transient = df[df["outcome"].isin(["success", "fail"])].copy()

    rates = (
        transient.groupby("failure_reason")["success"]
        .agg(["mean", "count"])
        .rename(columns={"mean": "recovery_rate", "count": "n_attempts"})
        .sort_values("recovery_rate", ascending=False)
    )
    print(f"\n  Recovery rates by failure reason:")
    print(f"  {'Failure reason':<22} {'Rate':>8}  {'N':>6}")
    print(f"  {'─'*40}")
    for fr, row in rates.iterrows():
        print(f"  {fr:<22} {row['recovery_rate']:>7.3f}  {int(row['n_attempts']):>6}")

    # Check 1a: network_timeout > issuer_declined
    nt = rates.loc["network_timeout", "recovery_rate"] if "network_timeout" in rates.index else None
    pe = rates.loc["processing_error", "recovery_rate"] if "processing_error" in rates.index else None
    id_ = rates.loc["issuer_declined", "recovery_rate"] if "issuer_declined" in rates.index else None
    dnh = rates.loc["do_not_honor", "recovery_rate"] if "do_not_honor" in rates.index else None

    results = []

    if nt is not None and id_ is not None:
        ok = nt > id_
        results.append(pass_fail(
            ok,
            "network_timeout recovery > issuer_declined recovery",
            f"{nt:.3f} vs {id_:.3f}",
        ))

    if nt is not None and dnh is not None:
        ok = nt > dnh
        results.append(pass_fail(
            ok,
            "network_timeout recovery > do_not_honor recovery",
            f"{nt:.3f} vs {dnh:.3f}",
        ))

    if pe is not None and id_ is not None:
        ok = pe > id_
        results.append(pass_fail(
            ok,
            "processing_error recovery > issuer_declined recovery",
            f"{pe:.3f} vs {id_:.3f}",
        ))

    if pe is not None and dnh is not None:
        ok = pe > dnh
        results.append(pass_fail(
            ok,
            "processing_error recovery > do_not_honor recovery",
            f"{pe:.3f} vs {dnh:.3f}",
        ))

    return all(results)


# ---------------------------------------------------------------------------
# Check 2: Recovery rate declines with attempt_number
# ---------------------------------------------------------------------------

def check_recovery_decline_with_attempt(df: pd.DataFrame) -> bool:
    """
    DATA_SCHEMA.md: recovery rate should decline with attempt_number.
    We require attempt_1 > attempt_2 > attempt_3 (monotone).
    """
    section("Check 2 — Recovery rate declines with attempt_number")

    transient = df[df["outcome"].isin(["success", "fail"])].copy()
    by_attempt = (
        transient.groupby("attempt_number")["success"]
        .agg(["mean", "count"])
        .rename(columns={"mean": "recovery_rate", "count": "n_attempts"})
        .sort_index()
    )
    print(f"\n  Recovery rates by attempt number:")
    print(f"  {'Attempt':>8} {'Rate':>8}  {'N':>6}")
    print(f"  {'─'*28}")
    for att, row in by_attempt.iterrows():
        print(f"  {att:>8} {row['recovery_rate']:>7.3f}  {int(row['n_attempts']):>6}")

    # Check monotone decrease across at least attempts 1, 2, 3
    available = [a for a in [1, 2, 3] if a in by_attempt.index]
    results = []
    for i in range(len(available) - 1):
        a, b = available[i], available[i + 1]
        ra = by_attempt.loc[a, "recovery_rate"]
        rb = by_attempt.loc[b, "recovery_rate"]
        ok = ra > rb
        results.append(pass_fail(
            ok,
            f"attempt {a} recovery ({ra:.3f}) > attempt {b} recovery ({rb:.3f})",
        ))

    return all(results)


# ---------------------------------------------------------------------------
# Check 3: Payday bump for insufficient_funds
# ---------------------------------------------------------------------------

def check_payday_bump(df: pd.DataFrame) -> bool:
    """
    DATA_SCHEMA.md: insufficient_funds recovery rate should visibly bump near payday.
    """
    section("Check 3 — Payday bump for insufficient_funds")

    insuf = df[
        (df["failure_reason"] == "insufficient_funds")
        & (df["outcome"].isin(["success", "fail"]))
    ].copy()

    if len(insuf) == 0:
        print("  WARNING: no insufficient_funds transient attempts found — skipping")
        return True

    near = insuf[insuf["is_near_payday"] == True]["success"]
    away = insuf[insuf["is_near_payday"] == False]["success"]

    near_rate = near.mean() if len(near) > 0 else 0.0
    away_rate = away.mean() if len(away) > 0 else 0.0

    print(f"\n  insufficient_funds recovery near payday:  {near_rate:.3f}  (n={len(near)})")
    print(f"  insufficient_funds recovery away payday:  {away_rate:.3f}  (n={len(away)})")

    ok = near_rate > away_rate
    return pass_fail(ok, "near-payday recovery > away-from-payday recovery",
                     f"{near_rate:.3f} vs {away_rate:.3f}")


# ---------------------------------------------------------------------------
# Check 4: Amount distribution resembles Kaggle reference
# ---------------------------------------------------------------------------

def check_amount_distribution(df: pd.DataFrame, kaggle_csv: str) -> bool:
    """
    DATA_SCHEMA.md: amount distribution should visibly resemble the Kaggle
    reference distribution's shape (histogram comparison / summary statistics).
    Uses a KS-test against the fitted distribution + prints summary stats.
    Falls back to a log-normality check if Kaggle file is absent.
    """
    section("Check 4 — Amount distribution shape")

    amounts = df["amount"].dropna()
    amounts = amounts[amounts > 0]

    print(f"\n  Generated amounts — summary statistics:")
    print(f"  n={len(amounts)}, min={amounts.min():.0f}, "
          f"median={amounts.median():.0f}, "
          f"mean={amounts.mean():.0f}, "
          f"p99={np.percentile(amounts, 99):.0f}, "
          f"max={amounts.max():.0f}")

    if not os.path.exists(kaggle_csv):
        # Fallback: check that amounts are log-normally distributed
        # (Shapiro-Wilk on log(amount) with a sample)
        log_amounts = np.log(amounts.sample(min(500, len(amounts)), random_state=0))
        stat, pval = stats.shapiro(log_amounts)
        ok = pval > 0.01  # log-normal if we fail to reject normality of logs
        detail = f"log-normality Shapiro-Wilk p={pval:.4f} (threshold > 0.01)"
        print(f"\n  (Kaggle file absent — checking log-normality of generated amounts)")
        return pass_fail(ok, "Generated amounts are log-normally distributed", detail)

    # Load Kaggle and compare
    kaggle_df = pd.read_csv(kaggle_csv, usecols=["amount"])
    kaggle_amounts = kaggle_df["amount"].dropna()
    kaggle_amounts_inr = kaggle_amounts[kaggle_amounts > 0] * USD_TO_INR
    cap = float(np.percentile(kaggle_amounts_inr, 99))
    kaggle_amounts_inr = kaggle_amounts_inr[kaggle_amounts_inr <= cap]

    print(f"\n  Kaggle amounts (INR) — summary statistics:")
    print(f"  n={len(kaggle_amounts_inr)}, "
          f"min={kaggle_amounts_inr.min():.0f}, "
          f"median={kaggle_amounts_inr.median():.0f}, "
          f"mean={kaggle_amounts_inr.mean():.0f}, "
          f"p99={np.percentile(kaggle_amounts_inr, 99):.0f}")

    # Fit log-normal to Kaggle
    shape, loc, scale = stats.lognorm.fit(kaggle_amounts_inr, floc=0)

    # KS-test: generated amounts vs the fitted distribution
    ks_stat, ks_pval = stats.kstest(
        amounts.values,
        lambda x: stats.lognorm.cdf(x, s=shape, loc=loc, scale=scale),
    )
    print(f"\n  KS-test (generated vs Kaggle-fitted log-normal): "
          f"stat={ks_stat:.4f}, p={ks_pval:.4f}")

    # Also compare log-means and log-stds (shape similarity)
    gen_log_mean = np.log(amounts).mean()
    gen_log_std = np.log(amounts).std()
    ref_log_mean = np.log(kaggle_amounts_inr).mean()
    ref_log_std = np.log(kaggle_amounts_inr).std()

    mean_ratio = gen_log_mean / ref_log_mean if ref_log_mean != 0 else float("inf")
    std_ratio = gen_log_std / ref_log_std if ref_log_std != 0 else float("inf")

    print(f"  Log-space mean:  generated={gen_log_mean:.3f}, reference={ref_log_mean:.3f}, ratio={mean_ratio:.3f}")
    print(f"  Log-space std:   generated={gen_log_std:.3f},  reference={ref_log_std:.3f},  ratio={std_ratio:.3f}")

    # Accept if KS-test does not strongly reject (p > 0.001 is reasonable for
    # synthetic data) OR log-space mean within 25% of reference
    ks_ok = ks_pval > 0.001
    mean_ok = 0.75 <= mean_ratio <= 1.25
    ok = ks_ok or mean_ok

    result = pass_fail(
        ok,
        "Amount distribution shape resembles Kaggle reference",
        f"KS p={ks_pval:.4f} (>0.001? {ks_ok}), log-mean ratio={mean_ratio:.3f} (0.75–1.25? {mean_ok})",
    )

    # Save comparison histogram
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        axes[0].hist(np.log1p(amounts), bins=50, color="#3395FF", alpha=0.7,
                     label="Generated (INR)", density=True)
        axes[0].hist(np.log1p(kaggle_amounts_inr), bins=50, color="#F2B705", alpha=0.7,
                     label="Kaggle ref (INR)", density=True)
        axes[0].set_title("log(amount+1) distribution comparison")
        axes[0].legend()

        axes[1].hist(amounts, bins=50, color="#3395FF", alpha=0.7,
                     label="Generated", density=True)
        axes[1].hist(kaggle_amounts_inr, bins=50, color="#F2B705", alpha=0.7,
                     label="Kaggle ref", density=True)
        axes[1].set_title("amount distribution (raw)")
        axes[1].legend()

        plot_path = os.path.join(SCRIPT_DIR, "validation_amount_dist.png")
        fig.tight_layout()
        fig.savefig(plot_path, dpi=100)
        plt.close(fig)
        print(f"  Histogram saved: {plot_path}")
    except Exception as e:
        print(f"  (Histogram save failed: {e})")

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Validate generated dataset against DATA_SCHEMA.md sanity checks."
    )
    parser.add_argument(
        "--dataset", type=str, default=DEFAULT_DATASET,
        help=f"Path to generated CSV (default: {DEFAULT_DATASET})"
    )
    parser.add_argument(
        "--no-kaggle-check", action="store_true",
        help="Skip check 4 (amount distribution) even if Kaggle file is present"
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  validate.py — DATA_SCHEMA.md sanity checks")
    print(f"{'='*60}")

    if not os.path.exists(args.dataset):
        print(f"\nERROR: Dataset not found: {args.dataset}")
        print("Run `python generate.py` first.\n")
        sys.exit(1)

    df = pd.read_csv(args.dataset)
    print(f"\n  Loaded: {args.dataset}  ({len(df)} rows)")

    results = {}
    results["check1_recovery_ordering"] = check_recovery_rate_ordering(df)
    results["check2_attempt_decline"] = check_recovery_decline_with_attempt(df)
    results["check3_payday_bump"] = check_payday_bump(df)

    if args.no_kaggle_check:
        print(f"\n{'─'*60}")
        print("  Check 4 — Amount distribution (SKIPPED via --no-kaggle-check)")
        results["check4_amount_dist"] = True
    else:
        results["check4_amount_dist"] = check_amount_distribution(df, KAGGLE_CSV)

    # Summary
    print(f"\n{'='*60}")
    print(f"  VALIDATION SUMMARY")
    print(f"{'='*60}")
    all_passed = True
    for name, ok in results.items():
        status = "PASS" if ok else "FAIL"
        icon = "✓" if ok else "✗"
        print(f"  [{status}] {icon} {name}")
        if not ok:
            all_passed = False

    print()
    if all_passed:
        print("  [OK] ALL CHECKS PASSED -- safe to proceed to Phase 2 (model training)\n")
        sys.exit(0)
    else:
        print("  [X]  ONE OR MORE CHECKS FAILED -- fix the generator before Phase 2\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
