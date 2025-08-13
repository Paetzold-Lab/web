import os
import re
import time
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup

# --- Configuration ---
# Use English and a larger page size to get all publications
scholar_user_id = "7Bv7PmgAAAAJ"
scholar_base_url = "https://scholar.google.com/citations"
scholar_url = f"{scholar_base_url}?user={scholar_user_id}&hl=en&pagesize=100"
output_json_path = "data/publications_scraped.json"
publication_images_dir = "images/publications/thumbnails/"
pdf_tmp_dir = "data/tmp_pdfs/"
CATEGORY_KEYWORDS = {
    'gnn': ['graph', 'gnn', 'relationformer'],
    'generative': ['gan', 'generative', 'synthesis', 'flow', 'diffusion'],
    'topology': ['topolog', 'betti', 'cldice', 'skeleton', 'persistence'],
    'segmentation': ['segment', 'segmentation'],
    'detection': ['detection', 'detect'],
    'classification': ['classification', 'classify'],
    'reconstruction': ['reconstruction', 'super-resolution', 'super resolution'],
    'registration': ['registration', 'register'],
    'microscopy': ['microscopy', 'oct', 'octl', 'retinal', 'vasculature'],
    'mri': ['mri', 'perfusion'],
    'ct': ['ct ' , 'computed tomography'],
    'x-ray': ['x-ray', 'xray'],
    'histology': ['histology'],
}

def categorize_publication(title: str) -> List[str]:
    t = title.lower()
    cats = []
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in t for kw in kws):
            cats.append(cat)
    # de-duplicate preserving order
    seen = set()
    dedup = []
    for c in cats:
        if c not in seen:
            dedup.append(c); seen.add(c)
    return dedup

def fetch_detail_page(relative_path: str) -> Optional[BeautifulSoup]:
    if not relative_path:
        return None
    full_url = f"https://scholar.google.com{relative_path}"
    try:
        resp = requests.get(full_url, headers=REQUEST_HEADERS, timeout=20)
        resp.raise_for_status()
        return BeautifulSoup(resp.content, 'html.parser')
    except requests.RequestException:
        return None

def extract_pdf_link(detail_soup: BeautifulSoup) -> Optional[str]:
    if not detail_soup:
        return None
    # Links containing PDF
    for a in detail_soup.select('a'):
        text = (a.text or '').strip().lower()
        href = a.get('href','')
        if ('pdf' in text or href.lower().endswith('.pdf')) and href.startswith('http'):
            return href
    return None

def download_pdf(url: str, save_path: str) -> bool:
    try:
        r = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
        r.raise_for_status()
        with open(save_path, 'wb') as f:
            f.write(r.content)
        return True
    except requests.RequestException:
        return False

def extract_overview_image_from_pdf(pdf_path: str, out_image_path: str) -> bool:
    """Attempt to render first page of PDF as thumbnail. Requires PyMuPDF (fitz)."""
    try:
        import fitz  # type: ignore
    except ImportError:
        return False
    try:
        doc = fitz.open(pdf_path)
        if doc.page_count == 0:
            return False
        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=fitz.Matrix(2,2))  # higher res
        os.makedirs(os.path.dirname(out_image_path), exist_ok=True)
        pix.save(out_image_path)
        return True
    except Exception:
        return False
default_local_thumbnail = "images/publications/default.png"
REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
}

MAX_PAGES = 10  # safety cap (100 results each) to avoid unbounded crawling
PAGE_SIZE = 100
REQUEST_DELAY = 1.2  # polite delay (seconds) between page fetches

