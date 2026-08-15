"""
Robust Dataset Validation & Cleaning Pipeline for Finora AI.
Supports up to 200 MB file uploads.
Features: Flexible column alias mapping, automated duplicate removal,
whitespace trimming, type coercion, and median imputation so valid datasets are not blocked.
"""
import hashlib
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from backend.utils.logger import get_logger

logger = get_logger("finora.validation")

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024   # 200 MB
ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}
MAX_ROWS = 500_000

# Canonical columns & common aliases (case-insensitive)
COLUMN_ALIASES = {
    "income": ["income", "monthly income", "monthly_income", "gross income", "earnings", "salary", "revenue"],
    "expense": ["expense", "expenses", "monthly expense", "monthly_expense", "total expense", "total_expense", "spending", "cost", "outflow"],
    "budget": ["budget", "monthly budget", "monthly_budget", "allocated budget"],
    "investment": ["investment", "investments", "monthly investment", "monthly_investment", "savings_invested"],
    "age": ["age", "user_age"],
    "gender": ["gender", "sex"],
    "occupation": ["occupation", "job", "profession"],
    "employment_type": ["employment_type", "employment type", "employment"],
    "marital_status": ["marital_status", "marital status"],
    "credit_score": ["credit_score", "credit score", "cibil", "cibil_score"],
    "loan": ["loan", "loans", "outstanding loan", "debt"],
    "emi": ["emi", "monthly emi"],
    "category": ["category", "spending category", "primary category"],
    "payment_mode": ["payment_mode", "payment mode", "payment_method"],
    "risk_profile": ["risk_profile", "risk profile"],
    "financial_goal": ["financial_goal", "financial goal", "goal"],
    "goal_amount": ["goal_amount", "goal amount", "target_amount"]
}

STANDARD_COLUMN_NAMES = {
    "income": "Income",
    "expense": "Expense",
    "budget": "Budget",
    "investment": "Investment",
    "age": "Age",
    "gender": "Gender",
    "occupation": "Occupation",
    "employment_type": "Employment_Type",
    "marital_status": "Marital_Status",
    "credit_score": "Credit_Score",
    "loan": "Loan",
    "emi": "EMI",
    "category": "Category",
    "payment_mode": "Payment_Mode",
    "risk_profile": "Risk_Profile",
    "financial_goal": "Financial_Goal",
    "goal_amount": "Goal_Amount"
}

NUMERIC_COLUMNS = [
    "Income", "Expense", "Budget", "Investment", "Age",
    "Credit_Score", "Loan", "EMI", "Goal_Amount"
]


def normalize_column_names(df: pd.DataFrame) -> Tuple[pd.DataFrame, list]:
    """
    Maps column aliases to standard Finora AI column names (e.g. 'monthly_income' -> 'Income').
    """
    renamed = []
    rename_map = {}

    for col in df.columns:
        col_clean = str(col).strip().lower().replace("_", " ")
        matched = False
        for key, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                if col_clean == alias or col_clean == alias.replace(" ", ""):
                    target_name = STANDARD_COLUMN_NAMES[key]
                    if col != target_name:
                        rename_map[col] = target_name
                        renamed.append(f"Renamed column '{col}' -> '{target_name}'")
                    matched = True
                    break
            if matched:
                break

    if rename_map:
        df = df.rename(columns=rename_map)

    return df, renamed


