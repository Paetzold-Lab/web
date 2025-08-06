document.addEventListener("DOMContentLoaded", () => {
  const components = [
    { placeholder: "header-placeholder", name: "header" },
    { placeholder: "footer-placeholder", name: "footer" },
    { placeholder: "search-overlay-placeholder", name: "search-overlay" },
    { placeholder: "research-overlay-placeholder", name: "research-overlay" }
  ];

  components.forEach(c => {
    const el = document.getElementById(c.placeholder);
    if (el) loadComponent(c.name, el);
  });
});

function loadComponent(name, target) {
  fetch(`components/${name}.html`)
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(html => {
      target.innerHTML = html;
      target.querySelectorAll("script").forEach(s => {
        const n = document.createElement("script");
        [...s.attributes].forEach(a => n.setAttribute(a.name, a.value));
        n.textContent = s.textContent;
        s.parentNode.replaceChild(n, s);
      });
      document.dispatchEvent(new CustomEvent(`${name}-loaded`));
    })
    .catch(() => {
      target.innerHTML = `<div class="component-placeholder">${name} placeholder</div>`;
      document.dispatchEvent(new CustomEvent(`${name}-loaded`));
    });
}