# --- Helper Functions ---
def download_image(url: str, save_path: str) -> bool:
    """Downloads an image from a URL and saves it to a given path."""
    try:
        # Google Scholar sometimes uses relative URLs for images
        if url.startswith('/'):
            url = 'https://scholar.google.com' + url
        response = requests.get(url, stream=True, headers=REQUEST_HEADERS, timeout=15)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        print(f"Downloaded thumbnail -> {save_path}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return False

def ensure_dir(directory: str):
    """Ensures that a directory exists, creating it if necessary."""
    if not os.path.exists(directory):
        os.makedirs(directory)


slug_invalid_re = re.compile(r'[^a-z0-9]+')

def slugify(title: str) -> str:
    base = title.lower().strip()
    base = slug_invalid_re.sub('_', base).strip('_')
    return base[:120]  # cap length

def unique_filename(base_slug: str, used: set) -> str:
    candidate = base_slug
    if candidate not in used:
        used.add(candidate)
        return candidate
    # append short hash for uniqueness
    short_hash = hashlib.sha1(base_slug.encode()).hexdigest()[:6]
    candidate = f"{base_slug}_{short_hash}"
    used.add(candidate)
    return candidate

def parse_publication_row(row) -> Optional[Dict]:
    """Parse a single Google Scholar results row DOM node to a dict or None."""
    # Title
    title_anchor = row.select_one('a.gsc_a_at') or row.select_one('.gsc_a_t a')
    if not title_anchor:
        return None
    title = title_anchor.text.strip()

    # Authors & venue/year: Google Scholar usually has two .gs_gray divs under .gsc_a_t
    gray_parts = row.select('.gsc_a_t .gs_gray')
    authors_raw = gray_parts[0].text if len(gray_parts) > 0 else ''
    venue_year_raw = gray_parts[1].text if len(gray_parts) > 1 else ''

    # Year: sometimes appears in its own cell .gsc_a_y span
    year_cell = row.select_one('.gsc_a_y span')
    year = None
    if year_cell and year_cell.text.isdigit():
        year = int(year_cell.text)
    else:
        # fallback: attempt to parse trailing year from venue_year_raw
        m = re.search(r'(19|20)\d{2}', venue_year_raw)
        if m:
            year = int(m.group(0))

    # Venue: try splitting venue_year_raw by comma and remove year
    venue = ''
    if venue_year_raw:
        # Remove year occurrences
        venue = re.sub(r'(19|20)\d{2}', '', venue_year_raw).strip(' ,;')

    # Authors filter (Paetzold among first 3 or last 2)
    author_list = [a.strip().lower() for a in authors_raw.split(',') if a.strip()]
    is_paetzold_author = any('paetzold' in a for a in author_list[:3]) or any('paetzold' in a for a in author_list[-2:])
    if not is_paetzold_author:
        return None

    # Citations
    citations_anchor = row.select_one('.gsc_a_c a')
    citations = 0
    if citations_anchor and citations_anchor.text.isdigit():
        citations = int(citations_anchor.text)

    # Thumbnail (rare on list view) – may not exist; keep default
    img_tag = row.select_one('.gsc_a_t img, .gsc_a_I img')
    img_url = ''
    if img_tag and img_tag.get('src') and 'scholar.googleusercontent.com' in img_tag['src']:
        img_url = img_tag['src']

    return {
        'title': title,
        'authors_raw': authors_raw,
        'venue': venue,
        'year': year,
        'citations': citations,
        'title_href': title_anchor.get('href', ''),
        'img_url': img_url
    }

def fetch_page(user_id: str, start: int) -> BeautifulSoup:
    params = {
        'user': user_id,
        'hl': 'en',
        'cstart': start,
        'pagesize': PAGE_SIZE
    }
    resp = requests.get(scholar_base_url, params=params, headers=REQUEST_HEADERS, timeout=20)
    resp.raise_for_status()
    return BeautifulSoup(resp.content, 'html.parser')

# --- Main Scraping Logic ---
def scrape_publications(user_id: str) -> List[Dict]:
    """Scrapes publication data across paginated Google Scholar profile pages.

    NOTE: Automated scraping may violate Google Scholar Terms of Service. Use responsibly.
    """
    print(f"Scraping Google Scholar user={user_id} ...")
    publications: List[Dict] = []
    used_filenames = set()

    try:
        for page_index in range(MAX_PAGES):
            cstart = page_index * PAGE_SIZE
            soup = fetch_page(user_id, cstart)
            rows = soup.select('.gsc_a_tr')
            if not rows:
                if page_index == 0:
                    print("No rows found – profile may be private or layout changed.")
                break

            new_count = 0
            for row in rows:
                parsed = parse_publication_row(row)
                if not parsed:
                    continue

                # Prepare image filename (if any)
                slug = slugify(parsed['title'])
                filename_base = unique_filename(slug, used_filenames)
                img_filename = f"{filename_base}.jpg"
                img_rel_path = os.path.join(publication_images_dir, img_filename)

                # Download image if available and not default
                if parsed['img_url']:
                    ensure_dir(publication_images_dir)
                    download_image(parsed['img_url'], img_rel_path)
                    thumbnail_path = img_rel_path
                else:
                    thumbnail_path = default_local_thumbnail

                pub_id = f"scraped_{len(publications) + 1:03d}"
                # Add extended schema fields matching original publications.json
                cats = categorize_publication(parsed['title'])
                primary_category = cats[0] if cats else None
                scholar_rel = parsed['title_href']
                detail_soup = fetch_detail_page(scholar_rel)
                pdf_link = extract_pdf_link(detail_soup) if detail_soup else None
                pdf_local_path = None
                if pdf_link:
                    ensure_dir(pdf_tmp_dir)
                    pdf_local_path = os.path.join(pdf_tmp_dir, f"{filename_base}.pdf")
                    if download_pdf(pdf_link, pdf_local_path):
                        # Try to extract overview image from PDF first page
                        pdf_thumb_path = os.path.join(publication_images_dir, f"{filename_base}_pdf.jpg")
                        if extract_overview_image_from_pdf(pdf_local_path, pdf_thumb_path):
                            thumbnail_path = pdf_thumb_path

                publications.append({
                    "id": pub_id,
                    "title": parsed['title'],
                    "authors": parsed['authors_raw'],
                    "year": parsed['year'],
                    "venue": parsed['venue'],
                    "venue_tag": parsed['venue'].upper() if parsed['venue'] else None,
                    "doi": None,
                    "abstract": "",  # Not scraped here
                    "url": f"https://scholar.google.com{parsed['title_href']}",
                    "scholar_link": scholar_rel,
                    "citations": parsed['citations'],
                    "pdf_link": pdf_link or "",
                    "categories": cats,
                    "primary_category": primary_category,
                    "thumbnail": thumbnail_path,
                    "featured": False,
                    "featuredOrder": 999
                })
                new_count += 1

            print(f"Page {page_index+1}: added {new_count} publications (total={len(publications)})")
            # If fewer than page size rows, likely last page
            if len(rows) < PAGE_SIZE:
                break
            time.sleep(REQUEST_DELAY)
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

    return publications

if __name__ == "__main__":
    # Ensure output directory exists
    ensure_dir(publication_images_dir)

    # Scrape publications and save to JSON
    scraped_publications = scrape_publications(scholar_user_id)
    if scraped_publications:
        # Create a compatible final JSON object
        output_data = {
            "last_updated": datetime.now().isoformat(),
            "publications": scraped_publications
        }
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nSuccessfully saved {len(scraped_publications)} publications to {output_json_path}")

    print("\nScraping complete.")

