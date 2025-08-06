document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("header-loaded", initializeHeader);
  document.addEventListener("search-overlay-loaded", initializeSearch);

  initializeUI();
  initializeCarousel();
  initializeCardScrolling();
  initializeContactForm();
  initializeGallery();
  initializeCollaboratorScrolling();
});

function initializeHeader() {
  const bar = document.getElementById("progress-bar");
  if (bar) {
    const d = 1300 + Math.random() * 400;
    bar.style.width = 0;
    bar.style.transition = `width ${d}ms cubic-bezier(0.4,0,0.2,1)`;
    bar.offsetHeight;
    requestAnimationFrame(() => (bar.style.width = "100%"));
  }
  document
    .querySelector(".search-btn")
    ?.addEventListener("click", () => {
      const o = document.getElementById("search-overlay");
      if (!o) return;
      o.classList.add("active");
      setTimeout(() => document.querySelector(".search-input")?.focus(), 300);
    });
}

function initializeUI() {
  document.addEventListener("click", e => {
    if (e.target.matches(".overlay-close"))
      e.target.closest(".overlay")?.classList.remove("active");
  });

  const title = document.querySelector(".typing-title");
  if (title) {
    new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add("animate");
            observer.unobserve(en.target);
          }
        });
      },
      { threshold: 0.5 }
    ).observe(title);
  }

  const observer = new IntersectionObserver(
    es => es.forEach(e => e.isIntersecting && ((e.target.style.opacity = 1), (e.target.style.transform = "translateY(0)"))),
    { threshold: 0.1 }
  );

  document.querySelectorAll(".pub-card").forEach(c => {
    c.style.opacity = 0;
    c.style.transform = "translateY(20px)";
    observer.observe(c);
  });
}

function initializeSearch() {
  const input = document.querySelector(".search-input");
  const results = document.querySelector(".search-results");
  if (!input) return;

  const pages = [
    "./index.html",
    "./team.html",
    "./research.html",
    "./join_us.html",
    "./contact.html",
    "./pi.html"
  ];

  let index = [];
  (async () => {
    index = (
      await Promise.all(
        pages.map(async p => {
          try {
            const r = await fetch(p);
            if (!r.ok) return null;
            const html = await r.text();
            const d = new DOMParser().parseFromString(html, "text/html");
            return {
              title: d.title,
              url: p.replace("./", ""),
              content: d.body.textContent.replace(/\s+/g, " ").trim()
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);
  })();

  input.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    if (!q) return (results.innerHTML = "");

    results.innerHTML = index
      .filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
      )
      .map(p => {
        const hilite = str => str.replace(new RegExp(q, "gi"), m => `<span class="highlight">${m}</span>`);
        const title = hilite(p.title);

        let snippet = p.content;
        const i = snippet.toLowerCase().indexOf(q);
        if (i > -1) {
          const s = Math.max(0, i - 50);
          const e = Math.min(snippet.length, i + q.length + 50);
          snippet = (s ? "..." : "") + snippet.slice(s, e) + (e < p.content.length ? "..." : "");
        }
        snippet = hilite(snippet);

        return `<div class="search-result-item" onclick="window.location='${p.url}'"><h3>${title}</h3><p>${snippet}</p></div>`;
      })
      .join("");
  });
}

function initializeCarousel() {
  const wrap = document.getElementById("carousel-wrapper");
  if (!wrap) return;

  const slides = [...document.querySelectorAll(".carousel-slide")];
  const dots = [...document.querySelectorAll(".dot")];
  const prev = document.getElementById("carousel-prev");
  const next = document.getElementById("carousel-next");
  let idx = 0;

  const update = () => {
    wrap.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  };

  dots.forEach((d, i) => d.addEventListener("click", () => ((idx = i), update())));
  prev?.addEventListener("click", () => ((idx = (idx - 1 + slides.length) % slides.length), update()));
  next?.addEventListener("click", () => ((idx = (idx + 1) % slides.length), update()));

  if (slides.length > 1) setInterval(() => ((idx = (idx + 1) % slides.length), update()), 8e3);

  document.querySelectorAll(".video-bg video").forEach(v => (v.playbackRate = 0.7));
  update();
}

function initializeCardScrolling() {
  const setup = (row, l, r, w) => {
    const wrap = document.getElementById(row);
    const left = document.getElementById(l);
    const right = document.getElementById(r);
    if (!wrap || !left || !right) return;

    let off = 0;
    left.addEventListener("click", () => {
      off = Math.min(off + w, 0);
      wrap.style.transform = `translateX(${off}px)`;
    });
    right.addEventListener("click", () => {
      const max = wrap.scrollWidth - wrap.clientWidth;
      off = Math.max(off - w, -max);
      wrap.style.transform = `translateX(${off}px)`;
    });
  };

  setup("team-scroll", "team-left", "team-right", 190);
  setup("research-scroll", "research-left", "research-right", 190);
}

function initializeContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = form.querySelector(".submit-btn");
    btn.dataset.originalText ||= btn.innerHTML;
    btn.innerHTML = "Sending...";
    btn.disabled = true;

    const data = {
      name: form.name?.value || "",
      email: form.email?.value || "",
      message: form.message?.value || ""
    };

    fetch(
      "https://script.google.com/macros/s/AKfycbyEveVuAWICqewCw5FF8JnuQQwP8KEIFYgAmZShgnKzlTsIOBjRD3PSHilzQ12rxy1j/exec",
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        mode: "no-cors"
      }
    )
      .then(() => {
        btn.classList.add("success");
        btn.innerHTML = "Sent Successfully";
        form.reset();
        setTimeout(() => {
          btn.classList.remove("success");
          btn.innerHTML = btn.dataset.originalText;
          btn.disabled = false;
        }, 3000);
      })
      .catch(() => {
        btn.innerHTML = "Failed to Send";
        btn.style.backgroundColor = "#F44336";
        setTimeout(() => {
          btn.innerHTML = btn.dataset.originalText;
          btn.style.backgroundColor = "";
          btn.disabled = false;
        }, 3000);
      });
  });
}

function initializeGallery() {
  const wrap = document.querySelector(".cards-scroll-wrapper.infinite-scroll");
  if (!wrap || wrap.classList.contains("cloned")) return;

  const cards = [...wrap.querySelectorAll(".small-card:not(.clone)")];
  wrap.querySelectorAll(".small-card.clone").forEach(c => c.remove());

  for (let i = 0; i < 3; i++)
    cards.forEach(c => {
      const clone = c.cloneNode(true);
      clone.classList.add("clone");
      wrap.appendChild(clone);
    });

  wrap.classList.add("cloned");
  wrap.style.animation = "none";
  wrap.offsetHeight;
  wrap.style.animation = "scrollLeft 90s linear infinite";

  window.addEventListener("resize", () => {
    wrap.style.animation = "none";
    wrap.offsetHeight;
    wrap.style.animation = "scrollLeft 90s linear infinite";
  });
}

function initializeCollaboratorScrolling() {
  const ct = document.querySelector(".collab-container");
  const prev = document.querySelector(".collaborators .scroll-btn.prev");
  const next = document.querySelector(".collaborators .scroll-btn.next");
  if (!ct || !prev || !next) return;

  const dx = 300;
  prev.addEventListener("click", () => ct.scrollBy({ left: -dx, behavior: "smooth" }));
  next.addEventListener("click", () => ct.scrollBy({ left: dx, behavior: "smooth" }));
}
