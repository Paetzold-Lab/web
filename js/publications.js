const ITEMS_PER_PAGE = 5;
const LAB_MEMBERS = ["Johannes Paetzold", "Chenjun Li", "Laurin Lux", "Alexander Berger", "Adina Scheinfeld", "Rudolf van Herten", "Lucas Stoffl"];

let publications = [];
let categories = {};
let currentPage = 1;
let sortConfig = { field: "year", ascending: false };
let activeFilter = "all";
let searchQuery = "";

async function fetchPublications() {
  try {
    const r = await fetch("./data/publications.json");
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    if (data.categories) {
      categories = data.categories;
      updateFilterButtons(Object.keys(categories));
    }
    return data.publications.map(p => ({
      ...p,
      thumbnail: p.thumbnail || "./images/publications/default.png",
      links: { pdf: p.pdf_link || null, scholar: p.url || p.scholar_link || null }
    }));
  } catch {
    return [];
  }
}

function updateFilterButtons(ids) {
  const box = document.querySelector(".pub-filters");
  if (!box) return;
  let html = `<button class="active" data-filter="all">All</button>`;
  ids.forEach(id => id !== "other" && (html += `<button data-filter="${id}">${categories[id] || id}</button>`));
  box.innerHTML = html;
  attachFilterListeners();
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("publications-container");
  const pages = document.querySelector(".page-numbers");
  const prev = document.querySelector(".pagination-btn.prev");
  const next = document.querySelector(".pagination-btn.next");
  const searchInput = document.querySelector(".pub-search input");
  const sortSel = document.getElementById("sort-select");
  const sortDir = document.getElementById("sort-direction");

  container && (container.innerHTML = '<div class="loading">Loading publications...</div>');
  publications = await fetchPublications();

  const param = new URLSearchParams(window.location.search).get("filter");
  if (param && (param === "all" || categories[param])) {
    activeFilter = param;
    document.querySelectorAll(".pub-filters button").forEach(b => b.classList.toggle("active", b.dataset.filter === activeFilter));
  }
  applyFiltersAndRender();

  let to;
  searchInput?.addEventListener("input", e => {
    clearTimeout(to);
    to = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase();
      currentPage = 1;
      applyFiltersAndRender();
    }, 300);
  });

  pages?.addEventListener("click", e => {
    if (e.target.tagName === "SPAN" && e.target.dataset.page) {
      currentPage = +e.target.dataset.page;
      applyFiltersAndRender();
      window.scrollTo({ top: document.querySelector(".publications").offsetTop - 100, behavior: "smooth" });
    }
  });

  prev?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFiltersAndRender();
      window.scrollTo({ top: document.querySelector(".publications").offsetTop - 100, behavior: "smooth" });
    }
  });

  next?.addEventListener("click", () => {
    const total = Math.ceil(getFilteredPublications().length / ITEMS_PER_PAGE);
    if (currentPage < total) {
      currentPage++;
      applyFiltersAndRender();
      window.scrollTo({ top: document.querySelector(".publications").offsetTop - 100, behavior: "smooth" });
    }
  });

  sortSel?.addEventListener("change", () => {
    sortConfig.field = sortSel.value;
    currentPage = 1;
    applyFiltersAndRender();
  });

  sortDir?.addEventListener("click", () => {
    sortConfig.ascending = !sortConfig.ascending;
    sortDir.textContent = sortConfig.ascending ? "↑" : "↓";
    currentPage = 1;
    applyFiltersAndRender();
  });
});

function attachFilterListeners() {
  document.querySelectorAll(".pub-filters button").forEach(btn =>
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll(".pub-filters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPage = 1;
      applyFiltersAndRender();

      const url = new URL(window.location);
      activeFilter === "all" ? url.searchParams.delete("filter") : url.searchParams.set("filter", activeFilter);
      window.history.replaceState({}, "", url);
    })
  );
}

function applyFiltersAndRender() {
  renderPublications(getFilteredPublications());
}

function getFilteredPublications() {
  let filtered =
    activeFilter === "all" ? publications : publications.filter(p => p.categories?.includes(activeFilter));

  if (searchQuery) {
    const q = searchQuery;
    filtered = filtered.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.abstract?.toLowerCase().includes(q) ||
        p.authors?.toLowerCase().includes(q) ||
        p.venue?.toLowerCase().includes(q)
    );
  }
  return sortPublications(filtered);
}

const ellipsis = (t, l) => (!t ? "" : t.length > l ? `${t.slice(0, l)}...` : t);

function highlightAuthors(str) {
  const pairs = LAB_MEMBERS.map(n => {
    const [f, l] = n.split(" ");
    return { f: f.toLowerCase(), l: l.toLowerCase() };
  });
  return str
    .split(", ")
    .map(n => {
      const lo = n.trim().toLowerCase();
      const isLab = pairs.some(p => lo.includes(p.f) && lo.includes(p.l));
      return isLab ? `<span class="lab-member">${n.trim()}</span>` : n.trim();
    })
    .join(", ");
}

