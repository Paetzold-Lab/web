/**
 * Publications handler for the research page
 * Fetches, filters, sorts, and displays publications with multi-category support
 */

// Configuration
const ITEMS_PER_PAGE = 5;
const LAB_MEMBERS = [
  "Johannes Paetzold",
  "Chenjun Li",
  "Laurin Lux",
  "Alexander Berger"
];

// State
let publications = [];
let categories = {};
let currentPage = 1;
let sortConfig = {
  field: 'year',
  ascending: false
};
let activeFilter = 'all';
let searchQuery = '';

/**
 * Fetch and process publications data
 */
async function fetchPublications() {
  try {
    const response = await fetch('./data/publications.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch publications: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store category information
    if (data.categories) {
      categories = data.categories;
      
      // Update filter buttons dynamically based on available categories
      updateFilterButtons(Object.keys(categories));
    }
    
    return data.publications.map(pub => ({
      ...pub,
      thumbnail: pub.thumbnail || './images/publications/default.png',
      links: {
        pdf: pub.pdf_link || null,
        scholar: pub.url || pub.scholar_link || null
      }
    }));
  } catch (error) {
    console.error('Error fetching publications:', error);
    return [];
  }
}

/**
 * Update filter buttons based on available categories
 */
function updateFilterButtons(categoryIds) {
  const filterContainer = document.querySelector('.pub-filters');
  if (!filterContainer) return;
  
  // Keep the "All" button
  let html = `<button class="active" data-filter="all">All</button>`;
  
  // Add a button for each category
  categoryIds.forEach(categoryId => {
    if (categoryId !== 'other') {
      html += `<button data-filter="${categoryId}">${categories[categoryId] || categoryId}</button>`;
    }
  });
  
  filterContainer.innerHTML = html;
  
  // Reattach event listeners
  attachFilterListeners();
}

/**
 * Initialization on document load
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const pubContainer = document.getElementById('publications-container');
  const pageNumbers = document.querySelector('.page-numbers');
  const prevBtn = document.querySelector('.pagination-btn.prev');
  const nextBtn = document.querySelector('.pagination-btn.next');
  const searchInput = document.querySelector('.pub-search input');
  const sortSelect = document.getElementById('sort-select');
  const sortDirection = document.getElementById('sort-direction');

  // Show loading state
  if (pubContainer) {
    pubContainer.innerHTML = '<div class="loading">Loading publications...</div>';
  }

  // Fetch publications
  try {
    publications = await fetchPublications();
    
    // Check for URL parameters (for direct linking to filtered views)
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    
    if (filterParam && (filterParam === 'all' || categories[filterParam])) {
      activeFilter = filterParam;
      
      // Update filter button UI
      document.querySelectorAll('.pub-filters button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === activeFilter);
      });
    }
    
    // Initial render with any applied filters
    applyFiltersAndRender();
  } catch (error) {
    if (pubContainer) {
      pubContainer.innerHTML = '<div class="error">Failed to load publications</div>';
    }
    return;
  }

  // Handle search
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        applyFiltersAndRender();
      }, 300);
    });
  }

  // Handle pagination
  if (pageNumbers) {
    pageNumbers.addEventListener('click', (e) => {
      if (e.target.tagName === 'SPAN' && e.target.dataset.page) {
        currentPage = parseInt(e.target.dataset.page);
        applyFiltersAndRender();
        window.scrollTo({
          top: document.querySelector('.publications').offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
        window.scrollTo({
          top: document.querySelector('.publications').offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const filteredPubs = getFilteredPublications();
      const totalPages = Math.ceil(filteredPubs.length / ITEMS_PER_PAGE);
      
      if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndRender();
        window.scrollTo({
          top: document.querySelector('.publications').offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  }

  // Handle sorting
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortConfig.field = sortSelect.value;
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  if (sortDirection) {
    sortDirection.addEventListener('click', () => {
      sortConfig.ascending = !sortConfig.ascending;
      sortDirection.textContent = sortConfig.ascending ? '↑' : '↓';
      currentPage = 1;
      applyFiltersAndRender();
    });
  }
});

/**
 * Attach event listeners to filter buttons
 */
function attachFilterListeners() {
  const filterButtons = document.querySelectorAll('.pub-filters button');
  
  if (filterButtons) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        activeFilter = filter;
        currentPage = 1;
        applyFiltersAndRender();
        
        // Update URL for bookmarking
        const url = new URL(window.location);
        if (filter === 'all') {
          url.searchParams.delete('filter');
        } else {
          url.searchParams.set('filter', filter);
        }
        window.history.replaceState({}, '', url);
      });
    });
  }
}

