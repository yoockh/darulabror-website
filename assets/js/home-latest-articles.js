const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";
const EXCERPT_MAX = 160;

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

function stripHTML(html) {
  const s = String(html ?? "");
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTextFromContent(content) {
  let obj = content;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return ""; }
  }
  if (!obj || typeof obj !== "object") return "";
  const blocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const directText = b.text || b.content || b.value;
    if (typeof directText === "string" && directText.trim()) return directText.trim();

    const dataText = b?.data?.text;
    if (typeof dataText === "string" && stripHTML(dataText)) return stripHTML(dataText);

    const items = b?.data?.items;
    if (Array.isArray(items)) {
      const firstItem = items.map((x) => stripHTML(x)).find(Boolean);
      if (firstItem) return firstItem;
    }
  }
  return "";
}

async function fetchLatestArticles(limit = 3) {
  const url = new URL(API_BASE + "/articles");
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch latest articles: ${res.status}`);

  const json = await res.json();
  return json?.data?.items ?? [];
}

function renderLatestCompact(items) {
  const grid = document.getElementById("homeLatestArticlesCompact");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `<div class="alert alert-light border mb-0 small">Belum ada artikel.</div>`;
    return;
  }

  grid.innerHTML = items.map((a) => {
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

async function initHomeLatestArticles() {
  const grid = document.getElementById("homeLatestArticlesCompact");
  if (!grid) return; // not on home

  try {
    const items = await fetchLatestArticles(6);
    renderLatestCompact(items);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="alert alert-danger mb-0 small">Gagal memuat artikel terbaru.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", initHomeLatestArticles);