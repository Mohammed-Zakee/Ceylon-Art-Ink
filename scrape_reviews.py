import os
import json
import time
import re
import urllib.request
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

# Configuration
URL = "https://www.google.com/maps/place/Bamboo+tattoo+studio+Ceylon+art+ink/@5.9498966,80.4555672,17z/data=!4m8!3m7!1s0x3ae173527d86caef:0x19aadc48f07518b7!8m2!3d5.9498966!4d80.4555672!9m1!1b1!16s%2Fg%2F11fprfdxvg?entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D"
DOWNLOAD_DIR = "downloaded_photos"
METADATA_FILE = "reviews.json"

def get_large_photo_url(url):
    """Converts a Google Maps thumbnail photo URL to high resolution."""
    if not url:
        return None
    # Google photo URLs typically end with things like =w100-h100-n-k-no.
    # Replacing the suffix with =s1600 gets the high-resolution version.
    if '=' in url:
        parts = url.rsplit('=', 1)
        if any(x in parts[1] for x in ['w', 'h', 's', 'k', 'no']):
            return parts[0] + '=s1600'
    return url

def download_image(url, filepath):
    """Downloads an image from a URL and saves it to filepath."""
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
        return True
    except Exception as e:
        print(f"Failed to download image {url}: {e}")
        return False

def clean_filename(name):
    """Removes invalid characters for file names."""
    return re.sub(r'[\\/*?:"<>| ]', '_', name)

def scrape():
    # Ensure download directory exists
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    with sync_playwright() as p:
        print("Launching Chromium browser...")
        # Launch headful so user can see progress and handle any captchas/consent screens
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"Navigating to: {URL}")
        page.goto(URL)
        page.wait_for_load_state("domcontentloaded")

        # Handle cookie consent popup if present (common in EU / some locations)
        try:
            # Look for buttons like "Accept all", "Agree", etc.
            consent_selectors = [
                'button:has-text("Accept all")',
                'button:has-text("Agree")',
                'button:has-text("I agree")',
                'button:has-text("Accept")',
                'form[action*="consent"] button'
            ]
            for selector in consent_selectors:
                btn = page.locator(selector).first
                if btn.count() > 0 and btn.is_visible():
                    print("Found consent dialog, clicking accept...")
                    btn.click()
                    page.wait_for_timeout(2000)
                    break
        except Exception as e:
            print(f"No consent modal handled: {e}")

        # Wait for the reviews to load (review cards have class '.jftiEf')
        print("Waiting for review cards to load...")
        try:
            page.wait_for_selector('.jftiEf', timeout=15000)
        except Exception:
            print("Timeout waiting for reviews. Checking if page layout is different...")
            # Take a screenshot to help debug if it fails
            page.screenshot(path="screenshot_error.png")
            print("Saved error screenshot to screenshot_error.png")
            browser.close()
            return

        # Define JS functions to find scrollable container in the DOM
        page.evaluate("""
            window.getScrollableContainer = () => {
                const card = document.querySelector('.jftiEf');
                if (!card) return null;
                let parent = card.parentElement;
                while (parent) {
                    const overflowY = window.getComputedStyle(parent).overflowY;
                    if (overflowY === 'auto' || overflowY === 'scroll') {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
                return document.body;
            };
        """)

        # Scroll to load all reviews
        print("Scrolling reviews container to load all items...")
        last_height = page.evaluate("() => { const c = window.getScrollableContainer(); return c ? c.scrollHeight : 0; }")
        no_change_count = 0
        scroll_count = 0

        while True:
            # Scroll to bottom
            page.evaluate("() => { const c = window.getScrollableContainer(); if(c) c.scrollTop = c.scrollHeight; }")
            page.wait_for_timeout(2000) # wait for new reviews to load
            
            scroll_count += 1
            reviews_count = page.locator('.jftiEf').count()
            print(f"Scroll #{scroll_count}: Loaded {reviews_count} reviews...")

            new_height = page.evaluate("() => { const c = window.getScrollableContainer(); return c ? c.scrollHeight : 0; }")
            if new_height == last_height:
                no_change_count += 1
                if no_change_count >= 4:
                    print("Scroll height did not change after 4 attempts. Scrolling finished.")
                    break
            else:
                no_change_count = 0
                last_height = new_height

        # Extract review details
        reviews_elements = page.locator('.jftiEf').all()
        print(f"Total reviews found: {len(reviews_elements)}")

        extracted_reviews = []
        image_download_count = 0

        for i, card in enumerate(reviews_elements):
            try:
                # 1. Author Name (typically .d4r55)
                author_el = card.locator('.d4r55').first
                author = author_el.inner_text().strip() if author_el.count() > 0 else f"Anonymous_{i}"

                # 2. Rating (look for stars)
                # Google stars are in an element with an aria-label like "5 stars"
                rating_el = card.locator('[aria-label*="star"]').first
                rating_text = rating_el.get_attribute('aria-label') if rating_el.count() > 0 else ""
                rating = None
                if rating_text:
                    rating_match = re.search(r'\d+', rating_text)
                    if rating_match:
                        rating = int(rating_match.group())

                # 3. Publish Time (e.g. .rsqaWe)
                date_el = card.locator('.rsqaWe').first
                date_text = date_el.inner_text().strip() if date_el.count() > 0 else ""

                # 4. Review Text (expand if "More" button exists)
                more_btn = card.locator('button:has-text("More")').first
                if more_btn.count() > 0 and more_btn.is_visible():
                    try:
                        more_btn.click()
                        page.wait_for_timeout(500)
                    except Exception:
                        pass

                text_el = card.locator('.wiI7pd').first
                text = text_el.inner_text().strip() if text_el.count() > 0 else ""

                # 5. Review Photos
                # Extract photo URLs from background-image style of buttons inside .KtCyie
                photos_urls = []
                photo_buttons = card.locator('.KtCyie button').all()
                for btn in photo_buttons:
                    style = btn.get_attribute('style')
                    if style:
                        match = re.search(r'url\((?:"|\')?(https?://[^"\')]+)(?:"|\')?\)', style)
                        if match:
                            src = match.group(1)
                            high_res = get_large_photo_url(src)
                            if high_res and high_res not in photos_urls:
                                photos_urls.append(high_res)

                # Download photos
                local_photos = []
                for idx, photo_url in enumerate(photos_urls):
                    safe_author = clean_filename(author)
                    filename = f"{safe_author}_{i}_{idx}.jpg"
                    filepath = os.path.join(DOWNLOAD_DIR, filename)
                    print(f"Downloading photo {idx+1}/{len(photos_urls)} for {author}...")
                    if download_image(photo_url, filepath):
                        local_photos.append(filepath)
                        image_download_count += 1

                extracted_reviews.append({
                    "id": i,
                    "author": author,
                    "rating": rating,
                    "date": date_text,
                    "text": text,
                    "photos_urls": photos_urls,
                    "local_photos": local_photos
                })

            except Exception as e:
                print(f"Error parsing review #{i}: {e}")

        # Save metadata to file
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(extracted_reviews, f, indent=4, ensure_ascii=False)

        print("\nScraping Completed!")
        print(f"Total Reviews Scraped: {len(extracted_reviews)}")
        print(f"Total Photos Downloaded: {image_download_count}")
        print(f"Metadata saved to {METADATA_FILE}")

        # Let the browser stay open for a second before closing
        time.sleep(2)
        browser.close()

if __name__ == "__main__":
    scrape()
