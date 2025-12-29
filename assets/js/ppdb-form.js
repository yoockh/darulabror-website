const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";

function showAlert(type, message) {
  const host = document.getElementById("ppdbAlert");
  if (!host) return;
  host.innerHTML = `
    <div class="alert alert-${type} border-0" role="alert">
      ${message}
    </div>
  `;
}

function v(id) {
  const el = document. getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

async function submitRegistration(payload) {
  const res = await fetch(`${API_BASE}/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) return;

  let msg = "Gagal mengirim pendaftaran. Silakan coba lagi.";
  try {
    const j = await res.json();
    if (j?.message) {
      const errMsg = j.message.toLowerCase();
      if (errMsg.includes("nisn") && errMsg.includes("10")) {
        msg = "NISN harus 10 digit angka.";
      } else if (errMsg.includes("email") && errMsg.includes("unique")) {
        msg = "Email sudah terdaftar.  Gunakan email lain.";
      } else if (errMsg.includes("nisn") && errMsg.includes("unique")) {
        msg = "NISN sudah terdaftar.";
      } else if (errMsg. includes("phone")) {
        msg = "Format nomor telepon tidak valid.";
      } else if (errMsg.includes("required")) {
        msg = "Mohon lengkapi semua data yang wajib diisi.";
      } else {
        msg = j.message;
      }
    }
  } catch { /* ignore */ }

  throw new Error(msg);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("ppdbForm");
  const btn = document.getElementById("ppdbSubmit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      student_type: v("student_type"),
      gender: v("gender"),

      email: v("email"),
      full_name: v("full_name"),
      phone: v("phone"),

      place_of_birth:  v("place_of_birth"),
      date_of_birth:  v("date_of_birth"),

      address: v("address"),
      origin_school: v("origin_school"),

      nisn: v("nisn"),

      father_name: v("father_name"),
      father_occupation:  v("father_occupation"),
      phone_father: v("phone_father"),
      date_of_birth_father: v("date_of_birth_father"),

      mother_name: v("mother_name"),
      mother_occupation:  v("mother_occupation"),
      phone_mother: v("phone_mother"),
      date_of_birth_mother: v("date_of_birth_mother"),
    };

    // Basic required check
    const missing = Object.entries(payload).filter(([, val]) => !String(val).trim());
    if (missing.length) {
      showAlert("warning", "Mohon lengkapi semua data yang wajib diisi.");
      return;
    }

    if (!/^\d{10}$/.test(payload.nisn)) {
      showAlert("warning", "NISN harus tepat 10 digit angka.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      showAlert("warning", "Format email tidak valid.");
      return;
    }

    const dates = [
      { field: payload.date_of_birth, label: "siswa" },
      { field:  payload.date_of_birth_father, label: "ayah" },
      { field: payload. date_of_birth_mother, label: "ibu" }
    ];
    for (const { field, label } of dates) {
      if (field && !/^\d{4}-\d{2}-\d{2}$/.test(field)) {
        showAlert("warning", `Format tanggal lahir ${label} tidak valid.  Gunakan format YYYY-MM-DD (contoh: 2007-01-15).`);
        return;
      }
    }

    btn?.setAttribute("disabled", "disabled");
    const original = btn?.innerHTML;
    if (btn) btn.innerHTML = `Mengirim…`;

    try {
      await submitRegistration(payload);
      showAlert("success", "Pendaftaran berhasil dikirim. Tim kami akan menghubungi Anda.");
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = String(err?.message || "Terjadi kesalahan.");
      showAlert("danger", msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      if (btn) {
        btn.removeAttribute("disabled");
        btn.innerHTML = original || `Kirim Pendaftaran`;
      }
    }
  });
});