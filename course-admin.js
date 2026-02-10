// course-admin.js
(function(){
  const courseId = EJStore.activeCourseId();
  const me = Auth.requireCourseLogin(courseId);
  if(!me) return;
  if(me.role!=="courseAdmin"){ location.href="login.html"; return; }

  document.getElementById("meName").textContent = me.name;

  const page = document.getElementById("page");
  document.getElementById("logoutBtn").onclick = ()=>{
    EJStore.courseLogout(courseId);
    EJ.toast("Çıxış edildi.", "ok");
    location.href = "login.html";
  };

  const fmtDate = (iso)=>{
    if(!iso) return "-";
    try{
      const d = new Date(iso);
      return d.toLocaleDateString("az-AZ", { year:"numeric", month:"2-digit", day:"2-digit" });
    }catch{ return String(iso); }
  };

  
  
  const fmtAZN = (n)=>{
    const num = Number(n||0);
    try{
      return num.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " AZN";
    }catch{
      return (Math.round(num*100)/100).toFixed(2) + " AZN";
    }
  };

  function calcRevenue(studentPayments){
    const obj = (studentPayments && typeof studentPayments==="object") ? studentPayments : {};
    let total = 0;
    let monthTotal = 0;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-11

    Object.keys(obj).forEach(sid=>{
      const arr = Array.isArray(obj[sid]) ? obj[sid] : [];
      arr.forEach(p=>{
        const amt = Number(p?.amount||0);
        if(!isFinite(amt)) return;
        total += amt;

        // aylıq gəlir: ödəniş tarixinə (paidAt) görə cari ay
        const d = p?.paidAt ? new Date(p.paidAt) : null;
        if(d && !isNaN(d) && d.getFullYear()===y && d.getMonth()===m){
          monthTotal += amt;
        }
      });
    });

    return { total, monthTotal };
  }

function parseHash(){
    const raw = location.hash || "#/dashboard";
    const parts = raw.split("?");
    const route = parts[0] || "#/dashboard";
    const params = new URLSearchParams(parts[1] || "");
    return { raw, route, params };
  }

function header(title, subtitle, actionsHTML=""){
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

  function getDb(){ return EJStore.load(); }
  function getCourse(){
    const db = getDb();
    return db.courses.find(c=>c.id===courseId) || null;
  }
  function getCdb(){
    const db = getDb();
    return db.courseData[courseId];
  }

  function setNav(route){
    const map = {
      "#/dashboard":"navDash",
      "#/teachers":"navT",
      "#/students":"navS",
      "#/rooms":"navR",
      "#/attendance":"navA",
      "#/payments":"navPay",
      "#/settings":"navSet"
    };
    Object.entries(map).forEach(([h, id])=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle("active", route===h);
    });
  }

  function render(){
    Auth.applyFreezeIfNeeded(courseId);
    const frozen = (EJStore.courseStatus(courseId)==="suspended");

    const { route, params } = parseHash();
    setNav(route);
    try{ EJ.setBrandLogo(document.querySelector('.brandLogo'), getCourse()); }catch(e){}


    if(route==="#/teachers") return renderTeachers(frozen);
    if(route==="#/students") return renderStudents(frozen);
    if(route==="#/rooms") return renderRooms(frozen);
    if(route==="#/attendance") return renderAttendance();
    if(route==="#/payments") return renderPayments(frozen, params);
    if(route==="#/settings") return renderSettings(frozen);
    return renderDashboard();
  }
  window.addEventListener("hashchange", render);

  // ---------------- Dashboard ----------------

  function renderDashboard(){
    const db = getDb();
    const c = getCourse();
    const cdb = getCdb();

    const teachers = (cdb.users||[]).filter(u=>u.role==="teacher").length;
    const students = (cdb.users||[]).filter(u=>u.role==="student").length;
    const rooms = (cdb.rooms||[]).length;

    const rev = calcRevenue(cdb.studentPayments);

    const statusBadge = c?.status==="active"
      ? `<span class="badge ok">Aktiv</span>`
      : `<span class="badge danger">Bloklu</span>`;

    const payBadge = (c?.paymentStatus==="late")
      ? `<span class="badge danger">Gecikir</span>`
      : `<span class="badge ok">Ödənib</span>`;

    page.innerHTML = `
      ${header("Dashboard", "Kursun ümumi göstəriciləri")}
      <div class="row">
        <div class="kpi col">
          <div class="k">Kurs</div>
          <div class="v">${EJ.escape(c?.name || "-")}</div>
          <div class="d"><span class="badge">ID: ${EJ.escape(courseId)}</span></div>
        </div>

        <div class="kpi col">
          <div class="k">Status</div>
          <div class="v">${statusBadge}</div>
          <div class="d">Bloklama yalnız şirkət admin tərəfindən edilir</div>
        </div>

        <div class="kpi col">
          <div class="k">Müqavilə bitmə tarixi</div>
          <div class="v">${EJ.escape(fmtDate(c?.contractEnd))}</div>
          <div class="d">Xidmət müddəti</div>
        </div>
      </div>

      <div class="row mt16">
        <div class="kpi col">
          <div class="k">Ödəniş statusu</div>
          <div class="v">${payBadge}</div>
          <div class="d">Son tarix: ${EJ.escape(fmtDate(c?.paymentDueAt))}</div>
        </div>

        <div class="kpi col">
          <div class="k">Ümumi müəllim sayı</div>
          <div class="v">${teachers}</div>
          <div class="d">Qeydiyyatda</div>
        </div>

        <div class="kpi col">
          <div class="k">Ümumi tələbə sayı</div>
          <div class="v">${students}</div>
          <div class="d">Qeydiyyatda</div>
        </div>

        <div class="kpi col">
          <div class="k">Ümumi otaq sayı</div>
          <div class="v">${rooms}</div>
          <div class="d">Dərs otaqları</div>
        </div>
      </div>


      <div class="row mt16">
        <div class="kpi col">
          <div class="k">Ümumi gəlir</div>
          <div class="v">${EJ.escape(fmtAZN(rev.total))}</div>
          <div class="d">Kurs açıldıqdan bəri</div>
        </div>

        <div class="kpi col">
          <div class="k">Aylıq gəlir</div>
          <div class="v">${EJ.escape(fmtAZN(rev.monthTotal))}</div>
          <div class="d">Cari ay üzrə</div>
        </div>
      </div>

      ${(c?.status==="suspended" || c?.paymentStatus==="late") ? `
        <div class="card p20 mt16" style="border-color:rgba(244,63,94,.35)">
          <div style="font-weight:900">Xəbərdarlıq</div>
          <div class="mt12" style="color:var(--sub);line-height:1.7">
            ${c?.status==="suspended" ? "Sistem hazırda <b>blokludur</b>. Əməliyyatlar məhdud ola bilər." : ""}
            ${c?.paymentStatus==="late" ? "<br>Ödəniş statusu <b>gecikir</b>. Şirkət admin bloklama tətbiq edə bilər." : ""}
          </div>
        </div>
      ` : ""}

      <div class="row mt16">
        <div class="card p20 col">
          <div style="font-weight:900">Sürətli keçidlər</div>
          <div class="mt12" style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn solid" href="#/teachers">Müəllimlər</a>
            <a class="btn solid" href="#/students">Tələbələr</a>
            <a class="btn" href="#/rooms">Dərs otaqları</a>
            <a class="btn" href="#/attendance">Davamiyyət</a>
            <a class="btn" href="#/settings">Parametrlər</a>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------- Teachers ----------------

  async function fileToDataUrl(file){
    if(!file) return "";
    return await new Promise((resolve)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(String(r.result||""));
      r.readAsDataURL(file);
    });
  }

  function teacherRow(t){
    const p = t.profile || {};
    return `
      <tr>
        <td style="font-weight:900">${EJ.escape(t.name)}</td>
        <td><span class="badge">${EJ.escape(t.id)}</span></td>
        <td><span class="badge">${EJ.escape(t.password)}</span></td>
        <td style="color:var(--sub)">${EJ.escape(p.subjects || "")}</td>
        <td style="color:var(--sub)">${EJ.escape(p.phone || "")}<br>${EJ.escape(p.email || "")}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn" data-tview="${EJ.escape(t.id)}">Profil</button>
          <button class="btn" data-tedit="${EJ.escape(t.id)}">Redaktə</button>
          <button class="btn danger" data-tdel="${EJ.escape(t.id)}">Sil</button>
        </td>
      </tr>
    `;
  }

  function renderTeachers(frozen){
    const cdb = getCdb();
    const teachers = (cdb.users||[]).filter(u=>u.role==="teacher");

    page.innerHTML = `
      ${header("Müəllimlər", "Yeni müəllim əlavə et • redaktə et • sil", `<button class="btn solid" id="addT" ${frozen?"disabled":""}>+ Müəllim əlavə et</button>`)}
      <div class="card p20">
        <table class="table">
          <thead>
            <tr>
              <th>Ad</th><th>ID</th><th>Şifrə</th><th>Fənn(lər)</th><th>Əlaqə</th><th style="text-align:right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            ${teachers.length ? teachers.map(teacherRow).join("") : `<tr><td colspan="6" style="color:var(--sub)">Müəllim yoxdur.</td></tr>`}
          </tbody>
        </table>
        ${frozen ? `<div class="smallNote mt12">Sistem bloklu olduğu üçün əlavə / redaktə / sil əməliyyatları bağlıdır.</div>` : ``}
      </div>
    `;

    const addBtn = document.getElementById("addT");
    if(addBtn){
      addBtn.onclick = ()=>{
        EJ.modal({
          title:"Müəllim əlavə et",
          okText:"Yarat",
          bodyHTML: teacherFormHTML(),
          onOk: async (wrap)=>{
            const prof = await readTeacherForm(wrap, /*withPhoto*/ true);
            if(!prof.firstName || !prof.lastName){
              EJ.toast("Ad və soyad mütləqdir.", "danger");
              return false;
            }
            const created = EJStore.addTeacher(courseId, prof);
            EJ.toast(`Müəllim yaradıldı: ${created.id} / ${created.pass}`, "ok");
            render();
          }
        });
      };
    }

    // row actions
    page.querySelectorAll("[data-tview]").forEach(btn=>{
      btn.addEventListener("click", ()=> openTeacherProfile(btn.getAttribute("data-tview")));
    });
    page.querySelectorAll("[data-tedit]").forEach(btn=>{
      btn.addEventListener("click", ()=> openTeacherEdit(btn.getAttribute("data-tedit"), frozen));
    });
    page.querySelectorAll("[data-tdel]").forEach(btn=>{
      btn.addEventListener("click", ()=> openTeacherDelete(btn.getAttribute("data-tdel"), frozen));
    });
  }

  function teacherFormHTML(teacher={}){
    const p = teacher.profile || {};
    return `
      <div class="row">
        <div class="col">
          <label class="lbl">Ad</label>
          <input class="input" id="fn" value="${EJ.escape(p.firstName||"")}" placeholder="Ad"/>
        </div>
        <div class="col">
          <label class="lbl">Soyad</label>
          <input class="input" id="ln" value="${EJ.escape(p.lastName||"")}" placeholder="Soyad"/>
        </div>
        <div class="col">
          <label class="lbl">Ata adı</label>
          <input class="input" id="fat" value="${EJ.escape(p.fatherName||"")}" placeholder="Ata adı"/>
        </div>
      </div>

      <div class="row mt12">
        <div class="col">
          <label class="lbl">Yaş</label>
          <input class="input" id="age" type="number" min="16" value="${EJ.escape(p.age||"")}"/>
        </div>
        <div class="col">
          <label class="lbl">Cins</label>
          <select class="select" id="gender">
            <option ${p.gender==="Kişi"?"selected":""}>Kişi</option>
            <option ${p.gender==="Qadın"?"selected":""}>Qadın</option>
          </select>
        </div>
        <div class="col">
          <label class="lbl">İşə qəbul tarixi</label>
          <input class="input" id="hire" type="date" value="${EJ.escape((p.hireDate||"").slice(0,10))}"/>
        </div>
      </div>

      <div class="mt12">
        <label class="lbl">Ali təhsil bitirdiyi müəssisə</label>
        <input class="input" id="uni" value="${EJ.escape(p.uni||"")}" placeholder="Məs: BDU, UNEC..."/>
      </div>

      <div class="row mt12">
        <div class="col">
          <label class="lbl">Telefon</label>
          <input class="input" id="phone" value="${EJ.escape(p.phone||"")}" placeholder="+994..."/>
        </div>
        <div class="col">
          <label class="lbl">Email</label>
          <input class="input" id="email" value="${EJ.escape(p.email||"")}" placeholder="email@..."/>
        </div>
      </div>

      <div class="mt12">
        <label class="lbl">Fənn(lər)</label>
        <input class="input" id="subj" value="${EJ.escape(p.subjects||"")}" placeholder="Məs: Riyaziyyat, JavaScript..."/>
      </div>

      <div class="mt12">
        <label class="lbl">3x4 şəkil (opsional)</label>
        <input class="input" id="photo" type="file" accept="image/*"/>
        <div class="smallNote mt8">Şəkil localStorage-a base64 yazılır (demo).</div>
      </div>
    `;
  }

  async function readTeacherForm(wrap, withPhoto){
    const prof = {
      firstName: EJ.$("#fn",wrap).value.trim(),
      lastName: EJ.$("#ln",wrap).value.trim(),
      fatherName: EJ.$("#fat",wrap).value.trim(),
      age: EJ.$("#age",wrap).value.trim(),
      gender: EJ.$("#gender",wrap).value,
      uni: EJ.$("#uni",wrap).value.trim(),
      phone: EJ.$("#phone",wrap).value.trim(),
      email: EJ.$("#email",wrap).value.trim(),
      subjects: EJ.$("#subj",wrap).value.trim(),
      hireDate: EJ.$("#hire",wrap).value ? new Date(EJ.$("#hire",wrap).value).toISOString() : ""
    };
    if(withPhoto){
      const file = EJ.$("#photo", wrap).files?.[0];
      const dataUrl = await fileToDataUrl(file);
      if(dataUrl) prof.photoDataUrl = dataUrl;
    }
    return prof;
  }

  function openTeacherProfile(teacherId){
    const cdb = getCdb();
    const t = (cdb.users||[]).find(u=>u.id===teacherId && u.role==="teacher");
    if(!t) return;
    const p = t.profile || {};
    EJ.modal({
      title:"Müəllim profili",
      okText:"Bağla",
      cancelText:"Bağla",
      bodyHTML: `
        <div class="row">
          <div class="card p20 col" style="min-width:280px">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="width:64px;height:84px;border-radius:14px;border:1px solid var(--border);overflow:hidden;background:var(--surface)">
                ${p.photoDataUrl ? `<img src="${p.photoDataUrl}" alt="photo" style="width:100%;height:100%;object-fit:cover">` : `<div style="padding:10px;color:var(--sub);font-size:12px">3x4</div>`}
              </div>
              <div>
                <div style="font-weight:900">${EJ.escape(t.name)}</div>
                <div class="mt8">
                  <span class="badge">ID: ${EJ.escape(t.id)}</span>
                  <span class="badge">Şifrə: ${EJ.escape(t.password)}</span>
                </div>
              </div>
            </div>

            <div class="mt16" style="color:var(--sub);font-size:13px;line-height:1.7">
              <div><b>Telefon:</b> ${EJ.escape(p.phone||"-")}</div>
              <div><b>Email:</b> ${EJ.escape(p.email||"-")}</div>
              <div><b>Universitet:</b> ${EJ.escape(p.uni||"-")}</div>
              <div><b>Fənn(lər):</b> ${EJ.escape(p.subjects||"-")}</div>
              <div><b>İşə qəbul tarixi:</b> ${EJ.escape(fmtDate(p.hireDate))}</div>
            </div>
          </div>
        </div>
      `,
      onOk: ()=> true
    });
  }

  function openTeacherEdit(teacherId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const t = (cdb.users||[]).find(u=>u.id===teacherId && u.role==="teacher");
    if(!t) return;

    EJ.modal({
      title:`Müəllimi redaktə et: ${t.name}`,
      okText:"Yadda saxla",
      bodyHTML: teacherFormHTML(t),
      onOk: async (wrap)=>{
        const patch = await readTeacherForm(wrap, true);
        const r = EJStore.updateTeacher(courseId, teacherId, patch);
        if(!r.ok){
          EJ.toast(r.error || "Xəta.", "danger");
          return false;
        }
        EJ.toast("Müəllim yeniləndi.", "ok");
        render();
      }
    });
  }

  function openTeacherDelete(teacherId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const t = (cdb.users||[]).find(u=>u.id===teacherId && u.role==="teacher");
    if(!t) return;

    EJ.modal({
      title:"Müəllimi sil",
      okText:"Hə, sil",
      cancelText:"Yox",
      bodyHTML:`<div style="color:var(--sub);line-height:1.7">
        <b>${EJ.escape(t.name)}</b> müəllimini silmək istəyirsiniz? <br>
        Bu əməliyyat geri qaytarılmır.
      </div>`,
      onOk: ()=>{
        const r = EJStore.deleteTeacher(courseId, teacherId);
        if(r.ok) EJ.toast("Müəllim silindi.", "ok");
        else EJ.toast("Silinmədi.", "danger");
        render();
      }
    });
  }

  // ---------------- Students ----------------

  function studentRow(s){
    const p = s.profile || {};
    const payments = (EJStore.listStudentPayments(courseId, s.id).payments || []).slice()
      .sort((a,b)=>(b.paidAt||"").localeCompare(a.paidAt||""));
    const st = EJStore.getStudentPaymentStatus(courseId, s.id);
    const statusBadge = (st?.isPaid)
      ? `<span class="badge ok">Ödənildi</span>`
      : `<span class="badge danger">${(st?.status==="debt") ? "Borc var" : "Ödənilməyib"}</span>`;
    const lastRows = payments.slice(0,5).map(p=>`
      <tr>
        <td>${fmtDate(p.paidAt)}</td>
        <td>${EJ.escape(p.periodFrom||"-")} → ${EJ.escape(p.periodTo||"-")}</td>
        <td>${EJ.escape((p.amount??0))} AZN</td>
        <td><span class="badge ok">Ödənildi</span></td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="small" style="opacity:.8">Ödəniş yoxdur.</td></tr>`;

    return `
      <tr>
        <td style="font-weight:900">${EJ.escape(s.name)}</td>
        <td><span class="badge">${EJ.escape(s.id)}</span></td>
        <td><span class="badge">${EJ.escape(s.password)}</span></td>
        <td style="color:var(--sub)">${EJ.escape(p.group||"")}</td>
        <td style="color:var(--sub)">${EJ.escape(p.subjects||"")}</td>
        <td style="color:var(--sub)">${EJ.escape(p.phone||"")}</td>
        <td style="color:var(--sub)">${EJ.escape(p.parentPhone||"")}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn" data-sview="${EJ.escape(s.id)}">Profil</button>
          <button class="btn" data-sedit="${EJ.escape(s.id)}">Redaktə</button>
          <button class="btn danger" data-sdel="${EJ.escape(s.id)}">Sil</button>
        </td>
      </tr>
    `;
  }

  function renderStudents(frozen){
    const cdb = getCdb();
    const students = (cdb.users||[]).filter(u=>u.role==="student");

    page.innerHTML = `
      ${header("Tələbələr", "Yeni tələbə əlavə et • redaktə et • sil", `<button class="btn solid" id="addS" ${frozen?"disabled":""}>+ Tələbə əlavə et</button>`)}
      <div class="card p20">
        <table class="table">
          <thead>
            <tr>
              <th>Ad</th><th>ID</th><th>Şifrə</th><th>Qrup</th><th>Fənn(lər)</th><th>Telefon</th><th>Valideyn</th><th style="text-align:right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            ${students.length ? students.map(studentRow).join("") : `<tr><td colspan="8" style="color:var(--sub)">Tələbə yoxdur.</td></tr>`}
          </tbody>
        </table>
        ${frozen ? `<div class="smallNote mt12">Sistem bloklu olduğu üçün əlavə / redaktə / sil əməliyyatları bağlıdır.</div>` : ``}
      </div>
    `;

    const addBtn = document.getElementById("addS");
    if(addBtn){
      addBtn.onclick = ()=>{
        EJ.modal({
          title:"Tələbə əlavə et",
          okText:"Yarat",
          bodyHTML: studentFormHTML(),
          onOk:(wrap)=>{
            const prof = readStudentForm(wrap);
            if(!prof.firstName || !prof.lastName){
              EJ.toast("Ad və soyad mütləqdir.", "danger");
              return false;
            }
            const created = EJStore.addStudent(courseId, prof);
            EJ.toast(`Tələbə yaradıldı: ${created.id} / ${created.pass}`, "ok");
            render();
          }
        });
      };
    }

    page.querySelectorAll("[data-sview]").forEach(btn=>{
      btn.addEventListener("click", ()=> openStudentProfile(btn.getAttribute("data-sview")));
    });
    page.querySelectorAll("[data-sedit]").forEach(btn=>{
      btn.addEventListener("click", ()=> openStudentEdit(btn.getAttribute("data-sedit"), frozen));
    });
    page.querySelectorAll("[data-sdel]").forEach(btn=>{
      btn.addEventListener("click", ()=> openStudentDelete(btn.getAttribute("data-sdel"), frozen));
    });
  }

  function studentFormHTML(student={}){
    const p = student.profile || {};
    return `
      <div class="row">
        <div class="col">
          <label class="lbl">Ad</label>
          <input class="input" id="fn" value="${EJ.escape(p.firstName||"")}" placeholder="Ad"/>
        </div>
        <div class="col">
          <label class="lbl">Soyad</label>
          <input class="input" id="ln" value="${EJ.escape(p.lastName||"")}" placeholder="Soyad"/>
        </div>
        <div class="col">
          <label class="lbl">Ata adı</label>
          <input class="input" id="fat" value="${EJ.escape(p.fatherName||"")}" placeholder="Ata adı"/>
        </div>
      </div>

      <div class="row mt12">
        <div class="col">
          <label class="lbl">Yaş</label>
          <input class="input" id="age" type="number" min="5" value="${EJ.escape(p.age||"")}"/>
        </div>
        <div class="col">
          <label class="lbl">Cins</label>
          <select class="select" id="gender">
            <option ${p.gender==="Kişi"?"selected":""}>Kişi</option>
            <option ${p.gender==="Qadın"?"selected":""}>Qadın</option>
          </select>
        </div>
        <div class="col">
          <label class="lbl">Qrup</label>
          <select class="select" id="group">
            ${["1","2","3","4","5","Digər"].map(g=>`<option ${String(p.group||"")==g?"selected":""}>${g}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="row mt12">
        <div class="col">
          <label class="lbl">Əlaqə nömrəsi</label>
          <input class="input" id="phone" value="${EJ.escape(p.phone||"")}" placeholder="+994..."/>
        </div>
        <div class="col">
          <label class="lbl">Valideyn nömrəsi</label>
          <input class="input" id="pphone" value="${EJ.escape(p.parentPhone||"")}" placeholder="+994..."/>
        </div>
      </div>

      <div class="mt12">
        <label class="lbl">Fənn(lər)</label>
        <input class="input" id="subj" value="${EJ.escape(p.subjects||"")}" placeholder="Məs: Riyaziyyat, İngilis dili..."/>
      </div>
    `;
  }

  function readStudentForm(wrap){
    return {
      firstName: EJ.$("#fn",wrap).value.trim(),
      lastName: EJ.$("#ln",wrap).value.trim(),
      fatherName: EJ.$("#fat",wrap).value.trim(),
      age: EJ.$("#age",wrap).value.trim(),
      gender: EJ.$("#gender",wrap).value,
      phone: EJ.$("#phone",wrap).value.trim(),
      parentPhone: EJ.$("#pphone",wrap).value.trim(),
      group: EJ.$("#group",wrap).value,
      subjects: EJ.$("#subj",wrap).value.trim()
    };
  }

  function openStudentProfile(studentId){
    const cdb = getCdb();
    const s = (cdb.users||[]).find(u=>u.id===studentId && u.role==="student");
    if(!s) return;
    const p = s.profile || {};
    const payments = (EJStore.listStudentPayments(courseId, s.id).payments || []).slice()
      .sort((a,b)=>(b.paidAt||"").localeCompare(a.paidAt||""));
    const st = EJStore.getStudentPaymentStatus(courseId, s.id);
    const statusBadge = (st?.isPaid)
      ? `<span class="badge ok">Ödənildi</span>`
      : `<span class="badge danger">${(st?.status==="debt") ? "Borc var" : "Ödənilməyib"}</span>`;
    const lastRows = payments.slice(0,5).map(p=>`
      <tr>
        <td>${fmtDate(p.paidAt)}</td>
        <td>${EJ.escape(p.periodFrom||"-")} → ${EJ.escape(p.periodTo||"-")}</td>
        <td>${EJ.escape((p.amount??0))} AZN</td>
        <td><span class="badge ok">Ödənildi</span></td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="small" style="opacity:.8">Ödəniş yoxdur.</td></tr>`;

    EJ.modal({
      title:"Tələbə profili",
      okText:"Bağla",
      cancelText:"Bağla",
      bodyHTML: `
        <div class="card p20">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <div>
              <div style="font-weight:900;font-size:16px">${EJ.escape(s.name)}</div>
              <div class="mt8">
                <span class="badge">ID: ${EJ.escape(s.id)}</span>
                <span class="badge">Şifrə: ${EJ.escape(s.password)}</span>
              </div>
            </div>
            <div class="badge">${EJ.escape(p.group||"-")}</div>
          </div>

          <div class="mt16" style="color:var(--sub);font-size:13px;line-height:1.7">
            <div><b>Telefon:</b> ${EJ.escape(p.phone||"-")}</div>
            <div><b>Valideyn:</b> ${EJ.escape(p.parentPhone||"-")}</div>
            <div><b>Fənn(lər):</b> ${EJ.escape(p.subjects||"-")}</div>
          </div>
        </div>

        <div class="card p20 mt12">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-weight:900">Ödəniş statusu</div>
            ${statusBadge}
          </div>
          ${st?.isPaid ? `<div class="small mt8" style="opacity:.9">Aktiv dövr: <b>${EJ.escape(st.lastPayment?.periodFrom||"-")}</b> → <b>${EJ.escape(st.lastPayment?.periodTo||"-")}</b></div>` : ``}
          ${(!st?.isPaid && st?.status==="debt") ? `<div class="small mt8" style="opacity:.9">Borc başlanğıcı: <b>${EJ.escape(st.debtFrom||"-")}</b> • Gecikmə: <b>${EJ.escape(String(st.overdueDays||0))} gün</b></div>` : ``}

          <div class="tableWrap mt12">
            <table class="table">
              <thead><tr><th>Ödəniş tarixi</th><th>Dövr</th><th>Məbləğ</th><th>Status</th></tr></thead>
              <tbody>${lastRows}</tbody>
            </table>
          </div>
        </div>
      `,
      onOk: ()=>true
    });
  }

  function openStudentEdit(studentId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const s = (cdb.users||[]).find(u=>u.id===studentId && u.role==="student");
    if(!s) return;

    EJ.modal({
      title:`Tələbəni redaktə et: ${s.name}`,
      okText:"Yadda saxla",
      bodyHTML: studentFormHTML(s),
      onOk:(wrap)=>{
        const patch = readStudentForm(wrap);
        const r = EJStore.updateStudent(courseId, studentId, patch);
        if(!r.ok){
          EJ.toast(r.error || "Xəta.", "danger");
          return false;
        }
        EJ.toast("Tələbə yeniləndi.", "ok");
        render();
      }
    });
  }

  function openStudentDelete(studentId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const s = (cdb.users||[]).find(u=>u.id===studentId && u.role==="student");
    if(!s) return;

    EJ.modal({
      title:"Tələbəni sil",
      okText:"Hə, sil",
      cancelText:"Yox",
      bodyHTML:`<div style="color:var(--sub);line-height:1.7">
        <b>${EJ.escape(s.name)}</b> tələbəsini silmək istəyirsiniz? <br>
        Bu əməliyyat geri qaytarılmır.
      </div>`,
      onOk: ()=>{
        const r = EJStore.deleteStudent(courseId, studentId);
        if(r.ok) EJ.toast("Tələbə silindi.", "ok");
        else EJ.toast("Silinmədi.", "danger");
        render();
      }
    });
  }

  // ---------------- Rooms ----------------

  function renderRooms(frozen){
    const cdb = getCdb();
    const teachers = (cdb.users||[]).filter(u=>u.role==="teacher");
    const rooms = (cdb.rooms||[]);

    const teacherNameById = (id)=> (teachers.find(t=>t.id===id)?.name || "");

    page.innerHTML = `
      ${header("Dərs otaqları", "Otaq yarat • müəllim təyin et • redaktə et", `<button class="btn solid" id="addR" ${frozen?"disabled":""}>+ Otaq yarat</button>`)}
      <div class="card p20">
        <table class="table">
          <thead>
            <tr><th>Otaq</th><th>Müəllim</th><th>Qeyd</th><th style="text-align:right">Əməliyyat</th></tr>
          </thead>
          <tbody>
            ${rooms.length ? rooms.map(r=>`
              <tr>
                <td style="font-weight:900">${EJ.escape(r.name)}</td>
                <td style="color:var(--sub)">${EJ.escape(teacherNameById(r.teacherId) || (r.teacherId ? ("ID: "+r.teacherId) : "-"))}</td>
                <td style="color:var(--sub)">${EJ.escape(r.note||"")}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn" data-redit="${EJ.escape(r.id)}">Redaktə</button>
                  <button class="btn danger" data-rdel="${EJ.escape(r.id)}">Sil</button>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="4" style="color:var(--sub)">Otaq yoxdur.</td></tr>`}
          </tbody>
        </table>

        <div class="smallNote mt12">
          Tələbələri otağa əlavə etmək və davamiyyət qeyd etmək <b>müəllim panelindən</b> ediləcək.
        </div>

        ${frozen ? `<div class="smallNote mt12">Sistem bloklu olduğu üçün otaq yarat / redaktə / sil əməliyyatları bağlıdır.</div>` : ``}
      </div>
    `;

    const addBtn = document.getElementById("addR");
    if(addBtn){
      addBtn.onclick = ()=>{
        EJ.modal({
          title:"Otaq yarat",
          okText:"Yarat",
          bodyHTML: roomFormHTML({teachers}),
          onOk:(wrap)=>{
            const payload = readRoomForm(wrap);
            if(!payload.name){
              EJ.toast("Otaq adı mütləqdir.", "danger");
              return false;
            }
            EJStore.addRoom(courseId, payload);
            EJ.toast("Otaq yaradıldı.", "ok");
            render();
          }
        });
      };
    }

    page.querySelectorAll("[data-redit]").forEach(btn=>{
      btn.addEventListener("click", ()=> openRoomEdit(btn.getAttribute("data-redit"), frozen));
    });
    page.querySelectorAll("[data-rdel]").forEach(btn=>{
      btn.addEventListener("click", ()=> openRoomDelete(btn.getAttribute("data-rdel"), frozen));
    });
  }

  function roomFormHTML({room=null, teachers=[]}){
    const r = room || { name:"", teacherId:"", note:"" };
    return `
      <div class="mt8">
        <label class="lbl">Otaq adı</label>
        <input class="input" id="rname" value="${EJ.escape(r.name||"")}" placeholder="Məs: Front-End 101"/>
      </div>

      <div class="mt12">
        <label class="lbl">Müəllim təyin et (opsional)</label>
        <select class="select" id="rteacher">
          <option value="">— seçilməyib —</option>
          ${teachers.map(t=>`<option value="${EJ.escape(t.id)}" ${t.id===r.teacherId?"selected":""}>${EJ.escape(t.name)} • ${EJ.escape(t.id)}</option>`).join("")}
        </select>
      </div>

      <div class="mt12">
        <label class="lbl">Qeyd (opsional)</label>
        <textarea class="textarea" id="rnote" rows="4" placeholder="Məs: Axşam qrup...">${EJ.escape(r.note||"")}</textarea>
      </div>
    `;
  }

  function readRoomForm(wrap){
    return {
      name: EJ.$("#rname",wrap).value.trim(),
      teacherId: EJ.$("#rteacher",wrap).value.trim(),
      note: EJ.$("#rnote",wrap).value.trim()
    };
  }

  function openRoomEdit(roomId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const teachers = (cdb.users||[]).filter(u=>u.role==="teacher");
    const room = (cdb.rooms||[]).find(r=>r.id===roomId);
    if(!room) return;

    EJ.modal({
      title:`Otağı redaktə et: ${room.name}`,
      okText:"Yadda saxla",
      bodyHTML: roomFormHTML({room, teachers}),
      onOk:(wrap)=>{
        const patch = readRoomForm(wrap);
        const r = EJStore.updateRoom(courseId, roomId, patch);
        if(!r.ok){
          EJ.toast(r.error || "Xəta.", "danger");
          return false;
        }
        EJ.toast("Otaq yeniləndi.", "ok");
        render();
      }
    });
  }

  function openRoomDelete(roomId, frozen){
    if(frozen) return;
    const cdb = getCdb();
    const room = (cdb.rooms||[]).find(r=>r.id===roomId);
    if(!room) return;

    EJ.modal({
      title:"Otağı sil",
      okText:"Hə, sil",
      cancelText:"Yox",
      bodyHTML:`<div style="color:var(--sub);line-height:1.7">
        <b>${EJ.escape(room.name)}</b> otağını silmək istəyirsiniz?
      </div>`,
      onOk: ()=>{
        const r = EJStore.deleteRoom(courseId, roomId);
        if(r.ok) EJ.toast("Otaq silindi.", "ok");
        else EJ.toast("Silinmədi.", "danger");
        render();
      }
    });
  }

  // ---------------- Attendance ----------------

  function renderAttendance(){
    const cdb = getCdb();
    const teachers = (cdb.users||[]).filter(u=>u.role==="teacher");
    const students = (cdb.users||[]).filter(u=>u.role==="student");

    const teacherName = (id)=> teachers.find(t=>t.id===id)?.name || "";
    const studentName = (id)=> students.find(s=>s.id===id)?.name || "";

    const items = (cdb.attendance||[]).slice().sort((a,b)=> String(b.dateISO||b.createdAt||"").localeCompare(String(a.dateISO||a.createdAt||"")));
    const total = items.length;
    const abs = items.filter(x=>x.status==="absent").length;
    const late = items.filter(x=>x.status==="late").length;
    const present = items.filter(x=>x.status==="present").length;
    const pct = total ? Math.round((present/total)*100) : 0;

    page.innerHTML = `
      ${header("Davamiyyət", "Müəllim tərəfindən qeyd olunur • Kurs admin yalnız izləyir")}
      <div class="row">
        <div class="kpi col">
          <div class="k">Ümumi qeyd</div>
          <div class="v">${total}</div>
          <div class="d">Bütün qeydiyyatlar</div>
        </div>
        <div class="kpi col">
          <div class="k">Qayıb</div>
          <div class="v">${abs}</div>
          <div class="d">absent</div>
        </div>
        <div class="kpi col">
          <div class="k">Gecikmə</div>
          <div class="v">${late}</div>
          <div class="d">late</div>
        </div>
        <div class="kpi col">
          <div class="k">Ümumi faiz</div>
          <div class="v">${pct}%</div>
          <div class="d">present / total</div>
        </div>
      </div>

      <div class="card p20 mt16">
        <table class="table">
          <thead>
            <tr>
              <th>Tarix</th><th>Tələbə</th><th>Status</th><th>Müəllim</th><th>Qeyd</th>
            </tr>
          </thead>
          <tbody>
            ${items.length ? items.map(a=>{
              const badge = a.status==="present" ? "ok" : a.status==="late" ? "" : "danger";
              const txt = a.status==="present" ? "İştirak" : a.status==="late" ? "Gecikdi" : "Qayıb";
              return `
                <tr>
                  <td>${EJ.escape(fmtDate(a.dateISO || a.createdAt))}</td>
                  <td style="font-weight:900">${EJ.escape(studentName(a.studentId) || a.studentId || "-")}</td>
                  <td><span class="badge ${badge}">${txt}</span></td>
                  <td style="color:var(--sub)">${EJ.escape(teacherName(a.teacherId) || a.teacherId || "-")}</td>
                  <td style="color:var(--sub)">${EJ.escape(a.note||"")}</td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="5" style="color:var(--sub)">Hələ davamiyyət qeydi yoxdur. (Müəllim panelindən əlavə ediləcək)</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  

  // ---------------- Ödənişlər (tələbə ödənişləri) ----------------
  function renderPayments(frozen, params){
    const db = getDb();
    const c = getCourse();
    const cdb = getCdb();

    const students = (cdb.users||[]).filter(u=>u.role==="student")
      .slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));

    const selected = (params?.get("student")) || (students[0]?.id || "");
    const byStudent = selected ? (EJStore.listStudentPayments(courseId, selected).payments || []) : [];

    // overall history (all students)
    const overall = [];
    (students||[]).forEach(st=>{
      const arr = (EJStore.listStudentPayments(courseId, st.id).payments || []);
      arr.forEach(p=> overall.push({ ...p, studentName: st.name, studentId: st.id }));
    });
    overall.sort((a,b)=> (b.paidAt||"").localeCompare(a.paidAt||""));

    const studentOptions = students.map(s=>`<option value="${EJ.escape(s.id)}" ${s.id===selected?"selected":""}>${EJ.escape(s.name)} • ${EJ.escape(s.id)}</option>`).join("");

    const rowsStudent = byStudent.length ? byStudent.map(p=>`
      <tr>
        <td>${fmtDate(p.paidAt)}</td>
        <td><span class="badge ok">Ödənildi</span></td>
        <td>${EJ.escape(p.periodFrom||"-")} → ${EJ.escape(p.periodTo||"-")}</td>
        <td>${EJ.escape((p.amount??0))} AZN</td>
        <td class="right">
          <button class="btn" data-edit="${EJ.escape(p.id)}">Redaktə</button>
          <button class="btn danger" data-del="${EJ.escape(p.id)}">Sil</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="small" style="opacity:.8">Bu tələbə üçün hələ ödəniş yoxdur.</td></tr>`;

    const rowsAll = overall.length ? overall.map(p=>`
      <tr>
        <td>${fmtDate(p.paidAt)}</td>
        <td>${EJ.escape(p.studentName||"-")}</td>
        <td>${EJ.escape(p.studentId||"-")}</td>
        <td>${EJ.escape(p.periodFrom||"-")} → ${EJ.escape(p.periodTo||"-")}</td>
        <td>${EJ.escape((p.amount??0))} AZN</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="small" style="opacity:.8">Hələ heç bir ödəniş yoxdur.</td></tr>`;

    page.innerHTML = `
      ${header("Ödənişlər", "Tələbələrin aylıq ödənişləri və tarixçə", `
        <button class="btn" id="btnPrintAll">Çap et</button>
        <button class="btn" id="btnPdfAll">PDF endir</button>
      `)}

      ${frozen? `<div class="card p16 mt12"><span class="badge danger">Sistem dondurulub</span> <span class="small">Ödəniş əlavə/redaktə/silmə mümkün deyil.</span></div>` : ""}

      <div class="card p20 mt16">
        <div style="display:flex; gap:12px; align-items:end; flex-wrap:wrap;">
          <div class="field" style="min-width:260px; flex:1;">
            <label>Tələbə seç</label>
            <select id="stuSelect">${studentOptions}</select>
          </div>
          <div class="field">
            <label>Başlanğıc tarix (ödəmə günü)</label>
            <input type="date" id="stuFrom"/>
          </div>
          <div class="field">
            <label>Bitmə tarixi</label>
            <input type="date" id="stuTo"/>
          </div>
          <div class="field">
            <label>Məbləğ (AZN)</label>
            <input type="number" min="0" step="0.01" id="stuAmount" placeholder="məs: 50"/>
          </div>
          <div>
            <button class="btn ok" id="stuSaveBtn" ${frozen?"disabled":""}>Yadda saxla</button>
          </div>
        </div>

        <div class="small mt12" style="opacity:.85">
          Qeyd: Ödəniş <b>Ödənildi</b> statusu ilə saxlanılır və tələbənin panelində (profilində) görünür.
        </div>
      </div>

      <div class="row mt16" id="payStudentWrap">
        <div class="card p20 col">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:900">Seçilmiş tələbə • Ödəniş tarixçəsi</div>
              <div class="small">Redaktə və silmə mümkündür</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn" id="btnPrintStudent">Çap et</button>
              <button class="btn" id="btnPdfStudent">PDF endir</button>
            </div>
          </div>

          <div class="tableWrap mt12">
            <table class="table">
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Status</th>
                  <th>Dövr</th>
                  <th>Məbləğ</th>
                  <th class="right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>${rowsStudent}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="row mt16" id="payAllWrap">
        <div class="card p20 col">
          <div style="font-weight:900">Ümumi • Bütün tələbələr üzrə tarixçə</div>
          <div class="small">Kurs daxilində edilən bütün ödənişlər</div>

          <div class="tableWrap mt12">
            <table class="table">
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Tələbə</th>
                  <th>ID</th>
                  <th>Dövr</th>
                  <th>Məbləğ</th>
                </tr>
              </thead>
              <tbody>${rowsAll}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const sel = document.getElementById("stuSelect");
    if(sel){
      sel.onchange = ()=>{
        const qs = new URLSearchParams(params || "");
        qs.set("student", sel.value);
        location.hash = `#/payments?${qs.toString()}`;
      };
    }

    // default date today
    const d = new Date();
    const pad = (n)=>String(n).padStart(2,"0");
    const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const fromEl = document.getElementById("stuFrom");
    if(fromEl && !fromEl.value) fromEl.value = today;

    // save payment
    const saveBtn = document.getElementById("stuSaveBtn");
    if(saveBtn){
      saveBtn.onclick = ()=>{
        if(frozen) return;
        const studentId = sel?.value || selected;
        const periodFrom = document.getElementById("stuFrom").value;
        const periodTo = document.getElementById("stuTo").value;
        const paidAt = periodFrom;
        const amount = document.getElementById("stuAmount").value;
        if(!studentId){ EJ.toast("Tələbə seçilməyib.", "danger"); return; }
        if(!periodFrom){ EJ.toast("Başlanğıc tarix boş ola bilməz.", "danger"); return; }
        if(!periodTo){ EJ.toast("Bitmə tarixi boş ola bilməz.", "danger"); return; }
        if(new Date(periodTo) < new Date(periodFrom)){ EJ.toast("Bitmə tarixi başlanğıcdan kiçik ola bilməz.", "danger"); return; }
        if(amount==="" || Number(amount)<=0){ EJ.toast("Məbləği düzgün yaz.", "danger"); return; }

        const r = EJStore.addStudentPayment(courseId, studentId, { paidAt, amount, periodFrom, periodTo });
        if(!r.ok){ EJ.toast(r.error||"Xəta", "danger"); return; }
        EJ.toast("Ödəniş qeyd olundu.", "ok");
        render();
      };
    }

    // edit/delete handlers (delegation)
    page.querySelectorAll("[data-edit]").forEach(btn=>{
      btn.onclick = ()=>{
        if(frozen) return;
        const pid = btn.getAttribute("data-edit");
        const rec = (byStudent||[]).find(x=>x.id===pid);
        if(!rec) return;

        const d = new Date(rec.paidAt);
        const pad = (n)=>String(n).padStart(2,"0");
        const val = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

        EJ.modal({
          title: "Ödənişi redaktə et",
          okText: "Yadda saxla",
          cancelText: "Ləğv",
          bodyHTML: `
            <div class="field">
              <label>Başlanğıc tarix</label>
              <input type="date" id="editFrom" value="${EJ.escape((rec.periodFrom||val))}"/>
            </div>
            <div class="field mt12">
              <label>Bitmə tarixi</label>
              <input type="date" id="editTo" value="${EJ.escape((rec.periodTo||val))}"/>
            </div>
            <div class="field mt12">
              <label>Məbləğ (AZN)</label>
              <input type="number" min="0" step="0.01" id="editAmount" value="${EJ.escape(rec.amount??0)}"/>
            </div>
          `,
          onOk: ()=>{
            const periodFrom = document.getElementById("editFrom").value;
            const periodTo = document.getElementById("editTo").value;
            const paidAt = periodFrom;
            const amount = document.getElementById("editAmount").value;
            if(!periodFrom || !periodTo){ EJ.toast("Tarixləri doldur.", "danger"); return false; }
            if(new Date(periodTo) < new Date(periodFrom)){ EJ.toast("Bitmə tarixi başlanğıcdan kiçik ola bilməz.", "danger"); return false; }
            const rr = EJStore.updateStudentPayment(courseId, selected, pid, { paidAt, amount, periodFrom, periodTo });
            if(!rr.ok){ EJ.toast(rr.error||"Xəta", "danger"); return false; }
            EJ.toast("Yeniləndi.", "ok");
            render();
            return true;
          }
        });
      };
    });

    page.querySelectorAll("[data-del]").forEach(btn=>{
      btn.onclick = ()=>{
        if(frozen) return;
        const pid = btn.getAttribute("data-del");
        EJ.modal({
          title: "Ödənişi silmək",
          okText: "Hə",
          cancelText: "Yox",
          bodyHTML: `
            <div class="small" style="opacity:.9">
              Bu ödənişi silsən, tələbənin ödəniş tarixçəsindən çıxacaq. Davam edək?
            </div>
          `,
          onOk: ()=>{
            const rr = EJStore.deleteStudentPayment(courseId, selected, pid);
            if(!rr.ok){ EJ.toast("Silinmədi.", "danger"); return false; }
            EJ.toast("Silindi.", "ok");
            render();
            return true;
          }
        });
      };
    });

    // print/pdf
    const printEl = (elId)=>{
      const el = document.getElementById(elId);
      if(!el) return;
      const w = window.open("", "_blank");
      w.document.write(`<html><head><title>Print</title><link rel="stylesheet" href="style.css"></head><body>${el.outerHTML}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
    };

    document.getElementById("btnPrintAll").onclick = ()=> printEl("payAllWrap");
    document.getElementById("btnPrintStudent").onclick = ()=> printEl("payStudentWrap");

    const pdfEl = (elId, filename)=>{
      const el = document.getElementById(elId);
      if(!el || !window.html2pdf) { EJ.toast("PDF modulu yüklənmədi.", "danger"); return; }
      html2pdf().set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save();
    };

    document.getElementById("btnPdfAll").onclick = ()=> pdfEl("payAllWrap", `kurs-odenişler-${courseId}.pdf`);
    document.getElementById("btnPdfStudent").onclick = ()=> pdfEl("payStudentWrap", `telebe-odeniş-${selected}.pdf`);
  }

// ---------------- Settings ----------------

  function renderSettings(frozen){
    const c = getCourse();
    const contact = c?.contact || {};
    let logoData = (c && typeof c.logoDataUrl==="string") ? c.logoDataUrl : "";
    page.innerHTML = `
      ${header("Parametrlər", "Kurs məlumatlarını yenilə")}
      <div class="row">
        <div class="card p20 col" style="min-width:280px">
          <div style="font-weight:900">Kurs məlumatları</div>

          <div class="mt12">
            <label class="lbl">Kurs adı</label>
            <input class="input" id="s_name" value="${EJ.escape(c?.name||"")}"/>
          </div>

          <div class="mt12">
            <label class="lbl">Ünvan</label>
            <input class="input" id="s_addr" value="${EJ.escape(contact.address||"")}"/>
          </div>

          <div class="row mt12">
            <div class="col">
              <label class="lbl">Əlaqə nömrəsi</label>
              <input class="input" id="s_p1" value="${EJ.escape(contact.phone1||"")}"/>
            </div>
            <div class="col">
              <label class="lbl">Əlavə nömrə (könüllü)</label>
              <input class="input" id="s_p2" value="${EJ.escape(contact.phone2||"")}"/>
            </div>
          </div>

          <div class="mt12">
            <label class="lbl">Email</label>
            <input class="input" id="s_email" value="${EJ.escape(contact.email||"")}"/>
          </div>

          <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn solid" id="saveSet" ${frozen?"disabled":""}>Yadda saxla</button>
            <a class="btn" href="#/dashboard">Geri</a>
          </div>

          ${frozen ? `<div class="smallNote mt12">Sistem bloklu olduğu üçün parametrləri dəyişmək bağlıdır.</div>` : ``}
        </div>

        
        <div class="card p20 col" style="min-width:280px">
          <div style="font-weight:900">Kurs logosu</div>
          <div class="mt8 small" style="color:var(--sub)">Logo bütün panellərdə görünəcək (kurs admin / müəllim / tələbə).</div>

          <div class="logoPreviewBox mt12" id="logoPreview">
            ${logoData ? `<img alt="logo" src="${EJ.escape(logoData)}">` : `<span style="color:var(--sub);font-size:12px;opacity:.8">logo</span>`}
          </div>

          <div class="mt12">
            <label class="lbl">Logo yüklə (PNG/JPG)</label>
            <input class="input" id="logoFile" type="file" accept="image/*" ${frozen?"disabled":""} />
          </div>

          <div class="mt12" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" id="logoRemove" ${frozen?"disabled":""}>Logonu sil</button>
          </div>

          ${frozen ? `<div class="smallNote mt12">Sistem bloklu olduğu üçün logo dəyişmək bağlıdır.</div>` : ``}
        </div>

<div class="card p20 col">
          <div style="font-weight:900">Qeyd</div>
          <div class="mt12" style="color:var(--sub);font-size:13px;line-height:1.7">
            Burada yalnız kurs məlumatları dəyişir. <b>Status</b> və <b>bloklama</b> hüququ şirkət admin tərəfində qalır.
          </div>
        </div>
      </div>
    `;

    const logoFile = document.getElementById("logoFile");
    const logoPrev = document.getElementById("logoPreview");
    const logoRemove = document.getElementById("logoRemove");

    if(logoFile){
      logoFile.onchange = ()=>{
        const f = logoFile.files && logoFile.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          logoData = String(reader.result || "");
          if(logoPrev){
            logoPrev.innerHTML = logoData ? `<img src="${EJ.escape(logoData)}" alt="logo" style="width:100%;height:100%;object-fit:cover">`
                                          : `<span class="small" style="opacity:.7">logo</span>`;
          }
        };
        reader.readAsDataURL(f);
      };
    }

    if(logoRemove){
      logoRemove.onclick = ()=>{
        logoData = "";
        if(logoPrev) logoPrev.innerHTML = `<span class="small" style="opacity:.7">logo</span>`;
        if(logoFile) logoFile.value = "";
        EJ.toast("Logo silindi (yadda saxlamaq üçün Parametrlərdən Save et).", "info");
      };
    }


    const btn = document.getElementById("saveSet");
    if(btn){
      btn.onclick = ()=>{
        const patch = {
          name: EJ.$("#s_name").value.trim(),
          address: EJ.$("#s_addr").value.trim(),
          phone1: EJ.$("#s_p1").value.trim(),
          phone2: EJ.$("#s_p2").value.trim(),
          email: EJ.$("#s_email").value.trim(),
          logoDataUrl: logoData
        };
        const r = EJStore.courseAdminUpdateCourse(courseId, patch);
        if(!r.ok){
          EJ.toast(r.error || "Xəta.", "danger");
          return;
        }
        EJ.toast("Parametrlər yeniləndi.", "ok");
        render();
      };
    }
  }

  render();
})();
