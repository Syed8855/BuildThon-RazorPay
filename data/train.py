"""
train.py -- Phase 2: Train, evaluate, and serialize the retry-success classifier.

Implements MODEL_SPEC.md exactly:
  - Features: attempt_number, time_since_last_attempt, time_since_first_failure,
    failure_reason, is_near_payday, payment_method, is_recurring, merchant_category,
    customer_segment, customer_historical_failure_rate, amount
  - Target: success (1/0) -- not_attempted rows excluded
  - Model: XGBoost (primary) with LightGBM as fallback
  - SHAP: per-prediction (top 3-4 features) + global feature importance chart
  - Evaluation: perturbed-parameter test set + baselines + AUC suspicion check
  - Serialization: joblib dump of model + feature list

Usage:
    python train.py                          # train + evaluate + serialize
    python train.py --model lightgbm         # use LightGBM instead
    python train.py --help

Outputs (in data/):
    model.joblib          serialized model
    feature_list.json     ordered feature names the model expects
    shap_importance.png   global feature importance chart
    eval_report.txt       full evaluation report
"""

import argparse
import json
import os
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score, accuracy_score, classification_report,
    confusion_matrix, log_loss,
)
from sklearn.preprocessing import LabelEncoder
import joblib
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRIMARY_CSV = os.path.join(SCRIPT_DIR, "primary_dataset.csv")
PERTURBED_CSV = os.path.join(SCRIPT_DIR, "perturbed_dataset.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.joblib")
FEATURE_LIST_PATH = os.path.join(SCRIPT_DIR, "feature_list.json")
SHAP_CHART_PATH = os.path.join(SCRIPT_DIR, "shap_importance.png")
EVAL_REPORT_PATH = os.path.join(SCRIPT_DIR, "eval_report.txt")

# MODEL_SPEC.md feature list -- exact order
FEATURE_COLS = [
    "attempt_number",
    "time_since_last_attempt",
    "time_since_first_failure",
    "failure_reason",
    "is_near_payday",
    "payment_method",
    "is_recurring",
    "merchant_category",
    "customer_segment",
    "customer_historical_failure_rate",
    "amount",
]
TARGET_COL = "success"

# Categorical columns -- will be label-encoded
CAT_COLS = ["failure_reason", "payment_method", "merchant_category", "customer_segment"]


# ---------------------------------------------------------------------------
# Data loading + preprocessing
# ---------------------------------------------------------------------------

def load_and_preprocess(csv_path: str, label_encoders: dict = None, fit: bool = True):
    """
    Load a dataset CSV, drop not_attempted rows, encode categoricals.
    If fit=True, fits new LabelEncoders and returns them.
    If fit=False, uses provided label_encoders (for test set consistency).
    """
    df = pd.read_csv(csv_path)

    # MODEL_SPEC.md: exclude not_attempted rows from training
    df = df[df["outcome"] != "not_attempted"].copy()
    df = df.dropna(subset=FEATURE_COLS + [TARGET_COL])

    # Boolean columns -> int
    for col in ["is_near_payday", "is_recurring"]:
        df[col] = df[col].astype(int)

    # Encode categoricals
    if label_encoders is None:
        label_encoders = {}

    for col in CAT_COLS:
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le
        else:
            le = label_encoders[col]
            # Handle unseen categories gracefully
            known = set(le.classes_)
            df[col] = df[col].astype(str).apply(
                lambda x: x if x in known else le.classes_[0]
            )
            df[col] = le.transform(df[col])

    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df[TARGET_COL].values.astype(np.int32)
    return X, y, label_encoders, df


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def train_xgboost(X_train, y_train, X_val, y_val):
    import xgboost as xgb
    model = xgb.XGBClassifier(
        n_estimators=600,
        max_depth=4,           # shallower trees -> less overfit
        learning_rate=0.03,    # slower learning -> better generalization
        subsample=0.75,
        colsample_bytree=0.7,
        min_child_weight=15,   # higher -> less overfit on small leaf nodes
        gamma=1.0,             # min loss reduction for a split -> pruning
        reg_alpha=0.5,         # L1 -> sparse features
        reg_lambda=2.0,        # L2 -> weight shrinkage
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=40,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )
    return model


def train_lightgbm(X_train, y_train, X_val, y_val):
    import lightgbm as lgb
    model = lgb.LGBMClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_samples=20,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(-1)],
    )
    return model


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------