/**
 * Apply all filters and render the publications
 */
function applyFiltersAndRender() {
  const filteredPubs = getFilteredPublications();
  renderPublications(filteredPubs);
}

/**
 * Get filtered publications based on current filter state
 * @returns {Array} Filtered and sorted publications
 */
function getFilteredPublications() {
  // Filter by category if needed
  let filtered = publications;
  if (activeFilter !== 'all') {
    filtered = publications.filter(pub => 
      pub.categories && pub.categories.includes(activeFilter)
    );
  }
  
  // Apply search query if present
  if (searchQuery) {
    filtered = filtered.filter(pub => 
      pub.title.toLowerCase().includes(searchQuery) ||
      (pub.abstract && pub.abstract.toLowerCase().includes(searchQuery)) ||
      (pub.authors && pub.authors.toLowerCase().includes(searchQuery)) ||
      (pub.venue && pub.venue.toLowerCase().includes(searchQuery))
    );
  }
  
  // Sort publications
  return sortPublications(filtered);
}

/**
 * Limit text to a specified length
 * @param {string} text - Text to limit
 * @param {number} limit - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
function limitText(text, limit) {
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit) + '...' : text;
}

/**
 * Highlight lab member names in author list
 * @param {string} authorStr - String of authors
 * @returns {string} HTML with highlighted lab members
 */
function highlightAuthors(authorStr) {
  // Split lab members into {first, last} pairs
  const labMemberPairs = LAB_MEMBERS.map(member => {
    const [firstName, lastName] = member.split(' ');
    return {
      first: firstName.toLowerCase(),
      last: lastName.toLowerCase()
    };
  });

  return authorStr
    .split(', ')
    .map(name => {
      const nameLower = name.trim().toLowerCase();
      // Check if BOTH first AND last name appear
      const isLabMember = labMemberPairs.some(member => 
        nameLower.includes(member.first) && 
        nameLower.includes(member.last)
      );
      
      return isLabMember ? 
        `<span class="lab-member">${name.trim()}</span>` : 
        name.trim();
    })
    .join(', ');
}

/**
 * Format author names for display
 * @param {string} authors - Raw author string
 * @returns {string} Formatted author string
 */
function formatAuthors(authors) {
  if (!authors) return '';
  
  // Split by both 'and' and commas, then clean up
  const authorList = authors
    .replace(/ and /g, ', ')  // Replace ' and ' with comma
    .split(',')               // Split by comma
    .map(a => a.trim())       // Clean up whitespace
    .filter(a => a);          // Remove empty strings
  
  // Shorten long author lists
  if (authorList.length <= 5) {
    return authorList.join(', ');
  }
  
  return `${authorList.slice(0, 3).join(', ')}, ..., ${authorList.slice(-2).join(', ')}`;
}

/**
 * Sort publications based on current sort configuration
 * @param {Array} pubs - Publications to sort
 * @returns {Array} Sorted publications
 */
function sortPublications(pubs) {
  return [...pubs].sort((a, b) => {
    let valueA = a[sortConfig.field] || '';
    let valueB = b[sortConfig.field] || '';
    
    // Handle string sorting for titles
    if (sortConfig.field === 'title') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    // Handle numeric sorting (year, citations)
    if (sortConfig.field === 'year' || sortConfig.field === 'citations') {
      valueA = Number(valueA) || 0;
      valueB = Number(valueB) || 0;
    }
    
    if (valueA === valueB) return 0;
    
    const comparison = valueA < valueB ? -1 : 1;
    return sortConfig.ascending ? comparison : -comparison;
  });
}

/**
 * Get category badges HTML
 * @param {Array} pubCategories - Publication categories
 * @returns {string} HTML for category badges
 */
function getCategoryBadges(pubCategories) {
  if (!pubCategories || pubCategories.length === 0) {
    return '<span class="pub-category-badge other">Research</span>';
  }
  
  return pubCategories.map(cat => {
    const categoryName = categories[cat] || cat;
    return `<span class="pub-category-badge ${cat}">${categoryName}</span>`;
  }).join('');
}

