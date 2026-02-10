// common.js
window.EJ = window.EJ || {};

EJ.$ = (sel, root=document) => root.querySelector(sel);
EJ.escape = (s="") => String(s)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

EJ.toast = function(msg, type="info"){
  const el = document.createElement("div");
  el.className = "card p16";
  el.style.position="fixed";
  el.style.right="16px";
  el.style.bottom="16px";
  el.style.maxWidth="420px";
  el.style.zIndex="99999";
  el.style.borderColor = type==="ok" ? "#bff3df" : type==="danger" ? "#fecaca" : "var(--border)";
  el.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start">
    <div class="badge ${type==="ok"?"ok":type==="danger"?"danger":""}">${EJ.escape(type.toUpperCase())}</div>
    <div style="color:var(--text)">${EJ.escape(msg)}</div>
  </div>`;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2400);
};

EJ.modal = function({title, bodyHTML, okText="Yadda saxla", cancelText="Ləğv et", onOk, onOpen, hideCancel=false, danger=false}){
  const wrap = document.createElement("div");
  wrap.className = "modalOverlay";
  wrap.innerHTML = `
    <div class="modal">
      <div class="modalHeader">
        <div style="font-weight:800">${EJ.escape(title)}</div>
        <button class="btn" data-x>✕</button>
      </div>
      <div class="modalBody">${bodyHTML}</div>
      <div class="modalFooter">
        ${hideCancel ? "" : `<button class="btn" data-cancel>${EJ.escape(cancelText)}</button>`}
        <button class="btn solid ${danger?"danger":""}" data-ok>${EJ.escape(okText)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = ()=> wrap.remove();
  wrap.addEventListener("click", (e)=>{ if(e.target===wrap) close(); });
  EJ.$("[data-x]", wrap).onclick = close;
  const cancelBtn = EJ.$("[data-cancel]", wrap);
  if(cancelBtn) cancelBtn.onclick = close;

  // allow callers to bind events after modal is in DOM
  try{ onOpen?.(wrap); }catch(e){}

  EJ.$("[data-ok]", wrap).onclick = async ()=>{
    try{
      const res = await onOk?.(wrap);
      if(res !== false) close();
    }catch(err){
      EJ.toast(err?.message || "Xəta baş verdi.", "danger");
    }
  };
  return wrap;
};

EJ.uid = (prefix="id") => prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);

EJ.randPin = (len=4) => {
  let s = "";
  for(let i=0;i<len;i++) s += Math.floor(Math.random()*10);
  return s;
};
EJ.randCode = (prefix="T", digits=5) => {
  let n = "";
  for(let i=0;i<digits;i++) n += Math.floor(Math.random()*10);
  return `${prefix}-${n}`;
};

EJ.initReveal = function(){
  const els = document.querySelectorAll(".reveal");
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add("show");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  els.forEach(el=>io.observe(el));
};


EJ.setBrandLogo = function(el, course){
  if(!el) return;
  const logo = course && typeof course.logoDataUrl === "string" ? course.logoDataUrl : "";
  if(logo){
    el.innerHTML = `<img alt="logo" src="${EJ.escape(logo)}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
    return;
  }
  const name = (course && course.name) ? course.name : "EJ";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0]||"E") + (parts[1]?.[0]||"J");
  el.textContent = initials.toUpperCase();
};
