import os
import json
import joblib
import pandas as pd
import numpy as np

MODEL_PATH = r"d:\Personal_Finance_Analyzer\model\Personal_Finance_Model.pkl"
MAPPINGS_PATH = r"d:\Personal_Finance_Analyzer\model\categorical_mappings.json"
MEDIANS_PATH = r"d:\Personal_Finance_Analyzer\model\column_medians.json"
DATASET_PATH = r"d:\Personal_Finance_Analyzer\dataset\Personal_Finance_Analyzer.csv"
INFO_PATH = r"d:\Personal_Finance_Analyzer\model\model_info.json"
FEATURES_PATH = r"d:\Personal_Finance_Analyzer\model\feature_columns.json"

print("="*60)
print("PHASE 1 - MODEL VERIFICATION")
print("="*60)

model = None
if not os.path.exists(MODEL_PATH):
    print(f"[FAIL] Model file missing at {MODEL_PATH}")
else:
    try:
        model = joblib.load(MODEL_PATH)
        print(f"[SUCCESS] Model loaded successfully from {MODEL_PATH}")
        print(f"Model Class: {type(model)}")
        
        if hasattr(model, 'feature_names_in_'):
            n_features = len(model.feature_names_in_)
            print(f"Number of Input Features: {n_features}")
            print(f"Features (first 10): {list(model.feature_names_in_[:10])}")
        else:
            n_features = getattr(model, 'n_features_in_', 'Unknown')
            print(f"Number of Input Features: {n_features}")
            
        if hasattr(model, 'n_estimators'):
            print(f"Number of Estimators: {model.n_estimators}")
            
        if hasattr(model, 'criterion'):
            print(f"Criterion: {model.criterion}")
            
    except Exception as e:
        print(f"[ERROR] Loading model failed: {e}")

print("\n" + "="*60)
print("PHASE 2 & 3 - DATASET & PREPROCESSING VERIFICATION")
print("="*60)

if os.path.exists(DATASET_PATH):
    df = pd.read_csv(DATASET_PATH)
    print(f"[SUCCESS] Loaded dataset from {DATASET_PATH}")
    print(f"Dataset Shape: {df.shape}")
    print(f"Columns ({len(df.columns)}): {list(df.columns[:15])}...")
    
    # Check target column
    possible_targets = [c for c in df.columns if 'savings' in c.lower() or 'target' in c.lower()]
    print(f"Possible Target Columns: {possible_targets}")
else:
    print(f"[FAIL] Dataset missing at {DATASET_PATH}")

if os.path.exists(MAPPINGS_PATH):
    with open(MAPPINGS_PATH, 'r', encoding='utf-8') as f:
        mappings = json.load(f)
    print(f"[SUCCESS] Loaded categorical mappings: {len(mappings)} categorical columns mapped.")
    print(f"Mapped categories: {list(mappings.keys())[:10]}")
else:
    print(f"[WARN] Categorical mappings missing at {MAPPINGS_PATH}")

if os.path.exists(MEDIANS_PATH):
    with open(MEDIANS_PATH, 'r', encoding='utf-8') as f:
        medians = json.load(f)
    print(f"[SUCCESS] Loaded column medians: {len(medians)} columns.")
else:
    print(f"[WARN] Column medians missing at {MEDIANS_PATH}")

# Check sample prediction if model exists
if model is not None and hasattr(model, 'feature_names_in_'):
    try:
        sample_row = pd.DataFrame([{col: 1.0 for col in model.feature_names_in_}])
        pred = model.predict(sample_row)
        print(f"\n[SAMPLE PREDICTION TEST] Result: {pred[0]}")
    except Exception as e:
        print(f"\n[SAMPLE PREDICTION TEST FAIL]: {e}")
