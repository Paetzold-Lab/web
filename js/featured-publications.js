const CATEGORY_NAMES = {
  "medical-imaging": "Medical Imaging",
  gnn: "GNN",
  generative: "Generative AI",
  topology: "Topology",
  microscopy: "Microscopy",
  other: "Research"
};

async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

async function getFeaturedPublications() {
  const data = await json("./data/publications.json");
  const pubs = data.publications;

  const featured = pubs
    .filter(p => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
  if (featured.length) return featured;

  const manualIds = ["pub001", "pub028", "pub013", "pub055", "pub088", "pub006"];
  const manual = pubs
    .filter(p => manualIds.includes(p.id))
    .sort((a, b) => manualIds.indexOf(a.id) - manualIds.indexOf(b.id));
  if (manual.length) return manual;

  const auto = [];
  Object.keys(data.categories || {}).forEach(cat => {
    auto.push(
      ...pubs
        .filter(p => p.categories?.includes(cat))
        .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0))
        .slice(0, 2)
    );
  });

  const uniq = [];
  const seen = new Set();
  auto.forEach(p => {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      uniq.push(p);
    }
  });
  return uniq.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0)).slice(0, 6);
}

function catName(id) {
  return CATEGORY_NAMES[id] || id;
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