/**
 * Render a single publication
 * @param {Object} pub - Publication data
 * @returns {string} HTML for publication card
 */
function renderPublication(pub) {
  const shortAuthors = limitText(formatAuthors(pub.authors), 120);
  const shortAbstract = limitText(pub.abstract, 250);
  const highlightedAuthors = highlightAuthors(shortAuthors);
  const yearDisplay = pub.year ? ` (${pub.year})` : '';
  const categoryBadges = getCategoryBadges(pub.categories);
  
  return `
    <article class="pub-item" data-categories="${pub.categories ? pub.categories.join(' ') : 'other'}">
      <div class="pub-thumb">
        <img src="${pub.thumbnail}" alt="${pub.title}" loading="lazy">
      </div>
      <div class="pub-content">
        <h3>${pub.title}</h3>
        <p class="authors">${highlightedAuthors}</p>
        <div class="pub-meta">
          <span class="venue-name">${pub.venue}</span>
          <span class="year">${yearDisplay}</span>
        </div>
        <div class="pub-categories">
          ${categoryBadges}
        </div>
        <p class="abstract">${shortAbstract}</p>
        <div class="pub-links">
          ${pub.links.pdf ? `<a href="${pub.links.pdf}" class="btn-link pdf" target="_blank" rel="noopener">PDF</a>` : ''}
          ${pub.links.scholar ? `<a href="${pub.links.scholar}" class="btn-link link" target="_blank" rel="noopener">Link</a>` : ''}
          ${pub.citations ? `<span class="citations-count"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 21l-8-9h16l-8 9z"/></svg>${pub.citations} citations</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

/**
 * Render publications page with filtering and pagination
 * @param {Array} filteredPubs - Publications to display
 */
function renderPublications(filteredPubs) {
  const pubContainer = document.getElementById('publications-container');
  if (!pubContainer) return;
  
  // Handle empty results
  if (filteredPubs.length === 0) {
    pubContainer.innerHTML = '<div class="no-results">No publications found. Try changing your search criteria.</div>';
    
    // Clear pagination
    const pageNumbers = document.querySelector('.page-numbers');
    if (pageNumbers) pageNumbers.innerHTML = '';
    
    // Disable pagination buttons
    const prevBtn = document.querySelector('.pagination-btn.prev');
    const nextBtn = document.querySelector('.pagination-btn.next');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    
    return;
  }
  
  // Paginate results
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredPubs.slice(start, end);
  
  // Render publications for current page
  pubContainer.innerHTML = pageItems.map(renderPublication).join('');
  
  // Update pagination
  updatePagination(filteredPubs.length);
}

/**
 * Update pagination UI
 * @param {number} totalItems - Total number of items
 */
function updatePagination(totalItems) {
  const pageNumbers = document.querySelector('.page-numbers');
  const prevBtn = document.querySelector('.pagination-btn.prev');
  const nextBtn = document.querySelector('.pagination-btn.next');
  
  if (!pageNumbers || !prevBtn || !nextBtn) return;
  
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const maxVisiblePages = 5;
  
  // Calculate page range to display
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Generate pagination HTML
  let paginationHTML = '';
  
  // First page and ellipsis
  if (startPage > 1) {
    paginationHTML += `<span data-page="1">1</span>`;
    if (startPage > 2) {
      paginationHTML += `<span class="ellipsis">...</span>`;
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <span class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</span>
    `;
  }

  // Last page and ellipsis
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="ellipsis">...</span>`;
    }
    paginationHTML += `<span data-page="${totalPages}">${totalPages}</span>`;
  }

  // Update UI
  pageNumbers.innerHTML = paginationHTML;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Add CSS for category badges
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
  .pub-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .pub-category-badge {
    font-size: 0.8rem;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    background: #f0f0f0;
    white-space: nowrap;
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 120px;
    overflow: hidden;
  }

  .pub-category-badge.medical-imaging {
    background-color: #e1f5fe;
    color: #0277bd;
  }

  .pub-category-badge.gnn {
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  .pub-category-badge.generative {
    background-color: #fff8e1;
    color: #ff8f00;
  }

  .pub-category-badge.topology {
    background-color: #f3e5f5;
    color: #7b1fa2;
  }

  .pub-category-badge.microscopy {
    background-color: #e0f7fa;
    color: #00838f;
  }
  `;
  document.head.appendChild(style);
});