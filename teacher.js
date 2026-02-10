// teacher.js
(function(){
  const courseId = EJStore.activeCourseId();
  const me = Auth.requireCourseLogin(courseId);
  if(!me) return;
  if(me.role!=="teacher"){ location.href="login.html"; return; }

  document.getElementById("meName").textContent = me.name;
  try{
    const db=EJStore.load();
    const c=(db.courses||[]).find(x=>x.id===courseId);
    EJ.setBrandLogo(document.querySelector('.brandLogo'), c||{name:'E-Jurnal'});
  }catch(e){}

  // Kurs adı/ID göstəricisi (sidebar)
  function setCourseLabel(){
    try{
      const db = EJStore.load();
      const c = (db.courses||[]).find(x=>x.id===courseId);
      const label = c ? `${c.name} • ${c.id}` : (courseId || "-");
      const el = document.getElementById("courseName");
      if(el) el.textContent = label;
    }catch(e){}
  }
  setCourseLabel();

  document.getElementById("logoutBtn").onclick = ()=>{
    EJStore.courseLogout(courseId);
    EJ.toast("Çıxış edildi.", "ok");
    location.href="login.html";
  };

  const page = document.getElementById("page");

  function header(title, subtitle){
    return `
      <div class="topbar">
        <div class="title">
          <h2>${EJ.escape(title)}</h2>
          <p>${EJ.escape(subtitle||"")}</p>
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
    const frozen = (EJStore.courseStatus(courseId)==="suspended");
    const raw = location.hash || "#/rooms";
    const route = raw.split("?")[0]; // keep compatibility
    document.getElementById("navRooms").classList.toggle("active", route==="#/rooms");
    document.getElementById("navAtt").classList.toggle("active", route==="#/attendance");
    document.getElementById("navAttHist").classList.toggle("active", route==="#/attendance-history");
    document.getElementById("navMat").classList.toggle("active", route==="#/materials");
    document.getElementById("navGr").classList.toggle("active", route==="#/grades");
    document.getElementById("navAnn").classList.toggle("active", route==="#/announcements");
    document.getElementById("navP").classList.toggle("active", route==="#/profile");

    if(route==="#/profile") return renderProfile();
    if(route==="#/attendance") return renderAttendance(frozen);
    if(route==="#/attendance-history") return renderAttendanceHistory(frozen);
    if(route==="#/materials") return renderMaterials(frozen);
    if(route==="#/grades") return renderGrades(frozen);
    if(route==="#/announcements") return renderAnnouncements(frozen);
    return renderRooms(frozen);
  }
  window.addEventListener("hashchange", render);

  function teacherRooms(cdb){
    return (cdb.rooms||[]).filter(r=>String(r.teacherId||"")===String(me.id));
  }

  function renderRooms(frozen){
    const cdb = getCdb();
    const rooms = teacherRooms(cdb);

    // pick selected room
    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    const selectedId = params.get("room") || (rooms[0]?.id || "");
    const selected = rooms.find(r=>r.id===selectedId) || rooms[0] || null;

    const studentsById = new Map((cdb.users||[]).filter(u=>u.role==="student").map(u=>[u.id,u]));

    const roomStudents = (room)=>{
      if(!room) return [];
      const ids = Array.isArray(room.studentIds)? room.studentIds : [];
      return ids.map(id=>studentsById.get(id)).filter(Boolean);
    };

    const students = roomStudents(selected);

    page.innerHTML = `
      ${header("Dərs otaqları", "Sizə təyin olunan otaqları görürsünüz. Otağı silmək olmaz.")}
      <div class="row">
        <div class="card p20 col" style="min-width:280px;max-width:360px">
          <div style="font-weight:900">Otaqlarım</div>
          <div class="mt12" style="display:flex;flex-direction:column;gap:10px">
            ${
              rooms.length ? rooms.map(r=>`
                <a class="btn ${selected && r.id===selected.id ? 'solid' : ''}" style="justify-content:flex-start"
                   href="#/rooms?room=${encodeURIComponent(r.id)}">
                  <span style="font-weight:900">${EJ.escape(r.name)}</span>
                </a>
              `).join("") : `<div style="color:var(--sub);font-size:13px;line-height:1.6">Sizə təyin olunmuş otaq yoxdur.</div>`
            }
          </div>
        </div>

        <div class="card p20 col">
          ${
            selected ? `
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
                <div>
                  <div style="font-weight:900;font-size:18px">${EJ.escape(selected.name)}</div>
                  <div class="smallNote mt6">Otaq ID: <b>${EJ.escape(selected.id)}</b></div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <button class="btn" id="renameRoomBtn" ${frozen?"disabled":""}>Adı dəyiş</button>
                </div>
              </div>

              
              <div class="mt16 card p16" style="background:rgba(255,255,255,.03)">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
                  <div>
                    <div style="font-weight:900">Sillabus (PDF/DOCX)</div>
                    <div class="small">Maksimum 8MB • Yalnız PDF və DOCX</div>
                  </div>
                  <div id="syllStatus">
                    ${selected.syllabus ? `<span class="badge ok">Yüklənib</span>` : `<span class="badge">Yoxdur</span>`}
                  </div>
                </div>

                <div class="mt10 small" id="syllMeta" style="opacity:.9">
                  ${
                    selected.syllabus
                      ? `Fayl: <b>${EJ.escape(selected.syllabus.fileName||"sillabus")}</b> • ${new Date(selected.syllabus.uploadedAt||Date.now()).toLocaleString()}`
                      : `Bu otaq üçün sillabus hələ yüklənməyib.`
                  }
                </div>

                <input type="file" id="syllFile" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none" />
                <div class="mt10" style="display:flex;gap:8px;flex-wrap:wrap">
                  <button class="btn solid" id="syllUploadBtn" ${frozen?"disabled":""}>${selected.syllabus ? "Dəyiş" : "Yüklə"}</button>
                  <button class="btn" id="syllViewBtn" ${selected.syllabus ? "" : "disabled"}>Bax</button>
                  <button class="btn" id="syllDownloadBtn" ${selected.syllabus ? "" : "disabled"}>Endir</button>
                  <button class="btn danger" id="syllRemoveBtn" ${selected.syllabus ? "" : "disabled"} ${frozen?"disabled":""}>Sil</button>
                </div>
                ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün sillabus yükləmə/silmə bağlıdır.</div>`:""}
              </div>


              <div class="mt16 card p16" style="background:rgba(255,255,255,.03)">
                <div style="font-weight:900">Tələbə əlavə et (ID ilə)</div>
                <div class="mt10" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                  <input class="input" id="stuIdIn" placeholder="Məs: T-32872" style="min-width:220px;flex:1" ${frozen?"disabled":""}/>
                  <button class="btn solid" id="addStuBtn" ${frozen?"disabled":""}>Əlavə et</button>
                </div>
                ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün əlavə/sil əməliyyatları bağlıdır.</div>`:""}
              </div>

              <div class="mt16">
                <div style="font-weight:900">Tələbələr (${students.length})</div>
                <div class="mt10">
                  <table class="table">
                    <thead>
                      <tr><th>Ad</th><th>ID</th><th>Əməliyyat</th></tr>
                    </thead>
                    <tbody>
                      ${
                        students.length ? students.map(s=>`
                          <tr>
                            <td>
                              <button class="btn" data-view="${EJ.escape(s.id)}" style="padding:6px 10px">
                                ${EJ.escape(s.name)}
                              </button>
                            </td>
                            <td><span class="badge">${EJ.escape(s.id)}</span></td>
                            <td style="text-align:right">
                              <button class="btn danger" data-del="${EJ.escape(s.id)}" ${frozen?"disabled":""}>Sil</button>
                            </td>
                          </tr>
                        `).join("") : `<tr><td colspan="3" style="color:var(--sub)">Bu otaqda tələbə yoxdur.</td></tr>`
                      }
                    </tbody>
                  </table>
                  <div class="smallNote mt10">Tələbənin adına klikləyərək şəxsi məlumatlarını görə bilərsiniz (yalnız müəllim).</div>
                </div>
              </div>
            ` : `
              <div style="color:var(--sub)">Otaq seçilməyib.</div>
            `
          }
        </div>
      </div>
    `;

    if(!selected) return;

    const renameBtn = document.getElementById("renameRoomBtn");
    if(renameBtn){
      renameBtn.onclick = ()=>{
        EJ.modal({
          title: "Otağın adını dəyiş",
          okText: "Yadda saxla",
          bodyHTML: `
            <div class="field">
              <div class="label">Yeni ad</div>
              <input class="input" id="rn" value="${EJ.escape(selected.name)}" />
            </div>
            <div class="smallNote mt10">Qeyd: Otağı silmək mümkün deyil.</div>
          `,
          onOk:(wrap)=>{
            const v = (wrap.querySelector("#rn")?.value||"").trim();
            if(!v){ EJ.toast("Otaq adı boş ola bilməz.", "danger"); return false; }
            EJStore.updateRoom(courseId, selected.id, { name:v });
            // keep same selection
            location.hash = `#/rooms?room=${encodeURIComponent(selected.id)}`;
            render();
            return true;
          }
        });
      };
    }

    
    // ---- Syllabus handlers ----
    const syllFile = document.getElementById("syllFile");
    const syllUploadBtn = document.getElementById("syllUploadBtn");
    const syllViewBtn = document.getElementById("syllViewBtn");
    const syllDownloadBtn = document.getElementById("syllDownloadBtn");
    const syllRemoveBtn = document.getElementById("syllRemoveBtn");

    const isAllowedSyll = (f)=>{
      const name = (f?.name||"").toLowerCase();
      const okExt = name.endsWith(".pdf") || name.endsWith(".docx");
      const okMime = (f?.type||"")==="application/pdf" || (f?.type||"")==="application/vnd.openxmlformats-officedocument.wordprocessingml.document" || (f?.type||"")==="application/msword";
      return okExt || okMime;
    };

    const fileToDataUrl = (file)=> new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onerror = ()=>reject(new Error("read_failed"));
      fr.onload = ()=>resolve(String(fr.result||""));
      fr.readAsDataURL(file);
    });

    const openSyll = ()=>{
      const syl = selected?.syllabus;
      if(!syl?.dataUrl) return EJ.toast("Sillabus tapılmadı.", "danger");
      window.open(syl.dataUrl, "_blank");
    };

    const downloadSyll = ()=>{
      const syl = selected?.syllabus;
      if(!syl?.dataUrl) return EJ.toast("Sillabus tapılmadı.", "danger");
      const a = document.createElement("a");
      a.href = syl.dataUrl;
      a.download = syl.fileName || "sillabus";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    if(syllUploadBtn && syllFile){
      syllUploadBtn.onclick = ()=>{
        if(frozen) return;
        syllFile.value = "";
        syllFile.click();
      };
      syllFile.onchange = async ()=>{
        const file = syllFile.files && syllFile.files[0];
        if(!file) return;
        if(!isAllowedSyll(file)) return EJ.toast("Yalnız PDF və DOCX faylları qəbul edilir.", "danger");
        const max = 8*1024*1024;
        if(file.size > max) return EJ.toast("Fayl maksimum 8MB olmalıdır.", "danger");
        try{
          const dataUrl = await fileToDataUrl(file);
          const res = EJStore.setRoomSyllabus(courseId, selected.id, me.id, {
            fileName: file.name,
            mime: file.type,
            size: file.size,
            dataUrl
          });
          if(!res.ok) return EJ.toast(res.error||"Yükləmə alınmadı.", "danger");
          EJ.toast("Sillabus yükləndi.", "ok");
          render();
        }catch(e){
          EJ.toast("Fayl oxunmadı.", "danger");
        }
      };
    }

    if(syllViewBtn) syllViewBtn.onclick = openSyll;
    if(syllDownloadBtn) syllDownloadBtn.onclick = downloadSyll;

    if(syllRemoveBtn){
      syllRemoveBtn.onclick = ()=>{
        if(frozen) return;
        if(!selected?.syllabus) return;
        EJ.modal({
          title:"Sillabusu sil?",
          okText:"Hə",
          cancelText:"Yox",
          bodyHTML:`<div class="small" style="line-height:1.7">Sillabusu silsəniz tələbələr artıq bu faylı görə bilməyəcək.</div>`,
          onOk:()=>{
            const res = EJStore.removeRoomSyllabus(courseId, selected.id, me.id);
            if(!res.ok) { EJ.toast(res.error||"Silinmədi.", "danger"); return false; }
            EJ.toast("Sillabus silindi.", "ok");
            render();
            return true;
          }
        });
      };
    }

const addBtn = document.getElementById("addStuBtn");
    if(addBtn){
      addBtn.onclick = ()=>{
        const sid = (document.getElementById("stuIdIn").value||"").trim();
        if(!sid){ EJ.toast("Tələbə ID yazın.", "danger"); return; }
        const res = EJStore.addStudentToRoom(courseId, selected.id, sid);
        if(!res.ok){
          EJ.toast(res.error || "Xəta baş verdi.", "danger");
          return;
        }
        document.getElementById("stuIdIn").value = "";
        EJ.toast("Tələbə əlavə olundu.", "ok");
        render();
      };
    }

    // delete student from room
    page.querySelectorAll("[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const sid = btn.getAttribute("data-del");
        const stu = studentsById.get(sid);
        EJ.modal({
          title:"Tələbəni silmək",
          okText:"Hə, sil",
          cancelText:"Yox",
          danger:true,
          bodyHTML: `
            <div style="color:var(--sub);line-height:1.7">
              <b>${EJ.escape(stu?.name||sid)}</b> adlı tələbəni bu otaqdan silmək istəyirsiniz?
            </div>
          `,
          onOk:()=>{
            EJStore.removeStudentFromRoom(courseId, selected.id, sid);
            EJ.toast("Silindi.", "ok");
            render();
            return true;
          }
        });
      });
    });

    // view student details
    page.querySelectorAll("[data-view]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const sid = btn.getAttribute("data-view");
        const s = studentsById.get(sid);
        if(!s){ EJ.toast("Tələbə tapılmadı.", "danger"); return; }
        const p = s.profile || {};
        EJ.modal({
          title:"Tələbə məlumatları",
          okText:"Bağla",
          hideCancel:true,
          bodyHTML: `
            <div style="display:flex;gap:12px;align-items:center">
              <div class="avatar" style="width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-weight:900">
                ${EJ.escape((s.name||"T").slice(0,1))}
              </div>
              <div>
                <div style="font-weight:900">${EJ.escape(s.name)}</div>
                <div style="color:var(--sub);font-size:13px">ID: <b>${EJ.escape(s.id)}</b></div>
              </div>
            </div>

            <div class="mt16" style="color:var(--sub);font-size:13px;line-height:1.8">
              <div><b>Ad:</b> ${EJ.escape(p.firstName||"")}</div>
              <div><b>Soyad:</b> ${EJ.escape(p.lastName||"")}</div>
              <div><b>Ata adı:</b> ${EJ.escape(p.fatherName||"")}</div>
              <div><b>Yaş:</b> ${EJ.escape(p.age||"")}</div>
              <div><b>Cins:</b> ${EJ.escape(p.gender||"")}</div>
              <div><b>Telefon:</b> ${EJ.escape(p.phone||"")}</div>
              <div><b>Valideyn nömrəsi:</b> ${EJ.escape(p.parentPhone||"")}</div>
              <div><b>Fənn(lər):</b> ${EJ.escape(p.subjects||"")}</div>
            </div>

            <div class="mt14 smallNote">Bu məlumatlar yalnız müəllim və adminlər üçün görünür. Tələbələr bir-birinin məlumatını görə bilməz.</div>
          `,
          onOk:()=>true
        });
      });
    });
  }


  // ---------- Helpers ----------
  const isoDate = (d)=> {
    const dt = d instanceof Date ? d : new Date(d||Date.now());
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,"0");
    const da = String(dt.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  };

  function roomPickerHTML(rooms, selectedId, hashBase){
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
            <div class="smallNote">Sürətli keçid</div>
            <div class="small" style="opacity:.75">Otaq dəyişəndə səhifə avtomatik yenilənir.</div>
          </div>
        </div>
      </div>
    `;
  }

  function bindRoomPicker(hashBase){
    const sel = document.getElementById("roomPick");
    if(!sel) return;
    sel.onchange = ()=>{ location.hash = `${hashBase}?room=${encodeURIComponent(sel.value)}`; };
  }

  // ---------- Attendance ----------
  function renderAttendance(frozen){
    const cdb = getCdb();
    const rooms = teacherRooms(cdb);
    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    const rid = params.get("room") || (rooms[0]?.id || "");
    const room = rooms.find(r=>r.id===rid) || rooms[0] || null;

    if(!room){
      page.innerHTML = `${header("Davamiyyət", "Sizə təyin olunmuş otaq yoxdur.")}<div class="card p20">Otaq tapılmadı.</div>`;
      return;
    }

    const date = params.get("date") || isoDate(new Date());
    const studentsById = new Map((cdb.users||[]).filter(u=>u.role==="student").map(u=>[u.id,u]));
    const students = (Array.isArray(room.studentIds)?room.studentIds:[]).map(id=>studentsById.get(id)).filter(Boolean);

    const existing = EJStore.getAttendance(courseId, room.id, date);
    const existingMap = new Map((existing?.items||[]).map(x=>[x.studentId, x.status]));

    page.innerHTML = `
      ${header("Davamiyyət", "Otaq seçin, tarix seçin və + / - / L qeyd edin.")}
      ${roomPickerHTML(rooms, room.id, "#/attendance")}
      <div class="card p20 mt16">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div>
            <div style="font-weight:900;font-size:18px">${EJ.escape(room.name)}</div>
            <div class="smallNote mt6">Tarix seçin və qeyd edin.</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div>
              <div class="smallNote">Tarix</div>
              <input class="input" type="date" id="attDate" value="${EJ.escape(date)}" ${frozen?"disabled":""}/>
            </div>
            <button class="btn solid" id="saveAttBtn" ${frozen?"disabled":""}>Yadda saxla</button>
          </div>
        </div>

        <div class="mt16">
          <table class="table">
            <thead>
              <tr><th>Tələbə</th><th>ID</th><th style="text-align:right">Status</th></tr>
            </thead>
            <tbody>
              ${
                students.length ? students.map(s=>{
                  const st = existingMap.get(s.id) || "P";
                  const btn = (code,label)=>`<button class="btn ${st===code?'solid':''}" data-stu="${EJ.escape(s.id)}" data-set="${code}" style="padding:6px 10px">${label}</button>`;
                  return `
                    <tr>
                      <td>${EJ.escape(s.name)}</td>
                      <td><span class="badge">${EJ.escape(s.id)}</span></td>
                      <td style="text-align:right;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
                        ${btn("P","+")}
                        ${btn("A","-")}
                        ${btn("L","L")}
                      </td>
                    </tr>
                  `;
                }).join("") : `<tr><td colspan="3" style="color:var(--sub)">Bu otaqda tələbə yoxdur.</td></tr>`
              }
            </tbody>
          </table>
          <div class="smallNote mt10">+ iştirak etdi • - iştirak etmədi • L gecikdi</div>
          ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün davamiyyət yazmaq bağlıdır.</div>`:""}
        </div>
      </div>
    `;

    bindRoomPicker("#/attendance");

    const attDate = document.getElementById("attDate");
    if(attDate){
      attDate.onchange = ()=>{ location.hash = `#/attendance?room=${encodeURIComponent(room.id)}&date=${encodeURIComponent(attDate.value)}`; };
    }

    const state = new Map();
    students.forEach(s=>state.set(s.id, existingMap.get(s.id)||"P"));

    page.querySelectorAll("[data-set]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const sid = b.getAttribute("data-stu");
        const val = b.getAttribute("data-set");
        state.set(sid, val);
        // refresh buttons in row
        const rowBtns = page.querySelectorAll(`[data-stu="${CSS.escape(sid)}"][data-set]`);
        rowBtns.forEach(x=>x.classList.toggle("solid", x.getAttribute("data-set")===val));
      });
    });

    const saveBtn = document.getElementById("saveAttBtn");
    if(saveBtn){
      saveBtn.onclick = ()=>{
        const items = Array.from(state.entries()).map(([studentId,status])=>({studentId,status}));
        const res = EJStore.setAttendance(courseId, room.id, me.id, attDate.value, items);
        if(!res.ok) return EJ.toast(res.error||"Yadda saxlanmadı.", "danger");
        EJ.toast("Davamiyyət yadda saxlandı.", "ok");
      };
    }
  }

  // ---------- Materials ----------
  
