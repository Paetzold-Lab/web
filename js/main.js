/**
 * Main JavaScript file for the Paetzold Lab website
 * Handles UI interactions, animations, and dynamic content loading
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize UI components after the header is loaded
  document.addEventListener('header-loaded', initializeHeader);
  
  // Initialize search functionality after overlay is loaded
  document.addEventListener('search-overlay-loaded', initializeSearch);
  
  // Initialize user interface elements
  initializeUI();
  
  // Set up the carousel if present on the page
  initializeCarousel();
  
  // Initialize team cards scrolling if present
  initializeCardScrolling();

  // Set up contact form handling if present
  initializeContactForm();
  
  // Initialize the infinite scroll gallery with proper setup
  initializeGallery();
  
  // Initialize collaborator scrolling buttons
  initializeCollaboratorScrolling();
});

/**
 * Initialize header-related functionality
 */
function initializeHeader() {
  // Progress bar animation
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const duration = 1300 + Math.floor(Math.random() * 400);
    progressBar.style.width = '0';
    progressBar.style.transition = `width ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
    progressBar.offsetHeight; // Force reflow
    requestAnimationFrame(() => {
      progressBar.style.width = '100%';
    });
  }

  // Attach event listener to search button
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchOverlay = document.getElementById('search-overlay');
      if (searchOverlay) {
        searchOverlay.classList.add('active');
        setTimeout(() => {
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
        }, 300);
      }
    });
  }
}

/**
 * Initialize general UI elements and interactions
 */
function initializeUI() {
  // Handle overlay close buttons
  document.addEventListener('click', (e) => {
    if (e.target.matches('.overlay-close')) {
      const overlay = e.target.closest('.overlay');
      if (overlay) overlay.classList.remove('active');
    }
  });
  

  // Animate typing title if present
  const typingTitle = document.querySelector('.typing-title');
  if (typingTitle) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(typingTitle);
  }

  // Animate publication cards on scroll
  const pubCardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.pub-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    pubCardObserver.observe(card);
  });
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');
  let searchIndex = [];

  // Define pages to index
  const pagePaths = [
    './index.html',
    './team.html',
    './research.html',
    './Join_us.html',
    './contact.html',
    './pi.html'
  ];

  // Build search index
  async function buildSearchIndex() {
    try {
      searchIndex = await Promise.all(pagePaths.map(async path => {
        try {
          const response = await fetch(path);
          if (!response.ok) {
            console.warn(`Failed to fetch ${path}: ${response.status}`);
            return null;
          }
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          return {
            title: doc.title,
            url: path.replace('./', ''),
            content: doc.body.textContent.replace(/\s+/g, ' ').trim()
          };
        } catch (error) {
          console.warn(`Error fetching ${path}:`, error);
          return null;
        }
      }));

      // Filter out failed fetches
      searchIndex = searchIndex.filter(item => item !== null);
    } catch (error) {
      console.error('Error building search index:', error);
      searchIndex = [];
    }
  }

  // Initialize search index
  buildSearchIndex();

  // Handle search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (!query) {
        searchResults.innerHTML = '';
        return;
      }

      const filtered = searchIndex.filter(page => 
        page.title.toLowerCase().includes(query) || 
        page.content.toLowerCase().includes(query)
      );

      searchResults.innerHTML = filtered.map(page => {
        const titleHighlighted = page.title.replace(
          new RegExp(query, 'gi'),
          match => `<span class="highlight">${match}</span>`
        );

        let contentSnippet = page.content;
        const matchIndex = contentSnippet.toLowerCase().indexOf(query);
        if (matchIndex > -1) {
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(contentSnippet.length, matchIndex + query.length + 50);
          contentSnippet = contentSnippet.slice(start, end);
          if (start > 0) contentSnippet = '...' + contentSnippet;
          if (end < page.content.length) contentSnippet += '...';
        }

        const contentHighlighted = contentSnippet.replace(
          new RegExp(query, 'gi'),
          match => `<span class="highlight">${match}</span>`
        );

        return `
          <div class="search-result-item" onclick="window.location='${page.url}'">
            <h3>${titleHighlighted}</h3>
            <p>${contentHighlighted}</p>
          </div>
        `;
      }).join('');
    });
  }
}

/**
 * Initialize hero carousel if present on the page
 */
function initializeCarousel() {
  // Hero Carousel - Only initialize if elements exist
  const carouselWrapper = document.getElementById('carousel-wrapper');
  if (!carouselWrapper) return;
  
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  const arrowPrev = document.getElementById('carousel-prev');
  const arrowNext = document.getElementById('carousel-next');
  let currentSlide = 0;
  const totalSlides = slides.length;

  // Function to update carousel position and indicators
  function updateCarousel() {
    carouselWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });
  }

  // Set up dot indicators
  if (dots.length) {
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        currentSlide = idx;
        updateCarousel();
      });
    });
  }

  // Set up previous arrow
  if (arrowPrev) {
    arrowPrev.addEventListener('click', () => {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateCarousel();
    });
  }

  // Set up next arrow
  if (arrowNext) {
    arrowNext.addEventListener('click', () => {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel();
    });
  }

  // Auto-play only if multiple slides exist
  if (slides.length > 1) {
    setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel();
    }, 8000);
  }

  // Set video playback speed if hero video exists
  const heroVideos = document.querySelectorAll('.video-bg video');
  heroVideos.forEach(video => {
    if (video) video.playbackRate = 0.7;
  });

  // Initial update
  updateCarousel();
}

/**
 * Initialize card scrolling functionality for team and research cards
 */
function initializeCardScrolling() {
  /**
   * Sets up horizontal scrolling for card rows
   * @param {string} rowId - ID of the scroll wrapper element
   * @param {string} leftBtnId - ID of the left scroll button
   * @param {string} rightBtnId - ID of the right scroll button
   * @param {number} cardWidth - Width of each card including margin
   */
  function setupCardScroll(rowId, leftBtnId, rightBtnId, cardWidth) {
    const scrollWrapper = document.getElementById(rowId);
    const leftBtn = document.getElementById(leftBtnId);
    const rightBtn = document.getElementById(rightBtnId);

    if (!scrollWrapper || !leftBtn || !rightBtn) return;

    let offset = 0;
    
    leftBtn.addEventListener('click', () => {
      offset = Math.min(offset + cardWidth, 0);
      scrollWrapper.style.transform = `translateX(${offset}px)`;
    });

    rightBtn.addEventListener('click', () => {
      const maxScroll = scrollWrapper.scrollWidth - scrollWrapper.clientWidth;
      offset = Math.max(offset - cardWidth, -maxScroll);
      scrollWrapper.style.transform = `translateX(${offset}px)`;
    });
  }

  // Initialize different card rows
  setupCardScroll('team-scroll', 'team-left', 'team-right', 190);
  setupCardScroll('research-scroll', 'research-left', 'research-right', 190);
}

/**
 * Initialize contact form handling
 * Sends form data to Google Sheets and shows success in the button
 */
function initializeContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get the submit button
    const submitBtn = contactForm.querySelector('.submit-btn');
    
    // Store original button text
    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.innerHTML;
    }
    
    // Change button to loading state
    submitBtn.innerHTML = 'Sending...';
    submitBtn.disabled = true;
    submitBtn.classList.remove('success');
    
    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email')?.value || '';
    const message = document.getElementById('message').value;
    
    // Prepare data
    const formData = {
      name: name,
      email: email,
      message: message
    };
    
    // Your Google Apps Script web app URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyEveVuAWICqewCw5FF8JnuQQwP8KEIFYgAmZShgnKzlTsIOBjRD3PSHilzQ12rxy1j/exec';
    
    try {
      fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'no-cors' // This prevents CORS errors but makes response unreadable
      })
      .then(() => {
        console.log('Form submitted successfully!');
        
        // Change button to success state
        submitBtn.classList.add('success');
        submitBtn.innerHTML = 'Sent Successfully';
        
        // Reset form fields
        contactForm.reset();
        
        // Return button to normal state after 3 seconds
        setTimeout(() => {
          submitBtn.classList.remove('success');
          submitBtn.innerHTML = submitBtn.dataset.originalText;
          submitBtn.disabled = false;
        }, 3000);
      })
      .catch(error => {
        console.error('Error:', error);
        
        // Show error in button
        submitBtn.innerHTML = 'Failed to Send';
        submitBtn.style.backgroundColor = '#F44336';
        
        // Return button to normal state after 3 seconds
        setTimeout(() => {
          submitBtn.innerHTML = submitBtn.dataset.originalText;
          submitBtn.style.backgroundColor = '';
          submitBtn.disabled = false;
        }, 3000);
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      submitBtn.innerHTML = 'Error Occurred';
      submitBtn.style.backgroundColor = '#F44336';
      
      setTimeout(() => {
        submitBtn.innerHTML = submitBtn.dataset.originalText;
        submitBtn.style.backgroundColor = '';
        submitBtn.disabled = false;
      }, 3000);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize infinite scroll gallery
  const scrollWrapper = document.querySelector('.cards-scroll-wrapper');
  
  if (scrollWrapper && !scrollWrapper.classList.contains('cloned')) {
    // Clone all gallery items for seamless looping
    const originalCards = Array.from(scrollWrapper.querySelectorAll('.small-card'));
    
    // Remove existing clones to prevent duplication if script runs multiple times
    scrollWrapper.querySelectorAll('.small-card.clone').forEach(clone => clone.remove());
    
    // Clone each card and append to the gallery
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('clone');
      scrollWrapper.appendChild(clone);
    });
    
    scrollWrapper.classList.add('cloned');
  }
});

/**
 * Initialize the infinite scroll gallery with proper setup
 */
function initializeGallery() {
  const scrollWrapper = document.querySelector('.cards-scroll-wrapper.infinite-scroll');
  if (!scrollWrapper) return;
  
  // Get all existing cards
  const originalCards = Array.from(scrollWrapper.querySelectorAll('.small-card:not(.clone)'));
  
  // Remove any existing clones to avoid duplication
  scrollWrapper.querySelectorAll('.small-card.clone').forEach(clone => clone.remove());
  
  // Make sure all card images are properly loaded
  originalCards.forEach(card => {
    const imgElement = card.querySelector('img');
    if (!imgElement || !imgElement.src) {
      const placeholder = card.querySelector('.small-card-image');
      if (placeholder) {
        // Assign a placeholder image or fix missing images
        if (card.querySelector('.card-year').textContent.includes('WACV')) {
          placeholder.innerHTML = '<img src="images/team/wacv_0.jpg" alt="Group photo" />';
        } else if (card.querySelector('.card-year').textContent.includes('MICCAI')) {
          placeholder.innerHTML = '<img src="images/team/MICCAI.jpeg" alt="Group photo" />';
        } else {
          placeholder.innerHTML = '<img src="images/team/Cornell-Tech.jpg" alt="Campus" />';
        }
      }
    }
  });
  
  // Create enough duplicates to ensure seamless scrolling
  // We need at least 2 complete sets for seamless infinite scrolling
  const duplicateCount = 3; // Create 3 sets to ensure coverage
  
  for (let i = 0; i < duplicateCount; i++) {
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('clone');
      scrollWrapper.appendChild(clone);
    });
  }
  
  // Ensure animation starts from the beginning
  scrollWrapper.style.animation = 'none';
  scrollWrapper.offsetHeight; // Force reflow
  scrollWrapper.style.animation = 'scrollLeft 90s linear infinite';
  
  // Add resize handler to ensure gallery remains properly filled
  window.addEventListener('resize', function() {
    // Reset animation when window size changes to prevent jumps
    scrollWrapper.style.animation = 'none';
    scrollWrapper.offsetHeight; // Force reflow
    scrollWrapper.style.animation = 'scrollLeft 90s linear infinite';
  });
}

/**
 * Initialize the collaborator section scroll buttons
 */
function initializeCollaboratorScrolling() {
  const collabContainer = document.querySelector('.collab-container');
  const prevBtn = document.querySelector('.collaborators .scroll-btn.prev');
  const nextBtn = document.querySelector('.collaborators .scroll-btn.next');
  
  if (!collabContainer || !prevBtn || !nextBtn) return;
  
  // The amount to scroll with each button click
  const scrollAmount = 300;
  
  // Add event listener for the previous button
  prevBtn.addEventListener('click', () => {
    collabContainer.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  });
  
  // Add event listener for the next button
  nextBtn.addEventListener('click', () => {
    collabContainer.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  });
}

