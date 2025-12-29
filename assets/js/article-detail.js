const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";

const MORE_ARTICLES_LIMIT = 5;

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDateFromUnixSeconds(unixSeconds) {
  if (!unixSeconds) return "";
  const d = new Date(unixSeconds * 1000);
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
}

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(str, maxLen) {
  const s = String(str ?? "").trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).trimEnd() + "…";
}

// Try to extract readable text from flexible JSONB content
function extractTextFromContent(content) {
  let obj = content;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return ""; }
  }
  if (!obj || typeof obj !== "object") return "";
  const blocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const text = b.text || b.content || b.value;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return "";
}

async function fetchArticle(id) {
  const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  const json = await res.json();

  // tolerate both: envelope {data: {...}} and raw object
  return json?.data ?? json;
}

async function fetchArticles({ page = 1, limit = 10 } = {}) {
  const url = new URL(API_BASE + "/articles");
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
  const json = await res.json();
  return json?.data?.items ?? [];
}

function renderMoreArticlesCompact(items) {
  const host = document.getElementById("articleMoreList");
  if (!host) return;

  if (!items.length) {
    host.innerHTML = `<div class="alert alert-light border mb-0 small">Belum ada artikel.</div>`;
    return;
  }

  host.innerHTML = items.map((a) => {
    const title = escapeHTML(a?.title || "Untitled");
    const date = escapeHTML(formatDateFromUnixSeconds(a?.created_at));
    const img = escapeHTML(a?.photo_header || "");
    const excerpt = escapeHTML(truncate(extractTextFromContent(a?.content) || "Baca selengkapnya…", 80));
    const href = `/article?id=${encodeURIComponent(a?.id)}`;

    return `
      <div class="article-compact p-3 mb-3">
        <div class="row g-3 align-items-center">
          <div class="col-4">
            <div class="article-thumb ratio ratio-1x1 bg-body-tertiary">
              ${img ? `<img src="${img}" class="object-fit-cover" alt="${title}" loading="lazy" style="width:100%;height:100%;">` : `<div class="d-flex align-items-center justify-content-center"><i class="bi bi-image text-muted"></i></div>`}
            </div>
          </div>
          <div class="col-8">
            <div class="fw-semibold mb-1 small" style="line-height:1.3;">${title}</div>
            <div class="text-muted" style="font-size:0.75rem;line-height:1.2;">${excerpt}</div>
            <div class="text-muted mt-1" style="font-size:0.7rem;">${date}</div>
            <a href="${href}" class="stretched-link"></a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function initMoreArticles(currentId) {
  const host = document.getElementById("articleMoreList");
  if (!host) return;

  try {
    // Fetch a bit more than we need to safely filter out the current article
    const items = await fetchArticles({ page: 1, limit: 12 });
    const filtered = items.filter((a) => String(a?.id ?? "") !== String(currentId ?? ""));
    renderMoreArticlesCompact(filtered.slice(0, MORE_ARTICLES_LIMIT));
  } catch (e) {
    console.error(e);
    host.innerHTML = `<div class="alert alert-danger mb-0 small">Gagal memuat berita lainnya.</div>`;
  }
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

function renderBlocks(content) {
  const { blocks } = normalizeContent(content);
  if (!blocks.length) return `<p class="text-muted mb-0">Konten belum tersedia.</p>`;

  return blocks.map((b) => {
    if (!b || typeof b !== "object") return "";

    const type = String(b.type || "").toLowerCase();

    // paragraph
    if (type === "paragraph" || b.text) {
      const text = escapeHTML(b.text || "");
      return text ? `<p>${text}</p>` : "";
    }

    // heading
    if (type === "heading") {
      const level = Number(b.level || 2);
      const tag = level >= 1 && level <= 4 ? `h${level}` : "h2";
      const text = escapeHTML(b.text || "");
      return text ? `<${tag} class="mt-4">${text}</${tag}>` : "";
    }

    // image
    if (type === "image") {
      const url = escapeHTML(b.url || "");
      const caption = escapeHTML(b.caption || "");
      if (!url) return "";
      return `
        <figure class="my-4">
          <img src="${url}" class="img-fluid rounded-4 border" alt="${caption || "Gambar"}" loading="lazy">
          ${caption ? `<figcaption class="text-muted small mt-2">${caption}</figcaption>` : ""}
        </figure>
      `;
    }

    // video (simple)
    if (type === "video") {
      const url = escapeHTML(b.url || "");
      if (!url) return "";
      return `
        <div class="ratio ratio-16x9 my-4">
          <video src="${url}" controls class="rounded-4 border"></video>
        </div>
      `;
    }

    // unknown block -> ignore for now
    return "";
  }).join("");
}

async function initArticleDetail() {
  const id = qs("id");
  const root = document.getElementById("articleRoot");
  if (!root) return;

  if (!id) {
    root.innerHTML = `<div class="alert alert-warning">ID artikel tidak ditemukan.</div>`;
    return;
  }

  root.innerHTML = `<div class="text-muted">Memuat…</div>`;

  try {
    const a = await fetchArticle(id);

    const title = escapeHTML(a?.title || "Untitled");
    const author = escapeHTML(a?.author || "");
    const date = escapeHTML(formatDateFromUnixSeconds(a?.created_at));
    const img = escapeHTML(a?.photo_header || "");

    root.innerHTML = `
      <div class="article-detail-wrap">
        <div class="mb-3">
          <a href="/artikel" class="text-decoration-none">
            <i class="bi bi-arrow-left"></i> Kembali ke Artikel
          </a>
        </div>

        <h1 class="h3 fw-bold mb-2">${title}</h1>
        <div class="text-muted mb-4">
          ${date ? `<span>${date}</span>` : ""}
          ${author ? `<span class="mx-2">•</span><span>${author}</span>` : ""}
        </div>

        ${img ? `
          <div class="mb-4">
            <img src="${img}" alt="${title}" class="article-detail-image" loading="lazy">
          </div>
        ` : ""}

        <article class="article-body">
          ${renderBlocks(a?.content)}
        </article>
      </div>
    `;

    initMoreArticles(id);
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="alert alert-danger">Gagal memuat artikel.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", initArticleDetail);