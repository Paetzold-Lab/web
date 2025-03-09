# Paetzold Lab Website

This repository contains the code for the Paetzold Lab website, which showcases the lab's research in AI and medicine, including machine learning methods for computer vision and healthcare.

## Project Structure

```
├── components/               # Reusable HTML components
│   ├── footer.html           # Footer component
│   ├── header.html           # Header component
│   ├── research-overlay.html # Research overlay component
│   └── search-overlay.html   # Search overlay component
├── css/                      # Stylesheet files
│   ├── contact.css           # Contact page styles
│   ├── joinus.css            # Join us page styles
│   ├── research.css          # Research page styles
│   ├── research_show.css     # Research showcase styles
│   └── style.css             # Main styles
├── data/                     # Data files
│   └── publications.json     # Publications data
├── images/                   # Image assets
│   ├── collaborators/        # Collaborator logos
│   ├── logo/                 # Lab and institution logos
│   ├── publications/         # Publication thumbnails
│   └── research_show/        # Research showcase images
├── js/                       # JavaScript files
│   ├── components.js         # Component loader
│   ├── featured-publications.js # Featured publications handler
│   ├── main.js               # Main JavaScript functionality
│   └── publications.js       # Publications page handler
├── videos/                   # Video assets
├── contact.html              # Contact page
├── index.html                # Homepage
├── Join_us.html              # Join us page
├── pi.html                   # Principal Investigator profile page
├── research.html             # Research and publications page
├── team.html                 # Team page
└── fetch_publications.py     # Python script for fetching publications
```

## Features

- Responsive design for all device sizes
- Component-based architecture to reduce code duplication
- Dynamic publication loading and filtering
- Search functionality across the entire site
- Interactive carousels and scrolling components

## Setup Instructions

1. Create a `components` directory in the root folder:
   ```bash
   mkdir components
   ```

2. Copy the component HTML files to the `components` directory:
   - `header.html`
   - `footer.html`
   - `search-overlay.html`
   - `research-overlay.html`

3. Update the JavaScript files in the `js` directory

4. The site should now be ready to run locally or deploy

## Development

### Adding New Pages

1. Create a new HTML file using the existing pages as templates
2. Include the component placeholders in your HTML:
   ```html
   <div id="header-placeholder"></div>
   <div id="search-overlay-placeholder"></div>
   
   <!-- Your page content here -->
   
   <div id="footer-placeholder"></div>
   ```
3. Link to the necessary CSS and JavaScript files

### Adding New Publications

The publications are loaded from `data/publications.json`. You can update this file manually or use the `fetch_publications.py` script to automatically fetch publications from Google Scholar.

To run the publication fetcher:
```bash
python fetch_publications.py
```

## Deployment

The website is designed to work with any static site hosting service. Simply upload all files to your hosting provider.

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Credits

- Paetzold Lab team
- Cornell Tech and Weill Cornell Medicine