def validate_and_clean_dataframe(df: pd.DataFrame, filename: str) -> dict:
    """
    Executes full dataset cleaning and validation pipeline.
    Returns structured report dict.
    """
    errors = []
    warnings = []
    original_rows = len(df)
    original_cols = len(df.columns)

    if original_rows == 0:
        errors.append("The uploaded file contains no data rows.")
        return _report(False, errors, warnings, None, original_rows, original_cols)

    if original_rows > MAX_ROWS:
        errors.append(f"File has {original_rows:,} rows which exceeds max allowed limit of {MAX_ROWS:,} rows.")
        return _report(False, errors, warnings, None, original_rows, original_cols)

    # 1. Clean copy & normalize column names
    df = df.copy()

    # Trim whitespace from column headers
    df.columns = [str(c).strip() for c in df.columns]

    df, rename_warnings = normalize_column_names(df)
    warnings.extend(rename_warnings)

    # 2. Check for essential financial columns
    if "Income" not in df.columns:
        # Check if there is any numeric column we can treat as Income
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if num_cols:
            df["Income"] = df[num_cols[0]]
            warnings.append(f"Missing 'Income' column — mapped from '{num_cols[0]}'.")
        else:
            errors.append("Required column 'Income' missing. Please ensure dataset has an Income or Earnings column.")
            return _report(False, errors, warnings, None, original_rows, original_cols)

    if "Expense" not in df.columns:
        num_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != "Income"]
        if num_cols:
            df["Expense"] = df[num_cols[0]]
            warnings.append(f"Missing 'Expense' column — mapped from '{num_cols[0]}'.")
        else:
            df["Expense"] = df["Income"] * 0.6  # Safe fallback estimate (60% expense)
            warnings.append("Missing 'Expense' column — estimated at 60% of Income for analysis.")

    # 3. Drop completely empty columns & rows
    empty_cols = df.columns[df.isnull().all()].tolist()
    if empty_cols:
        df.drop(columns=empty_cols, inplace=True)
        warnings.append(f"Dropped {len(empty_cols)} empty column(s).")

    df.dropna(how="all", inplace=True)

    # 4. Remove unnamed / index columns
    unnamed = [c for c in df.columns if str(c).startswith("Unnamed")]
    if unnamed:
        df.drop(columns=unnamed, inplace=True)

    # 5. Remove duplicates
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        df.drop_duplicates(inplace=True)
        warnings.append(f"Removed {dup_count:,} duplicate row(s).")

    # 6. Clean and convert numeric columns
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            # Clean string symbols like $ ₹ ,
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(r"[₹$,\s]", "", regex=True)
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
            # Impute NaNs with median
            median_val = df[col].median()
            if pd.isna(median_val):
                median_val = 0.0
            if df[col].isnull().sum() > 0:
                df[col] = df[col].fillna(median_val)

    # Clip negative values for Income and Expense
    if "Income" in df.columns:
        df["Income"] = df["Income"].clip(lower=0)
    if "Expense" in df.columns:
        df["Expense"] = df["Expense"].clip(lower=0)

    # Ensure missing optional numeric columns exist with defaults
    if "Budget" not in df.columns:
        df["Budget"] = df["Expense"] * 1.1
    if "Investment" not in df.columns:
        df["Investment"] = (df["Income"] - df["Expense"]).clip(lower=0) * 0.3

    # Replace inf values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)

    cleaned_rows = len(df)
    missing_rate = 0.0  # NaNs imputed

    logger.info(f"Dataset '{filename}' successfully cleaned: {original_rows}->{cleaned_rows} rows.")

    return _report(
        is_valid=True,
        errors=errors,
        warnings=warnings,
        cleaned_df=df,
        original_rows=original_rows,
        original_cols=original_cols,
        cleaned_rows=cleaned_rows,
        missing_rate=missing_rate,
        dup_removed=dup_count
    )


def _report(is_valid, errors, warnings, cleaned_df,
            original_rows=0, original_cols=0,
            cleaned_rows=None, missing_rate=0.0, dup_removed=0):
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "cleaned_df": cleaned_df,
        "stats": {
            "original_rows": int(original_rows),
            "original_columns": int(original_cols),
            "cleaned_rows": int(cleaned_rows) if cleaned_rows is not None else int(original_rows),
            "missing_data_rate_pct": float(round(missing_rate, 2)),
            "duplicates_removed": int(dup_removed),
        }
    }