function renderAttendanceHistory(frozen){
  const cdb = getCdb();
  const rooms = teacherRooms(cdb);
  const roomsById = new Map((rooms||[]).map(r=>[r.id,r]));
  const studentsById = new Map((cdb.users||[]).filter(u=>u.role==="student").map(u=>[u.id,u]));

  const params = new URLSearchParams((location.hash.split("?")[1]||""));
  const roomId = params.get("room") || "";
  const q = (params.get("q")||"").trim().toLowerCase();
  const statusF = (params.get("st")||"").trim().toUpperCase(); // P/A/L
  const from = (params.get("from")||"").trim();
  const to = (params.get("to")||"").trim();

  const inRange = (d)=>{
    // d is YYYY-MM-DD
    if(from && d < from) return false;
    if(to && d > to) return false;
    return true;
  };

  const statusLabel = (s)=>{
    if(s==="P") return {txt:"+ İştirak", cls:"ok"};
    if(s==="A") return {txt:"- Qayıb", cls:"danger"};
    if(s==="L") return {txt:"L Gecikdi", cls:"warn"};
    return {txt:s||"—", cls:""};
  };

  // flatten attendance records
  let rows = [];
  (cdb.attendance||[]).forEach(rec=>{
    const r = roomsById.get(rec.roomId);
    if(!r) return; // only my rooms
    const date = String(rec.date||"").slice(0,10);
    if(!date) return;
    (rec.items||[]).forEach(it=>{
      const sid = String(it.studentId||"").trim();
      if(!sid) return;
      const stu = studentsById.get(sid);
      rows.push({
        date,
        savedAt: rec.updatedAt || rec.createdAt || "",
        roomId: rec.roomId,
        roomName: r.name || rec.roomId,
        studentId: sid,
        studentName: stu?.name || sid,
        status: String(it.status||"").toUpperCase()
      });
    });
  });

  // filters
  rows = rows.filter(x=>{
    if(roomId && x.roomId !== roomId) return false;
    if(statusF && x.status !== statusF) return false;
    if(!inRange(x.date)) return false;
    if(q){
      const hay = (x.studentName+" "+x.studentId+" "+x.roomName).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  // sort newest first
  rows.sort((a,b)=>{
    if(a.date!==b.date) return a.date<b.date ? 1 : -1;
    const ta = Date.parse(a.savedAt||"") || 0;
    const tb = Date.parse(b.savedAt||"") || 0;
    return tb-ta;
  });

  page.innerHTML = `
    ${header("Davamiyyət keçmişi", "Hansı tələbəyə nə vaxt hansı otaqda + / - / L yazıldığını izləyin.")}
    <div class="card p16">
      <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div class="field" style="min-width:220px;flex:1">
          <div class="label">Otaq</div>
          <select class="input" id="ahRoom">
            <option value="">Hamısı</option>
            ${(rooms||[]).map(r=>`<option value="${EJ.escape(r.id)}" ${r.id===roomId?'selected':''}>${EJ.escape(r.name)}</option>`).join("")}
          </select>
        </div>

        <div class="field" style="min-width:160px">
          <div class="label">Başlanğıc</div>
          <input class="input" type="date" id="ahFrom" value="${EJ.escape(from)}"/>
        </div>

        <div class="field" style="min-width:160px">
          <div class="label">Bitmə</div>
          <input class="input" type="date" id="ahTo" value="${EJ.escape(to)}"/>
        </div>

        <div class="field" style="min-width:160px">
          <div class="label">Status</div>
          <select class="input" id="ahSt">
            <option value="">Hamısı</option>
            <option value="P" ${statusF==="P"?'selected':''}>+ İştirak</option>
            <option value="A" ${statusF==="A"?'selected':''}>- Qayıb</option>
            <option value="L" ${statusF==="L"?'selected':''}>L Gecikdi</option>
          </select>
        </div>

        <div class="field" style="min-width:220px;flex:1">
          <div class="label">Axtarış (ad/ID)</div>
          <input class="input" id="ahQ" placeholder="Məs: T-32872 və ya ad" value="${EJ.escape(params.get("q")||"")}"/>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn solid" id="ahApply">Tətbiq et</button>
          <button class="btn" id="ahClear">Təmizlə</button>
        </div>
      </div>

      ${frozen?`<div class="smallNote mt10">Sistem bloklu ola bilər, amma keçmişə baxış mümkündür.</div>`:""}
    </div>

    <div class="mt16">
      <div style="font-weight:900">Nəticə: ${rows.length}</div>
      <div class="mt10 card p16" style="overflow:auto">
        <table class="table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Otaq</th>
              <th>Tələbə</th>
              <th>Status</th>
              <th style="text-align:right">Qeyd vaxtı</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.length ? rows.map(r=>{
                const lab = statusLabel(r.status);
                return `
                  <tr>
                    <td><span class="badge">${EJ.escape(r.date)}</span></td>
                    <td>${EJ.escape(r.roomName)}</td>
                    <td>${EJ.escape(r.studentName)} <span class="badge" style="margin-left:6px">${EJ.escape(r.studentId)}</span></td>
                    <td><span class="badge ${lab.cls}">${EJ.escape(lab.txt)}</span></td>
                    <td style="text-align:right;color:var(--sub)">${EJ.escape(r.savedAt?new Date(r.savedAt).toLocaleString():"—")}</td>
                  </tr>
                `;
              }).join("") : `<tr><td colspan="5" style="color:var(--sub)">Seçilən filtrə uyğun qeyd tapılmadı.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  const apply = ()=>{
    const rp = new URLSearchParams();
    const vRoom = document.getElementById("ahRoom").value;
    const vFrom = document.getElementById("ahFrom").value;
    const vTo = document.getElementById("ahTo").value;
    const vSt = document.getElementById("ahSt").value;
    const vQ = document.getElementById("ahQ").value.trim();
    if(vRoom) rp.set("room", vRoom);
    if(vFrom) rp.set("from", vFrom);
    if(vTo) rp.set("to", vTo);
    if(vSt) rp.set("st", vSt);
    if(vQ) rp.set("q", vQ);
    const qs = rp.toString();
    location.hash = "#/attendance-history" + (qs ? ("?"+qs) : "");
  };

  document.getElementById("ahApply").onclick = apply;
  document.getElementById("ahClear").onclick = ()=>{
    location.hash = "#/attendance-history";
  };
}

function renderMaterials(frozen){
    const cdb = getCdb();
    const rooms = teacherRooms(cdb);
    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    const rid = params.get("room") || (rooms[0]?.id || "");
    const room = rooms.find(r=>r.id===rid) || rooms[0] || null;

    if(!room){
      page.innerHTML = `${header("Materiallar", "Sizə təyin olunmuş otaq yoxdur.")}<div class="card p20">Otaq tapılmadı.</div>`;
      return;
    }

    const mats = Array.isArray(room.materials)?room.materials:[];
    const fileAccept = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    page.innerHTML = `
      ${header("Materiallar", "Hər otaq üçün fayl (PDF/DOCX) və ya link paylaşın.")}
      ${roomPickerHTML(rooms, room.id, "#/materials")}
      <div class="card p20 mt16">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div>
            <div style="font-weight:900;font-size:18px">${EJ.escape(room.name)}</div>
            <div class="smallNote mt6">Materialları tələbələr görə və endirə bilər.</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn solid" id="addMatBtn" ${frozen?"disabled":""}>Material əlavə et</button>
          </div>
        </div>

        <div class="mt16">
          <table class="table">
            <thead>
              <tr><th>Başlıq</th><th>Tip</th><th>Tarix</th><th style="text-align:right">Əməliyyat</th></tr>
            </thead>
            <tbody>
              ${
                mats.length ? mats.map(m=>`
                  <tr>
                    <td style="font-weight:800">${EJ.escape(m.title||"Material")}</td>
                    <td><span class="badge">${m.type==="link"?"Link":"Fayl"}</span></td>
                    <td class="small">${new Date(m.createdAt||Date.now()).toLocaleString()}</td>
                    <td style="text-align:right;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
                      <button class="btn" data-mview="${EJ.escape(m.id)}">Bax</button>
                      <button class="btn" data-medit="${EJ.escape(m.id)}" ${frozen?"disabled":""}>Redaktə</button>
                      <button class="btn danger" data-mdel="${EJ.escape(m.id)}" ${frozen?"disabled":""}>Sil</button>
                    </td>
                  </tr>
                `).join("") : `<tr><td colspan="4" style="color:var(--sub)">Bu otaqda material yoxdur.</td></tr>`
              }
            </tbody>
          </table>
          <div class="smallNote mt10">Max 8MB • Fayl: PDF/DOCX • Link: https://...</div>
          ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün material əlavə/silmə bağlıdır.</div>`:""}
        </div>
      </div>
      <input type="file" id="matFile" accept="${fileAccept}" style="display:none" />
    `;

    bindRoomPicker("#/materials");

    const isAllowed = (f)=>{
      const n=(f?.name||"").toLowerCase();
      return n.endsWith(".pdf")||n.endsWith(".docx")||f.type==="application/pdf"||f.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||f.type==="application/msword";
    };
    const toDataUrl = (file)=> new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onerror=()=>reject(); fr.onload=()=>resolve(String(fr.result||"")); fr.readAsDataURL(file);
    });
    const openMaterial = (m)=>{
      if(m.type==="link"){ window.open(m.url, "_blank"); return; }
      if(m.dataUrl) window.open(m.dataUrl, "_blank");
    };

    const addBtn=document.getElementById("addMatBtn");
    const matFile=document.getElementById("matFile");

    if(addBtn){
      addBtn.onclick = ()=>{
        if(frozen) return;

        let pickedFile = null;

        const wrap = EJ.modal({
          title:"Material əlavə et",
          okText:"Yadda saxla",
          bodyHTML: `
            <div class="field">
              <div class="label">Başlıq</div>
              <input class="input" id="mtitle" placeholder="Məs: Mövzu 1 PDF" />
            </div>
            <div class="field mt12">
              <div class="label">Növ</div>
              <select class="input" id="mtype">
                <option value="file">Fayl (PDF/DOCX)</option>
                <option value="link">Link</option>
              </select>
            </div>
            <div class="field mt12" id="mLinkWrap" style="display:none">
              <div class="label">Link</div>
              <input class="input" id="mlink" placeholder="https://..." />
              <div class="smallNote mt8">Nümunə: https://drive.google.com/...</div>
            </div>
            <div class="field mt12" id="mFileWrap">
              <div class="label">Fayl</div>
              <button class="btn" type="button" id="pickFileBtn">Fayl seç</button>
              <div class="smallNote mt8" id="pickedInfo">Max 8MB • PDF/DOCX</div>
            </div>
          `,
          onOk: async (wrap)=>{
            const title = (wrap.querySelector("#mtitle").value||"").trim() || "Material";
            const type = wrap.querySelector("#mtype").value;

            if(type==="link"){
              const url = (wrap.querySelector("#mlink").value||"").trim();
              if(!url){ EJ.toast("Link yazın.", "danger"); return false; }
              const res = EJStore.addRoomMaterial(courseId, room.id, me.id, { title, type:"link", url });
              if(!res.ok){ EJ.toast(res.error||"Əlavə olunmadı.", "danger"); return false; }
              EJ.toast("Material əlavə olundu.", "ok");
              render();
              return true;
            }

            if(!pickedFile){ EJ.toast("Fayl seçin.", "danger"); return false; }
            try{
              const dataUrl = await toDataUrl(pickedFile);
              const res = EJStore.addRoomMaterial(courseId, room.id, me.id, {
                title,
                type:"file",
                fileName:pickedFile.name,
                mime:pickedFile.type,
                size:pickedFile.size,
                dataUrl
              });
              if(!res.ok){ EJ.toast(res.error||"Əlavə olunmadı.", "danger"); return false; }
              EJ.toast("Material əlavə olundu.", "ok");
              render();
              return true;
            }catch(e){
              EJ.toast("Fayl oxunmadı.", "danger");
              return false;
            }
          }
        });

        // EJ.modal has no onOpen hook -> bind after creation
        const typeSel = wrap.querySelector("#mtype");
        const linkWrap = wrap.querySelector("#mLinkWrap");
        const fileWrap = wrap.querySelector("#mFileWrap");
        const pickBtn = wrap.querySelector("#pickFileBtn");
        const pickedInfo = wrap.querySelector("#pickedInfo");

        const update = ()=>{
          const t = typeSel.value;
          linkWrap.style.display = (t==="link") ? "block" : "none";
          fileWrap.style.display = (t==="file") ? "block" : "none";
        };
        typeSel.addEventListener("change", update);
        update();

        pickBtn.onclick = ()=>{
          matFile.value = "";
          matFile.click();
        };

        matFile.onchange = ()=>{
          const f = matFile.files && matFile.files[0];
          if(!f) return;
          if(!isAllowed(f)) { EJ.toast("Yalnız PDF və DOCX.", "danger"); return; }
          if(f.size > 8*1024*1024) { EJ.toast("Fayl maksimum 8MB olmalıdır.", "danger"); return; }
          pickedFile = f;
          pickedInfo.textContent = `Seçildi: ${f.name} (${Math.round(f.size/1024)} KB)`;
        };
      };
    }

    // view/edit/delete
    page.querySelectorAll("[data-mview]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-mview");
        const m = (Array.isArray(room.materials)?room.materials:[]).find(x=>x.id===id);
        if(!m) return;
        openMaterial(m);
      });
    });

    page.querySelectorAll("[data-medit]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-medit");
        const m = (Array.isArray(room.materials)?room.materials:[]).find(x=>x.id===id);
        if(!m) return;
        EJ.modal({
          title:"Materialı redaktə et",
          okText:"Yadda saxla",
          bodyHTML: `
            <div class="field">
              <div class="label">Başlıq</div>
              <input class="input" id="etitle" value="${EJ.escape(m.title||"")}" />
            </div>
            ${m.type==="link" ? `
              <div class="field mt12">
                <div class="label">Link</div>
                <input class="input" id="eurl" value="${EJ.escape(m.url||"")}" />
              </div>
            ` : `
              <div class="field mt12">
                <div class="label">Faylı dəyiş</div>
                <button class="btn" type="button" id="epick">Yeni fayl seç</button>
                <div class="smallNote mt8" id="einfo">${EJ.escape(m.fileName||"")}</div>
              </div>
            `}
          `,
          onOpen:(wrap)=>{
            if(m.type==="file"){
              const btn = wrap.querySelector("#epick");
              const info = wrap.querySelector("#einfo");
              let picked=null;
              btn.onclick=()=>{
                matFile.value=""; matFile.click();
                matFile.onchange=()=>{
                  const f=matFile.files && matFile.files[0];
                  if(!f) return;
                  if(!isAllowed(f)) return EJ.toast("Yalnız PDF və DOCX.", "danger");
                  if(f.size>8*1024*1024) return EJ.toast("Fayl maksimum 8MB olmalıdır.", "danger");
                  picked=f; info.textContent=`Seçildi: ${f.name}`;
                };
              };
              wrap.__picked=()=>picked;
            }
          },
          onOk: async (wrap)=>{
            const title=(wrap.querySelector("#etitle").value||"").trim() || m.title;
            if(m.type==="link"){
              const url=(wrap.querySelector("#eurl").value||"").trim() || m.url;
              const res=EJStore.updateRoomMaterial(courseId, room.id, me.id, m.id, { title, url });
              if(!res.ok){ EJ.toast(res.error||"Yadda saxlanmadı.", "danger"); return false; }
              EJ.toast("Yeniləndi.", "ok"); render(); return true;
            }else{
              const picked = wrap.__picked ? wrap.__picked() : null;
              if(picked){
                try{
                  const dataUrl=await toDataUrl(picked);
                  const res=EJStore.updateRoomMaterial(courseId, room.id, me.id, m.id, { title, dataUrl, fileName:picked.name, mime:picked.type, size:picked.size });
                  if(!res.ok){ EJ.toast(res.error||"Yadda saxlanmadı.", "danger"); return false; }
                }catch(e){ EJ.toast("Fayl oxunmadı.", "danger"); return false; }
              }else{
                const res=EJStore.updateRoomMaterial(courseId, room.id, me.id, m.id, { title });
                if(!res.ok){ EJ.toast(res.error||"Yadda saxlanmadı.", "danger"); return false; }
              }
              EJ.toast("Yeniləndi.", "ok"); render(); return true;
            }
          }
        });
      });
    });

    page.querySelectorAll("[data-mdel]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-mdel");
        EJ.modal({
          title:"Materialı sil?",
          okText:"Hə, sil",
          cancelText:"Yox",
          danger:true,
          bodyHTML:`<div class="small" style="line-height:1.7">Bu material tələbələr üçün də silinəcək.</div>`,
          onOk:()=>{
            const res=EJStore.removeRoomMaterial(courseId, room.id, me.id, id);
            if(!res.ok){ EJ.toast(res.error||"Silinmədi.", "danger"); return false; }
            EJ.toast("Silindi.", "ok"); render(); return true;
          }
        });
      });
    });
  }

  // ---------- Grades ----------
  function renderGrades(frozen){
    const cdb = getCdb();
    const rooms = teacherRooms(cdb);
    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    const rid = params.get("room") || (rooms[0]?.id || "");
    const room = rooms.find(r=>r.id===rid) || rooms[0] || null;
    if(!room){
      page.innerHTML = `${header("Qiymətlər", "Sizə təyin olunmuş otaq yoxdur.")}<div class="card p20">Otaq tapılmadı.</div>`;
      return;
    }
    const studentsById = new Map((cdb.users||[]).filter(u=>u.role==="student").map(u=>[u.id,u]));
    const students = (Array.isArray(room.studentIds)?room.studentIds:[]).map(id=>studentsById.get(id)).filter(Boolean);

    const gradesAll = Array.isArray(cdb.grades)?cdb.grades:[];
    const grades = gradesAll.filter(g=>g.roomId===room.id);

    page.innerHTML = `
      ${header("Qiymətlər", "Tələbələr üçün 0-100 sistemi.")}
      ${roomPickerHTML(rooms, room.id, "#/grades")}
      <div class="card p20 mt16">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div>
            <div style="font-weight:900;font-size:18px">${EJ.escape(room.name)}</div>
            <div class="smallNote mt6">Qiyməti yalnız müəllim yaza bilər. Tələbə yalnız öz qiymətini görür.</div>
          </div>
          <button class="btn solid" id="addGradeBtn" ${frozen?"disabled":""}>Qiymət əlavə et</button>
        </div>

        <div class="mt16">
          <table class="table">
            <thead>
              <tr><th>Tələbə</th><th>Başlıq</th><th>Tarix</th><th>Bal</th><th style="text-align:right">Əməliyyat</th></tr>
            </thead>
            <tbody>
              ${
                grades.length ? grades.map(g=>{
                  const stu = studentsById.get(g.studentId);
                  return `
                    <tr>
                      <td>${EJ.escape(stu?stu.name:g.studentId)} <span class="badge">${EJ.escape(g.studentId)}</span></td>
                      <td style="font-weight:800">${EJ.escape(g.title||"")}</td>
                      <td class="small">${EJ.escape(g.date||"")}</td>
                      <td><span class="badge ok">${EJ.escape(String(g.score))}</span></td>
                      <td style="text-align:right;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
                        <button class="btn" data-gedit="${EJ.escape(g.id)}" ${frozen?"disabled":""}>Redaktə</button>
                        <button class="btn danger" data-gdel="${EJ.escape(g.id)}" ${frozen?"disabled":""}>Sil</button>
                      </td>
                    </tr>
                  `;
                }).join("") : `<tr><td colspan="5" style="color:var(--sub)">Hələ qiymət yoxdur.</td></tr>`
              }
            </tbody>
          </table>
          ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün qiymət əlavə/silmə bağlıdır.</div>`:""}
        </div>
      </div>
    `;

    bindRoomPicker("#/grades");

    const addBtn = document.getElementById("addGradeBtn");
    if(addBtn){
      addBtn.onclick = ()=>{
        if(!students.length) return EJ.toast("Bu otaqda tələbə yoxdur.", "danger");
        EJ.modal({
          title:"Qiymət əlavə et",
          okText:"Yadda saxla",
          bodyHTML: `
            <div class="field">
              <div class="label">Tələbə</div>
              <select class="input" id="gStu">
                ${students.map(s=>`<option value="${EJ.escape(s.id)}">${EJ.escape(s.name)} (${EJ.escape(s.id)})</option>`).join("")}
              </select>
            </div>
            <div class="field mt12">
              <div class="label">İmtahan/Quiz adı</div>
              <input class="input" id="gTitle" placeholder="Məs: Quiz 1" />
            </div>
            <div class="field mt12">
              <div class="label">Tarix</div>
              <input class="input" type="date" id="gDate" value="${isoDate(new Date())}" />
            </div>
            <div class="field mt12">
              <div class="label">Bal (0-100)</div>
              <input class="input" id="gScore" type="number" min="0" max="100" value="0" />
            </div>
          `,
          onOk:(wrap)=>{
            const studentId = wrap.querySelector("#gStu").value;
            const title = (wrap.querySelector("#gTitle").value||"").trim() || "Qiymət";
            const date = wrap.querySelector("#gDate").value;
            const score = Number(wrap.querySelector("#gScore").value||0);
            if(score<0 || score>100){ EJ.toast("Bal 0-100 arası olmalıdır.", "danger"); return false; }
            const res = EJStore.addGrade(courseId, me.id, { roomId: room.id, studentId, title, date, score });
            if(!res.ok){ EJ.toast(res.error||"Yadda saxlanmadı.", "danger"); return false; }
            EJ.toast("Əlavə olundu.", "ok"); render(); return true;
          }
        });
      };
    }

    page.querySelectorAll("[data-gedit]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-gedit");
        const g = (Array.isArray(cdb.grades)?cdb.grades:[]).find(x=>x.id===id);
        if(!g) return;
        EJ.modal({
          title:"Qiyməti redaktə et",
          okText:"Yadda saxla",
          bodyHTML: `
            <div class="field">
              <div class="label">Başlıq</div>
              <input class="input" id="eTitle" value="${EJ.escape(g.title||"")}" />
            </div>
            <div class="field mt12">
              <div class="label">Tarix</div>
              <input class="input" type="date" id="eDate" value="${EJ.escape(g.date||isoDate(new Date()))}" />
            </div>
            <div class="field mt12">
              <div class="label">Bal (0-100)</div>
              <input class="input" id="eScore" type="number" min="0" max="100" value="${EJ.escape(String(g.score||0))}" />
            </div>
          `,
          onOk:(wrap)=>{
            const title=(wrap.querySelector("#eTitle").value||"").trim()||g.title;
            const date=wrap.querySelector("#eDate").value||g.date;
            const score=Number(wrap.querySelector("#eScore").value||0);
            if(score<0||score>100){ EJ.toast("Bal 0-100 arası olmalıdır.", "danger"); return false; }
            const res=EJStore.updateGrade(courseId, me.id, id, { title, date, score });
            if(!res.ok){ EJ.toast(res.error||"Yadda saxlanmadı.", "danger"); return false; }
            EJ.toast("Yeniləndi.", "ok"); render(); return true;
          }
        });
      });
    });

    page.querySelectorAll("[data-gdel]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-gdel");
        EJ.modal({
          title:"Qiyməti sil?",
          okText:"Hə, sil",
          cancelText:"Yox",
          danger:true,
          bodyHTML:`<div class="small" style="line-height:1.7">Bu qiymət tələbənin panelindən də silinəcək.</div>`,
          onOk:()=>{
            const res=EJStore.removeGrade(courseId, me.id, id);
            if(!res.ok){ EJ.toast(res.error||"Silinmədi.", "danger"); return false; }
            EJ.toast("Silindi.", "ok"); render(); return true;
          }
        });
      });
    });
  }

  // ---------- Announcements ----------
  function renderAnnouncements(frozen){
    const cdb = getCdb();
    const rooms = teacherRooms(cdb);
    const params = new URLSearchParams((location.hash.split("?")[1]||""));
    const rid = params.get("room") || (rooms[0]?.id || "");
    const room = rooms.find(r=>r.id===rid) || rooms[0] || null;

    const anns = (Array.isArray(cdb.announcements)?cdb.announcements:[]).filter(a=>!a.roomId || (room && a.roomId===room.id));

    page.innerHTML = `
      ${header("Bildirişlər", "Otaq üzrə qısa elanlar paylaşın.")}
      ${room ? roomPickerHTML(rooms, room.id, "#/announcements") : `<div class="card p16">Otaq tapılmadı.</div>`}
      <div class="card p20 mt16">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div>
            <div style="font-weight:900;font-size:18px">${room?EJ.escape(room.name):"Otaq"}</div>
            <div class="smallNote mt6">Tələbələr “Bildirişlər” bölməsində görəcək.</div>
          </div>
          <button class="btn solid" id="addAnnBtn" ${frozen?"disabled":""}>Bildiriş yaz</button>
        </div>

        <div class="mt16" style="display:flex;flex-direction:column;gap:10px">
          ${
            anns.length ? anns.map(a=>`
              <div class="card p16" style="background:rgba(255,255,255,.03)">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
                  <div>
                    <div style="font-weight:900">${EJ.escape(a.title||"Elan")}</div>
                    <div class="smallNote mt6">${new Date(a.createdAt||Date.now()).toLocaleString()}</div>
                  </div>
                  <button class="btn danger" data-adel="${EJ.escape(a.id)}" ${frozen?"disabled":""}>Sil</button>
                </div>
                <div class="mt10 small" style="line-height:1.7;opacity:.9">${EJ.escape(a.text||"")}</div>
              </div>
            `).join("") : `<div style="color:var(--sub)">Bu otaq üçün bildiriş yoxdur.</div>`
          }
        </div>

        ${frozen?`<div class="smallNote mt10">Sistem bloklu olduğu üçün bildiriş əlavə/silmə bağlıdır.</div>`:""}
      </div>
    `;

    if(room) bindRoomPicker("#/announcements");

    const addBtn=document.getElementById("addAnnBtn");
    if(addBtn){
      addBtn.onclick=()=>{
        EJ.modal({
          title:"Bildiriş yaz",
          okText:"Paylaş",
          bodyHTML: `
            <div class="field">
              <div class="label">Başlıq</div>
              <input class="input" id="atitle" placeholder="Məs: Sabah dərs 19:00" />
            </div>
            <div class="field mt12">
              <div class="label">Mətn</div>
              <textarea class="input" id="atext" rows="5" placeholder="Qısa məlumat yazın..."></textarea>
            </div>
          `,
          onOk:(wrap)=>{
            if(!room){ EJ.toast("Otaq seçin.", "danger"); return false; }
            const title=(wrap.querySelector("#atitle").value||"").trim()||"Elan";
            const text=(wrap.querySelector("#atext").value||"").trim();
            if(!text){ EJ.toast("Mətn boş ola bilməz.", "danger"); return false; }
            const res=EJStore.addAnnouncement(courseId, me.id, { roomId: room.id, title, text });
            if(!res.ok){ EJ.toast(res.error||"Paylaşılmadı.", "danger"); return false; }
            EJ.toast("Paylaşıldı.", "ok"); render(); return true;
          }
        });
      };
    }

    page.querySelectorAll("[data-adel]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id=b.getAttribute("data-adel");
        EJ.modal({
          title:"Bildirişi sil?",
          okText:"Hə, sil",
          cancelText:"Yox",
          danger:true,
          bodyHTML:`<div class="small" style="line-height:1.7">Bu bildiriş tələbələrin panelindən də silinəcək.</div>`,
          onOk:()=>{
            const res=EJStore.removeAnnouncement(courseId, me.id, id);
            if(!res.ok){ EJ.toast(res.error||"Silinmədi.", "danger"); return false; }
            EJ.toast("Silindi.", "ok"); render(); return true;
          }
        });
      });
    });
  }


  function renderProfile(){
    const p = me.profile || {};
    page.innerHTML = `
      ${header("Mənim profilim", "Bu məlumatlar tələbələr tərəfindən görünür")}
      <div class="row">
        <div class="card p20 col" style="min-width:280px">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="avatar" style="width:54px;height:54px;border-radius:14px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-weight:900">
              ${EJ.escape((me.name||"M").slice(0,1))}
            </div>
            <div>
              <div style="font-weight:900">${EJ.escape(me.name)}</div>
              <div style="color:var(--sub);font-size:13px">ID: <b>${EJ.escape(me.id)}</b></div>
            </div>
          </div>

          <div class="mt16" style="color:var(--sub);font-size:13px;line-height:1.7">
            <div><b>Telefon:</b> ${EJ.escape(p.phone||"")}</div>
            <div><b>Email:</b> ${EJ.escape(p.email||"")}</div>
            <div><b>Universitet:</b> ${EJ.escape(p.uni||"")}</div>
            <div><b>Fənn(lər):</b> ${EJ.escape(p.subjects||"")}</div>
          </div>
        </div>

        <div class="card p20 col">
          <div style="font-weight:900">Qeyd</div>
          <div class="mt12" style="color:var(--sub);font-size:13px;line-height:1.7">
            Profil məlumatlarını dəyişmək funksiyası demo-da bağlıdır.
          </div>
        </div>
      </div>
    `;
  }

  render();
})();
