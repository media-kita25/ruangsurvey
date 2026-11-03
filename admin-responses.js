(async function () {
  var R = window.RS; if (!(await R.requireAdmin("responses"))) return;
  var sb = R.sb, esc = R.esc, LIMIT = 10, page = 1, cache = {};
  var OPT = {
    platform_utama: ["WhatsApp","Instagram","TikTok","Facebook","YouTube","X","Telegram","Threads","Lainnya"],
    durasi_harian: ["Kurang dari 1 jam","1-2 jam","3-4 jam","5-6 jam","Lebih dari 6 jam"],
    tujuan_utama: ["Komunikasi","Hiburan","Pendidikan","Pekerjaan","Bisnis","Mencari Informasi","Mengikuti Berita","Lainnya"],
    frekuensi: ["1-2 kali","3-5 kali","6-10 kali","Lebih dari 10 kali","Hampir setiap saat"],
    bantu_informasi: ["Sangat Membantu","Membantu","Cukup Membantu","Tidak Membantu"],
    ganggu_produktivitas: ["Sangat Mengganggu","Mengganggu","Kadang-kadang","Tidak Mengganggu"],
    pengaruh_kehidupan: ["Sangat Positif","Positif","Netral","Negatif","Sangat Negatif"]
  };
  var LABEL = { platform_utama: "Platform Utama", durasi_harian: "Durasi Harian", tujuan_utama: "Tujuan Utama", frekuensi: "Frekuensi",
    bantu_informasi: "Bantu Informasi", ganggu_produktivitas: "Ganggu Produktivitas", pengaruh_kehidupan: "Pengaruh Kehidupan" };

  var f = '<div class="col-md-6"><label class="form-label">Nama</label><input class="form-control" name="nama" maxlength="100"></div>' +
    '<div class="col-md-3"><label class="form-label">Umur</label><input type="number" min="5" max="120" class="form-control" name="umur" required></div>' +
    '<div class="col-md-3"><label class="form-label">Jenis Kelamin</label><select class="form-select" name="jenis_kelamin" required><option>Laki-laki</option><option>Perempuan</option></select></div>' +
    '<div class="col-md-6"><label class="form-label">Pekerjaan</label><input class="form-control" name="pekerjaan" maxlength="100" required></div>';
  Object.keys(OPT).forEach(function (k) {
    f += '<div class="col-md-6"><label class="form-label">' + LABEL[k] + '</label><select class="form-select" name="' + k + '" required>' +
      OPT[k].map(function (v) { return "<option>" + esc(v) + "</option>"; }).join("") + "</select></div>";
  });
  f += '<div class="col-12"><label class="form-label">Saran</label><textarea class="form-control" name="saran" rows="3" maxlength="2000"></textarea></div>';
  document.getElementById("editFields").innerHTML = f;
  var modal = new bootstrap.Modal(document.getElementById("editModal")), form = document.getElementById("editForm"), editing = null;

  async function load() {
    var from = (page - 1) * LIMIT;
    var r = await sb.from("survey_jawaban").select("*, responden(*)", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + LIMIT - 1);
    if (r.error) { R.notice("#pesan", "danger", "Gagal memuat data: " + r.error.message); return; }
    var total = r.count || 0, pages = Math.max(1, Math.ceil(total / LIMIT));
    document.getElementById("total").textContent = total + " hasil";
    cache = {};
    document.getElementById("rows").innerHTML = r.data.length ? r.data.map(function (x) {
      cache[x.id_jawaban] = x; var o = x.responden || {};
      return "<tr><td>" + esc(o.nama || "-") + "</td><td>" + esc(o.umur) + "</td><td>" + esc(o.jenis_kelamin) + "</td><td>" + esc(o.pekerjaan) + "</td><td>" +
        esc(x.platform_utama) + "</td><td>" + esc(x.durasi_harian) + "</td><td>" + esc(x.pengaruh_kehidupan) + "</td><td>" + R.fmtDate(x.created_at) + "</td>" +
        '<td class="text-end"><button class="btn btn-sm btn-outline-primary" data-edit="' + x.id_jawaban + '" title="Edit"><i class="bi bi-pencil"></i></button> ' +
        '<button class="btn btn-sm btn-outline-danger" data-del="' + x.id_jawaban + '" title="Hapus"><i class="bi bi-trash"></i></button></td></tr>';
    }).join("") : '<tr><td colspan="9" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Belum ada data survey.</td></tr>';
    var p = ""; for (var i = 1; i <= pages; i++) p += '<li class="page-item ' + (i === page ? "active" : "") + '"><a class="page-link" href="#" data-page="' + i + '">' + i + "</a></li>";
    document.getElementById("pager").innerHTML = pages > 1 ? p : "";
  }

  document.addEventListener("click", async function (e) {
    var t = e.target.closest("[data-edit],[data-del],[data-page]"); if (!t) return;
    if (t.dataset.page) { e.preventDefault(); page = +t.dataset.page; load(); return; }
    if (t.dataset.edit) {
      var x = cache[t.dataset.edit]; editing = x; var o = x.responden || {};
      Object.keys(o).concat(Object.keys(x)).forEach(function (k) {
        var el = form.elements[k]; if (!el) return; el.value = (k in o ? o[k] : x[k]) == null ? "" : (k in o ? o[k] : x[k]);
      });
      modal.show();
        } else if (t.dataset.del) {
      if (!confirm("Yakin ingin menghapus data ini?")) return;
      var x2 = cache[t.dataset.del];
      
      // 1. Hapus dulu data jawabannya dari tabel survey_jawaban
      var deleteJawaban = await sb.from("survey_jawaban").delete().eq("id_jawaban", x2.id_jawaban);
      
      if (deleteJawaban.error) {
          return R.notice("#pesan", "danger", "Gagal menghapus jawaban: " + deleteJawaban.error.message);
      }

      // 2. Jika id_responden ada, hapus juga data respondennya
      if (x2.id_responden) {
          await sb.from("responden").delete().eq("id_responden", x2.id_responden);
      }

      R.notice("#pesan", "success", "Data berhasil dihapus."); 
      load();
    }
  });

    form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(form).entries());
    var a = { error: null }; 
    var b = { error: null };

    // 1. Update tabel responden (HANYA jika id_responden ada / tidak null)
    if (editing.id_responden) {
      a = await sb.from("responden").update({ 
          nama: d.nama.trim() || null, 
          umur: parseInt(d.umur, 10), 
          jenis_kelamin: d.jenis_kelamin, 
          pekerjaan: d.pekerjaan.trim() 
      }).eq("id_responden", editing.id_responden);
    }

    // 2. Update tabel survey_jawaban
    b = await sb.from("survey_jawaban").update({ 
        platform_utama: d.platform_utama, 
        durasi_harian: d.durasi_harian, 
        tujuan_utama: d.tujuan_utama, 
        frekuensi: d.frekuensi,
        bantu_informasi: d.bantu_informasi, 
        ganggu_produktivitas: d.ganggu_produktivitas, 
        pengaruh_kehidupan: d.pengaruh_kehidupan, 
        saran: d.saran.trim() || null 
    }).eq("id_jawaban", editing.id_jawaban);

    // Sembunyikan modal
    modal.hide();
    
    // Cek error
    if (a.error || b.error) {
        var err = a.error ? a.error.message : b.error.message;
        return R.notice("#pesan", "danger", "Gagal menyimpan: " + err);
    }
    
    R.notice("#pesan", "success", "Data berhasil diperbarui."); 
    load();
  });
  load();
})();
