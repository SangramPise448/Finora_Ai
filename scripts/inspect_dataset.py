import pandas as pd
import json

DATASET_PATH = r"d:\Personal_Finance_Analyzer\dataset\Personal_Finance_Analyzer.csv"
df = pd.read_csv(DATASET_PATH, nrows=5)
print("ALL COLUMNS (82):")
for i, col in enumerate(df.columns):
    print(f"{i+1}. {col}")
