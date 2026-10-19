/* Fungsi bersama untuk semua halaman. Memakai UMD supabase-js (tanpa module)
   supaya juga jalan saat file dibuka langsung dari folder. */
(function () {
  var CFG = window.RS_CONFIG || {};
  var configured = CFG.SUPABASE_URL && CFG.SUPABASE_URL.indexOf("GANTI") === -1 &&
                   CFG.SUPABASE_ANON_KEY && CFG.SUPABASE_ANON_KEY.indexOf("GANTI") === -1;
  var sb = configured ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

  var MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return MAP[c]; }); }

  function fmtDate(d, withTime) {
    var o = new Date(d);
    return withTime ? o.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : o.toLocaleDateString("id-ID");
  }

  function pubUrl(bucket, name) { return sb.storage.from(bucket).getPublicUrl(name).data.publicUrl; }

  function notice(el, type, msg) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return;
    el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show">' + esc(msg) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
  }

  function randomName(file) {
    var ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    var id = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, "").slice(0, 12);
    return Date.now() + "_" + id + "." + ext;
  }

  function checkConfig() {
    if (configured) return true;
    var b = document.createElement("div");
    b.className = "alert alert-warning m-3";
    b.style.cssText = "position:relative;z-index:2000";
    b.innerHTML = "<strong>Supabase belum dikonfigurasi.</strong> Isi <code>assets/js/config.js</code> dengan Project URL dan anon key Anda.";
    document.body.prepend(b);
    return false;
  }

  /* ---------- ADMIN ---------- */
  var MENU = [
    ["dashboard", "speedometer2", "Dashboard"], 
    ["pendaftar", "people", "Data Pendaftar"], // <-- TAMBAHKAN BARIS INI
    ["responses", "table", "Respons"],
    ["kontak", "envelope", "Pesan Masuk"], 
    ["galeri", "images", "Galeri"],
    ["panduan", "folder2-open", "Kelola Artikel"]
  ];

  async function requireAdmin(active) {
    document.body.classList.add("admin-hidden");
    if (!checkConfig()) { document.body.classList.remove("admin-hidden"); return null; }
    var r = await sb.auth.getSession();
    if (!r.data.session) { location.replace("../login.html"); return null; }
    var html = '<div class="fw-bold fs-5 mb-4 d-flex align-items-center"><img class="brand-img" src="../assets/foto/logo.png" alt="RS">Admin</div><nav class="nav flex-lg-column">';
    MENU.forEach(function (m) {
      html += '<a class="nav-link' + (m[0] === active ? " active" : "") + '" href="' + m[0] + '.html"><i class="bi bi-' + m[1] + ' me-2"></i>' + m[2] + "</a>";
    });
    html += '<a class="nav-link text-danger" href="#" id="btnLogout"><i class="bi bi-box-arrow-left me-2"></i>Keluar</a></nav>';
    document.getElementById("sidebar").innerHTML = html;
    document.getElementById("btnLogout").addEventListener("click", async function (e) {
      e.preventDefault(); await sb.auth.signOut(); location.replace("../login.html");
    });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("../login.html"); });
    document.body.classList.remove("admin-hidden");
    return r.data.session;
  }

  window.RS = { sb: sb, esc: esc, fmtDate: fmtDate, pubUrl: pubUrl, notice: notice,
                randomName: randomName, checkConfig: checkConfig, requireAdmin: requireAdmin };
})();
