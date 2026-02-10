// student.js
(function(){
    const courseId = EJStore.activeCourseId();
    const me = Auth.requireCourseLogin(courseId);
    if(!me) return;
    if(me.role!=="student"){ location.href="login.html"; return; }
  
    document.getElementById("meName").textContent = me.name;
    try{ const db=EJStore.load(); const c=(db.courses||[]).find(x=>x.id===courseId); EJ.setBrandLogo(document.querySelector('.brandLogo'), c||{name:'E-Jurnal'}); }catch(e){}

    // Kurs adı/ID göstəricisi (sidebar + mobil topbar)
    function setCourseLabels(){
      try{
        const db = EJStore.load();
        const c = (db.courses||[]).find(x=>x.id===courseId);
        const label = c ? `${c.name} • ${c.id}` : (courseId || "-");
        const el1 = document.getElementById("courseName");
        if(el1) el1.textContent = label;
        const el2 = document.getElementById("mCourseName");
        if(el2) el2.textContent = label;
      }catch(e){}
    }
    setCourseLabels();

    document.getElementById("logoutBtn").onclick = ()=>{
      EJStore.courseLogout(courseId);
      EJ.toast("Çıxış edildi.", "ok");
      location.href="login.html";
    };
  
    const page = document.getElementById("page");
    const daysAZ = { Mon:"B.e", Tue:"Ç.a", Wed:"Ç", Thu:"C.a", Fri:"C", Sat:"Ş", Sun:"B" };
  
    function header(title, subtitle){
      return `
        <div class="topbar">
          <div class="title">
            <h2>${EJ.escape(title)}</h2>
            <p>${EJ.escape(subtitle)}</p>
          </div>
        </div>
      `;
    }
  
    function getCdb(){
      const db = EJStore.load();
      return db.courseData[courseId];
    }
  
    function render(){
      Auth.applyFreezeIfNeeded(courseId);
      const raw = location.hash || "#/teachers";
      const route = raw.split("?")[0];
      document.getElementById("navT").classList.toggle("active", route==="#/teachers");
      document.getElementById("navSch").classList.toggle("active", route==="#/schedule");
      document.getElementById("navAtt").classList.toggle("active", route==="#/attendance");
      document.getElementById("navMat").classList.toggle("active", route==="#/materials");
      document.getElementById("navGr").classList.toggle("active", route==="#/grades");
      document.getElementById("navAnn").classList.toggle("active", route==="#/announcements");
      document.getElementById("navPay").classList.toggle("active", route==="#/payments");
      const navProf = document.getElementById("navProf");
      if(navProf) navProf.classList.toggle("active", route==="#/profile");
      const navSyl = document.getElementById("navSyl");
      if(navSyl) navSyl.classList.toggle("active", route==="#/syllabus");

      if(route==="#/schedule") return renderSchedule();
      if(route==="#/attendance") return renderAttendance();
      if(route==="#/materials") return renderMaterials();
      if(route==="#/grades") return renderGrades();
      if(route==="#/announcements") return renderAnnouncements();
      if(route==="#/payments") return renderPayments();
      if(route==="#/syllabus") return renderSyllabus();
      if(route==="#/profile") return renderProfile();
      return renderTeachers();
    }
    window.addEventListener("hashchange", render);
  

    // ---------- Helpers ----------
    const isoDate = (d)=> {
      const dt = d instanceof Date ? d : new Date(d||Date.now());
      const y = dt.getFullYear();
      const m = String(dt.getMonth()+1).padStart(2,"0");
      const da = String(dt.getDate()).padStart(2,"0");
      return `${y}-${m}-${da}`;
    };

    function myRooms(cdb){
      return (cdb.rooms||[]).filter(r=>Array.isArray(r.studentIds) && r.studentIds.includes(me.id));
    }

    function roomPickForStudent(rooms, selectedId, hashBase){
      return `
        <div class="card p16" style="background:rgba(255,255,255,.03)">
          <div class="row" style="align-items:center">
            <div class="col" style="min-width:240px">
              <div class="smallNote">Otaq seç</div>
              <select class="input" id="roomPick">
                ${rooms.map(r=>`<option value="${EJ.escape(r.id)}" ${r.id===selectedId?'selected':''}>${EJ.escape(r.name)} (${EJ.escape(r.id)})</option>`).join("")}
              </select>
            </div>
            <div class="col" style="min-width:240px">
              <div class="smallNote">Məlumat</div>
              <div class="small" style="opacity:.75">Yalnız daxil olduğunuz otaqlar görünür.</div>
            </div>
          </div>
        </div>
      `;
    }

    function bindRoomPick(hashBase){
      const sel = document.getElementById("roomPick");
      if(!sel) return;
      sel.onchange = ()=>{ location.hash = `${hashBase}?room=${encodeURIComponent(sel.value)}`; };
    }

    // ---------- Attendance ----------
    function renderAttendance(){
      const cdb = getCdb();
      const rooms = myRooms(cdb);
      if(!rooms.length){
        page.innerHTML = `${header("Davamiyyət", "Hələ otağa əlavə olunmamısınız.")}<div class="card p20">Sizə aid otaq tapılmadı.</div>`;
        return;
      }
      const params = new URLSearchParams((location.hash.split("?")[1]||""));
      const rid = params.get("room") || rooms[0].id;
      const room = rooms.find(r=>r.id===rid) || rooms[0];

      // build attendance rows for this room
      const recs = (cdb.attendance||[]).filter(a=>a.roomId===room.id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const rows = recs.map(r=>{
        const it = (r.items||[]).find(x=>x.studentId===me.id);
        const st = it ? it.status : "";
        return { date:r.date, status: st };
      }).filter(x=>x.status);

      let p=0,a=0,l=0;
      rows.forEach(x=>{ if(x.status==="P") p++; else if(x.status==="A") a++; else if(x.status==="L") l++; });
      const total = rows.length || 0;
      const pct = total ? Math.round((p/total)*100) : 0;

      const statusBadge = (s)=> s==="P" ? `<span class="badge ok">+</span>` : s==="A" ? `<span class="badge danger">-</span>` : `<span class="badge">L</span>`;

      page.innerHTML = `
        ${header("Davamiyyət", "Davamiyyətiniz və gecikmələriniz burada görünür.")}
        ${roomPickForStudent(rooms, room.id, "#/attendance")}
        <div class="card p20 mt16">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div>
              <div style="font-weight:900;font-size:18px">${EJ.escape(room.name)}</div>
              <div class="smallNote mt6">Statistika son qeyd olunan dərslərə əsaslanır.</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="badge ok">İştirak: ${p}</span>
              <span class="badge danger">Qayıb: ${a}</span>
              <span class="badge">Gecikmə: ${l}</span>
              <span class="badge">${pct}%</span>
            </div>
          </div>

          <div class="mt16">
            <table class="table">
              <thead><tr><th>Tarix</th><th>Status</th></tr></thead>
              <tbody>
                ${
                  rows.length ? rows.map(r=>`
                    <tr>
                      <td>${EJ.escape(r.date)}</td>
                      <td>${statusBadge(r.status)} <span class="small" style="margin-left:8px;opacity:.85">${r.status==="P"?"İştirak etdi":r.status==="A"?"İştirak etmədi":"Gecikdi"}</span></td>
                    </tr>
                  `).join("") : `<tr><td colspan="2" style="color:var(--sub)">Bu otaq üzrə davamiyyət qeyd olunmayıb.</td></tr>`
                }
              </tbody>
            </table>
            <div class="smallNote mt10">+ iştirak etdi • - iştirak etmədi • L gecikdi</div>
          </div>
        </div>
      `;
      bindRoomPick("#/attendance");
    }

    // ---------- Materials ----------
    function renderMaterials(){
      const cdb = getCdb();
      const rooms = myRooms(cdb);
      if(!rooms.length){
        page.innerHTML = `${header("Materiallar", "Hələ otağa əlavə olunmamısınız.")}<div class="card p20">Sizə aid otaq tapılmadı.</div>`;
        return;
      }
      const params = new URLSearchParams((location.hash.split("?")[1]||""));
      const rid = params.get("room") || rooms[0].id;
      const room = rooms.find(r=>r.id===rid) || rooms[0];
      const mats = Array.isArray(room.materials)?room.materials:[];

      const openMat = (m)=>{
        if(m.type==="link"){ window.open(m.url, "_blank"); return; }
        if(m.dataUrl) window.open(m.dataUrl, "_blank");
      };
      const downloadMat = (m)=>{
        if(m.type==="link"){ window.open(m.url, "_blank"); return; }
        const a=document.createElement("a");
        a.href=m.dataUrl; a.download=m.fileName||"material";
        document.body.appendChild(a); a.click(); a.remove();
      };

      page.innerHTML = `
        ${header("Materiallar", "Müəllimin paylaşdığı fayl və linklər.")}
        ${roomPickForStudent(rooms, room.id, "#/materials")}
        <div class="card p20 mt16">
          <div style="font-weight:900;font-size:18px">${EJ.escape(room.name)}</div>
          <div class="mt16">
            <table class="table">
              <thead><tr><th>Başlıq</th><th>Tip</th><th>Tarix</th><th style="text-align:right">Aç</th></tr></thead>
              <tbody>
                ${
                  mats.length ? mats.map(m=>`
                    <tr>
                      <td style="font-weight:800">${EJ.escape(m.title||"Material")}</td>
                      <td><span class="badge">${m.type==="link"?"Link":"Fayl"}</span></td>
                      <td class="small">${new Date(m.createdAt||Date.now()).toLocaleString()}</td>
                      <td style="text-align:right;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
                        <button class="btn" data-mv="${EJ.escape(m.id)}">Bax</button>
                        <button class="btn solid" data-md="${EJ.escape(m.id)}">Endir</button>
                      </td>
                    </tr>
                  `).join("") : `<tr><td colspan="4" style="color:var(--sub)">Bu otaqda material yoxdur.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      `;

      bindRoomPick("#/materials");

      page.querySelectorAll("[data-mv]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const id=b.getAttribute("data-mv");
          const m=mats.find(x=>x.id===id);
          if(m) openMat(m);
        });
      });
      page.querySelectorAll("[data-md]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const id=b.getAttribute("data-md");
          const m=mats.find(x=>x.id===id);
          if(m) downloadMat(m);
        });
      });
    }

    // ---------- Grades ----------
    function renderGrades(){
      const cdb = getCdb();
      const grades = (Array.isArray(cdb.grades)?cdb.grades:[]).filter(g=>g.studentId===me.id);
      const roomsById = new Map((cdb.rooms||[]).map(r=>[r.id,r]));
      page.innerHTML = `
        ${header("Qiymətlər", "Yalnız sizin qiymətləriniz görünür.")}
        <div class="card p20">
          <table class="table">
            <thead><tr><th>Otaq</th><th>Başlıq</th><th>Tarix</th><th>Bal</th></tr></thead>
            <tbody>
              ${
                grades.length ? grades.map(g=>`
                  <tr>
                    <td>${EJ.escape((roomsById.get(g.roomId)?.name)||g.roomId)} <span class="badge">${EJ.escape(g.roomId)}</span></td>
                    <td style="font-weight:800">${EJ.escape(g.title||"")}</td>
                    <td class="small">${EJ.escape(g.date||"")}</td>
                    <td><span class="badge ok">${EJ.escape(String(g.score))}</span></td>
                  </tr>
                `).join("") : `<tr><td colspan="4" style="color:var(--sub)">Hələ qiymət yoxdur.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
    }

    // ---------- Announcements ----------
    function renderAnnouncements(){
      const cdb = getCdb();
      const rooms = myRooms(cdb);
      const roomIds = new Set(rooms.map(r=>r.id));
      const anns = (Array.isArray(cdb.announcements)?cdb.announcements:[]).filter(a=>!a.roomId || roomIds.has(a.roomId));

      const roomsById = new Map((cdb.rooms||[]).map(r=>[r.id,r]));

      page.innerHTML = `
        ${header("Bildirişlər", "Müəllimin paylaşımları.")}
        <div class="card p20">
          <div style="display:flex;flex-direction:column;gap:10px">
            ${
              anns.length ? anns.map(a=>`
                <div class="card p16" style="background:rgba(255,255,255,.03)">
                  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
                    <div>
                      <div style="font-weight:900">${EJ.escape(a.title||"Elan")}</div>
                      <div class="smallNote mt6">
                        ${a.roomId ? `Otaq: <b>${EJ.escape((roomsById.get(a.roomId)?.name)||a.roomId)}</b> • ` : ""}
                        ${new Date(a.createdAt||Date.now()).toLocaleString()}
                      </div>
                    </div>
                    ${a.roomId?`<span class="badge">${EJ.escape(a.roomId)}</span>`:`<span class="badge ok">Ümumi</span>`}
                  </div>
                  <div class="mt10 small" style="line-height:1.7;opacity:.9">${EJ.escape(a.text||"")}</div>
                </div>
              `).join("") : `<div style="color:var(--sub)">Bildiriş yoxdur.</div>`
            }
          </div>
        </div>
      `;
    }

    function renderTeachers(){
      const cdb = getCdb();
      const teachers = cdb.users.filter(u=>u.role==="teacher");
  
      page.innerHTML = `
        ${header("Müəllimlər", "Müəllim profil məlumatları görünür")}
        <div class="row">
          ${teachers.length ? teachers.map(t=>{
            const p = t.profile || {};
            return `
              <div class="card p20 col" style="min-width:280px">
                <div style="display:flex;gap:12px">
                  <div style="width:92px;height:120px;border-radius:14px;border:1px solid var(--border);overflow:hidden;background:var(--surface)">
                    ${p.photoDataUrl ? `<img src="${p.photoDataUrl}" alt="photo" style="width:100%;height:100%;object-fit:cover">` : `<div style="padding:10px;color:var(--sub);font-size:12px">3x4 şəkil</div>`}
                  </div>
                  <div style="flex:1">
                    <div style="font-weight:900;font-size:16px">${EJ.escape(t.name)}</div>
                    <div class="badge mt8">${EJ.escape(p.subjects||"-")}</div>
                    <div class="mt12" style="color:var(--sub);font-size:13px;line-height:1.6">
                      Təhsil: ${EJ.escape(p.uni||"-")} <br>
                      Əlaqə: ${EJ.escape(p.phone||"-")} <br>
                      Email: ${EJ.escape(p.email||"-")}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join("") : `<div class="card p20">Müəllim yoxdur.</div>`}
        </div>
      `;
    }
  
    function renderSchedule(){
      const cdb = getCdb();
      page.innerHTML = `
        ${header("Dərs cədvəli", "Kursun ümumi cədvəli")}
        <div class="card p20">
          <table class="table">
            <thead><tr><th>Fənn</th><th>Gün</th><th>Saat</th><th>Otaq</th></tr></thead>
            <tbody>
              ${(cdb.schedule||[]).length ? (cdb.schedule||[]).map(s=>`
                <tr>
                  <td style="font-weight:800">${EJ.escape(s.subject)}</td>
                  <td>${EJ.escape(daysAZ[s.day]||s.day)}</td>
                  <td>${EJ.escape(s.time)}</td>
                  <td>${EJ.escape(s.room||"-")}</td>
                </tr>
              `).join("") : `<tr><td colspan="4" style="color:var(--sub)">Cədvəl yoxdur.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    }
  
    render();
  

    function renderSyllabus(){
      const cdb = getCdb();
      const rooms = (cdb.rooms||[]).filter(r => Array.isArray(r.studentIds) && r.studentIds.includes(me.id));
      const byTeacher = new Map((cdb.users||[]).filter(u=>u.role==="teacher").map(u=>[u.id,u]));
      const cards = rooms.length ? rooms.map(r=>{
        const t = byTeacher.get(r.teacherId);
        const syl = r.syllabus || null;
        const status = syl ? `<span class="badge ok">Yüklənib</span>` : `<span class="badge">Yoxdur</span>`;
        const fileLine = syl ? `<div class="small mt6">Fayl: <b>${EJ.escape(syl.fileName||"sillabus")}</b></div>` : `<div class="small mt6" style="opacity:.85">Bu otaq üçün sillabus hələ yüklənməyib.</div>`;
        const btns = syl ? `
          <div class="mt10" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn solid" data-view="${EJ.escape(r.id)}">Bax</button>
            <button class="btn" data-dl="${EJ.escape(r.id)}">Endir</button>
          </div>` : ``;
        return `
          <div class="card p16 mt12">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-weight:900">${EJ.escape(r.name||"Otaq")}</div>
                <div class="small">Müəllim: ${EJ.escape(t?.name||"—")}</div>
              </div>
              <div>${status}</div>
            </div>
            ${fileLine}
            ${btns}
          </div>
        `;
      }).join("") : `<div class="card p20 mt12"><div class="small" style="opacity:.85;line-height:1.7">Siz heç bir otağa əlavə olunmamısınız.</div></div>`;

      page.innerHTML = `
        ${header("Sillabus", "Yalnız əlavə olunduğunuz otaqların sillabusunu görə bilərsiniz.")}
        ${cards}
      `;

      // handlers
      page.querySelectorAll("[data-view]").forEach(btn=>{
        btn.onclick = ()=>{
          const rid = btn.getAttribute("data-view");
          const room = (cdb.rooms||[]).find(x=>x.id===rid);
          const syl = room?.syllabus;
          if(!syl || !syl.dataUrl) return EJ.toast("Sillabus tapılmadı.", "danger");
          window.open(syl.dataUrl, "_blank");
        };
      });
      page.querySelectorAll("[data-dl]").forEach(btn=>{
        btn.onclick = ()=>{
          const rid = btn.getAttribute("data-dl");
          const room = (cdb.rooms||[]).find(x=>x.id===rid);
          const syl = room?.syllabus;
          if(!syl || !syl.dataUrl) return EJ.toast("Sillabus tapılmadı.", "danger");
          const a = document.createElement("a");
          a.href = syl.dataUrl;
          a.download = syl.fileName || "sillabus";
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
      });
    }

;
  

    const fmtDate = (iso)=>{
      if(!iso) return "-";
      try{
        const d = new Date(iso);
        // if it's YYYY-MM-DD, keep
        if(/\d{4}-\d{2}-\d{2}/.test(String(iso)) && String(iso).length<=10) return String(iso);
        return d.toLocaleDateString("az-AZ", { year:"numeric", month:"2-digit", day:"2-digit" });
      }catch{ return String(iso); }
    };



    function renderPayments(){
      const db = EJStore.load();
      const c = (db.courses||[]).find(x=>x.id===courseId) || { name:"Kurs" };
      const cdb = getCdb();

      const all = (EJStore.listStudentPayments(courseId, me.id).payments || []).slice()
        .sort((a,b)=>(b.paidAt||"").localeCompare(a.paidAt||""));

      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
      const paidThisMonth = all.some(p=>p.month===ym);

      const statusBadge = paidThisMonth ? `<span class="badge ok">Ödənildi</span>` : `<span class="badge danger">Ödənilməyib</span>`;

      const rows = all.length ? all.map(p=>`
        <tr>
          <td>${(new Date(p.paidAt)).toLocaleDateString()}</td>
          <td>${EJ.escape(p.month||"-")}</td>
          <td>${EJ.escape((p.amount??0))} AZN</td>
          <td><span class="badge ok">Ödənildi</span></td>
        </tr>
      `).join("") : `<tr><td colspan="4" class="small" style="opacity:.8">Hələ ödəniş yoxdur.</td></tr>`;

      page.innerHTML = `
        ${header("Ödənişlər", "Aylıq ödəniş statusu və tarixçə")}
        <div class="card p20">
          <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
            <div>
              <div style="font-weight:900">Bu ay (${EJ.escape(ym)})</div>
              <div class="small">Status: ${statusBadge}</div>
            </div>
            <div>
              <button class="btn solid" id="btnHistory">Ödəniş tarixçəsi</button>
            </div>
          </div>
        </div>

        <div class="card p20 mt16">
          <div style="font-weight:900">Son ödənişlər</div>
          <div class="small">Son 5 qeyd</div>
          <div class="tableWrap mt12">
            <table class="table">
              <thead>
                <tr><th>Tarix</th><th>Ay</th><th>Məbləğ</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${(all.slice(0,5).length ? all.slice(0,5).map(p=>`
                  <tr>
                    <td>${(new Date(p.paidAt)).toLocaleDateString()}</td>
                    <td>${EJ.escape(p.month||"-")}</td>
                    <td>${EJ.escape((p.amount??0))} AZN</td>
                    <td><span class="badge ok">Ödənildi</span></td>
                  </tr>
                `).join("") : `<tr><td colspan="4" class="small" style="opacity:.8">Hələ ödəniş yoxdur.</td></tr>`)}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const btn = document.getElementById("btnHistory");
      if(btn){
        btn.onclick = ()=>{
          EJ.modal({
            title: "Ödəniş tarixçəsi",
            okText: "Bağla",
            cancelText: " ",
            bodyHTML: `
              <div class="tableWrap">
                <table class="table">
                  <thead>
                    <tr><th>Tarix</th><th>Ay</th><th>Məbləğ</th><th>Status</th></tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            `,
            onOk: ()=> true
          });
          // hide cancel button if exists
          const cancel = document.querySelector(".modal [data-cancel]");
          if(cancel) cancel.style.display="none";
        };
      }
    }


    // ---------- Profile ----------
    function renderProfile(){
      const cdb = getCdb();
      const rooms = myRooms(cdb);
      const byTeacher = new Map((cdb.users||[]).filter(u=>u.role==="teacher").map(u=>[u.id,u]));
      const p = me.profile || {};

      // Attendance stats across all my rooms
      const roomIds = new Set(rooms.map(r=>r.id));
      let P=0,A=0,L=0,total=0;
      const attRows = [];
      (cdb.attendance||[]).forEach(rec=>{
        if(!roomIds.has(rec.roomId)) return;
        (rec.items||[]).forEach(it=>{
          if(String(it.studentId) !== String(me.id)) return;
          const st = String(it.status||"P");
          total++;
          if(st==="P") P++;
          else if(st==="A") A++;
          else if(st==="L") L++;
          attRows.push({ date: rec.date, roomId: rec.roomId, status: st });
        });
      });
      attRows.sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")));

      const percent = total ? Math.round((P/total)*100) : 0;

      // Payments
      const payStatus = EJStore.getStudentPaymentStatus(courseId, me.id);
      const pay = EJStore.listStudentPayments(courseId, me.id);
      const payList = (pay.ok?pay.payments:[]);
      const lastPay = payStatus.ok ? payStatus.lastPayment : null;

      // Grades
      const grades = (cdb.grades||[]).filter(g=>String(g.studentId)===String(me.id));
      grades.sort((a,b)=> String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||"")));
      const avg = grades.length ? Math.round(grades.reduce((s,x)=>s+(Number(x.score)||0),0)/grades.length) : null;
      const lastGrade = grades[0] || null;

      // Announcements (last 5) for my rooms
      const anns = (cdb.announcements||[]).filter(a=>!a.roomId || roomIds.has(a.roomId));
      anns.sort((a,b)=> String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      const annTop = anns.slice(0,5);

      // Syllabus/material counts
      const sylCount = rooms.filter(r=>r.syllabus && r.syllabus.dataUrl).length;
      let matCount = 0;
      rooms.forEach(r=>{ matCount += Array.isArray(r.materials)? r.materials.length : 0; });

      const roomListHTML = rooms.length ? rooms.map(r=>{
        const t = byTeacher.get(r.teacherId);
        const hasSyl = !!(r.syllabus && r.syllabus.dataUrl);
        return `
          <div class="card p16 mt12" style="background:rgba(255,255,255,.03)">
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
              <div>
                <div style="font-weight:900">${EJ.escape(r.name)}</div>
                <div class="small mt6">Müəllim: <b>${EJ.escape(t?.name||"-")}</b> • Otaq ID: <b>${EJ.escape(r.id)}</b></div>
                <div class="mt8">
                  ${hasSyl?`<span class="badge ok">Sillabus var</span>`:`<span class="badge">Sillabus yoxdur</span>`}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <a class="btn solid" href="#/syllabus">Sillabus</a>
                <a class="btn" href="#/materials?room=${encodeURIComponent(r.id)}">Materiallar</a>
              </div>
            </div>
          </div>
        `;
      }).join("") : `<div class="card p16 mt12" style="color:var(--sub)">Hələ otağa əlavə olunmamısınız.</div>`;

      const attTable = attRows.length ? attRows.slice(0,12).map(r=>{
        const room = rooms.find(x=>x.id===r.roomId);
        const st = r.status==="P" ? `<span class="badge ok">+</span>` : (r.status==="A" ? `<span class="badge danger">-</span>` : `<span class="badge">L</span>`);
        return `<tr><td>${EJ.escape(r.date)}</td><td>${EJ.escape(room?.name||r.roomId)}</td><td>${st}</td></tr>`;
      }).join("") : `<tr><td colspan="3" class="small" style="opacity:.8">Hələ davamiyyət qeydi yoxdur.</td></tr>`;

      const payBadge = (!payStatus.ok || payStatus.status==="unpaid") ? `<span class="badge danger">Ödənilməyib</span>` :
        (payStatus.status==="paid" ? `<span class="badge ok">Ödənildi</span>` : `<span class="badge danger">Borc var</span>`);

      const debtLine = (payStatus.ok && payStatus.status==="debt") ? `<div class="small mt6" style="opacity:.9">Borc başlanğıcı: <b>${EJ.escape(payStatus.debtFrom||"-")}</b> • Gecikmə: <b>${EJ.escape(String(payStatus.overdueDays||0))} gün</b></div>` : ``;

      const payMini = payList.length ? payList.slice(0,5).map(p=>{
        const from = EJ.escape(p.periodFrom||"-");
        const to = EJ.escape(p.periodTo||"-");
        const amt = EJ.escape(String(p.amount??0));
        const paidAt = EJ.escape((p.paidAt||"").slice(0,10) || "-");
        return `<tr><td>${paidAt}</td><td>${from} → ${to}</td><td>${amt} AZN</td></tr>`;
      }).join("") : `<tr><td colspan="3" class="small" style="opacity:.8">Hələ ödəniş yoxdur.</td></tr>`;

      const gradesMini = grades.length ? grades.slice(0,6).map(g=>{
        const room = rooms.find(x=>x.id===g.roomId) || (cdb.rooms||[]).find(x=>x.id===g.roomId);
        return `<tr><td>${EJ.escape(g.date||"-")}</td><td>${EJ.escape(g.title||"Qiymət")}</td><td>${EJ.escape(room?.name||g.roomId)}</td><td><b>${EJ.escape(String(g.score))}</b></td></tr>`;
      }).join("") : `<tr><td colspan="4" class="small" style="opacity:.8">Hələ qiymət yoxdur.</td></tr>`;

      const annMini = annTop.length ? annTop.map(a=>{
        const room = (cdb.rooms||[]).find(x=>x.id===a.roomId);
        return `<div class="card p16 mt12" style="background:rgba(255,255,255,.03)">
          <div style="font-weight:900">${EJ.escape(a.title||"Bildiriş")}</div>
          <div class="small mt6" style="opacity:.85">${EJ.escape(a.message||"")}</div>
          <div class="small mt8">Otaq: <b>${EJ.escape(room?.name||"Ümumi")}</b> • ${EJ.escape((a.createdAt||"").slice(0,16).replace("T"," "))}</div>
        </div>`;
      }).join("") : `<div class="card p16 mt12" style="color:var(--sub)">Bildiriş yoxdur.</div>`;

      page.innerHTML = `
        ${header("Profilim", "Ümumi baxış və şəxsi məlumatlar")}
        <div class="card p20">
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div class="avatar" style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-weight:900">
              ${EJ.escape((me.name||"T").slice(0,1))}
            </div>
            <div>
              <div style="font-weight:900;font-size:18px">${EJ.escape(me.name)}</div>
              <div class="small mt6">ID: <b>${EJ.escape(me.id)}</b> • Qrup: <b>${EJ.escape(p.group||p.level||"-")}</b></div>
            </div>
          </div>

          <div class="statsGrid">
            <div class="statCard"><div class="k">Otaqlarım</div><div class="v">${rooms.length}</div></div>
            <div class="statCard"><div class="k">Davamiyyət</div><div class="v">${percent}%</div></div>
            <div class="statCard"><div class="k">Ödəniş statusu</div><div class="v" style="font-size:16px">${payBadge}</div></div>
          </div>

          <div class="mt16 kv">
            <div><b>Telefon</b></div><div>${EJ.escape(p.phone||"-")}</div>
            <div><b>Valideyn nömrəsi</b></div><div>${EJ.escape(p.parentPhone||"-")}</div>
            <div><b>Yaş / Cins</b></div><div>${EJ.escape(p.age||"-")} • ${EJ.escape(p.gender||"-")}</div>
            <div><b>Fənn(lər)</b></div><div>${EJ.escape(p.subjects||"-")}</div>
          </div>
        </div>

        <div class="row mt16">
          <div class="card p20 col">
            <div class="sectionTitle">Davamiyyət</div>
            <div class="small" style="opacity:.85">İştirak: <b>${P}</b> • Qayıb: <b>${A}</b> • Gecikdi: <b>${L}</b> • Ümumi: <b>${total}</b></div>
            <div class="tableWrap mt12">
              <table class="table">
                <thead><tr><th>Tarix</th><th>Otaq</th><th>Status</th></tr></thead>
                <tbody>${attTable}</tbody>
              </table>
            </div>
            <div class="mt12" style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn" href="#/attendance">Hamısını gör</a>
            </div>
          </div>

          <div class="card p20 col">
            <div class="sectionTitle">Ödəniş</div>
            <div class="mt6">${payBadge}</div>
            ${debtLine}
            <div class="tableWrap mt12">
              <table class="table">
                <thead><tr><th>Tarix</th><th>Dövr</th><th>Məbləğ</th></tr></thead>
                <tbody>${payMini}</tbody>
              </table>
            </div>
            <div class="mt12" style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn" href="#/payments">Tarixçə</a>
            </div>
          </div>
        </div>

        <div class="row mt16">
          <div class="card p20 col">
            <div class="sectionTitle">Mənim otaqlarım</div>
            <div class="small" style="opacity:.85">Sillabus olan otaqlar: <b>${sylCount}</b> • Material sayı: <b>${matCount}</b></div>
            ${roomListHTML}
          </div>

          <div class="card p20 col">
            <div class="sectionTitle">Materiallar & Sillabus</div>
            <div class="small" style="opacity:.85">Sillabus və materiallara sürətli keçid.</div>
            <div class="mt12" style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn solid" href="#/syllabus">Sillabuslarım</a>
              <a class="btn" href="#/materials">Materiallarım</a>
            </div>
            <div class="smallNote mt12">Materiallar yalnız müəllim tərəfindən əlavə olunur.</div>
          </div>
        </div>

        <div class="card p20 mt16">
          <div class="sectionTitle">Qiymətlər</div>
          <div class="small" style="opacity:.85">
            ${avg!==null?`Orta bal: <b>${avg}</b> • Son bal: <b>${EJ.escape(String(lastGrade?.score??"-"))}</b>`:"Hələ qiymət daxil edilməyib."}
          </div>
          <div class="tableWrap mt12">
            <table class="table">
              <thead><tr><th>Tarix</th><th>Ad</th><th>Otaq</th><th>Bal</th></tr></thead>
              <tbody>${gradesMini}</tbody>
            </table>
          </div>
          <div class="mt12" style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn" href="#/grades">Hamısını gör</a>
          </div>
        </div>

        <div class="card p20 mt16">
          <div class="sectionTitle">Bildirişlər</div>
          ${annMini}
          <div class="mt12" style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn" href="#/announcements">Hamısını gör</a>
          </div>
        </div>
      `;
    }


})();



function initStudentSidebarDrawer(){
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("drawerOverlay");
  const burger = document.getElementById("mBurger");

  if(!sidebar || !overlay || !burger) return;

  const logoutDesktop = document.getElementById("logoutBtn");
  const logoutMobile = document.getElementById("mLogoutBtn");

  function openDrawer(){
    sidebar.classList.add("open");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    burger.setAttribute("aria-expanded","true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer(){
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
    burger.setAttribute("aria-expanded","false");
    document.body.style.overflow = "";
  }

  burger.addEventListener("click", ()=>{
    if(sidebar.classList.contains("open")) closeDrawer();
    else openDrawer();
  });

  overlay.addEventListener("click", closeDrawer);

  // mobil logout desktop logout-un aynısı olsun
  if(logoutMobile && logoutDesktop){
    logoutMobile.onclick = logoutDesktop.onclick;
  }

  // mobil drawer içində linkə klikləyən kimi bağlansın
  const nav = document.getElementById("studentNav");
  if(nav){
    nav.addEventListener("click", (e)=>{
      const a = e.target.closest("a");
      if(a && window.matchMedia("(max-width: 960px)").matches){
        closeDrawer();
      }
    });
  }

  // route dəyişəndə də bağlansın (hashchange)
  window.addEventListener("hashchange", ()=>{
    if(window.matchMedia("(max-width: 960px)").matches) closeDrawer();
  });
}

// student.js-də bir dəfə çağır:
initStudentSidebarDrawer();
