const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";

function showAlert(type, message) {
  const host = document.getElementById("contactAlert");
  if (!host) return;
  host.innerHTML = `
    <div class="alert alert-${type} border-0" role="alert">
      ${message}
    </div>
  `;
}

async function submitContact(payload) {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) return;

  let msg = "Gagal mengirim pesan. Silakan coba lagi.";
  try {
    const j = await res.json();
    if (j?.message) {
      const errMsg = j.message.toLowerCase();
      if (errMsg.includes("email") && errMsg.includes("invalid")) {
        msg = "Format email tidak valid.";
      } else if (errMsg.includes("required")) {
        msg = "Mohon lengkapi email, subjek, dan pesan.";
      } else {
        msg = j.message;
      }
    }
  } catch { /* ignore */ }

  throw new Error(msg);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const btn = document.getElementById("contactSubmit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      email: String(document.getElementById("contact_email")?.value || "").trim(),
      subject: String(document.getElementById("contact_subject")?.value || "").trim(),
      message: String(document.getElementById("contact_message")?.value || "").trim(),
    };

    if (!payload.email || !payload.subject || !payload.message) {
      showAlert("warning", "Mohon lengkapi email, subjek, dan pesan.");
      return;
    }

    btn?.setAttribute("disabled", "disabled");
    const original = btn?.innerHTML;
    if (btn) btn.innerHTML = "Mengirim…";

    try {
      await submitContact(payload);
      showAlert("success", "Pesan berhasil dikirim. Terima kasih.");
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showAlert("danger", String(err?.message || "Terjadi kesalahan."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      if (btn) {
        btn.removeAttribute("disabled");
        btn.innerHTML = original || "Kirim";
      }
    }
  });
});