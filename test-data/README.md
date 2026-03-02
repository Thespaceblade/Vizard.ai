## Test CSV datasets (clean + dirty)

This folder contains small CSV datasets intended for testing visualization generation from prompts + CSV.

### Datasets

- `retail_store_sales_clean.csv` / `retail_store_sales_dirty.csv`
  - Store-month sales metrics with latitude/longitude for map visualizations.
- `city_incidents_clean.csv` / `city_incidents_dirty.csv`
  - Incident events with date/time, category, severity, and coordinates.
- `real_estate_listings_clean.csv` / `real_estate_listings_dirty.csv`
  - Property listings with coordinates and listing attributes.

### Dirty versions include common issues

- Missing values, inconsistent casing/whitespace
- Duplicates
- Invalid/ambiguous date/time formats
- Non-numeric values in numeric columns
- Out-of-range lat/lon or swapped coordinates
- Negative values where they shouldn't appear
