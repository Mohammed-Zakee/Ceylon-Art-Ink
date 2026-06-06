# Ceylon Art Ink - Premium Landing Page & Reviews Scraper

A premium, fast-loading, responsive landing page built for **Ceylon Art Ink**, a traditional bamboo and modern machine tattoo studio located in Galle Road, Mirissa, Sri Lanka.

This repository features the complete landing page with customer reviews and high-resolution photo galleries compiled directly from Google Maps, along with a WhatsApp booking consultation system.

## 🚀 Live Hosting & Vercel Deployment

This project is optimized to be deployed instantly on **Vercel** with zero configuration.

### Deployment Instructions:
1. Connect your GitHub account to **Vercel**.
2. Click **Add New** > **Project** in the Vercel Dashboard.
3. Import this repository `Ceylon-Art-Ink`.
4. Leave all build settings at their default values (no build command is required since this is a high-performance static site).
5. Click **Deploy**. Vercel will host it, provide an SSL certificate, and serve it via global CDN.

---

## 🎨 Design & Features

- **Tropical Dark Theme**: Designed with custom typography (`Syne` and `Inter` from Google Fonts), tropical forest greens (`#29533c`), matte gold accents (`#cfa858`), and clean glassmorphism.
- **100% Mobile Friendly**: Fully optimized for smartphones, tablets, and desktops. Includes stacked mobile-touch buttons, responsive flex/grid wrappers, a slide-out drawer navigation menu, and auto-wrapping filter badges to prevent overflows or overlaps on smaller viewports.
- **Dynamic Review Board**: Displays all **136 reviews** fetched directly from the Google Maps reviews page.
  - Reviews can be dynamically filtered by **All**, **5 Stars**, or **With Photos**.
  - A client-side "Load More" pagination pattern maintains blistering page load speeds.
  - Expandable review text cards for longer review text.
- **High-Resolution Photo Lightbox**: Extracts the photos attached to Google reviews and presents them in a responsive thumbnail layout that opens in an immersive dark glassmorphic lightbox when clicked.
- **WhatsApp Inquiry System**: A structured form that collects client booking inquiries (Name, Preferred Technique, Size, Body Placement, and Design Description), formats them into a neat template, and redirects directly to the studio's WhatsApp number (`+94 77 440 0877`) on submit.

---

## 📁 Repository Structure

```bash
Ceylon-Art-Ink/
│
├── downloaded_photos/   # 83 high-resolution photos downloaded from reviews
├── index.html           # Main semantic markup and page structure
├── style.css            # Responsive layout rules, custom theme, and animations
├── app.js               # Navigation logic, reviews pagination, filters, and lightbox
├── reviews_data.js      # Scraped reviews database represented as a static JS array
│
├── scrape_reviews.py    # Python Playwright script used to scrape reviews and photos
├── reviews.json         # Raw reviews data scraped from Google Maps (metadata)
├── .gitignore           # Excludes development virtual environments and log files
└── README.md            # Project documentation and deployment instructions
```

---

## 🛠️ How the Scraper Works (Optional Dev Info)

If you ever need to scrape fresh reviews or update the compiled data:

1. **Setup Environment**:
   ```bash
   python -m venv venv
   # Activate virtual env:
   # Windows Powershell: .\venv\Scripts\Activate.ps1
   # macOS/Linux: source venv/bin/activate
   pip install playwright
   playwright install chromium
   ```

2. **Run Scraper**:
   ```bash
   python scrape_reviews.py
   ```
   *Note: This script launches Playwright Chromium, scrolls to load all 130+ Google reviews, cleanses the URLs to fetch high-resolution images (`=s1600`), and saves files locally.*

3. **Rebuild JavaScript Database**:
   Run this Python one-liner to compile the fresh `reviews.json` file into `reviews_data.js`:
   ```bash
   python -c "import json; data=json.load(open('reviews.json', encoding='utf-8')); open('reviews_data.js', 'w', encoding='utf-8').write('const reviewsData = ' + json.dumps(data, indent=4, ensure_ascii=False) + ';')"
   ```
