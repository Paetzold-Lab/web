/**
 * Featured Publications handler for the homepage
 * Displays the latest publications in a scrollable carousel
 */

/**
 * Fetch featured publications
 * @returns {Promise<Array>} Latest publications sorted by year
 */
async function getFeaturedPublications() {
    try {
        const response = await fetch('./data/publications.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Get latest publications (sort by year, then citations)
        return data.publications
            .sort((a, b) => {
                // First by year (descending)
                const yearDiff = Number(b.year) - Number(a.year);
                if (yearDiff !== 0) return yearDiff;
                
                // Then by citations (descending) within the same year
                return (b.citations || 0) - (a.citations || 0);
            })
            .slice(0, 6); // Get top 6 latest publications
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
        const pubs = await getFeaturedPublications();
        
        if (pubs.length === 0) {
            pubContainer.innerHTML = '<p>No publications found.</p>';
            return;
        }
        
        // Render publications
        pubContainer.innerHTML = pubs.map(pub => `
            <article class="pub-card" data-aos="fade-up">
                <div class="pub-card-image">
                    <img src="${pub.thumbnail || './images/publications/default.jpg'}" alt="${pub.title}" loading="lazy">
                </div>
                <div class="pub-card-content">
                    <div class="pub-card-meta">
                        <span class="pub-card-badge">${pub.category || 'Research'}</span>
                        <span class="pub-card-badge">${pub.year || ''}</span>
                    </div>
                    <h3>${pub.title}</h3>
                    <div class="pub-metrics">
                        ${pub.citations ? `
                            <span class="metric">
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path d="M12 21l-8-9h16l-8 9z"/>
                                </svg>
                                ${pub.citations} citations
                            </span>
                        ` : ''}
                    </div>
                </div>
            </article>
        `).join('');

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
