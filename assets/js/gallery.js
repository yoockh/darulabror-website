const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isLikelyImageUrl(url) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return false;

  // Many CDN image URLs (e.g. Unsplash) don't include file extensions.
  // We only exclude obvious non-image assets.
  const lower = u.toLowerCase();
  if (/\.(mp4|webm|mov|avi|mkv|pdf)(\?|#|$)/.test(lower)) return false;

  return true;
}

function normalizeContent(content) {
  let obj = content;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return { blocks: [] }; }
  }
  if (!obj || typeof obj !== "object") return { blocks: [] };
  if (!Array.isArray(obj.blocks)) obj.blocks = [];
  return obj;
}

async function fetchSomeArticles(limit = 100) {
  const url = new URL(API_BASE + "/articles");
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
  const json = await res.json();
  return json?.data?.items ?? [];
}

function collectImagesFromArticles(items) {
  const out = [];
  const seen = new Set();

  for (const a of items) {
    const title = String(a?.title || "Artikel");

    // cover
    const coverUrl = a?.photo_header || a?.photoHeader || a?.cover_url || a?.coverUrl || a?.image_url || a?.imageUrl;
    if (isLikelyImageUrl(coverUrl) && !seen.has(coverUrl)) {
      seen.add(coverUrl);
      out.push({ url: coverUrl, caption: title });
    }

    // content blocks
    const { blocks } = normalizeContent(a?.content);
    for (const b of blocks) {
      if (!b || typeof b !== "object") continue;
      const type = String(b.type || "").toLowerCase();
      if (type !== "image") continue;

      // Support EditorJS image block: {type:"image", data:{file:{url}, caption}}
      const url = b.url || b.src || b?.data?.file?.url || b?.data?.url;
      if (isLikelyImageUrl(url) && !seen.has(url)) {
        seen.add(url);
        const cap = b.caption || b?.data?.caption;
        out.push({ url, caption: cap ? `${title} — ${cap}` : title });
      }
    }
  }

  return out;
}

function renderGallery(images) {
  const grid = document.getElementById("galleryGrid");
  const meta = document.getElementById("galleryMeta");
  if (!grid) return;

  if (meta) meta.textContent = `Total gambar: ${images.length}`;

  if (!images.length) {
    grid.innerHTML = `<div class="col-12"><div class="alert alert-light border mb-0">Belum ada gambar. Nanti akan muncul otomatis setelah artikel berisi foto.</div></div>`;
    return;
  }

  grid.innerHTML = images.map((img, idx) => {
    const url = escapeHTML(img.url);
    const caption = escapeHTML(img.caption || "");
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <button class="btn p-0 w-100 text-start" data-gallery-idx="${idx}" style="border:0;">
          <div class="card da-card">
            <div class="ratio ratio-1x1 bg-body-tertiary">
              <img src="${url}" alt="${caption || "Foto"}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
            </div>
          </div>
        </button>
      </div>
    `;
  }).join("");

  const modalEl = document.getElementById("galleryModal");
  const modalImg = document.getElementById("galleryModalImg");
  const modalCaption = document.getElementById("galleryModalCaption");
  const modalOpen = document.getElementById("galleryModalOpen");
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-gallery-idx]");
    if (!btn) return;
    const i = Number(btn.getAttribute("data-gallery-idx"));
    const data = images[i];
    if (!data || !modalImg || !modal) return;

    modalImg.src = data.url;
    if (modalCaption) modalCaption.textContent = data.caption || "";
    if (modalOpen) modalOpen.href = data.url;

    modal.show();
  });
}

async function initGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  try {
    const items = await fetchSomeArticles(100);
    const images = collectImagesFromArticles(items);
    renderGallery(images);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">Gagal memuat galeri.</div></div>`;
  }
}

document.addEventListener("DOMContentLoaded", initGallery);