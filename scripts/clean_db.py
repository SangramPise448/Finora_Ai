import sqlite3
import json

db_path = "backend/finora.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, user_id, input_data, created_at FROM predictions")
rows = c.fetchall()

seen = set()
to_delete = []

for r in rows:
    pred_id, user_id, raw_input, created_at = r
    data = json.loads(raw_input)
    inc = data.get("Income")
    exp = data.get("Expense")
    
    # Remove test Income 100,000 record specifically requested by user
    if inc == 100000.0 and exp == 55000.0:
        to_delete.append(pred_id)
        continue
        
    key = (user_id, inc, exp)
    if key in seen:
        to_delete.append(pred_id)
    else:
        seen.add(key)

for pid in to_delete:
    c.execute("DELETE FROM predictions WHERE id = ?", (pid,))

conn.commit()
print(f"Cleaned up {len(to_delete)} duplicate/test records. Remaining predictions: {len(rows) - len(to_delete)}")
conn.close()
