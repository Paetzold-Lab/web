import os
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

# --- Configuration ---
# Use English and a larger page size to get all publications
scholar_url = "https://scholar.google.com/citations?user=7Bv7PmgAAAAJ&hl=en&pagesize=100"
output_json_path = "data/publications_scraped.json"
publication_images_dir = "images/publications/thumbnails/"

# --- Helper Functions ---
def download_image(url, save_path):
    """Downloads an image from a URL and saves it to a given path."""
    try:
        # Google Scholar sometimes uses relative URLs for images
        if url.startswith('/'):
            url = 'https://scholar.google.com' + url
        
        response = requests.get(url, stream=True, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        print(f"Successfully downloaded {save_path}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")

def ensure_dir(directory):
    """Ensures that a directory exists, creating it if necessary."""
    if not os.path.exists(directory):
        os.makedirs(directory)

# --- Main Scraping Logic ---
def scrape_publications(url):
    """Scrapes publication data from a Google Scholar profile."""
    print("Scraping publications...")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        publications = []
        for item in soup.select('.gsc_a_tr'):
            title_element = item.select_one('.gsc_a_t a')
            if not title_element:
                continue
            
            title = title_element.text
            authors_raw = item.select_one('.gsc_a_a').text
            venue_raw = item.select_one('.gsc_a_j').text
            
            # Filter by author position
            author_list = [a.strip().lower() for a in authors_raw.split(',')]
            is_paetzold_author = any('paetzold' in author for author in author_list[:3]) or \
                                 any('paetzold' in author for author in author_list[-2:])

            if not is_paetzold_author:
                continue

            # Extract details
            venue_parts = venue_raw.split(',')
            venue = venue_parts[0].strip()
            year = int(venue_parts[1].strip()) if len(venue_parts) > 1 and venue_parts[1].strip().isdigit() else None
            
            citations_element = item.select_one('.gsc_a_c a')
            citations = int(citations_element.text) if citations_element and citations_element.text.isdigit() else 0

            # Extract image URL
            img_tag = item.select_one('.gsc_a_I img')
            img_url = img_tag['src'] if img_tag else '/scholar/images/product_retina/books-32.png' # Default image

            # Sanitize filename
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '_')).rstrip()
            img_filename = f"{safe_title.replace(' ', '_').lower()}.jpg"
            img_save_path = os.path.join(publication_images_dir, img_filename)

            # Use a structure compatible with publications.json
            pub_id = f"scraped_{len(publications) + 1}"
            publications.append({
                "id": pub_id,
                "title": title,
                "authors": authors_raw,
                "year": year,
                "venue": venue,
                "thumbnail": img_save_path,
                "citations": citations,
                "url": f"https://scholar.google.com{title_element['href']}",
                "abstract": "", # Abstract is not available on the main page
                "pdf_link": "",
                "categories": [],
                "featured": False
            })

            # Download the image
            download_image(img_url, img_save_path)
            
        return publications

    except requests.exceptions.RequestException as e:
        print(f"Error fetching Google Scholar page: {e}")
        return []

if __name__ == "__main__":
    # Ensure output directory exists
    ensure_dir(publication_images_dir)

    # Scrape publications and save to JSON
    scraped_publications = scrape_publications(scholar_url)
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

