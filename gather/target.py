from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import requests
import json
import csv
import re
import time
import os
from urllib.parse import urljoin

OUTPUT_CSV = "target_all_states.csv"

STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
]

def slugify(text):
    """Convert text to URL-friendly slug format"""
    slug = text.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug

def get_store_links_simple(state_slug):
    """Simple and reliable approach to get all store links for a state"""
    url = f"https://www.target.com/store-locator/store-directory/{state_slug}"
    base_url = "https://www.target.com"

    try:
        print(f"🔍 Fetching store directory for {state_slug} using simple approach")
        res = requests.get(url)
        res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        store_links = []

        # Find all links that match the store URL pattern
        for a in soup.find_all("a", href=True):
            if a['href'].startswith("/sl/"):
                full_url = urljoin(base_url, a['href'])
                store_links.append(full_url)

        print(f"✅ Found {len(store_links)} store links in {state_slug}")
        return store_links

    except Exception as e:
        print(f"❌ Failed to get store links for {state_slug}: {e}")
        return []

def get_store_details(store_url, session=None):
    """Extract detailed store information from a store URL"""
    if session is None:
        session = requests

    try:
        print(f"🔍 Fetching details for {store_url}")
        res = session.get(store_url)
        res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        script_tag = soup.find("script", {"type": "application/ld+json", "id": "@store-locator/StoreDetails/JsonLD"})

        if not script_tag:
            print(f"⚠️ No JSON-LD data found for {store_url}")
            return None

        data = json.loads(script_tag.string)
        store_id = store_url.split("/")[-1]

        addr = data.get("address", {})
        geo = data.get("geo", {})

        store_data = {
            "store_id": store_id,
            "name": data.get("name", "").strip(),
            "street": addr.get("streetAddress"),
            "city": addr.get("addressLocality"),
            "state": addr.get("addressRegion"),
            "zip": addr.get("postalCode"),
            "latitude": geo.get("latitude"),
            "longitude": geo.get("longitude"),
            "phone": data.get("telephone"),
            "url": store_url
        }

        print(f"✅ Successfully extracted data for {store_data['name']}")
        return store_data

    except Exception as e:
        print(f"❌ Failed to get store details for {store_url}: {e}")
        return None

def extract_city_store_ids_advanced(page, state_slug):
    """Advanced method using Playwright to extract city and store ID information"""
    url = f"https://www.target.com/store-locator/store-directory/{state_slug}"

    try:
        print(f"🔍 Loading {url} for advanced extraction")
        page.goto(url, timeout=60000)
        page.wait_for_load_state('networkidle', timeout=10000)

        # First, try the data-city selector method (handles multi-store cities well)
        data_city_elements = page.locator('[data-city]').all()

        if data_city_elements and len(data_city_elements) > 0:
            cities_data = page.evaluate("""
                () => [...document.querySelectorAll('[data-city]')].map(e => ({
                    city: e.dataset.city,
                    ids: e.dataset.ids.split(",")
                }))
            """)

            if cities_data and len(cities_data) > 0:
                print(f"✅ Found {len(cities_data)} cities using data-city attributes")
                return cities_data
    except Exception as e:
        print(f"⚠️ Advanced extraction failed: {e}")

    return None

def get_store_links_for_state(state_slug):
    """Combine both approaches to get all store links for a state"""
    # Try the simple approach first
    store_links = get_store_links_simple(state_slug)

    # If simple approach gets results, return them
    if store_links:
        return store_links

    # If simple approach fails, try advanced approach with Playwright
    print(f"⚠️ Simple approach failed for {state_slug}, trying advanced approach")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            cities_data = extract_city_store_ids_advanced(page, state_slug)

            if cities_data:
                # Convert city/ids structure to store URLs
                store_links = []
                for city_data in cities_data:
                    city = city_data["city"]
                    for store_id in city_data["ids"]:
                        # Try to guess the URL format
                        city_slug = slugify(city)
                        url = f"https://www.target.com/sl/{city_slug}/{store_id}"
                        store_links.append(url)

                print(f"✅ Found {len(store_links)} store links using advanced approach")
        except Exception as e:
            print(f"❌ Advanced approach failed: {e}")
            store_links = []

        browser.close()

    return store_links

def main():
    """Main function to scrape Target store information across all states"""
    # Create a session for better performance
    session = requests.Session()
    all_stores = []

    # Check if there's a CSV already to resume from
    try:
        with open(OUTPUT_CSV, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            all_stores = list(reader)
            print(f"📂 Loaded {len(all_stores)} existing stores from {OUTPUT_CSV}")
    except FileNotFoundError:
        all_stores = []
        print(f"🆕 Starting fresh - no existing {OUTPUT_CSV} found")

    # Get store IDs from existing data to avoid duplicates
    existing_store_ids = set(store["store_id"] for store in all_stores)
    print(f"Found {len(existing_store_ids)} existing store IDs")

    # Track states we've already processed
    processed_states = set(store.get("state") for store in all_stores)

    # Process each state
    for state in STATES:
        if state in processed_states:
            print(f"⏭️ Skipping {state} - already processed")
            continue

        print(f"\n==== 🔍 Processing {state} ====")
        state_slug = state.lower().replace(" ", "-")

        # Get all store links for this state
        store_urls = get_store_links_for_state(state_slug)

        if not store_urls:
            print(f"❌ No store links found for {state}")
            continue

        print(f"🧩 {state} → {len(store_urls)} store links")
        state_stores_count = 0

        # Process each store URL
        for url in store_urls:
            # Extract store ID from URL
            store_id = url.split("/")[-1]

            # Skip if we already have this store
            if store_id in existing_store_ids:
                print(f"⏭️ Skipping store {store_id} - already in database")
                continue

            # Get store details
            store_data = get_store_details(url, session)

            if store_data:
                all_stores.append(store_data)
                existing_store_ids.add(store_id)
                state_stores_count += 1

                # Write to CSV after each successful store to preserve progress
                keys = ["store_id", "name", "street", "city", "state", "zip", "latitude", "longitude", "phone", "url"]
                with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=keys)
                    writer.writeheader()
                    writer.writerows(all_stores)

                print(f"✅ Added store {store_id} to {OUTPUT_CSV}")

            # Delay to avoid rate limiting
            time.sleep(0.5)

        print(f"📊 Added {state_stores_count} new stores for {state}")

        # Mark this state as processed if we found stores
        if state_stores_count > 0:
            processed_states.add(state)

        # Sleep between states to avoid rate limiting
        print(f"😴 Sleeping for 5 seconds before next state...")
        time.sleep(5)

    print(f"\n✅ Done. {len(all_stores)} stores saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()