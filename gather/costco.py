import json
import csv
import re

INPUT_FILE = "Warehouses By State_Costco.html"
OUTPUT_FILE = "costco_warehouses.csv"

def extract_json_from_script_tag(filename):
    with open(filename, "r", encoding="utf-8") as f:
        text = f.read()
    match = re.search(r"var\s+allWarehousesList\s*=\s*(\[\{.*?\}]);", text, re.DOTALL)
    if not match:
        raise ValueError("Could not find allWarehousesList JSON block")
    return json.loads(match.group(1))

def make_store_url(city, state_code, identifier):
    slug_city = city.lower().replace(" ", "-")
    slug_state = state_code.lower()
    return f"https://www.costco.com/warehouse-locations/{slug_city}-{slug_state}-{identifier}.html"

def flatten_warehouses(data):
    records = []
    for state_block in data:
        state = state_block.get("state")
        for w in state_block.get("warehouseList", []):
            city = w.get("city", "").title()
            state_code = state
            identifier = w.get("identifier") or w.get("stlocID")
            records.append({
                "state": state_code,
                "city": city,
                "address": w.get("address1", "").title(),
                "zip": w.get("zipCode", ""),
                "phone": w.get("phone", "").strip(),
                "latitude": w.get("latitude"),
                "longitude": w.get("longitude"),
                "store_url": make_store_url(city, state_code, identifier),
            })
    return records

def main():
    raw_data = extract_json_from_script_tag(INPUT_FILE)
    flat_data = flatten_warehouses(raw_data)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=flat_data[0].keys())
        writer.writeheader()
        writer.writerows(flat_data)

    print(f"✅ Extracted {len(flat_data)} warehouses to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()