/**
 * Featured Publications handler for the homepage
 * Displays manually selected publications in a scrollable carousel
 */

/**
 * Fetch featured publications
 * @returns {Promise<Array>} Manually selected publications
 */
async function getFeaturedPublications() {
    try {
        const response = await fetch('./data/publications.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Method 1: Use publications explicitly marked as featured
        // This requires setting "featured": true on publications you want to feature
        const featuredPublications = data.publications
            .filter(pub => pub.featured === true)
            .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));
            
        // If there are manually featured publications, use those
        if (featuredPublications.length > 0) {
            return featuredPublications;
        }
        
        // Method 2: Manual selection by ID as fallback
        const featuredIds = [
            "pub001", 
            "pub028",
            "pub013", 
            "pub055",
            "pub088",
            "pub006"
        ];
        
        // Filter publications to only include those with matching IDs
        const selectedByIds = data.publications
            .filter(pub => featuredIds.includes(pub.id))
            .sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));
            
        if (selectedByIds.length > 0) {
            return selectedByIds;
        }
        
        // Method 3: Automatic selection as final fallback
        // Get the most cited papers from each category
        const categoryCounts = {};
        const allCategories = Object.keys(data.categories || {});
        
        // Limit to top 2 from each major category for variety
        const autoSelected = [];
        
        for (const category of allCategories) {
            const categoryPapers = data.publications
                .filter(pub => pub.categories && pub.categories.includes(category))
                .sort((a, b) => (b.citations || 0) - (a.citations || 0))
                .slice(0, 2);
                
            autoSelected.push(...categoryPapers);
        }
        
        // Remove duplicates (papers might be in multiple categories)
        const uniqueIds = new Set();
        const uniqueAutoSelected = [];
        
        for (const paper of autoSelected) {
            if (!uniqueIds.has(paper.id)) {
                uniqueIds.add(paper.id);
                uniqueAutoSelected.push(paper);
            }
        }
        
        // Sort by citations and limit to 6
        return uniqueAutoSelected
            .sort((a, b) => (b.citations || 0) - (a.citations || 0))
            .slice(0, 6);
        
    } catch (error) {
        console.error('Error fetching featured publications:', error);
        return [];
    }
}

/**
 * Initialize the featured publications component
 */
