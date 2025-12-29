/* Public Articles List
 * Renders Bootstrap cards from GET /articles
 * - Date uses created_at (unix seconds)
 * - Excerpt max 160 chars
 */

const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";
const EXCERPT_MAX = 160;

function formatDateFromUnixSeconds(unixSeconds) {
  if (!unixSeconds) return "";
  const d = new Date(unixSeconds * 1000);
  // Indonesian locale, e.g. "20 Desember 2025"
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

  // Sometimes APIs return JSON as string
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return ""; }
  }

  if (!obj || typeof obj !== "object") return "";

  // Common shape: { blocks: [ { type, text }, ... ] }
  const blocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const text = b.text || b.content || b.value; // tolerate variants
    if (typeof text === "string" && text.trim()) return text.trim();
  }

  return "";
}

function makeExcerpt(article) {
  const raw = extractTextFromContent(article?.content);
  return truncate(raw, EXCERPT_MAX);
}

function getQueryInt(name, fallback) {
  const v = new URLSearchParams(window.location.search).get(name);
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getQueryStr(name, fallback = "") {
  const v = new URLSearchParams(window.location.search).get(name);
  return (v ?? fallback).trim();
}

function matchesQuery(article, q) {
  const qq = String(q || "").toLowerCase().trim();
  if (!qq) return true;

  const title = String(article?.title || "").toLowerCase();
  const body = String(extractTextFromContent(article?.content) || "").toLowerCase();

  return title.includes(qq) || body.includes(qq);
}

async function fetchArticles({ page = 1, limit = 9 } = {}) {
  const url = new URL(API_BASE + "/articles");
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);

  const json = await res.json();
  const items = json?.data?.items ?? [];
  const meta = json?.data?.meta ?? { page, limit, total: items.length };
  return { items, meta };
}

function renderArticlesGrid(items) {
  const grid = document.getElementById("articlesGrid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `<div class="col-12"><div class="alert alert-light border mb-0">Belum ada artikel.</div></div>`;
    return;
  }

  grid.innerHTML = items
    .map((a) => {
      const title = escapeHTML(a?.title || "Untitled");
      const date = escapeHTML(formatDateFromUnixSeconds(a?.created_at));
      const author = escapeHTML(a?.author || "");
      const img = escapeHTML(a?.photo_header || "");
      const excerpt = escapeHTML(makeExcerpt(a) || "Baca selengkapnya…");

      // detail page (clean URL): /article?id=123
      const href = `/article?id=${encodeURIComponent(a?.id)}`;

      return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card article-card h-100 shadow-sm border-0">
            <div class="article-image ratio ratio-16x9 bg-body-tertiary">
              ${img ? `<img src="${img}" class="card-img-top object-fit-cover" alt="${title}" loading="lazy">` : ""}
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title mb-2">${title}</h5>
              <div class="small text-muted mb-2">
                ${date ? `<span>${date}</span>` : ""}
                ${author ? `<span class="mx-2">•</span><span>${author}</span>` : ""}
              </div>
              <p class="card-text text-body-secondary">${excerpt}</p>
              <div class="mt-auto">
                <a class="btn btn-success w-100" href="${href}">Selengkapnya</a>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPager(meta) {
  const pager = document.getElementById("articlesPager");
  if (!pager) return;

  const page = Number(meta?.page || 1);
  const limit = Number(meta?.limit || 9);
  const total = Number(meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= totalPages ? "disabled" : "";

  const qs = new URLSearchParams(window.location.search);

  function linkTo(p) {
    const next = new URLSearchParams(qs);
    next.set("page", String(p));
    next.set("limit", String(limit));
    return `?${next.toString()}`;
  }

  pager.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-3">
      <a class="btn btn-outline-secondary ${prevDisabled}" href="${prevDisabled ? "#" : linkTo(page - 1)}">Prev</a>
      <div class="small text-muted">Halaman ${page} / ${totalPages} • Total ${total}</div>
      <a class="btn btn-outline-secondary ${nextDisabled}" href="${nextDisabled ? "#" : linkTo(page + 1)}">Next</a>
    </div>
  `;
}

async function initArticlesPage() {
  const q = getQueryStr("q", "");
  const page = getQueryInt("page", 1);
  const limit = getQueryInt("limit", 9);

  // sync search input value
  const searchInput = document.getElementById("articleSearch");
  if (searchInput) searchInput.value = q;

  const metaEl = document.getElementById("searchMeta");
  const grid = document.getElementById("articlesGrid");
  const pager = document.getElementById("articlesPager");

  if (grid) grid.innerHTML = `<div class="col-12"><div class="text-muted">Memuat artikel…</div></div>`;
  if (metaEl) metaEl.textContent = "";

  try {
    // If searching: fetch more items (simple approach)
    if (q) {
      const { items } = await fetchArticles({ page: 1, limit: 100 });
      const filtered = items.filter((a) => matchesQuery(a, q));

      renderArticlesGrid(filtered);

      if (pager) pager.innerHTML = ""; // hide pager for search mode
      if (metaEl) metaEl.textContent = `Hasil pencarian untuk "${q}": ${filtered.length} artikel (pencarian lokal).`;

      return;
    }

    // Normal paginated mode
    const { items, meta } = await fetchArticles({ page, limit });
    renderArticlesGrid(items);
    renderPager(meta);

  } catch (e) {
    if (grid) grid.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">Gagal memuat artikel.</div></div>`;
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", initArticlesPage);