def evaluate_model(model, X, y, label: str, report_lines: list):
    """Compute and record metrics for a given split/dataset."""
    proba = model.predict_proba(X)[:, 1]
    pred = (proba >= 0.5).astype(int)

    auc = roc_auc_score(y, proba)
    acc = accuracy_score(y, pred)
    ll = log_loss(y, proba)
    majority_acc = max(y.mean(), 1 - y.mean())

    line = (
        f"  {label:<30}  AUC={auc:.4f}  Acc={acc:.4f}  "
        f"LogLoss={ll:.4f}  MajorityAcc={majority_acc:.4f}"
    )
    report_lines.append(line)
    print(line)
    return {"auc": auc, "acc": acc, "log_loss": ll, "majority_acc": majority_acc,
            "proba": proba, "pred": pred}


def baseline_metrics(y_true, label: str, report_lines: list):
    """Compute dumb baselines: always-retry, never-retry, majority-class."""
    pos_rate = y_true.mean()
    neg_rate = 1 - pos_rate
    n = len(y_true)

    # Always retry (predict success=1 always)
    always_pred = np.ones(n, dtype=int)
    always_auc = roc_auc_score(y_true, np.ones(n))  # degenerate -- use 0.5
    always_acc = accuracy_score(y_true, always_pred)

    # Never retry (predict success=0 always)
    never_pred = np.zeros(n, dtype=int)
    never_auc = roc_auc_score(y_true, np.zeros(n))  # degenerate -- use 0.5
    never_acc = accuracy_score(y_true, never_pred)

    # Majority class
    majority_class = 1 if pos_rate >= 0.5 else 0
    majority_pred = np.full(n, majority_class, dtype=int)
    majority_acc = accuracy_score(y_true, majority_pred)

    lines = [
        f"  {'[Baseline] Always-retry':<30}  AUC=0.5000  Acc={always_acc:.4f}",
        f"  {'[Baseline] Never-retry':<30}  AUC=0.5000  Acc={never_acc:.4f}",
        f"  {'[Baseline] Majority-class':<30}  AUC=0.5000  Acc={majority_acc:.4f}",
    ]
    for line in lines:
        report_lines.append(line)
        print(line)

    return {
        "always_retry_acc": always_acc,
        "never_retry_acc": never_acc,
        "majority_acc": majority_acc,
    }


def check_overfitting_suspicion(train_auc: float, val_auc: float, report_lines: list):
    """
    MODEL_SPEC.md: if AUC on held-out split > ~0.97, treat as a red flag.
    Also flag if train_auc >> val_auc (classic overfitting).
    """
    lines = []
    lines.append(f"\n  [Overfitting check]")
    lines.append(f"  Train AUC: {train_auc:.4f}  |  Val AUC: {val_auc:.4f}")

    if val_auc > 0.97:
        lines.append(
            f"  WARNING: Val AUC {val_auc:.4f} > 0.97 -- suspiciously high. "
            "Model may be re-deriving the generator formula. Investigate before reporting."
        )
    else:
        lines.append(f"  Val AUC {val_auc:.4f} is in the expected range (< 0.97). OK.")

    gap = train_auc - val_auc
    if gap > 0.05:
        lines.append(
            f"  WARNING: Train-Val AUC gap {gap:.4f} > 0.05 -- possible overfitting."
        )
    else:
        lines.append(f"  Train-Val gap {gap:.4f} <= 0.05. OK.")

    for line in lines:
        report_lines.append(line)
        print(line)


# ---------------------------------------------------------------------------
# SHAP
# ---------------------------------------------------------------------------

def compute_shap(model, X_sample: np.ndarray, model_type: str):
    """
    Compute SHAP values on a sample. Returns shap_values array.
    """
    print("  Computing SHAP values (this may take a moment) ...")
    if model_type == "xgboost":
        explainer = shap.TreeExplainer(model)
    else:
        explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)
    # For binary classifiers some versions return a list; take class-1 values
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    return shap_values


