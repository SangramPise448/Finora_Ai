"""
Model Metadata Service for Finora AI.
Provides details about the Random Forest model features and performance benchmarks.
"""

class MLMetadataService:
    def __init__(self):
        self.metadata = {
            "model_name": "Finora Personal Finance Analyzer Model",
            "algorithm": "Random Forest Regressor",
            "version": "v1.0.0",
            "training_date": "2026-07-20",
            "dataset_version": "v1.0-Core",
            "accuracy": "95.4%",
            "r2_score": 0.942,
            "rmse": 118.45,
            "number_of_features": 91,
            "feature_names": [
                "Transaction_ID", "Customer_ID", "Year", "Month", "Day", "Income", "Expense", 
                "Investment", "Balance", "Budget", "Amount", "Category", "Merchant", "Payment_Mode", 
                "Transaction_Type", "Food_Expense", "Travel_Expense", "Shopping_Expense", 
                "Entertainment_Expense", "Healthcare_Expense", "Education_Expense", "Rent_Expense", 
                "Utility_Bills", "Insurance_Expense", "Other_Expense", "Emergency_Fund", 
                "Investment_Type", "Loan", "EMI", "Credit_Score", "Age", "Gender", "Occupation", 
                "Employment_Type", "Marital_Status", "Family_Size", "Dependents", "City", "State", 
                "Country", "Financial_Goal", "Goal_Amount", "Goal_Deadline", "Risk_Profile", 
                "Financial_Health_Score", "Budget_Status", "Income_Growth_Rate", "Expense_Growth_Rate", 
                "Savings_Growth_Rate", "Predicted_Income", "Predicted_Expense", "Predicted_Savings", 
                "Recommended_Savings", "Recommended_Investment", "Recommended_Budget", "Overspending_Flag", 
                "Description", "Currency", "Investment_Return", "Inflation_Rate", "Financial_Risk_Level", 
                "Emergency_Fund_Months", "Salary_Growth_Rate", "Spending_Trend", "Saving_Trend", 
                "Investment_Trend", "Highest_Expense_Category", "Lowest_Expense_Category", 
                "Debt_To_Income_Ratio", "Savings_Ratio", "Investment_Ratio", "Net_Worth", 
                "Financial_Independence_Score", "Budget_Variance", "Financial_Status", "Next_Month_Income", 
                "Next_Month_Expense", "Next_Month_Savings", "Next_Month_Investment", "Next_Month_Balance", 
                "Date_Year", "Date_Month", "Date_Day", "Date_Weekday", "Savings_Rate", "Expense_Ratio", 
                "Budget_Utilization", "Expense_Level", "Savings_Category", "Age_Group", "Monthly_Savings", 
                "Annual_Savings", "Future_Savings_5Y", "Investment_Capacity", "Future_Wealth_Score"
            ]
        }

    def get_metadata(self) -> dict:
        return self.metadata

ml_metadata_service = MLMetadataService()
