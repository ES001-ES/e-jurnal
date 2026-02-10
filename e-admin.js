// e-admin.js
(function () {
    const admin = EJStore.currentCompanyAdmin();
    if (!admin) { location.href = "admin/login/"; return; }
  
    document.getElementById("adminName").textContent = admin.name;
  
    document.getElementById("logoutBtn").onclick = () => {
      EJStore.companyLogout();
      EJ.toast("Çıxış edildi.", "ok");
      location.href = "admin/login/";
    };
    document.getElementById("resetBtn").onclick = () => {
      EJStore.seedReset();
      EJ.toast("Demo sıfırlandı.", "ok");
      location.reload();
    };
  
    const page = document.getElementById("page");
  
    function header(title, subtitle, actionsHTML = "") {
      return `
        <div class="topbar">
          <div class="title">
            <h2>${EJ.escape(title)}</h2>
            <p>${EJ.escape(subtitle)}</p>
          </div>
          <div class="topActions">${actionsHTML}</div>
        </div>
      `;
    }
  
    function render() {
      const hash = location.hash || "#/dashboard";
  
      document.getElementById("navDash").classList.toggle("active", hash === "#/dashboard");
      document.getElementById("navCourses").classList.toggle("active", hash === "#/courses");
      document.getElementById("navMsg").classList.toggle("active", hash === "#/messages");
      document.getElementById("navPay").classList.toggle("active", hash === "#/payments");
  
      if (hash === "#/courses") return renderCourses();
      if (hash === "#/messages") return renderMessages();
      if (hash === "#/payments") return renderPayments();
      return renderDashboard();
    }
  
    window.addEventListener("hashchange", render);
  
    // ---------------- Dashboard ----------------
  
    function renderDashboard() {
      const db = EJStore.load();
      const s = computeCompanyStats(db);
  
      const top = s.topCourses || [];
      const maxV = s.topCoursesMax || 1;
  
      const topHtml = top.length
        ? top.map((x, i) => {
          const badgeCls = x.status === "active" ? "ok" : "danger";
          const badgeTxt = x.status === "active" ? "Aktiv" : "Dondurulub";
          const w = Math.round((x.students / maxV) * 100);
  
          return `
            <div class="rankItem">
              <div class="rankLeft">
                <div class="rankNo">${i + 1}</div>
                <div class="rankMeta">
                  <div class="rankTitle">${EJ.escape(x.name)}</div>
                  <div class="rankSub">
                    <span class="badge ${badgeCls}">${badgeTxt}</span>
                    <span class="badge">ID: ${EJ.escape(x.id)}</span>
                  </div>
                  <div class="rankBar"><div class="rankFill" style="width:${w}%"></div></div>
                </div>
              </div>
              <div class="rankRight">
                <div class="rankNum">${x.students}</div>
                <div class="rankLbl">tələbə</div>
              </div>
            </div>
          `;
        }).join("")
        : `<div style="color:var(--sub);font-size:13px">Hələ tələbə əlavə edilməyib.</div>`;
  
      page.innerHTML = `
        ${header("Dashboard", "Ümumi sistem göstəriciləri")}
  
        <div class="row">
          <div class="kpi col">
            <div class="k">Xidmət etdiyiniz kurslar</div>
            <div class="v">${s.coursesTotal}</div>
            <div class="d">Aktiv: ${s.coursesActive} • Dondurulan: ${s.coursesSuspended}</div>
          </div>
  
          <div class="kpi col">
            <div class="k">Ümumi tələbə sayı</div>
            <div class="v">${s.studentsTotal}</div>
            <div class="d">Bütün kursların tələbələri (cəmi)</div>
          </div>
  
          <div class="kpi col">
            <div class="k">Ümumi müəllim sayı</div>
            <div class="v">${s.teachersTotal}</div>
            <div class="d">Bütün kursların müəllimləri (cəmi)</div>
          </div>
        </div>
  
        <div class="card p20 col">
          <div style="font-weight:900">Kurs statusları</div>
  
          <div class="mt12" style="display:grid; gap:10px">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--sub)">
                <span>Aktiv</span>
                <span><b style="color:var(--text)">${s.coursesActive}</b> (${s.activePct}%)</span>
              </div>
              <div style="height:10px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:6px">
                <div style="height:100%; width:${s.activePct}%; background:rgba(34,197,94,.85)"></div>
              </div>
            </div>
  
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--sub)">
                <span>Dondurulmuş</span>
                <span><b style="color:var(--text)">${s.coursesSuspended}</b> (${s.suspendedPct}%)</span>
              </div>
              <div style="height:10px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:6px">
                <div style="height:100%; width:${s.suspendedPct}%; background:rgba(244,63,94,.85)"></div>
              </div>
            </div>
          </div>
  
          <div class="mt16">
            <a class="btn" href="#/courses">Kursları idarə et</a>
          </div>
        </div>
  
        <div class="row mt16">
          <div class="card p20 col">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div>
                <div style="font-weight:900">TOP 3 kurs</div>
                <div style="color:var(--sub);font-size:13px">Ən çox tələbəsi olan kurslar</div>
              </div>
              <span class="badge">Live</span>
            </div>
  
            <div class="rankList mt12">
              ${topHtml}
            </div>
          </div>
        </div>
  
        <div class="row mt16">
          <div class="card p20 col" style="min-width:280px">
            <div style="font-weight:900">Lead / Əlaqə</div>
            <div class="mt12" style="color:var(--sub);line-height:1.7">
              <div><b>Ümumi mesaj:</b> ${s.messagesTotal}</div>
              <div><b>Son mesaj tarixi:</b> ${fmtDate(s.lastMessageAt)}</div>
            </div>
            <div class="mt16">
              <a class="btn solid" href="#/messages">Mesajlara bax</a>
              <a class="btn" href="#/courses">Kurslara bax</a>
            </div>
          </div>
  
          <div class="card p20 col">
            <div style="font-weight:900">Status xülasə</div>
            <div class="mt12" style="color:var(--sub);font-size:13px;line-height:1.7">
              Dashboard göstəriciləri localStorage-dan real vaxt yenilənir:
              Kurs əlavə etdikcə / tələbə yaratdıqca rəqəmlər avtomatik dəyişəcək.
            </div>
            <div class="mt16 smallNote">
              İpucu: “Kurslar” bölməsində status dəyişəndə Dashboard-u yenilə (və ya menüyə kliklə) — KPI-lar dərhal yenilənəcək.
            </div>
          </div>
        </div>
      `;
    }
  
    function computeCompanyStats(db) {
      const stats = {
        coursesTotal: db.courses.length,
        coursesActive: 0,
        coursesSuspended: 0,
  
        teachersTotal: 0,
        studentsTotal: 0,
  
        messagesTotal: 0,
        lastMessageAt: null,
  
        topCourses: [],
        topCoursesMax: 1,
  
        activePct: 0,
        suspendedPct: 0
      };
  
      for (const c of db.courses) {
        if (c.status === "active") stats.coursesActive++;
        else if (c.status === "suspended") stats.coursesSuspended++;
  
        const cdb = db.courseData?.[c.id];
        if (!cdb) continue;
  
        const users = cdb.users || [];
        stats.teachersTotal += users.filter(u => u.role === "teacher").length;
        stats.studentsTotal += users.filter(u => u.role === "student").length;
  
        const msgs = cdb.contacts || [];
        stats.messagesTotal += msgs.length;
  
        for (const m of msgs) {
          if (!m.createdAt) continue;
          if (!stats.lastMessageAt || String(m.createdAt) > String(stats.lastMessageAt)) {
            stats.lastMessageAt = m.createdAt;
          }
        }
      }
  
      const total = stats.coursesTotal || 1;
      stats.activePct = Math.round((stats.coursesActive / total) * 100);
      stats.suspendedPct = Math.round((stats.coursesSuspended / total) * 100);
  
      // TOP 3 kurs (tələbə sayına görə)
      const courseRows = db.courses.map(c => {
        const cdb = db.courseData?.[c.id];
        const students = (cdb?.users || []).filter(u => u.role === "student").length;
        return { id: c.id, name: c.name, status: c.status, students };
      });
      courseRows.sort((a, b) => b.students - a.students);
      stats.topCourses = courseRows.slice(0, 3);
      stats.topCoursesMax = Math.max(1, ...stats.topCourses.map(x => x.students));
  
      return stats;
    }
  
    function fmtDate(iso) {
      if (!iso) return "—";
      try {
        const d = new Date(iso);
        return d.toLocaleString();
      } catch { return iso; }
    }
  
    // ---------------- Courses (Add/Edit) ----------------
  
    
    function renderCourses() {
      const db = EJStore.load();

      page.innerHTML = `
        ${header(
          "Kurslar",
          "Satdığınız kurs panellərinin statusuna nəzarət",
          `<button class="btn solid" id="addCourseBtn">+ Yeni kurs əlavə et</button>`
        )}

        <div class="card p20">
          <table class="table">
            <thead>
              <tr>
                <th>Kurs</th>
                <th>ID</th>
                <th>Status</th>
                <th>Əlaqə</th>
                <th>Kurs admin girişi</th>
                <th>Statistika</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>

            <tbody>
              ${db.courses.map(c => {
                const stBadge = c.status === "active" ? "ok" : "danger";
                const stLabel = c.status === "active" ? "Aktiv" : "Dondurulub";

                const cdb = db.courseData?.[c.id];
                const users = cdb?.users || [];
                const tCount = users.filter(u => u.role === "teacher").length;
                const sCount = users.filter(u => u.role === "student").length;

                const actDisabled = c.status === "active" ? "disabled" : "";
                const susDisabled = c.status === "suspended" ? "disabled" : "";

                const phone1 = c.contact?.phone1 || "—";
                const phone2 = c.contact?.phone2 || "";
                const address = c.contact?.address || "—";

                return `
                  <tr>
                    <td style="font-weight:900">${EJ.escape(c.name)}</td>
                    <td><span class="badge">${EJ.escape(c.id)}</span></td>
                    <td><span class="badge ${stBadge}">${stLabel}</span></td>
                    <td style="color:var(--sub); min-width:190px">
                      <div>${EJ.escape(phone1)}${phone2 ? ` • ${EJ.escape(phone2)}` : ""}</div>
                      <div class="small">${EJ.escape(address)}</div>
                    </td>
                    <td>
                      <div class="badge">ID: ${EJ.escape(c.courseAdmin.id)}</div>
                      <div class="badge">Şifrə: ${EJ.escape(c.courseAdmin.password)}</div>
                    </td>
                    <td style="color:var(--sub)">
                      Müəllim: <b style="color:var(--text)">${tCount}</b> •
                      Tələbə: <b style="color:var(--text)">${sCount}</b>
                    </td>
                    <td style="display:flex;gap:8px;flex-wrap:wrap">
                      <button class="btn" data-edit="${EJ.escape(c.id)}">Düzəliş et</button>
                      <button class="btn solid" ${actDisabled} data-act="${EJ.escape(c.id)}">Aktivləşdir</button>
                      <button class="btn danger" ${susDisabled} data-sus="${EJ.escape(c.id)}">Dondur</button>
                      <button class="btn danger" data-del="${EJ.escape(c.id)}">Kursu sil</button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>

          <div class="mt16 smallNote">
            Qeyd: Kurs “Dondur” olarsa, müəllim və tələbə panelində sistem bloklanır, data isə qalır.
            “Kursu sil” seçilsə, həmin kursun bütün məlumatları (istifadəçi ID-ləri daxil) silinir.
          </div>
        </div>

        <!-- Modal (Add / Edit) -->
        <div class="modal" id="courseModal" style="display:none">
          <div class="modalBackdrop" data-close="1"></div>
          <div class="modalCard card p20" style="width:min(720px,100%); position:relative; z-index:2">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div>
                <div style="font-weight:900" id="mTitle">Yeni kurs əlavə et</div>
                <div style="color:var(--sub);font-size:13px" id="mSub">Kurs ID sistem tərəfindən random veriləcək.</div>
              </div>
              <button class="btn" data-close="1">Bağla</button>
            </div>

            <div class="mt16" style="display:grid;gap:10px">
              <label class="small">Kurs adı</label>
              <input class="input" id="mCourseName" placeholder="Məs: Code Academy" />

              <label class="small">Kurs ünvanı</label>
              <input class="input" id="mAddress" placeholder="Məs: Bakı, Nizami küç. 10" />

              <div style="display:grid;grid-template-columns:1fr 1fr; gap:10px">
                <div>
                  <label class="small">Əlaqə nömrəsi</label>
                  <input class="input" id="mPhone1" placeholder="+994..." />
                </div>
                <div>
                  <label class="small">Əlavə əlaqə nömrəsi (istəyə bağlı)</label>
                  <input class="input" id="mPhone2" placeholder="+994..." />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr; gap:10px">
                <div>
                  <label class="small">Kurs admin ID</label>
                  <input class="input" id="mAdminId" disabled />
                  <div class="smallNote">ID avtomatik: kurs ID ilə eyni (A-xxxxx).</div>
                </div>
                <div>
                  <label class="small">Kurs admin şifrə (istəyə bağlı)</label>
                  <input class="input" id="mAdminPass" placeholder="Boş qalsa sistem random verəcək." />
                </div>
              </div>

              <label class="small">Qeyd (istəyə bağlı)</label>
              <input class="input" id="mNote" placeholder="Məs: 6 aylıq müqavilə" />

              <div class="mt12" style="display:flex;gap:10px;justify-content:flex-end">
                <button class="btn" data-close="1">Ləğv et</button>
                <button class="btn solid" id="mSaveBtn">Yadda saxla</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete confirm -->
        <div class="modal" id="delModal" style="display:none">
          <div class="modalBackdrop" data-delclose="1"></div>
          <div class="modalCard card p20" style="width:min(560px,100%); position:relative; z-index:2">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div style="font-weight:900">Kursu silmək</div>
              <button class="btn" data-delclose="1">Bağla</button>
            </div>

            <div class="mt12" style="color:var(--sub);line-height:1.55">
              <div id="delText">
                Bu kursu silsəniz, bütün məlumatları (istifadəçi ID-ləri daxil) silinəcək.
              </div>
            </div>

            <div class="mt16" style="display:flex;gap:10px;justify-content:flex-end">
              <button class="btn" id="delNoBtn">Yox</button>
              <button class="btn danger" id="delYesBtn">Hə</button>
            </div>
          </div>
        </div>
      `;

      // handlers
      const modal = document.getElementById("courseModal");
      const mTitle = document.getElementById("mTitle");
      const mSub = document.getElementById("mSub");
      const mName = document.getElementById("mCourseName");
      const mAddress = document.getElementById("mAddress");
      const mPhone1 = document.getElementById("mPhone1");
      const mPhone2 = document.getElementById("mPhone2");
      const mAdminId = document.getElementById("mAdminId");
      const mPass = document.getElementById("mAdminPass");
      const mNote = document.getElementById("mNote");
      const mSave = document.getElementById("mSaveBtn");

      const delModal = document.getElementById("delModal");
      const delText = document.getElementById("delText");
      const delYes = document.getElementById("delYesBtn");
      const delNo = document.getElementById("delNoBtn");

      let editingCourseId = null;
      let deletingCourseId = null;

      function openModalAdd() {
        editingCourseId = null;
        mTitle.textContent = "Yeni kurs əlavə et";
        mSub.textContent = "Kurs ID sistem tərəfindən random veriləcək (A-20321 kimi).";
        mName.value = "";
        mAddress.value = "";
        mPhone1.value = "";
        mPhone2.value = "";
        mAdminId.value = "A-xxxxx (avtomatik)";
        mPass.value = "";
        mNote.value = "";
        modal.style.display = "block";
        setTimeout(() => mName.focus(), 10);
      }

      function openModalEdit(course) {
        editingCourseId = course.id;
        mTitle.textContent = "Kurs məlumatlarını düzəliş et";
        mSub.textContent = `Kurs ID dəyişmir: ${course.id}`;
        mName.value = course.name || "";
        mAddress.value = course.contact?.address || "";
        mPhone1.value = course.contact?.phone1 || "";
        mPhone2.value = course.contact?.phone2 || "";
        mAdminId.value = course.id;
        mPass.value = course.courseAdmin?.password || "";
        mNote.value = course.note || "";
        modal.style.display = "block";
        setTimeout(() => mName.focus(), 10);
      }

      function closeModal() { modal.style.display = "none"; }
      modal.querySelectorAll("[data-close]").forEach(x => x.onclick = closeModal);

      function openDelete(course){
        deletingCourseId = course.id;
        delText.textContent = `“${course.name}” kursunu silsəniz, bütün məlumatları (istifadəçi ID-ləri daxil) silinəcək.`;
        delModal.style.display = "block";
      }
      function closeDelete(){
        delModal.style.display = "none";
        deletingCourseId = null;
      }
      delModal.querySelectorAll("[data-delclose]").forEach(x => x.onclick = closeDelete);
      delNo.onclick = closeDelete;

      delYes.onclick = () => {
        if(!deletingCourseId) return closeDelete();
        const res = EJStore.deleteCourse(deletingCourseId);
        if(res?.ok) EJ.toast("Kurs silindi.", "ok");
        else EJ.toast("Kurs tapılmadı.", "danger");
        closeDelete();
        renderCourses();
      };

      document.getElementById("addCourseBtn").onclick = openModalAdd;

      // Edit
      page.querySelectorAll("[data-edit]").forEach(b => {
        b.onclick = () => {
          const id = b.getAttribute("data-edit");
          const c = EJStore.load().courses.find(x => x.id === id);
          if (!c) return EJ.toast("Kurs tapılmadı.", "danger");
          openModalEdit(c);
        };
      });

      // Activate / Suspend
      page.querySelectorAll("[data-act]").forEach(b => {
        b.onclick = () => {
          EJStore.setCourseStatus(b.getAttribute("data-act"), "active");
          EJ.toast("Kurs aktivləşdirildi.", "ok");
          renderCourses();
        };
      });
      page.querySelectorAll("[data-sus]").forEach(b => {
        b.onclick = () => {
          EJStore.setCourseStatus(b.getAttribute("data-sus"), "suspended");
          EJ.toast("Kurs donduruldu.", "ok");
          renderCourses();
        };
      });

      // Delete
      page.querySelectorAll("[data-del]").forEach(b => {
        b.onclick = () => {
          const id = b.getAttribute("data-del");
          const c = EJStore.load().courses.find(x => x.id === id);
          if(!c) return EJ.toast("Kurs tapılmadı.", "danger");
          openDelete(c);
        };
      });

      // Save (Add/Edit)
      mSave.onclick = () => {
        const name = mName.value.trim();
        const address = mAddress.value.trim();
        const phone1 = mPhone1.value.trim();
        const phone2 = mPhone2.value.trim();
        const adminPassword = mPass.value.trim();
        const note = mNote.value.trim();

        if (!name) return EJ.toast("Kurs adını yazın.", "danger");
        if (!address) return EJ.toast("Kurs ünvanını yazın.", "danger");
        if (!phone1) return EJ.toast("Əlaqə nömrəsini yazın.", "danger");

        if (editingCourseId) {
          const res = EJStore.updateCourse(editingCourseId, {
            name, note, address, phone1, phone2,
            adminPassword
          });
          if (!res?.ok) return EJ.toast(res?.error || "Xəta baş verdi.", "danger");
          EJ.toast("Kurs məlumatları yeniləndi.", "ok");
        } else {
          const res = EJStore.addCourse({ name, note, address, phone1, phone2, adminPassword });
          if (!res?.ok) return EJ.toast(res?.error || "Xəta baş verdi.", "danger");
          EJ.toast(`Yeni kurs yaradıldı: ${res.course.id}`, "ok");
        }

        closeModal();
        renderCourses();
      };
    }



    // ---------------- Payments ----------------

    function renderPayments(){
      const db = EJStore.load();
      const courses = (db.courses||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
      const selected = (new URLSearchParams(location.search)).get("course") || (courses[0]?.id || "");
      const overall = EJStore.listPayments().payments || [];
      const byCourse = selected ? (EJStore.listPayments(selected).payments || []) : [];

      const courseOptions = courses.map(c=>`<option value="${EJ.escape(c.id)}" ${c.id===selected?"selected":""}>${EJ.escape(c.name)} • ${EJ.escape(c.id)}</option>`).join("");

      page.innerHTML = `
        ${header("Ödənişlər", "Kursların ödəniş tarixçəsi və müqavilə müddəti", `
          <button class="btn" id="btnPrintAll">Çap et</button>
          <button class="btn" id="btnPdfAll">PDF endir</button>
        `)}

        <div class="card p20">
          <div style="display:flex; gap:12px; align-items:end; flex-wrap:wrap;">
            <div class="field" style="min-width:260px; flex:1;">
              <label>Kurs seç</label>
              <select id="payCourseSelect">${courseOptions}</select>
            </div>
            <div class="field">
              <label>Ödəniş tarixi</label>
              <input type="date" id="payPaidAt"/>
            </div>
            <div class="field">
              <label>Xidmətin bitmə tarixi</label>
              <input type="date" id="payServiceEnd"/>
            </div>
            <div>
              <button class="btn ok" id="paySaveBtn">Yadda saxla</button>
            </div>
          </div>

          <div class="small mt12" style="opacity:.85">
            Qeyd: Bu məlumat kurs admin panelində avtomatik görünəcək (müqavilə bitmə tarixi və ödəniş statusu).
          </div>
        </div>

        <div class="row mt16">
          <div class="card p20 col">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
              <div>
                <div style="font-weight:900">Seçilmiş kurs • Ödəniş tarixçəsi</div>
                <div class="small">Kurs admin panelində də əks olunur</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn" id="btnPrintCourse">Çap et</button>
                <button class="btn" id="btnPdfCourse">PDF endir</button>
              </div>
            </div>

            <div class="mt12" id="coursePayArea">
              ${renderPaymentsTable(byCourse, true, selected)}
            </div>
          </div>

          <div class="card p20 col">
            <div style="font-weight:900">Ümumi ödəniş tarixçəsi</div>
            <div class="small">Bütün kursların ödənişləri</div>
            <div class="mt12" id="allPayArea">
              ${renderPaymentsTable(overall, false)}
            </div>
          </div>
        </div>

        <!-- Payment delete confirm -->
        <div class="modal" id="payDelModal" style="display:none">
          <div class="modalBackdrop" data-paydelclose="1"></div>
          <div class="modalCard card p20" style="width:min(560px,100%); position:relative; z-index:2">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div style="font-weight:900">Ödənişi silmək</div>
              <button class="btn" data-paydelclose="1">Bağla</button>
            </div>

            <div class="mt12" style="color:var(--sub);line-height:1.55">
              <div id="payDelText">
                Bu ödəniş qeydini silsəniz, kursun ödəniş tarixçəsindən çıxarılacaq.
              </div>
            </div>

            <div class="mt16" style="display:flex;gap:10px;justify-content:flex-end">
              <button class="btn" id="payDelNoBtn">Yox</button>
              <button class="btn danger" id="payDelYesBtn">Hə</button>
            </div>
          </div>
        </div>
      `;

      // default dates: today and +6 months
      const today = new Date();
      const isoDate = d => {
        const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
        return z.toISOString().slice(0,10);
      };
      const paidInput = document.getElementById("payPaidAt");
      const endInput  = document.getElementById("payServiceEnd");
      paidInput.value = isoDate(today);
      const d6 = new Date(today); d6.setMonth(d6.getMonth()+6);
      endInput.value = isoDate(d6);

      document.getElementById("payCourseSelect").onchange = (e)=>{
        const id = e.target.value;
        // store in querystring for persistence
        const u = new URL(location.href);
        u.searchParams.set("course", id);
        history.replaceState(null,"",u.toString());
        render();
      };

      document.getElementById("paySaveBtn").onclick = ()=>{
        const cid = document.getElementById("payCourseSelect").value;
        const paidAt = document.getElementById("payPaidAt").value;
        const serviceEnd = document.getElementById("payServiceEnd").value;
        const res = EJStore.addPayment(cid, {
          paidAt: paidAt ? new Date(paidAt+"T00:00:00").toISOString() : "",
          serviceEnd: serviceEnd ? new Date(serviceEnd+"T00:00:00").toISOString() : ""
        });
        if(!res.ok){ EJ.toast(res.error||"Xəta", "danger"); return; }
        EJ.toast("Ödəniş qeyd olundu.", "ok");
        render();
      };

      // delete payment handlers
      const payDelModal = document.getElementById("payDelModal");
      const payDelText = document.getElementById("payDelText");
      const payDelYes = document.getElementById("payDelYesBtn");
      const payDelNo = document.getElementById("payDelNoBtn");

      let deletingPay = { courseId:null, paymentId:null };

      const closePayDel = ()=>{ payDelModal.style.display = "none"; deletingPay = { courseId:null, paymentId:null }; };
      payDelModal.querySelectorAll("[data-paydelclose]").forEach(x => x.onclick = closePayDel);
      payDelNo.onclick = closePayDel;

      page.querySelectorAll("[data-paydel]").forEach(btn=>{
        btn.onclick = ()=>{
          const cid = btn.getAttribute("data-course") || "";
          const pid = btn.getAttribute("data-paydel") || "";
          if(!cid || !pid) return EJ.toast("Ödəniş ID tapılmadı.", "danger");
          deletingPay = { courseId: cid, paymentId: pid };
          const c = (EJStore.load().courses||[]).find(x=>x.id===cid);
          const cname = c?.name ? `“${c.name}”` : "seçilmiş kurs";
          payDelText.textContent = `${cname} üçün bu ödəniş qeydini silmək istəyirsiniz? (Silinsə, kurs admin panelində tarixçə və status yenilənəcək.)`;
          payDelModal.style.display = "block";
        };
      });

      payDelYes.onclick = ()=>{
        const { courseId, paymentId } = deletingPay;
        if(!courseId || !paymentId) return closePayDel();
        const res = EJStore.deletePayment(courseId, paymentId);
        if(!res?.ok){ EJ.toast(res?.error || "Silinmədi.", "danger"); return; }
        EJ.toast("Ödəniş qeydi silindi.", "ok");
        closePayDel();
        render();
      };

      // export helpers
      const printArea = (elId)=>{
        const el = document.getElementById(elId);
        if(!el){ EJ.toast("Çap sahəsi tapılmadı.", "danger"); return; }
        const w = window.open("", "_blank");
        w.document.write(`
          <html><head>
            <meta charset="UTF-8"/>
            <title>Ödənişlər</title>
            <link rel="stylesheet" href="style.css"/>
            <style>
              body{ padding:24px; }
              .printTitle{ font-weight:900; font-size:18px; margin-bottom:12px; }
              .small{ font-size:12px; opacity:.85; }
            </style>
          </head><body>
            <div class="printTitle">Ödəniş tarixçəsi</div>
            ${el.innerHTML}
          </body></html>
        `);
        w.document.close();
        w.focus();
        w.print();
      };

      const pdfArea = async (elId, filename)=>{
        const el = document.getElementById(elId);
        if(!el){ EJ.toast("PDF sahəsi tapılmadı.", "danger"); return; }
        if(typeof window.html2pdf === "undefined"){
          EJ.toast("PDF kitabxanası yüklənmədi. İnternet bağlantısını yoxlayın.", "danger");
          return;
        }
        const opt = {
          margin: 10,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await window.html2pdf().set(opt).from(el).save();
      };

      document.getElementById("btnPrintAll").onclick = ()=> printArea("allPayArea");
      document.getElementById("btnPdfAll").onclick = ()=> pdfArea("allPayArea", "odenisler-umumi.pdf");
      document.getElementById("btnPrintCourse").onclick = ()=> printArea("coursePayArea");
      document.getElementById("btnPdfCourse").onclick = ()=> pdfArea("coursePayArea", "odenisler-kurs.pdf");
    }

    function renderPaymentsTable(list, includeCourseCol, fixedCourseId=""){
      const rows = (list||[]);
      if(!rows.length){
        return `<div class="small" style="opacity:.85">Hələ ödəniş qeydi yoxdur.</div>`;
      }
      const fmt = (iso)=>{
        try{
          const d=new Date(iso);
          return d.toLocaleDateString("az-AZ",{year:"numeric",month:"2-digit",day:"2-digit"});
        }catch{ return String(iso||"-"); }
      };
      return `
        <div class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                ${includeCourseCol ? "" : `<th>Kurs</th>`}
                <th>Ödəniş tarixi</th>
                <th>Xidmətin bitmə tarixi</th>
                <th>Status</th>
                <th class="noPrint">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r=>{
                const end = new Date(r.serviceEnd);
                const late = end < new Date();
                const badge = late ? `<span class="badge danger">Gecikir</span>` : `<span class="badge ok">Ödənib</span>`;
                const cid = includeCourseCol ? fixedCourseId : (r.courseId||"");
                return `
                  <tr>
                    ${includeCourseCol ? "" : `<td>${EJ.escape((r.courseName||"-"))} <span class="badge">ID: ${EJ.escape(r.courseId||"-")}</span></td>`}
                    <td>${EJ.escape(fmt(r.paidAt))}</td>
                    <td>${EJ.escape(fmt(r.serviceEnd))}</td>
                    <td>${badge}</td>
                    <td class="noPrint" style="white-space:nowrap">
                      <button class="btn danger" style="padding:6px 10px" data-course="${EJ.escape(cid)}" data-paydel="${EJ.escape(r.id||"")}">Sil</button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }


    // ---------------- Messages ----------------
  
    function renderMessages() {
      const db = EJStore.load();
      const msgs = [];
      for (const c of db.courses) {
        const cdb = db.courseData[c.id];
        (cdb?.contacts || []).forEach(m => msgs.push({ course: c, msg: m }));
      }
      msgs.sort((a, b) => (b.msg.createdAt || "").localeCompare(a.msg.createdAt || ""));
  
      page.innerHTML = `
        ${header("Əlaqə mesajları", "Landing formundan gələn lead-lər")}
        <div class="card p20">
          <table class="table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Kurs</th>
                <th>Ad</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>Mesaj</th>
              </tr>
            </thead>
            <tbody>
              ${msgs.length ? msgs.map(x => `
                <tr>
                  <td>${EJ.escape((x.msg.createdAt || "").slice(0, 10))}</td>
                  <td>${EJ.escape(x.course.name)}</td>
                  <td style="font-weight:800">${EJ.escape(x.msg.name || "")}</td>
                  <td>${EJ.escape(x.msg.phone || "")}</td>
                  <td>${EJ.escape(x.msg.email || "")}</td>
                  <td style="color:var(--sub)">${EJ.escape(x.msg.message || "")}</td>
                </tr>
              `).join("") : `<tr><td colspan="6" style="color:var(--sub)">Mesaj yoxdur.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    }
  
    render();
  })();
  