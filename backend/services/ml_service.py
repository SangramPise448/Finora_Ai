import os
import json
import joblib
import pandas as pd
import numpy as np
from backend.config import settings

class MLService:
    def __init__(self):
        self.model = None
        self.mappings = {}
        self.medians = {}
        self.features_list = []
        
        # Load feature columns list
        features_path = os.path.join(os.path.dirname(settings.MODEL_PATH), "feature_columns.json")
        if os.path.exists(features_path):
            try:
                with open(features_path, 'r', encoding='utf-8') as f:
                    self.features_list = json.load(f)
                print(f">>> ML_SERVICE: Loaded {len(self.features_list)} features from feature_columns.json.")
            except Exception as e:
                print(f">>> ML_SERVICE: Error loading feature_columns.json: {e}")

        # Load the Random Forest model
        if os.path.exists(settings.MODEL_PATH):
            try:
                self.model = joblib.load(settings.MODEL_PATH)
                print(">>> ML_SERVICE: Random Forest Model loaded successfully.")
                if hasattr(self.model, 'feature_names_in_'):
                    self.features_list = list(self.model.feature_names_in_)
                    print(f">>> ML_SERVICE: Model expects {len(self.features_list)} features.")
            except Exception as e:
                print(f">>> ML_SERVICE: Error loading model from {settings.MODEL_PATH}: {e}")
        else:
            print(f">>> ML_SERVICE: WARNING: Model file not found at {settings.MODEL_PATH}")

        # Load categorical mappings
        if os.path.exists(settings.MAPPINGS_PATH):
            try:
                with open(settings.MAPPINGS_PATH, 'r', encoding='utf-8') as f:
                    self.mappings = json.load(f)
                print(">>> ML_SERVICE: Categorical mappings loaded.")
            except Exception as e:
                print(f">>> ML_SERVICE: Error loading mappings: {e}")

        # Load column medians
        if os.path.exists(settings.MEDIANS_PATH):
            try:
                with open(settings.MEDIANS_PATH, 'r', encoding='utf-8') as f:
                    self.medians = json.load(f)
                print(">>> ML_SERVICE: Column medians loaded.")
            except Exception as e:
                print(f">>> ML_SERVICE: Error loading medians: {e}")

    def preprocess_row(self, raw_data: dict) -> dict:
        """
        Take a dictionary of raw inputs, clean/calculate missing items,
        encode categoricals, and return a dictionary of numeric values matching the feature vector.
        """
        processed = {}
        
        # 1. Fill default values from medians first
        for col, median_val in self.medians.items():
            processed[col] = median_val
            
        # 2. Update with raw data provided by user
        for key, val in raw_data.items():
            if val is not None and val != "":
                processed[key] = val
                
        # 3. Perform manual calculations for custom features
        income = float(processed.get("Income", 0))
        expense = float(processed.get("Expense", 0))
        budget = float(processed.get("Budget", 0))
        age = float(processed.get("Age", 30))
        
        # Calculate savings as income - expense
        savings = income - expense
        processed["Monthly_Savings"] = savings
        processed["Annual_Savings"] = savings * 12
        processed["Future_Savings_5Y"] = savings * 60
        processed["Investment_Capacity"] = round(max(0, savings) * 0.30, 2)
        processed["Emergency_Fund"] = round(expense * 6, 2)
        
        # Savings Rate & Expense Ratio
        savings_rate = (savings / income * 100) if income > 0 else 0.0
        expense_ratio = (expense / income * 100) if income > 0 else 0.0
        processed["Savings_Rate"] = round(savings_rate, 2)
        processed["Expense_Ratio"] = round(expense_ratio, 2)
        processed["Savings_Ratio"] = round(savings_rate, 2)
        processed["Investment_Ratio"] = round(float(processed.get("Investment", 0)) / income * 100, 2) if income > 0 else 0.0
        
        # Budget Utilization & Variance
        budget_utilization = (expense / budget * 100) if budget > 0 else 0.0
        processed["Budget_Utilization"] = round(budget_utilization, 2)
        processed["Budget_Variance"] = budget - expense
        
        # Health Score & Wealth Score
        health_score = np.clip(savings_rate, 0, 100)
        processed["Financial_Health_Score"] = round(health_score, 2)
        processed["Future_Wealth_Score"] = (processed["Investment_Capacity"] * savings_rate) / 100
        
        # Date sub-components
        date_str = str(processed.get("Date", "2026-07-31"))
        try:
            dt = pd.to_datetime(date_str)
        except:
            dt = pd.to_datetime("2026-07-31")
            
        processed["Date_Year"] = dt.year
        processed["Date_Month"] = dt.month
        processed["Date_Day"] = dt.day
        processed["Date_Weekday"] = dt.day_name()
        processed["Year"] = dt.year
        processed["Month"] = dt.strftime("%B")
        processed["Day"] = dt.day
        
        # Categorical strings -> numeric encoding using JSON mappings
        for col, mapping_dict in self.mappings.items():
            if col in processed and isinstance(mapping_dict, dict):
                val = str(processed[col])
                if val in mapping_dict:
                    processed[col] = mapping_dict[val]
                else:
                    processed[col] = 0
                    
        # Safe categorical cuts with fallback dictionary lookups
        health = processed["Financial_Health_Score"]
        status_str = "Excellent" if health >= 70 else "Good" if health >= 50 else "Average" if health >= 30 else "Poor"
        processed["Financial_Status"] = self.mappings.get("Financial_Status", {}).get(status_str, 0)
        
        level_str = "Low" if processed["Expense_Ratio"] <= 40 else "Medium" if processed["Expense_Ratio"] <= 70 else "High"
        processed["Expense_Level"] = self.mappings.get("Expense_Level", {}).get(level_str, 0)
        
        s_rate = processed["Savings_Rate"]
        cat_str = "Very Low" if s_rate <= 10 else "Low" if s_rate <= 20 else "Medium" if s_rate <= 40 else "High"
        processed["Savings_Category"] = self.mappings.get("Savings_Category", {}).get(cat_str, 0)
        
        ag_str = "18-25" if age <= 25 else "26-35" if age <= 35 else "36-45" if age <= 45 else "46-60" if age <= 60 else "60+"
        processed["Age_Group"] = self.mappings.get("Age_Group", {}).get(ag_str, 0)
        
        return processed

    def predict_profile(self, raw_data: dict) -> dict:
        """
        Runs ML prediction on a single user profile dictionary using the trained Random Forest Regressor.
        Returns predicted savings and calculated analytics.
        """
        processed_data = self.preprocess_row(raw_data)
        
        # Fallback if model is not loaded
        if self.model is None:
            predicted_savings = max(0.0, float(raw_data.get("Income", 50000)) - float(raw_data.get("Expense", 30000)))
            print(">>> ML_SERVICE: Model not found. Running fallback estimation.")
        else:
            # Reconstruct exact features dataframe in exact order
            X_row = {}
            for col in self.features_list:
                val = processed_data.get(col, 0.0)
                # Convert string if any remaining
                if isinstance(val, str):
                    try:
                        val = float(val)
                    except:
                        val = 0.0
                X_row[col] = [val]
                
            df_row = pd.DataFrame(X_row)
            df_row = df_row.replace([np.inf, -np.inf], np.nan).fillna(0.0)
            
            try:
                pred = self.model.predict(df_row)
                predicted_savings = float(pred[0])
            except Exception as e:
                print(f">>> ML_SERVICE: Random Forest prediction error: {e}")
                predicted_savings = max(0.0, float(processed_data.get("Income", 50000)) - float(processed_data.get("Expense", 30000)))
                
        # Future calculations
        annual_savings = predicted_savings * 12
        five_year_savings = annual_savings * 5
        recommended_investment = round(predicted_savings * 0.30, 2)
        retirement_fund_20y = round(annual_savings * 20, 2)
        
        # Wealth Category
        if annual_savings <= 100000:
            wealth_cat = "Low"
        elif annual_savings <= 300000:
            wealth_cat = "Medium"
        elif annual_savings <= 600000:
            wealth_cat = "High"
        else:
            wealth_cat = "Excellent"
            
        # Personalized Recommendations
        if wealth_cat == "Excellent":
            recommendation = "Outstanding savings performance! Allocate your monthly surplus into a combination of Nifty 50 Index Funds, Flexi-Cap Mutual Funds, and tax-saving ELSS."
        elif wealth_cat == "High":
            recommendation = "Strong financial health. Boost your monthly SIP contributions and establish a 6-month liquid emergency reserve."
        elif wealth_cat == "Medium":
            recommendation = "Moderate savings pool. Focus on reducing non-essential expenditures to increase your monthly investment capacity."
        else:
            recommendation = "Low savings capacity. Set up automated savings rules on salary day and maintain a strict monthly expense budget."
            
        result = {
            "predicted_savings": round(predicted_savings, 2),
            "predicted_annual_savings": round(annual_savings, 2),
            "predicted_5year_savings": round(five_year_savings, 2),
            "recommended_investment": round(recommended_investment, 2),
            "retirement_fund_20y": round(retirement_fund_20y, 2),
            "future_wealth_category": wealth_cat,
            "investment_recommendation": recommendation,
            "financial_health_score": float(processed_data.get("Financial_Health_Score", 50.0)),
            "budget_utilization": float(processed_data.get("Budget_Utilization", 70.0)),
            "emergency_fund": float(processed_data.get("Emergency_Fund", 0.0)),
            "savings_rate": float(processed_data.get("Savings_Rate", 10.0)),
            "expense_ratio": float(processed_data.get("Expense_Ratio", 80.0)),
            "future_wealth_score": float(processed_data.get("Future_Wealth_Score", 0.0)),
            "savings_forecast": [
                {"year": "Current", "savings": round(predicted_savings, 2)},
                {"year": "Year 1", "savings": round(predicted_savings * 12 * 1.05, 2)},
                {"year": "Year 2", "savings": round(predicted_savings * 12 * 2.15, 2)},
                {"year": "Year 3", "savings": round(predicted_savings * 12 * 3.35, 2)},
                {"year": "Year 4", "savings": round(predicted_savings * 12 * 4.62, 2)},
                {"year": "Year 5", "savings": round(predicted_savings * 12 * 6.00, 2)}
            ]
        }
        return result

    def predict_dataset(self, df: pd.DataFrame) -> tuple:
        """
        Runs ML prediction on an uploaded DataFrame.
        Returns predicted savings array, and a summarization report dictionary.
        """
        cleaned_df = df.copy()
        
        # Apply row cleaning and preprocessing
        rows_processed = []
        for _, row in cleaned_df.iterrows():
            row_dict = row.to_dict()
            processed_row = self.preprocess_row(row_dict)
            rows_processed.append(processed_row)
            
        processed_df = pd.DataFrame(rows_processed)
        
        # If model is loaded, predict. Otherwise fallback
        if self.model is None:
            predicted = (processed_df["Income"] - processed_df["Expense"]).clip(lower=0).values
        else:
            X_df = processed_df[self.features_list]
            X_df = X_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)
            predicted = self.model.predict(X_df)
            
        processed_df["Predicted_Savings"] = predicted
        
        # Create summaries
        summary = {
            "total_records": len(processed_df),
            "average_income": round(float(processed_df["Income"].mean()), 2) if "Income" in processed_df else 0.0,
            "average_expense": round(float(processed_df["Expense"].mean()), 2) if "Expense" in processed_df else 0.0,
            "average_savings": round(float(processed_df["Monthly_Savings"].mean()), 2) if "Monthly_Savings" in processed_df else 0.0,
            "average_predicted_savings": round(float(predicted.mean()), 2),
            "average_health_score": round(float(processed_df["Financial_Health_Score"].mean()), 2) if "Financial_Health_Score" in processed_df else 0.0,
            "average_budget_utilization": round(float(processed_df["Budget_Utilization"].mean()), 2) if "Budget_Utilization" in processed_df else 0.0,
            "average_credit_score": round(float(processed_df["Credit_Score"].mean()), 2) if "Credit_Score" in processed_df else 700.0
        }
        
        return predicted.tolist(), summary

# Singleton ML Service
ml_service = MLService()
