/**
 * Components handler for the Paetzold Lab website
 * Loads HTML components dynamically to reduce duplication
 */

document.addEventListener("DOMContentLoaded", () => {
  // Component placeholder IDs and their corresponding component names
  const components = [
    { placeholder: 'header-placeholder', name: 'header' },
    { placeholder: 'footer-placeholder', name: 'footer' },
    { placeholder: 'search-overlay-placeholder', name: 'search-overlay' },
    { placeholder: 'research-overlay-placeholder', name: 'research-overlay' }
  ];
  
  // Load each component if its placeholder exists
  components.forEach(component => {
    const placeholderElement = document.getElementById(component.placeholder);
    if (placeholderElement) {
      loadComponent(component.name, placeholderElement);
    }
  });
});

/**
 * Loads a component from the components directory
 * 
 * @param {string} componentName - Name of the component file (without extension)
 * @param {HTMLElement} element - DOM element to insert the component into
 */
function loadComponent(componentName, element) {
  // In production, fetch from actual components directory
  fetch(`components/${componentName}.html`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${componentName} component`);
      }
      return response.text();
    })
    .then(html => {
      element.innerHTML = html;
      
      // Execute any scripts in the component
      const scripts = element.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
      
      // Dispatch event to notify the component has been loaded
      document.dispatchEvent(new CustomEvent(`${componentName}-loaded`));
    })
    .catch(error => {
      console.error(`Error loading ${componentName} component:`, error);
      
      // Fallback for development when components directory might not exist
      // Display a placeholder with component name
      element.innerHTML = `<div class="component-placeholder">${componentName} placeholder</div>`;
      
      // Still dispatch the event so dependent code can initialize
      document.dispatchEvent(new CustomEvent(`${componentName}-loaded`));
    });
}
