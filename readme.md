# Paetzold Lab Website

## Directory Structure

```
├── components/             # Reusable HTML components
│   ├── footer.html
│   ├── header.html
│   ├── research-overlay.html
│   └── search-overlay.html
├── css/                    # Stylesheets by section
│   ├── contact.css         # Contact page
│   ├── joinus.css          # Join us page
│   ├── research.css        # Research page
│   ├── research_show.css   # Research showcase
│   └── style.css           # Main styles
├── data/
│   └── publications.json   # Publication data
├── images/                 # Image assets
│   ├── collaborators/      # Partner logos
│   ├── logo/               # Lab logos
│   ├── portrait/           # Team photos
│   ├── publications/       # Publication thumbnails
│   ├── research_show/      # Research images
│   └── team/               # Team photos
├── js/                     # JavaScript files
│   ├── components.js       # Component loader
│   ├── featured-publications.js
│   ├── main.js             # Core functionality
│   └── publications.js     # Publication handling
├── videos/                 # Video assets
└── *.html                  # Main pages
```


## Setup

1. Ensure the `components` directory exists with all component files
2. Main pages reference components via placeholder elements:
   ```html
   <div id="header-placeholder"></div>
   <div id="search-overlay-placeholder"></div>
   <!-- Page content -->
   <div id="footer-placeholder"></div>
   ```
3. Publications are loaded from `data/publications.json`

## Development

### Adding Pages

Create new HTML files based on existing templates, including component placeholders and necessary CSS/JS references.

### Publication Management

Update `data/publications.json` manually or use the `fetch_publications.py` script to pull from Google Scholar.

## Deployment

Compatible with any static site hosting service. Simply upload all files to your web server.

## Credits

- Matt Li