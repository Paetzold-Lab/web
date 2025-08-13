// Local fallback / legacy names. Prefer dynamic names from publications.json when available.
const CATEGORY_NAMES = {
  "medical-imaging": "Medical Imaging",
  gnn: "GNN",
  generative: "Generative AI",
  topology: "Topology",
  microscopy: "Microscopy",
  mri: "MRI",
  ct: "CT",
  pet: "PET",
  "x-ray": "X-ray",
  ultrasound: "Ultrasound",
  histology: "Histology",
  segmentation: "Segmentation",
  reconstruction: "Reconstruction",
  detection: "Detection",
  registration: "Registration",
  classification: "Classification",
  other: "Research"
};

// Will be populated from publications.json (data.categories) for single source of truth.
let CATEGORY_MAP_FROM_DATA = {};

async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

async function getFeaturedPublications() {
  const data = await json("./data/publications.json");
  if (data.categories) CATEGORY_MAP_FROM_DATA = data.categories;
  const pubs = data.publications;
  // 1. Explicit featured entries (preferred)
  const featured = pubs
    .filter(p => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
  if (featured.length) return featured;

  // 2. Legacy manual id list (kept for backward compatibility if old ids still exist)
  const manualIds = ["pub001", "pub028", "pub013", "pub055", "pub088", "pub006"];
  const manual = pubs
    .filter(p => manualIds.includes(p.id))
    .sort((a, b) => manualIds.indexOf(a.id) - manualIds.indexOf(b.id));
  if (manual.length) return manual;

  // 3. Category-based diverse selection (derive categories if top-level summary missing)
  let categoryMap = data.categories;
  if (!categoryMap) {
    categoryMap = {};
    pubs.forEach(p => (p.categories || []).forEach(c => (categoryMap[c] = c)));
  }
  const auto = [];
  Object.keys(categoryMap).forEach(cat => {
    auto.push(
      ...pubs
        .filter(p => p.categories?.includes(cat))
        .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0))
        .slice(0, 1) // take top 1 per category first for diversity
    );
  });
  // Fill remaining slots (up to 6) with next best across categories
  if (auto.length < 6) {
    const remaining = pubs
      .filter(p => !auto.find(a => a.id === p.id))
      .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
    auto.push(...remaining.slice(0, 6 - auto.length));
  }
  if (auto.length) {
    return auto
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
      .slice(0, 6);
  }

  // 4. Absolute fallback: pick top 6 by citations or by year if citations absent
  const scored = [...pubs].sort((a, b) => {
    const ca = a.citations ?? 0;
    const cb = b.citations ?? 0;
    if (cb !== ca) return cb - ca;
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    return yb - ya;
  });
  return scored.slice(0, 6);
}

function catName(id) {
  // Prefer names from data, then static map, then heuristic capitalization.
  if (CATEGORY_MAP_FROM_DATA[id]) return CATEGORY_MAP_FROM_DATA[id];
  if (CATEGORY_NAMES[id]) return CATEGORY_NAMES[id];
  // Heuristic: if short (<=4) and all lowercase letters, uppercase it (e.g., mri -> MRI)
  if (/^[a-z]{2,4}$/.test(id)) return id.toUpperCase();
  // Replace hyphen groups with capitalized words.
  return id
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function scrollSetup(c, l, r) {
  if (!c || !l || !r) return;
  const dx = 400;
  l.addEventListener("click", () => c.scrollBy({ left: -dx, behavior: "smooth" }));
  r.addEventListener("click", () => c.scrollBy({ left: dx, behavior: "smooth" }));

  const sync = () => {
    l.style.opacity = c.scrollLeft > 0 ? "1" : "0.5";
    r.style.opacity = c.scrollLeft < c.scrollWidth - c.clientWidth - 10 ? "1" : "0.5";
  };
  c.addEventListener("scroll", sync);
  sync();
}

document.addEventListener("DOMContentLoaded", async () => {
  const wrap = document.querySelector(".pub-featured");
  const left = document.getElementById("pub-left");
  const right = document.getElementById("pub-right");
  if (!wrap) return;

  wrap.textContent = "Loading publications...";
  const pubs = await getFeaturedPublications();
  if (!pubs.length) {
    wrap.textContent = "No publications found.";
    return;
  }

  wrap.innerHTML = pubs
    .map(p => {
      const url =
        p.url || p.scholar_link || p.links?.scholar || p.links?.pdf || "#";
      return `
        <article class="pub-card">
          <a href="${url}" target="_blank" rel="noopener" class="pub-card-link">
            <div class="pub-card-image">
              <img src="${p.thumbnail || "./images/publications/default.png"}" alt="${p.title}" loading="lazy">
            </div>
            <div class="pub-card-content">
              <div class="pub-card-meta">
                ${(p.categories?.slice(0, 5) || ["other"])
                  .map(c => `<span class="pub-card-badge ${c}">${catName(c)}</span>`)
                  .join("")}
                <span class="pub-card-badge year">${p.year || ""}</span>
              </div>
              <h3>${p.title}</h3>
            </div>
          </a>
        </article>`;
    })
    .join("");

  scrollSetup(wrap, left, right);

  wrap.querySelectorAll(".pub-card").forEach((card, i) => {
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "opacity .5s ease,transform .5s ease";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    }, i * 100);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const s = document.createElement("style");
  s.textContent = `
    .pub-card{position:relative;cursor:pointer;min-width:350px;max-width:350px;height:550px;margin:0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 5px 15px rgba(0,0,0,.1)}
    .pub-card-link{display:flex;flex-direction:column;color:inherit;height:100%}
    .pub-card-image{height:220px;flex-shrink:0}
    .pub-card-image img{height:100%;width:100%;object-fit:cover}
    .pub-card-content{flex-grow:1;display:flex;flex-direction:column;position:relative;padding:1.5rem}
    .pub-card h3{font-size:1.2rem;line-height:1.4;margin:.5rem 0 1rem}
    .pub-card-badge{font-size:.9rem;padding:.4rem .8rem;margin:0 .3rem .3rem 0;display:inline-block}
    .pub-metrics{position:absolute;bottom:20px;left:20px;margin:0}
  `;
  document.head.appendChild(s);
});