document.addEventListener('DOMContentLoaded', async () => {
    const pubContainer = document.querySelector('.pub-featured');
    const leftBtn = document.getElementById('pub-left');
    const rightBtn = document.getElementById('pub-right');
    
    if (!pubContainer) return;
    
    // Show loading state
    pubContainer.innerHTML = '<div class="loading">Loading publications...</div>';
    
    try {
        // Get featured publications
        const pubs = await getFeaturedPublications();
        
        if (pubs.length === 0) {
            pubContainer.innerHTML = '<p>No publications found.</p>';
            return;
        }
        
        // Render publications
        pubContainer.innerHTML = pubs.map(pub => {
            // Get the paper URL from whatever source is available
            const paperUrl = pub.url || pub.scholar_link || pub.links?.scholar || pub.links?.pdf || '#';
            
            return `
                <article class="pub-card" data-aos="fade-up">
                    <a href="${paperUrl}" target="_blank" rel="noopener" class="pub-card-link">
                        <div class="pub-card-image">
                            <img src="${pub.thumbnail || './images/publications/default.png'}" alt="${pub.title}" loading="lazy">
                        </div>
                        <div class="pub-card-content">
                            <div class="pub-card-meta">
                                ${pub.categories && pub.categories.length > 0 ? 
                                    pub.categories.slice(0, 5).map(cat => 
                                        `<span class="pub-card-badge ${cat}" title="${getCategoryName(cat, pub)}">${getCategoryName(cat, pub)}</span>`
                                    ).join('') : 
                                    `<span class="pub-card-badge">${pub.primary_category || 'Research'}</span>`
                                }
                                <span class="pub-card-badge year">${pub.year || ''}</span>
                            </div>
                            <h3>${pub.title}</h3>
                            <div class="pub-metrics">
                                ${pub.citations ? `
                                    <span class="metric citations">
                                        <svg width="16" height="16" viewBox="0 0 24 24">
                                            <path d="M12 21l-8-9h16l-8 9z"/>
                                        </svg>
                                        ${pub.citations} citations
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </a>
                </article>
            `;
        }).join('');

        // Set up scroll functionality
        setupScroll(pubContainer, leftBtn, rightBtn);
        
        // Add animation on scroll
        const pubCards = document.querySelectorAll('.pub-card');
        pubCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            // Stagger the animations
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

    } catch (error) {
        console.error('Error rendering publications:', error);
        pubContainer.innerHTML = '<p>Failed to load publications.</p>';
    }
});

/**
 * Get human-readable category name
 * @param {string} categoryId - Category ID
 * @param {Object} publication - Publication object
 * @returns {string} Category name
 */
function getCategoryName(categoryId, publication) {
    // Try to get category name from cache
    if (window.categoryNames && window.categoryNames[categoryId]) {
        return window.categoryNames[categoryId];
    }
    
    // Map of known category IDs to display names
    const knownCategories = {
        "medical-imaging": "Medical Imaging",
        "gnn": "GNN",
        "generative": "Generative AI",
        "topology": "Topology",
        "microscopy": "Microscopy",
        "other": "Research"
    };
    
    return knownCategories[categoryId] || categoryId;
}

/**
 * Setup horizontal scrolling
 * @param {HTMLElement} container - Scroll container
 * @param {HTMLElement} leftBtn - Left scroll button
 * @param {HTMLElement} rightBtn - Right scroll button
 */
function setupScroll(container, leftBtn, rightBtn) {
    if (!container || !leftBtn || !rightBtn) return;
    
    const scrollAmount = 400; // Width of one card + gap
    
    // Left button click handler
    leftBtn.addEventListener('click', () => {
        container.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    // Right button click handler
    rightBtn.addEventListener('click', () => {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
    
    // Handle scroll button visibility based on scroll position
    container.addEventListener('scroll', () => {
        // Show/hide left button based on scroll position
        leftBtn.style.opacity = container.scrollLeft > 0 ? '1' : '0.5';
        
        // Show/hide right button based on whether we can scroll further right
        const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 10;
        rightBtn.style.opacity = canScrollRight ? '1' : '0.5';
    });
    
    // Trigger initial scroll event to set button visibility
    container.dispatchEvent(new Event('scroll'));
}

// Preload category names when publications.json is first loaded
(async function() {
    try {
        const response = await fetch('./data/publications.json');
        if (response.ok) {
            const data = await response.json();
            if (data.categories) {
                window.categoryNames = data.categories;
            }
        }
    } catch (e) {
        console.error('Failed to preload category names', e);
    }
})();

// Add CSS for publication card links and citation positioning
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Make entire card clickable */
    .pub-card {
      position: relative;
      cursor: pointer;
    }
    
    .pub-card-link {
      display: block;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    
    /* Make card content a flex container for positioning */
    .pub-card-content {
      display: flex;
      flex-direction: column;
      height: 180px;
      position: relative;
    }
    
    /* Position metrics at the bottom */
    .pub-metrics {
      position: absolute;
      bottom: 15px;
      left: 0;
      margin: 0;
    }
    
    /* Style citation metric */
    .metric.citations {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-light);
      font-size: 0.9rem;
    }
    
    /* Ensure title doesn't overlap with citations */
    .pub-card h3 {
      margin-bottom: 40px;
    }
  `;
  document.head.appendChild(style);
});

// Add CSS for larger publication cards with fixed citation position
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Make entire card clickable and larger */
    .pub-card {
      position: relative;
      cursor: pointer;
      min-width: 350px;  /* Increased from original size */
      max-width: 350px;  /* Increased from original size */
      height: 530px;     /* Increased from original size */
      margin: 1rem;
    }
    
    /* Adjust image container for larger card */
    .pub-card-image {
      height: 220px;     /* Increase image height */
    }
    
    .pub-card-image img {
      height: 100%;
      width: 100%;
      object-fit: cover;
    }
    
    .pub-card-link {
      display: block;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    
    /* Make card content larger and a flex container for positioning */
    .pub-card-content {
      display: flex;
      flex-direction: column;
      height: 230px;     /* Increased content area height */
      position: relative;
      padding: 1.5rem;   /* Increased padding */
    }
    
    /* Position metrics at the bottom */
    .pub-metrics {
      position: absolute;
      bottom: 0px;
      left: 20px;
      margin: 0;
    }
    
    /* Style citation metric */
    .metric.citations {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-light);
      font-size: 1rem;   /* Slightly larger font */
    }
    
    /* Ensure title doesn't overlap with citations and increase size */
    .pub-card h3 {
      margin-bottom: 30px;
      font-size: 1.2rem;  /* Larger title */
      line-height: 1.4;
    }
    
    /* Ensure card badges are appropriately sized */
    .pub-card-badge {
      font-size: 0.9rem;
      padding: 0.4rem 0.8rem;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    /* Adjust scrolling for the larger cards */
    .pub-featured-wrapper {
      padding: 1.5rem 0;
    }
  `;
  document.head.appendChild(style);
});

// Add CSS for larger publication cards with fixed citation position at absolute bottom
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Make entire card clickable and larger */
    .pub-card {
      position: relative;
      cursor: pointer;
      min-width: 350px;
      max-width: 350px;
      height: 550px;
      margin: 0rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .pub-card-link {
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    
    /* Adjust image container for larger card */
    .pub-card-image {
      height: 220px;
      flex-shrink: 0;
    }
    
    .pub-card-image img {
      height: 100%;
      width: 100%;
      object-fit: cover;
    }
    
    /* Make card content area flexible */
    .pub-card-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      padding: 1.5rem;
    }
    
    /* Ensure title has appropriate space */
    .pub-card h3 {
      font-size: 1.2rem;
      line-height: 1.4;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }
    
    /* Position metrics at the very bottom of the card */
    .pub-metrics {
      position: absolute;
      bottom: 20px;
      left: 20px;
      margin: 0;
      padding: 0;
    }
    
    /* Style citation metric */
    .metric.citations {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-light);
      font-size: 1rem;
    }
    
    /* Create bottom space to ensure text doesn't overlap with citations */
    .pub-card-content::after {
      content: '';
      display: block;
      height: 50px; /* Space for citations */
    }
    
    /* Ensure card badges are appropriately sized */
    .pub-card-badge {
      font-size: 0.9rem;
      padding: 0.4rem 0.8rem;
      margin-right: 0.3rem;
      margin-bottom: 0.3rem;
      display: inline-block;
    }
  `;
  document.head.appendChild(style);
});