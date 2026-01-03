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

function stripHTML(html) {
  const s = String(html ?? "");
  // For excerpts/search, keep it simple and safe.
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeInlineHTML(html) {
  // Minimal sanitizer: allow a small set of inline tags, drop attributes.
  // This is intentionally conservative for a public site.
  const raw = String(html ?? "");
  if (!raw.trim()) return "";

  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "BR", "CODE", "A"]);
  const tpl = document.createElement("template");
  tpl.innerHTML = raw;

  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];

  while (walker.nextNode()) {
    const el = /** @type {HTMLElement} */ (walker.currentNode);
    if (!allowed.has(el.tagName)) {
      // replace element with its text content
      const text = document.createTextNode(el.textContent || "");
      el.replaceWith(text);
      continue;
    }

    // Strip all attributes except safe href on <a>
    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }

    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      const safe = /^https?:\/\//i.test(href) && !/^javascript:/i.test(href);
      if (!safe) {
        // convert to plain text
        const text = document.createTextNode(el.textContent || "");
        toRemove.push([el, text]);
      } else {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  for (const [el, replacement] of toRemove) el.replaceWith(replacement);
  return tpl.innerHTML;
}

function isPublicHttpUrl(url) {
  const u = String(url ?? "").trim();
  return /^https?:\/\//i.test(u);
}

function isBlobOrDataUrl(url) {
  const u = String(url ?? "").trim().toLowerCase();
  return u.startsWith("blob:") || u.startsWith("data:");
}

function isSafeEmbedUrl(url) {
  const u = String(url ?? "").trim();
  if (!isPublicHttpUrl(u)) return false;

  // Allowlist common embed hosts.
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    if (host === "www.youtube.com" || host === "youtube.com") {
      return parsed.pathname.startsWith("/embed/");
    }
    if (host === "www.youtube-nocookie.com" || host === "youtube-nocookie.com") {
      return parsed.pathname.startsWith("/embed/");
    }
    if (host === "player.vimeo.com") {
      return parsed.pathname.startsWith("/video/");
    }
    return false;
  } catch {
    return false;
  }
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

    // paragraph (EditorJS: {type:"paragraph", data:{text:"<b>..</b>"}})
    if (type === "paragraph" || b.text || b?.data?.text) {
      const raw = typeof b.text === "string" ? b.text : (typeof b?.data?.text === "string" ? b.data.text : "");
      const safe = sanitizeInlineHTML(raw);
      return safe ? `<p>${safe}</p>` : "";
    }

    // heading (custom) / header (EditorJS)
    if (type === "heading" || type === "header") {
      const level = Number(b.level || b?.data?.level || 2);
      const tag = level >= 1 && level <= 4 ? `h${level}` : "h2";
      const raw = typeof b.text === "string" ? b.text : (typeof b?.data?.text === "string" ? b.data.text : "");
      const text = escapeHTML(stripHTML(raw));
      return text ? `<${tag} class="mt-4">${text}</${tag}>` : "";
    }

    // image
    if (type === "image") {
      const rawUrl = b.url || b.src || b?.data?.file?.url || b?.data?.url;
      if (!isPublicHttpUrl(rawUrl)) {
        // EditorJS in admin can produce blob: URLs for local preview.
        // Those cannot be rendered on a different origin (public website).
        if (rawUrl && isBlobOrDataUrl(rawUrl)) {
          const fileName = escapeHTML(String(b?.data?.file?.name || ""));
          const fileKey = escapeHTML(String(b?.data?.file?.fileKey || ""));
          return `
            <div class="alert alert-warning border my-4">
              <div class="fw-semibold">Gambar belum tampil di website</div>
              <div class="small">URL gambar masih lokal (blob) sehingga tidak bisa diakses publik.</div>
              ${fileName ? `<div class="small text-muted mt-1">File: ${fileName}</div>` : ""}
              ${fileKey ? `<div class="small text-muted">Key: ${fileKey}</div>` : ""}
            </div>
          `;
        }

        return "";
      }

      const url = escapeHTML(rawUrl);
      const captionRaw = b.caption || b?.data?.caption || "";
      const caption = escapeHTML(stripHTML(captionRaw));
      if (!url) return "";
      return `
        <figure class="my-4">
          <img src="${url}" class="img-fluid rounded-4 border" alt="${caption || "Gambar"}" loading="lazy">
          ${caption ? `<figcaption class="text-muted small mt-2">${caption}</figcaption>` : ""}
        </figure>
      `;
    }

    // embed (EditorJS) - used for YouTube/Vimeo
    if (type === "embed") {
      const rawUrl = b?.data?.embed || b?.data?.source || b?.data?.url;
      if (!isSafeEmbedUrl(rawUrl)) return "";
      const url = escapeHTML(rawUrl);

      const captionRaw = b?.data?.caption || "";
      const caption = escapeHTML(stripHTML(captionRaw));

      return `
        <div class="my-4">
          <div class="ratio ratio-16x9">
            <iframe
              src="${url}"
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              loading="lazy"
              class="rounded-4 border"
            ></iframe>
          </div>
          ${caption ? `<div class="text-muted small mt-2">${caption}</div>` : ""}
        </div>
      `;
    }

    // list (EditorJS)
    if (type === "list") {
      const style = String(b?.data?.style || "unordered").toLowerCase();
      const items = Array.isArray(b?.data?.items) ? b.data.items : [];
      if (!items.length) return "";
      const tag = style === "ordered" ? "ol" : "ul";
      const li = items.map((x) => `<li>${escapeHTML(stripHTML(x))}</li>`).join("");
      return `<${tag} class="my-3">${li}</${tag}>`;
    }

    // quote (EditorJS)
    if (type === "quote") {
      const raw = typeof b?.data?.text === "string" ? b.data.text : "";
      const safe = sanitizeInlineHTML(raw);
      if (!safe) return "";
      const caption = escapeHTML(stripHTML(b?.data?.caption || ""));
      return `
        <figure class="my-4">
          <blockquote class="blockquote mb-1">${safe}</blockquote>
          ${caption ? `<figcaption class="blockquote-footer mb-0">${caption}</figcaption>` : ""}
        </figure>
      `;
    }

    // delimiter (EditorJS)
    if (type === "delimiter") {
      return `<hr class="my-4" style="opacity:.15;">`;
    }

    // video (legacy)
    if (type === "video") {
      const rawUrl = b.url || b?.data?.url;
      if (!isPublicHttpUrl(rawUrl)) return "";
      const url = escapeHTML(rawUrl);
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