function formatAuthors(raw) {
  if (!raw) return "";
  const list = raw.replace(/ and /g, ", ").split(",").map(a => a.trim()).filter(Boolean);
  return list.length <= 5
    ? list.join(", ")
    : `${list.slice(0, 3).join(", ")}, ..., ${list.slice(-2).join(", ")}`;
}

function sortPublications(arr) {
  return [...arr].sort((a, b) => {
    let A = a[sortConfig.field] ?? "";
    let B = b[sortConfig.field] ?? "";
    if (sortConfig.field === "title") (A = A.toLowerCase()), (B = B.toLowerCase());
    if (["year", "citations"].includes(sortConfig.field)) (A = +A || 0), (B = +B || 0);
    if (A === B) return 0;
    const cmp = A < B ? -1 : 1;
    return sortConfig.ascending ? cmp : -cmp;
  });
}

function prettyCat(id) {
  if (categories[id]) return categories[id];
  if (/^[a-z]{2,4}$/.test(id)) return id.toUpperCase(); // e.g., mri -> MRI, ct -> CT
  return id
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function badges(cats) {
  if (!cats?.length) return '<span class="pub-category-badge other">Research</span>';
  return cats.map(c => `<span class="pub-category-badge ${c}">${prettyCat(c)}</span>`).join("");
}

function renderPublication(p) {
  const a = ellipsis(formatAuthors(p.authors), 120);
  const abs = ellipsis(p.abstract, 250);
  return `
    <article class="pub-item" data-categories="${p.categories?.join(" ") || "other"}">
      <div class="pub-thumb"><img src="${p.thumbnail}" alt="${p.title}" loading="lazy"></div>
      <div class="pub-content">
        <h3>${p.title}</h3>
        <p class="authors">${highlightAuthors(a)}</p>
        <div class="pub-meta">
          <span class="venue-name">${p.venue}</span>
          <span class="year">${p.year ? ` (${p.year})` : ""}</span>
        </div>
        <div class="pub-categories">${badges(p.categories)}</div>
        <p class="abstract">${abs}</p>
        <div class="pub-links">
          ${p.links.pdf ? `<a href="${p.links.pdf}" class="btn-link pdf" target="_blank" rel="noopener">PDF</a>` : ""}
          ${p.links.scholar ? `<a href="${p.links.scholar}" class="btn-link link" target="_blank" rel="noopener">Link</a>` : ""}
          ${p.citations ? `<span class="citations-count"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 21l-8-9h16l-8 9z"/></svg>${p.citations} citations</span>` : ""}
        </div>
      </div>
    </article>`;
}

function renderPublications(list) {
  const box = document.getElementById("publications-container");
  if (!box) return;

  if (!list.length) {
    box.innerHTML = '<div class="no-results">No publications found. Try changing your search criteria.</div>';
    document.querySelector(".page-numbers")?.(e => (e.innerHTML = ""));
    document.querySelector(".pagination-btn.prev")?.setAttribute("disabled", "");
    document.querySelector(".pagination-btn.next")?.setAttribute("disabled", "");
    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const slice = list.slice(start, start + ITEMS_PER_PAGE);
  box.innerHTML = slice.map(renderPublication).join("");
  updatePagination(list.length);
}

function updatePagination(total) {
  const pages = document.querySelector(".page-numbers");
  const prev = document.querySelector(".pagination-btn.prev");
  const next = document.querySelector(".pagination-btn.next");
  if (!pages || !prev || !next) return;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const max = 5;
  let s = Math.max(1, currentPage - Math.floor(max / 2));
  let e = Math.min(totalPages, s + max - 1);
  if (e - s + 1 < max) s = Math.max(1, e - max + 1);

  let html = "";
  if (s > 1) {
    html += `<span data-page="1">1</span>`;
    if (s > 2) html += `<span class="ellipsis">...</span>`;
  }

  for (let i = s; i <= e; i++)
    html += `<span class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</span>`;

  if (e < totalPages) {
    if (e < totalPages - 1) html += `<span class="ellipsis">...</span>`;
    html += `<span data-page="${totalPages}">${totalPages}</span>`;
  }

  pages.innerHTML = html;
  prev.disabled = currentPage === 1;
  next.disabled = currentPage === totalPages;
}

document.addEventListener("DOMContentLoaded", () => {
  const s = document.createElement("style");
  s.textContent = `
    .pub-categories{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
    .pub-category-badge{font-size:.8rem;padding:.25rem .75rem;border-radius:20px;background:#f0f0f0;white-space:nowrap;max-width:120px;overflow:hidden}
    .pub-category-badge.medical-imaging{background:#e1f5fe;color:#0277bd}
    .pub-category-badge.gnn{background:#e8f5e9;color:#2e7d32}
    .pub-category-badge.generative{background:#fff8e1;color:#ff8f00}
    .pub-category-badge.topology{background:#f3e5f5;color:#7b1fa2}
    .pub-category-badge.microscopy{background:#e0f7fa;color:#00838f}
  `;
  document.head.appendChild(s);
});
