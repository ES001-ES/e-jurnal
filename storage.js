// storage.js
window.EJStore = (function(){
    const KEY = "EJ_PRO_V1";
    const nowISO = () => new Date().toISOString();
  
    // ---- SEED ----
    const seed = () => ({
      meta:{ version:1, createdAt: nowISO(), activeCourseId: null },
  
      company: {
        admins: [
          { id:"ca1", username:"company1", password:"company123", name:"Şirkət Admin 1" },
          { id:"ca2", username:"company2", password:"company123", name:"Şirkət Admin 2" }
        ],
        sessions: { companyAdminId:null }
      },
  
      // Kurslar (müştərilər)
      courses: [
        {
          id:"A-20321",
          name:"Nümunə Kurs",
          status:"active",
          createdAt: nowISO(),
          note:"Demo kurs",
          logoDataUrl:"",
          contact:{ phone1:"+994000000000", phone2:"", address:"Bakı, Nizami küç. 10", email:"" },
          contractEnd: (function(){ const d=new Date(); d.setMonth(d.getMonth()+6); return d.toISOString(); })(),
          paymentStatus:"paid",
          paymentDueAt: (function(){ const d=new Date(); d.setMonth(d.getMonth()+6); return d.toISOString(); })(),
          payments: [
            { id:"p1", paidAt: nowISO(), serviceEnd: (function(){ const d=new Date(); d.setMonth(d.getMonth()+6); return d.toISOString(); })(), createdAt: nowISO(), by:"seed" }
          ],
          // ✅ Kurs admin ID = kurs ID (A-xxxxx)
          courseAdmin: { id:"A-20321", password:"7391" }
        }
      ],
  
      // Kurs datası ayrıca saxlanılır
      courseData: {
        "A-20321": {
          sessions: { userId:null },
          users: [
            // ✅ kurs admin login: ID=kursa aid A-xxxxx + password
            { id:"A-20321", role:"courseAdmin", password:"7391", name:"Nümunə Kurs Admin", createdAt: nowISO(), profile:{} },
  
            // müəllim demo
            { id:"M-10021", role:"teacher", password:"2341", name:"Müəllim Nümunə", createdAt: nowISO(),
              profile:{
                firstName:"Müəllim", lastName:"Nümunə", fatherName:"", age:"29", gender:"Kişi",
                uni:"BDU", phone:"+994000000000", email:"teacher@example.com",
                subjects:"JavaScript", photoDataUrl:""
              }
            },
  
            // tələbə demo
            { id:"T-32872", role:"student", password:"8173", name:"Tələbə Nümunə", createdAt: nowISO(),
              profile:{
                firstName:"Tələbə", lastName:"Nümunə", fatherName:"", age:"18", gender:"Kişi",
                parentPhone:"+994000000000", phone:"+994000000000",
                skillNotes:"(yalnız müəllim görür)"
              }
            }
          ],
  
          rooms: [],
          schedule: [],
          attendance: [],
          announcements: [],
          contacts: [],
          studentPayments: {}
        }
      }
    });
  
    

    // ---- MIGRATION / NORMALIZATION ----
    function migrate(db){
      if(!db || typeof db!=="object") return db;
      db.meta = db.meta || { version:1, createdAt: nowISO(), activeCourseId: null };

      // normalize courses
      db.courses = db.courses || [];
      (db.courses||[]).forEach(c=>{
        if(!c) return;
        if(!c.contact) c.contact = { phone1:"", phone2:"", address:"", email:"" };
        if(typeof c.logoDataUrl !== "string") c.logoDataUrl = "";
        if(!Array.isArray(c.payments)) c.payments = [];
        if(typeof c.contractEnd !== "string") c.contractEnd = "";
        if(typeof c.paymentDueAt !== "string") c.paymentDueAt = "";
        if(typeof c.paymentStatus !== "string") c.paymentStatus = "paid";
      });

      // normalize courseData
      db.courseData = db.courseData || {};
      Object.keys(db.courseData||{}).forEach(cid=>{
        const cdb = db.courseData[cid];
        if(!cdb) return;
        cdb.users = cdb.users || [];
        cdb.rooms = cdb.rooms || [];
        // normalize room members
        (cdb.rooms||[]).forEach(r=>{
          if(!r) return;
          if(!Array.isArray(r.studentIds)) r.studentIds = [];
          if(typeof r.syllabus === "undefined") r.syllabus = null;
          if(!Array.isArray(r.materials)) r.materials = [];
        });
        cdb.schedule = cdb.schedule || [];
        cdb.attendance = cdb.attendance || [];
        cdb.announcements = cdb.announcements || [];
        cdb.grades = cdb.grades || [];
        cdb.contacts = cdb.contacts || [];
        if(!cdb.studentPayments || typeof cdb.studentPayments!=="object") cdb.studentPayments = {};
      });

      return db;
    }
// ---- STORAGE ----
    function load(){
      const raw = localStorage.getItem(KEY);
      if(!raw){
        const db = seed();
        localStorage.setItem(KEY, JSON.stringify(db));
        return migrate(db);
      }
      try { const db = JSON.parse(raw); return migrate(db); }
      catch{
        const db = seed();
        localStorage.setItem(KEY, JSON.stringify(db));
        return migrate(db);
      }
    }
    function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
  
    // ---- HELPERS ----
    function getCourse(db, courseId){ return (db.courses||[]).find(c=>c.id===courseId); }
  
    function courseDb(db, courseId){
      if(!db.courseData) db.courseData = {};
      if(!db.courseData[courseId]){
        db.courseData[courseId] = { sessions:{userId:null}, users:[], rooms:[], schedule:[], attendance:[], announcements:[], contacts:[] };
      }
      return db.courseData[courseId];
    }
  
    // --- ID generators (unikal) ---
    function uniqCourseId(db){
      let id = EJ.randCode("A", 5); // A-12345
      while((db.courses||[]).some(c=>c.id===id)) id = EJ.randCode("A", 5);
      return id;
    }
    function allUserIds(db){
      const ids = new Set();
      for(const k of Object.keys(db.courseData||{})){
        for(const u of (db.courseData[k]?.users || [])) ids.add(u.id);
      }
      return ids;
    }
    function uniqUserId(db, prefix){
      const used = allUserIds(db);
      let id = EJ.randCode(prefix, 5); // M-12345, T-12345
      while(used.has(id)) id = EJ.randCode(prefix, 5);
      return id;
    }
  
    return {
      KEY,
      load,
      save,
      seedReset(){ localStorage.removeItem(KEY); load(); },
  
      // ---- Company admin auth (dəyişmir) ----
      companyLogin(username, password){
        const db = load();
        const a = db.company.admins.find(x=>x.username===username && x.password===password);
        if(!a) return {ok:false, error:"Şirkət admin girişi yanlışdır."};
        db.company.sessions.companyAdminId = a.id;
        save(db);
        return {ok:true, admin:a};
      },
      companyLogout(){
        const db = load();
        db.company.sessions.companyAdminId = null;
        save(db);
      },
      currentCompanyAdmin(){
        const db = load();
        const id = db.company.sessions.companyAdminId;
        return db.company.admins.find(a=>a.id===id) || null;
      },
  
      // ---- Course status ----
      setCourseStatus(courseId, status){
        const db = load();
        const c = getCourse(db, courseId);
        if(!c) return;
        c.status = status;
        save(db);
      },
      courseStatus(courseId){
        const db = load();
        const c = getCourse(db, courseId);
        return c?.status || "active";
      },
  
      // ---- Active course context ----
      setActiveCourseId(courseId){
        const db = load();
        db.meta.activeCourseId = courseId;
        save(db);
      },
      activeCourseId(){
        const db = load();
        return db.meta.activeCourseId || db.courses[0]?.id || null;
      },
  
      // ✅ Login: kurs seçmədən ID + şifrə (BİRBAŞA PANEL)
      // Burada ID həm M-xxxxx/T-xxxxx ola bilər, həm də A-xxxxx (kurs admin)
      courseLoginAny(userId, password){
        const db = load();
        const uid = String(userId||"").trim();
        const pw  = String(password||"").trim();
        if(!uid || !pw) return { ok:false, error:"ID və şifrə daxil edin." };
  
        // 1) Əvvəl users içindən (teacher/student/courseAdmin) axtar
        for(const c of (db.courses||[])){
          const cdb = db.courseData?.[c.id];
          if(!cdb) continue;
  
          const u = (cdb.users||[]).find(x => x.id === uid && x.password === pw);
          if(u){
            cdb.sessions.userId = u.id;
            db.meta.activeCourseId = c.id;
            save(db);
            return { ok:true, user:u, courseId:c.id };
          }
        }
  
        // 2) Tapılmadısa: bu ID kurs ID-sidir (A-xxxxx) -> kurs admin login
        const course = (db.courses||[]).find(c => c.id === uid);
        if(course){
          const adminPass = String(course.courseAdmin?.password || "").trim();
          if(adminPass && adminPass === pw){
            const cdb = courseDb(db, course.id);
  
            // courseAdmin user-i tap, yoxdursa yarat (ID = kurs ID)
            let u = (cdb.users||[]).find(x => x.role==="courseAdmin");
            if(!u){
              u = {
                id: course.id,
                role:"courseAdmin",
                password: adminPass,
                name: (course.name || "Kurs") + " Admin",
                createdAt: nowISO(),
                profile:{}
              };
              cdb.users.unshift(u);
            }else{
              // sync et: id kurs id olmalıdır
              u.id = course.id;
              u.password = adminPass;
            }
  
            cdb.sessions.userId = u.id;
            db.meta.activeCourseId = course.id;
            save(db);
            return { ok:true, user:u, courseId: course.id };
          }
        }
  
        return { ok:false, error:"ID və ya şifrə yanlışdır." };
      },
  
      courseLogout(courseId){
        const db = load();
        const cdb = courseDb(db, courseId);
        cdb.sessions.userId = null;
        save(db);
      },
      currentCourseUser(courseId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const id = cdb.sessions.userId;
        return (cdb.users||[]).find(u=>u.id===id) || null;
      },
  
      // ---- Contact store ----
      addContact(courseId, payload){
        const db = load();
        const cdb = courseDb(db, courseId);
        cdb.contacts.push({ id:EJ.uid("msg"), ...payload, createdAt: nowISO() });
        save(db);
      },
  
      // ✅ Company admin: Yeni kurs yarat
      // Kurs admin ID = kurs ID (A-xxxxx), şifrə random
      addCourse({ name, note="", phone1="", phone2="", address="", adminPassword="" }){
        const db = load();
        const courseId = uniqCourseId(db);

        const adminPass = String(adminPassword||"").trim() || EJ.randPin(4);

        const course = {
          id: courseId,
          name: (name||"").trim() || "Yeni kurs",
          status: "active",
          createdAt: nowISO(),
          note: (note||"").trim(),
          contact: {
            phone1: String(phone1||"").trim(),
            phone2: String(phone2||"").trim(),
            address: String(address||"").trim(),
            email: ""
          },
          contractEnd: (function(){ const d=new Date(); d.setMonth(d.getMonth()+6); return d.toISOString(); })(),
          paymentStatus:"paid",
          paymentDueAt: (function(){ const d=new Date(); d.setMonth(d.getMonth()+6); return d.toISOString(); })(),
          payments: [],
          courseAdmin: { id: courseId, password: adminPass } // ✅ ID = kurs ID
        };

        db.courses.push(course);

        const cdb = courseDb(db, courseId);
        cdb.users.unshift({
          id: courseId,                // ✅ ID = kurs ID
          role: "courseAdmin",
          password: adminPass,
          name: course.name + " Admin",
          createdAt: nowISO(),
          profile: {}
        });

        save(db);
        return { ok:true, course };
      },
  
      // ✅ Company admin: Kursu edit et (ad/qeyd + şifrə yenilə)
      updateCourse(courseId, patch){
        const db = load();
        const c = getCourse(db, courseId);
        if(!c) return { ok:false, error:"Kurs tapılmadı." };

        if(typeof patch.name === "string") c.name = patch.name.trim() || c.name;
        if(typeof patch.note === "string") c.note = patch.note.trim();

        // kontakt məlumatları
        if(!c.contact) c.contact = { phone1:"", phone2:"", address:"" };
        if(typeof patch.phone1 === "string") c.contact.phone1 = patch.phone1.trim();
        if(typeof patch.phone2 === "string") c.contact.phone2 = patch.phone2.trim();
        if(typeof patch.address === "string") c.contact.address = patch.address.trim();

        // şifrə yeniləmə
        if(typeof patch.adminPassword === "string" && patch.adminPassword.trim()){
          c.courseAdmin.password = patch.adminPassword.trim();

          const cdb = courseDb(db, courseId);
          const u = (cdb.users||[]).find(x=>x.role==="courseAdmin");
          if(u){
            u.id = courseId;
            u.password = c.courseAdmin.password;
            u.name = c.name + " Admin";
          }else{
            cdb.users.unshift({
              id: courseId,
              role:"courseAdmin",
              password:c.courseAdmin.password,
              name: c.name + " Admin",
              createdAt: nowISO(),
              profile:{}
            });
          }
        }

        save(db);
        return { ok:true, course:c };
      },


      // ✅ Company admin: Kursu sistemdən tam sil (bütün data + user ID-lər)
      deleteCourse(courseId){
        const db = load();
        const beforeLen = (db.courses||[]).length;
        db.courses = (db.courses||[]).filter(c => c.id !== courseId);
        if(db.courseData && db.courseData[courseId]) delete db.courseData[courseId];

        // activeCourseId silinibsə, mövcud ilk kursu seç
        if(db.meta?.activeCourseId === courseId){
          db.meta.activeCourseId = db.courses[0]?.id || null;
        }

        save(db);
        return { ok: (beforeLen !== (db.courses||[]).length) };
      },
  
      // Course admin creates users (ID random + şifrə random)
      addTeacher(courseId, teacherProfile){
        const db = load();
        const cdb = courseDb(db, courseId);
  
        const id = uniqUserId(db, "M");
        const pass = EJ.randPin(4);
        const fullName = `${teacherProfile.firstName||""} ${teacherProfile.lastName||""}`.trim();
  
        const user = {
          id,
          role:"teacher",
          password:pass,
          name: fullName || "Müəllim",
          createdAt: nowISO(),
          profile: teacherProfile
        };
        cdb.users.push(user);
        save(db);
        return { id, pass, user };
      },
  
      addStudent(courseId, studentProfile){
        const db = load();
        const cdb = courseDb(db, courseId);
  
        const id = uniqUserId(db, "T");
        const pass = EJ.randPin(4);
        const fullName = `${studentProfile.firstName||""} ${studentProfile.lastName||""}`.trim();
  
        const user = {
          id,
          role:"student",
          password:pass,
          name: fullName || "Tələbə",
          createdAt: nowISO(),
          profile: studentProfile
        };
        cdb.users.push(user);
        save(db);
        return { id, pass, user };
      },

      // ---- Course admin: Teacher CRUD ----
      updateTeacher(courseId, teacherId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        const u = (cdb.users||[]).find(x=>x.id===teacherId && x.role==="teacher");
        if(!u) return { ok:false, error:"Müəllim tapılmadı." };

        const p = u.profile || (u.profile = {});
        const fields = ["firstName","lastName","fatherName","age","gender","uni","phone","email","subjects","hireDate","photoDataUrl"];
        for(const k of fields){
          if(typeof patch[k] === "string") p[k] = patch[k];
        }
        u.name = `${p.firstName||""} ${p.lastName||""}`.trim() || u.name;
        save(db);
        return { ok:true, user:u };
      },
      deleteTeacher(courseId, teacherId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const before = (cdb.users||[]).length;
        cdb.users = (cdb.users||[]).filter(x => !(x.id===teacherId && x.role==="teacher"));
        save(db);
        return { ok: before !== (cdb.users||[]).length };
      },

      // ---- Course admin: Student CRUD ----
      updateStudent(courseId, studentId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        const u = (cdb.users||[]).find(x=>x.id===studentId && x.role==="student");
        if(!u) return { ok:false, error:"Tələbə tapılmadı." };

        const p = u.profile || (u.profile = {});
        const fields = ["firstName","lastName","fatherName","age","gender","phone","parentPhone","group","subjects"];
        for(const k of fields){
          if(typeof patch[k] === "string") p[k] = patch[k];
        }
        u.name = `${p.firstName||""} ${p.lastName||""}`.trim() || u.name;
        save(db);
        return { ok:true, user:u };
      },
      deleteStudent(courseId, studentId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const before = (cdb.users||[]).length;
        cdb.users = (cdb.users||[]).filter(x => !(x.id===studentId && x.role==="student"));
        cdb.attendance = (cdb.attendance||[]).filter(a => a.studentId !== studentId);
        save(db);
        return { ok: before !== (cdb.users||[]).length };
      },

      // ---- Rooms ----
      addRoom(courseId, payload){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb.rooms) cdb.rooms = [];
        const room = {
          id: EJ.uid("room"),
          name: String(payload.name||"").trim() || "Yeni otaq",
          teacherId: String(payload.teacherId||"").trim() || "",
          note: String(payload.note||"").trim(),
          createdAt: nowISO(),
          studentIds: []
        };
        cdb.rooms.push(room);
        save(db);
        return { ok:true, room };
      },
      updateRoom(courseId, roomId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb.rooms) cdb.rooms = [];
        const r = cdb.rooms.find(x=>x.id===roomId);
        if(!r) return { ok:false, error:"Otaq tapılmadı." };
        if(typeof patch.name === "string") r.name = patch.name.trim() || r.name;
        if(typeof patch.teacherId === "string") r.teacherId = patch.teacherId.trim();
        if(typeof patch.note === "string") r.note = patch.note.trim();
        save(db);
        return { ok:true, room:r };
      },
      deleteRoom(courseId, roomId){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb.rooms) cdb.rooms = [];
        const before = cdb.rooms.length;
        cdb.rooms = cdb.rooms.filter(x=>x.id!==roomId);
        cdb.schedule = (cdb.schedule||[]).filter(s => s.roomId !== roomId && s.room !== roomId);
        save(db);
        return { ok: before !== cdb.rooms.length };
      },

      // ---- Room members (Teacher) ----
      addStudentToRoom(courseId, roomId, studentId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const sid = String(studentId||"").trim();
        if(!rid || !sid) return { ok:false, error:"Məlumat natamamdır." };

        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(!Array.isArray(room.studentIds)) room.studentIds = [];

        const stu = (cdb.users||[]).find(u=>u.id===sid && u.role==="student");
        if(!stu) return { ok:false, error:"Belə tələbə tapılmadı." };

        if(room.studentIds.includes(sid)) return { ok:false, error:"Bu tələbə artıq otaqdadır." };

        room.studentIds.push(sid);
        save(db);
        return { ok:true };
      },
      removeStudentFromRoom(courseId, roomId, studentId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const sid = String(studentId||"").trim();
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(!Array.isArray(room.studentIds)) room.studentIds = [];
        const before = room.studentIds.length;
        room.studentIds = room.studentIds.filter(x=>x!==sid);
        save(db);
        return { ok: before !== room.studentIds.length };
      },
      // ---- Room syllabus (Teacher) ----
      setRoomSyllabus(courseId, roomId, teacherId, file){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        if(!rid || !tid) return { ok:false, error:"Məlumat natamamdır." };

        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };

        // file: {fileName, mime, size, dataUrl}
        if(!file || typeof file.dataUrl!=="string" || !file.dataUrl.startsWith("data:")) return { ok:false, error:"Fayl oxunmadı." };

        room.syllabus = {
          fileName: String(file.fileName||"sillabus"),
          mime: String(file.mime||""),
          size: Number(file.size||0),
          dataUrl: String(file.dataUrl||""),
          uploadedAt: nowISO(),
          uploadedBy: tid
        };
        save(db);
        return { ok:true };
      },

      removeRoomSyllabus(courseId, roomId, teacherId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        room.syllabus = null;
        save(db);
        return { ok:true };
      },


      // ---- Attendance ----
      getAttendance(courseId, roomId, dateISO){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const d = String(dateISO||"").trim();
        if(!rid || !d) return null;
        return (cdb.attendance||[]).find(a=>a.roomId===rid && a.date===d) || null;
      },

      setAttendance(courseId, roomId, teacherId, dateISO, items){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        const d = String(dateISO||"").trim();
        if(!rid || !tid || !d) return { ok:false, error:"Məlumat natamamdır." };

        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };

        const clean = (Array.isArray(items)?items:[]).map(x=>({
          studentId: String(x.studentId||"").trim(),
          status: String(x.status||"P").trim() // P,A,L
        })).filter(x=>x.studentId);

        let rec = (cdb.attendance||[]).find(a=>a.roomId===rid && a.date===d);
        if(!rec){
          rec = { id: "att-"+Math.random().toString(16).slice(2), roomId: rid, date: d, items: [], updatedAt: nowISO(), updatedBy: tid };
          cdb.attendance.push(rec);
        }
        rec.items = clean;
        rec.updatedAt = nowISO();
        rec.updatedBy = tid;
        save(db);
        return { ok:true };
      },

      // ---- Materials (per room) ----
      addRoomMaterial(courseId, roomId, teacherId, material){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        if(!rid || !tid) return { ok:false, error:"Məlumat natamamdır." };
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        room.materials = Array.isArray(room.materials)? room.materials : [];
        const m = Object.assign({}, material||{});
        m.id = m.id || ("mat-"+Math.random().toString(16).slice(2));
        m.title = String(m.title||"Material").trim();
        m.type = m.type==="link" ? "link" : "file";
        m.createdAt = nowISO();
        m.createdBy = tid;
        if(m.type==="link"){
          m.url = String(m.url||"").trim();
          if(!m.url) return { ok:false, error:"Link boş ola bilməz." };
        }else{
          m.fileName = String(m.fileName||"").trim();
          m.mime = String(m.mime||"").trim();
          m.size = Number(m.size||0);
          m.dataUrl = String(m.dataUrl||"");
          if(!m.dataUrl) return { ok:false, error:"Fayl tapılmadı." };
        }
        room.materials.unshift(m);
        save(db);
        return { ok:true, material:m };
      },

      updateRoomMaterial(courseId, roomId, teacherId, materialId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        const mid = String(materialId||"").trim();
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        room.materials = Array.isArray(room.materials)? room.materials : [];
        const m = room.materials.find(x=>x.id===mid);
        if(!m) return { ok:false, error:"Material tapılmadı." };
        patch = patch||{};
        if(typeof patch.title==="string") m.title = patch.title.trim()||m.title;
        if(m.type==="link" && typeof patch.url==="string") m.url = patch.url.trim()||m.url;
        if(m.type==="file" && typeof patch.dataUrl==="string" && patch.dataUrl){
          m.dataUrl = patch.dataUrl;
          if(typeof patch.fileName==="string") m.fileName = patch.fileName.trim()||m.fileName;
          if(typeof patch.mime==="string") m.mime = patch.mime;
          if(typeof patch.size==="number") m.size = patch.size;
        }
        save(db);
        return { ok:true };
      },

      removeRoomMaterial(courseId, roomId, teacherId, materialId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const rid = String(roomId||"").trim();
        const tid = String(teacherId||"").trim();
        const mid = String(materialId||"").trim();
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        room.materials = Array.isArray(room.materials)? room.materials : [];
        room.materials = room.materials.filter(x=>x.id!==mid);
        save(db);
        return { ok:true };
      },

      // ---- Grades ----
      addGrade(courseId, teacherId, grade){
        const db = load();
        const cdb = courseDb(db, courseId);
        const tid = String(teacherId||"").trim();
        grade = grade||{};
        const rid = String(grade.roomId||"").trim();
        const sid = String(grade.studentId||"").trim();
        if(!rid || !sid) return { ok:false, error:"Məlumat natamamdır." };
        const room = (cdb.rooms||[]).find(r=>r.id===rid);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        const g = {
          id: grade.id || ("gr-"+Math.random().toString(16).slice(2)),
          roomId: rid,
          studentId: sid,
          title: String(grade.title||"Qiymət").trim(),
          date: String(grade.date||"").trim(),
          score: Number(grade.score||0),
          createdAt: nowISO(),
          createdBy: tid
        };
        cdb.grades = Array.isArray(cdb.grades)?cdb.grades:[];
        cdb.grades.unshift(g);
        save(db);
        return { ok:true, grade:g };
      },

      updateGrade(courseId, teacherId, gradeId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        const tid = String(teacherId||"").trim();
        const gid = String(gradeId||"").trim();
        cdb.grades = Array.isArray(cdb.grades)?cdb.grades:[];
        const g = cdb.grades.find(x=>x.id===gid);
        if(!g) return { ok:false, error:"Qiymət tapılmadı." };
        const room = (cdb.rooms||[]).find(r=>r.id===g.roomId);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        patch = patch||{};
        if(typeof patch.title==="string") g.title = patch.title.trim()||g.title;
        if(typeof patch.date==="string") g.date = patch.date.trim()||g.date;
        if(typeof patch.score!=="undefined") g.score = Number(patch.score);
        save(db);
        return { ok:true };
      },

      removeGrade(courseId, teacherId, gradeId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const tid = String(teacherId||"").trim();
        const gid = String(gradeId||"").trim();
        cdb.grades = Array.isArray(cdb.grades)?cdb.grades:[];
        const g = cdb.grades.find(x=>x.id===gid);
        if(!g) return { ok:false, error:"Qiymət tapılmadı." };
        const room = (cdb.rooms||[]).find(r=>r.id===g.roomId);
        if(!room) return { ok:false, error:"Otaq tapılmadı." };
        if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        cdb.grades = cdb.grades.filter(x=>x.id!==gid);
        save(db);
        return { ok:true };
      },

      // ---- Announcements ----
      addAnnouncement(courseId, teacherId, ann){
        const db = load();
        const cdb = courseDb(db, courseId);
        const tid = String(teacherId||"").trim();
        ann = ann||{};
        const rid = String(ann.roomId||"").trim(); // optional
        if(rid){
          const room = (cdb.rooms||[]).find(r=>r.id===rid);
          if(!room) return { ok:false, error:"Otaq tapılmadı." };
          if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        }
        cdb.announcements = Array.isArray(cdb.announcements)?cdb.announcements:[];
        const a = {
          id: ann.id || ("an-"+Math.random().toString(16).slice(2)),
          roomId: rid || "",
          title: String(ann.title||"Elan").trim(),
          text: String(ann.text||"").trim(),
          createdAt: nowISO(),
          createdBy: tid
        };
        cdb.announcements.unshift(a);
        save(db);
        return { ok:true, announcement:a };
      },

      removeAnnouncement(courseId, teacherId, annId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const tid = String(teacherId||"").trim();
        const aid = String(annId||"").trim();
        cdb.announcements = Array.isArray(cdb.announcements)?cdb.announcements:[];
        const a = cdb.announcements.find(x=>x.id===aid);
        if(!a) return { ok:false, error:"Elan tapılmadı." };
        if(a.roomId){
          const room = (cdb.rooms||[]).find(r=>r.id===a.roomId);
          if(!room) return { ok:false, error:"Otaq tapılmadı." };
          if(String(room.teacherId||"") !== tid) return { ok:false, error:"Bu otağa müdaxilə icazəniz yoxdur." };
        }
        cdb.announcements = cdb.announcements.filter(x=>x.id!==aid);
        save(db);
        return { ok:true };
      },


      // ---- Payments (Company admin) ----
      addPayment(courseId, { paidAt, serviceEnd }){
        const db = load();
        const c = getCourse(db, courseId);
        if(!c) return { ok:false, error:"Kurs tapılmadı." };

        const pPaid = String(paidAt||"").trim();
        const pEnd  = String(serviceEnd||"").trim();
        if(!pPaid || !pEnd) return { ok:false, error:"Ödəniş tarixi və xidmətin bitmə tarixi tələb olunur." };

        if(!c.payments) c.payments = [];
        const id = "p" + Math.random().toString(16).slice(2,10);
        const rec = { id, paidAt: pPaid, serviceEnd: pEnd, createdAt: nowISO(), by: (db.company?.sessions?.companyAdminId||"") };
        c.payments.unshift(rec);

        // sync quick fields for dashboards
        c.contractEnd = pEnd;
        c.paymentDueAt = pEnd;
        const endDate = new Date(pEnd);
        c.paymentStatus = (endDate < new Date()) ? "late" : "paid";

        save(db);
        return { ok:true, payment: rec, course:c };
      },

      listPayments(courseId=null){
        const db = load();
        const courses = db.courses||[];
        if(courseId){
          const c = getCourse(db, courseId);
          return { ok:true, payments: (c?.payments||[]), course:c };
        }
        // overall
        const all = [];
        for(const c of courses){
          for(const p of (c.payments||[])){
            all.push({ ...p, courseId: c.id, courseName: c.name });
          }
        }
        all.sort((a,b)=> (new Date(b.paidAt)) - (new Date(a.paidAt)));
        return { ok:true, payments: all };
      },

      deletePayment(courseId, paymentId){
        const db = load();
        const c = getCourse(db, courseId);
        if(!c) return { ok:false, error:"Kurs tapılmadı." };
        if(!c.payments) c.payments = [];

        const before = c.payments.length;
        c.payments = c.payments.filter(p => p.id !== paymentId);

        // re-sync dashboard quick fields based on latest remaining payment
        const latest = (c.payments||[])[0];
        if(latest){
          c.contractEnd = latest.serviceEnd;
          c.paymentDueAt = latest.serviceEnd;
          const endDate = new Date(latest.serviceEnd);
          c.paymentStatus = (endDate < new Date()) ? "late" : "paid";
        }else{
          c.contractEnd = "";
          c.paymentDueAt = "";
          // no payment record -> treat as late (company can decide)
          c.paymentStatus = "late";
        }

        save(db);
        return { ok: before !== c.payments.length };
      },



      // ---- Student payments (Course Admin) ----
      listStudentPayments(courseId, studentId){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb) return { ok:false, error:"Kurs datası tapılmadı.", payments:[] };
        if(!cdb.studentPayments || typeof cdb.studentPayments!=="object") cdb.studentPayments = {};
        const arr = cdb.studentPayments[studentId] || [];
        return { ok:true, payments: arr.slice().sort((a,b)=> (b.paidAt||"").localeCompare(a.paidAt||"")) };
      },

      // tələbənin hazırkı ödəniş statusunu hesablayır (borc / ödənildi)
      getStudentPaymentStatus(courseId, studentId, atDateISO){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb) return { ok:false, error:"Kurs datası tapılmadı." };

        const now = atDateISO ? new Date(atDateISO) : new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local 00:00

        const arr = (cdb.studentPayments && cdb.studentPayments[studentId]) ? cdb.studentPayments[studentId].slice() : [];
        // normalize legacy records: periodFrom/periodTo yoxdursa, paidAt gününü period say
        arr.forEach(p=>{
          if(!p.periodFrom && p.paidAt) p.periodFrom = String(new Date(p.paidAt).toISOString().slice(0,10));
          if(!p.periodTo && p.periodFrom) p.periodTo = p.periodFrom;
        });

        // ən son bitmə tarixinə görə seç
        arr.sort((a,b)=> String(b.periodTo||"").localeCompare(String(a.periodTo||"")));
        const last = arr[0];

        if(!last){
          return { ok:true, status:"unpaid", isPaid:false, overdueDays:null, debtFrom:null, lastPayment:null };
        }

        const from = new Date(String(last.periodFrom));
        const to = new Date(String(last.periodTo));

        const inRange = !isNaN(from.getTime()) && !isNaN(to.getTime()) && (today >= new Date(from.getFullYear(),from.getMonth(),from.getDate())) && (today <= new Date(to.getFullYear(),to.getMonth(),to.getDate()));

        if(inRange){
          return { ok:true, status:"paid", isPaid:true, overdueDays:0, debtFrom:null, lastPayment:last };
        }

        // borc hesabı: bitmə günündən sonra
        const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
        const diffMs = (today - toDay);
        const overdueDays = diffMs>0 ? Math.floor(diffMs / (24*3600*1000)) : 0;
        const debtFrom = new Date(toDay.getTime() + 24*3600*1000).toISOString().slice(0,10);

        return { ok:true, status: overdueDays>0 ? "debt" : "unpaid", isPaid:false, overdueDays, debtFrom, lastPayment:last };
      },

      addStudentPayment(courseId, studentId, payload){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb) return { ok:false, error:"Kurs datası tapılmadı." };
        if(!cdb.studentPayments || typeof cdb.studentPayments!=="object") cdb.studentPayments = {};
        // paidAt: ödənişin edildiyi tarix (qeyd üçün)
        const paidAt = payload?.paidAt ? new Date(payload.paidAt).toISOString() : nowISO();
        const amount = Number(payload?.amount || 0);

        // periodFrom / periodTo: bu ödənişin əhatə etdiyi xidmət dövrü
        const periodFrom = (payload?.periodFrom || payload?.from || payload?.startDate || payload?.start) ? String(payload.periodFrom || payload.from || payload.startDate || payload.start) : (new Date(paidAt)).toISOString().slice(0,10);
        const periodTo   = (payload?.periodTo   || payload?.to   || payload?.endDate   || payload?.end)   ? String(payload.periodTo   || payload.to   || payload.endDate   || payload.end)   : periodFrom;

        // ay üçün köhnə uyğunluq (UI-lərdə lazım ola bilər)
        const d0 = new Date(periodFrom);
        const ym = `${d0.getFullYear()}-${String(d0.getMonth()+1).padStart(2,"0")}`;

        const rec = {
          id: "sp_" + Math.random().toString(16).slice(2) + Date.now().toString(16),
          studentId,
          paidAt,
          amount,
          periodFrom,
          periodTo,
          month: ym,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          status: "paid"
        };
        if(!Array.isArray(cdb.studentPayments[studentId])) cdb.studentPayments[studentId] = [];
        cdb.studentPayments[studentId].push(rec);
        save(db);
        return { ok:true, payment: rec };
      },

      updateStudentPayment(courseId, studentId, paymentId, patch){
        const db = load();
        const cdb = courseDb(db, courseId);
        if(!cdb?.studentPayments?.[studentId]) return { ok:false, error:"Ödəniş tapılmadı." };
        const arr = cdb.studentPayments[studentId];
        const rec = arr.find(x=>x.id===paymentId);
        if(!rec) return { ok:false, error:"Ödəniş tapılmadı." };

        if(typeof patch.paidAt === "string" && patch.paidAt){
          const paidAt = new Date(patch.paidAt).toISOString();
          rec.paidAt = paidAt;
          const d = new Date(paidAt);
          const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
          rec.month = ym;
        }
        if(patch.amount !== undefined){
          rec.amount = Number(patch.amount || 0);
        }
        if(typeof patch.periodFrom === "string" && patch.periodFrom){
          rec.periodFrom = String(patch.periodFrom);
          const d = new Date(rec.periodFrom);
          if(!isNaN(d.getTime())){
            rec.month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
          }
        }
        if(typeof patch.periodTo === "string" && patch.periodTo){
          rec.periodTo = String(patch.periodTo);
        }
        rec.updatedAt = nowISO();
        save(db);
        return { ok:true, payment: rec };
      },

      deleteStudentPayment(courseId, studentId, paymentId){
        const db = load();
        const cdb = courseDb(db, courseId);
        const arr = cdb?.studentPayments?.[studentId];
        if(!Array.isArray(arr)) return { ok:false, error:"Ödəniş tapılmadı." };
        const before = arr.length;
        cdb.studentPayments[studentId] = arr.filter(x=>x.id!==paymentId);
        save(db);
        return { ok: before !== cdb.studentPayments[studentId].length };
      },
// ---- Course admin settings (safe fields only) ----
      courseAdminUpdateCourse(courseId, patch){
        const db = load();
        const c = getCourse(db, courseId);
        if(!c) return { ok:false, error:"Kurs tapılmadı." };

        if(typeof patch.name === "string" && patch.name.trim()){
          c.name = patch.name.trim();
          const cdb = courseDb(db, courseId);
          const u = (cdb.users||[]).find(x=>x.role==="courseAdmin");
          if(u) u.name = c.name + " Admin";
        }

        if(!c.contact) c.contact = { phone1:"", phone2:"", address:"", email:"" };
        if(typeof patch.phone1 === "string") c.contact.phone1 = patch.phone1.trim();
        if(typeof patch.phone2 === "string") c.contact.phone2 = patch.phone2.trim();
        if(typeof patch.address === "string") c.contact.address = patch.address.trim();
        if(typeof patch.email === "string") c.contact.email = patch.email.trim();

        // logo (dataURL)
        if(typeof patch.logoDataUrl === "string") c.logoDataUrl = patch.logoDataUrl;

        save(db);
        return { ok:true, course:c };
      }

    };
  })();
  