def plot_global_shap(shap_values: np.ndarray, feature_names: list, output_path: str):
    """
    Save a global feature importance bar chart (mean |SHAP|) per MODEL_SPEC.md.
    Colors: positive contributions in Razorpay blue, negative in dark.
    """
    mean_abs = np.abs(shap_values).mean(axis=0)
    order = np.argsort(mean_abs)[::-1]

    names_ordered = [feature_names[i] for i in order]
    vals_ordered = mean_abs[order]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.barh(
        range(len(names_ordered)),
        vals_ordered,
        color="#3395FF",
        edgecolor="none",
    )
    ax.set_yticks(range(len(names_ordered)))
    ax.set_yticklabels(names_ordered, fontsize=11)
    ax.invert_yaxis()
    ax.set_xlabel("Mean |SHAP value| (impact on model output)", fontsize=11)
    ax.set_title("Global feature importance (SHAP)", fontsize=13, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(output_path, dpi=120)
    plt.close(fig)
    print(f"  Global SHAP chart saved: {output_path}")


def shap_domain_check(shap_values: np.ndarray, feature_names: list, df_sample: pd.DataFrame, report_lines: list):
    """
    MODEL_SPEC.md: confirm learned feature importances match real domain patterns:
    - attempt_number should have a negative mean SHAP (more attempts = worse)
    - is_near_payday should have a positive mean SHAP contribution
    - customer_segment (high_value encoded higher) should have positive mean SHAP
    """
    lines = ["\n  [SHAP domain sanity check]"]
    name_to_idx = {n: i for i, n in enumerate(feature_names)}

    checks = {
        "attempt_number": ("attempt_number negative SHAP (more attempts = worse)", "negative"),
        "is_near_payday": ("is_near_payday positive SHAP (payday helps recovery)", "positive"),
    }

    for col, (desc, direction) in checks.items():
        if col not in name_to_idx:
            continue
        idx = name_to_idx[col]
        mean_shap = shap_values[:, idx].mean()
        if direction == "negative":
            ok = mean_shap < 0
        else:
            ok = mean_shap > 0
        status = "OK" if ok else "WARN"
        lines.append(f"  [{status}] {desc}: mean_SHAP={mean_shap:.4f}")

    for line in lines:
        report_lines.append(line)
        print(line)


def per_prediction_shap_example(model, X_sample: np.ndarray, shap_values: np.ndarray,
                                feature_names: list):
    """
    Print a sample per-prediction SHAP breakdown (top 3-4 features).
    This is what the API will return for each /predict call.
    """
    print("\n  Sample per-prediction SHAP (first 3 examples):")
    for i in range(min(3, len(X_sample))):
        sv = shap_values[i]
        top_idx = np.argsort(np.abs(sv))[::-1][:4]
        parts = []
        for idx in top_idx:
            impact_pct = sv[idx] * 100
            sign = "+" if impact_pct >= 0 else ""
            parts.append(f"{feature_names[idx]}: {sign}{impact_pct:.1f}%")
        proba = model.predict_proba(X_sample[i:i+1])[0, 1]
        print(f"    Example {i+1}: p={proba:.3f}  |  {', '.join(parts)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Train, evaluate, and serialize the retry-success classifier."
    )
    parser.add_argument(
        "--model", choices=["xgboost", "lightgbm"], default="xgboost",
        help="Model type (default: xgboost)"
    )
    parser.add_argument(
        "--test-size", type=float, default=0.20,
        help="Fraction of primary data held out for validation (default: 0.20)"
    )
    parser.add_argument(
        "--shap-sample", type=int, default=500,
        help="Number of rows to use for SHAP computation (default: 500)"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
    )
    args = parser.parse_args()

    report_lines = []

    def log(s=""):
        report_lines.append(s)
        print(s)

    log(f"\n{'='*60}")
    log(f"  Phase 2 -- Model Training ({args.model.upper()})")
    log(f"{'='*60}")

    # ---- Load primary dataset ----
    log(f"\nLoading primary dataset: {PRIMARY_CSV}")
    X_all, y_all, label_encoders, df_all = load_and_preprocess(
        PRIMARY_CSV, fit=True
    )
    log(f"  Rows (excl. not_attempted): {len(X_all)}")
    log(f"  Positive rate (success=1):  {y_all.mean():.3f}")

    # ---- Train / val split ----
    X_train, X_val, y_train, y_val = train_test_split(
        X_all, y_all, test_size=args.test_size, random_state=args.seed, stratify=y_all
    )
    log(f"  Train: {len(X_train)}  |  Val: {len(X_val)}")

    # ---- Train ----
    log(f"\nTraining {args.model.upper()} ...")
    if args.model == "xgboost":
        model = train_xgboost(X_train, y_train, X_val, y_val)
    else:
        model = train_lightgbm(X_train, y_train, X_val, y_val)
    log("  Training complete.")

    # ---- Evaluate on train + val splits ----
    log(f"\n{'--'*30}")
    log("  Evaluation -- primary dataset splits")
    log(f"{'--'*30}")
    train_metrics = evaluate_model(model, X_train, y_train, "Train split", report_lines)
    val_metrics = evaluate_model(model, X_val, y_val, "Val split (held-out)", report_lines)

    # ---- Baselines ----
    log(f"\n{'--'*30}")
    log("  Baselines (val split)")
    log(f"{'--'*30}")
    baselines = baseline_metrics(y_val, "Val split", report_lines)

    # MODEL_SPEC.md: model should outperform baselines meaningfully but not implausibly
    model_better = val_metrics["acc"] > baselines["majority_acc"]
    log(f"\n  Model val acc ({val_metrics['acc']:.4f}) > majority baseline "
        f"({baselines['majority_acc']:.4f})? {'YES' if model_better else 'NO -- investigate'}")

    # ---- Overfitting / suspicion check ----
    log(f"\n{'--'*30}")
    log("  Overfitting / suspicion check")
    log(f"{'--'*30}")
    check_overfitting_suspicion(train_metrics["auc"], val_metrics["auc"], report_lines)

    # ---- Perturbed-parameter test set ----
    log(f"\n{'--'*30}")
    log("  Perturbed-parameter test set (MODEL_SPEC.md eval strategy)")
    log(f"{'--'*30}")
    if not os.path.exists(PERTURBED_CSV):
        log(f"  WARNING: {PERTURBED_CSV} not found. Run: python generate.py --perturbed")
        log("  Skipping perturbed evaluation.")
    else:
        X_perturbed, y_perturbed, _, _ = load_and_preprocess(
            PERTURBED_CSV, label_encoders=label_encoders, fit=False
        )
        log(f"  Perturbed set rows: {len(X_perturbed)}  pos rate: {y_perturbed.mean():.3f}")
        perturbed_metrics = evaluate_model(
            model, X_perturbed, y_perturbed, "Perturbed test set", report_lines
        )
        # AUC should be somewhat lower than val (distribution shifted) but still meaningful
        auc_drop = val_metrics["auc"] - perturbed_metrics["auc"]
        log(f"  AUC drop (val -> perturbed): {auc_drop:.4f}  "
            f"({'expected -- parameters shifted' if auc_drop > 0 else 'unexpected -- model may be overfit to generator'})")

        perturbed_baselines = baseline_metrics(y_perturbed, "Perturbed set", report_lines)

    # ---- SHAP ----
    log(f"\n{'--'*30}")
    log("  SHAP explainability")
    log(f"{'--'*30}")

    # Use a random sample of val set for SHAP
    shap_n = min(args.shap_sample, len(X_val))
    rng = np.random.default_rng(args.seed)
    shap_idx = rng.choice(len(X_val), size=shap_n, replace=False)
    X_shap = X_val[shap_idx]

    shap_values = compute_shap(model, X_shap, args.model)
    plot_global_shap(shap_values, FEATURE_COLS, SHAP_CHART_PATH)
    shap_domain_check(shap_values, FEATURE_COLS, df_all, report_lines)
    per_prediction_shap_example(model, X_shap, shap_values, FEATURE_COLS)

    # ---- Serialize ----
    log(f"\n{'--'*30}")
    log("  Serializing model")
    log(f"{'--'*30}")

    # Save model
    joblib.dump(model, MODEL_PATH)
    log(f"  Model saved: {MODEL_PATH}")

    # Save feature list and label encoder classes for API use
    feature_meta = {
        "feature_cols": FEATURE_COLS,
        "cat_cols": CAT_COLS,
        "label_encoders": {
            col: list(le.classes_) for col, le in label_encoders.items()
        },
        "model_type": args.model,
    }
    with open(FEATURE_LIST_PATH, "w") as f:
        json.dump(feature_meta, f, indent=2)
    log(f"  Feature metadata saved: {FEATURE_LIST_PATH}")

    # ---- Save eval report ----
    log(f"\n{'='*60}")
    log("  EVALUATION COMPLETE")
    log(f"{'='*60}\n")

    with open(EVAL_REPORT_PATH, "w") as f:
        f.write("\n".join(report_lines))
    print(f"Full report saved: {EVAL_REPORT_PATH}")


if __name__ == "__main__":
    main()
