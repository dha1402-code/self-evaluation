/* دليل التقويم الذاتي المدرسي — واجهة تعمل دون إنترنت (Electron أو المتصفح) */
(() => {
'use strict';
const D = window.EVAL_DATA;
const MAX = 50 * 1024 * 1024;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || '').replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
const size = n => n < 1048576 ? Math.max(1, Math.ceil(n / 1024)) + ' ك.ب' : (n / 1048576).toFixed(1) + ' م.ب';
const hijri = () => { try { return new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
const greg = () => new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- أيقونات ---------- */
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5', doc: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6',
  set: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6', search: 'M20 20l-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  up: 'M12 16V4M7 9l5-5 5 5M4 20h16', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  down: 'M12 4v12M7 11l5 5 5-5M4 20h16', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3', plus: 'M12 5v14M5 12h14', check: 'M5 12l5 5 9-10',
  print: 'M7 8V3h10v5M6 17H4v-7h16v7h-2M7 14h10v7H7z', x: 'M6 6l12 12M18 6L6 18', file: 'M6 3h8l5 5v13H6zM14 3v5h5',
  folder: 'M3 6h6l2 2h10v11H3z', chev: 'M6 9l6 6 6-6', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
const emblem = s => `<svg viewBox="0 0 100 100" width="${s}" height="${s}"><rect x="6" y="6" width="88" height="88" rx="22" style="fill:var(--p)"/><g fill="none" stroke="#e6c866" stroke-width="3"><rect x="24" y="24" width="52" height="52"/><rect x="24" y="24" width="52" height="52" transform="rotate(45 50 50)"/></g><circle cx="50" cy="50" r="17" fill="#e6c866"/><path d="M41 51l7 7 12-14" fill="none" stroke="#0b4f37" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------- التخزين: Electron (ملفات على الجهاز) أو المتصفح (IndexedDB) ---------- */
function idbStore() {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('selfeval', 1); r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (st, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const rq = fn(t.objectStore(st)); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); };
  const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const b64 = bytes => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(new Blob([bytes])); });
  const pickJson = () => new Promise(r => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => r(i.files[0] || null); i.addEventListener('cancel', () => r(null)); i.click(); });
  const S = {
    loadDb: () => tx('kv', 'readonly', s => s.get('db')),
    saveDb: db => tx('kv', 'readwrite', s => s.put(db, 'db')),
    putFile: (id, name, mime, bytes) => tx('files', 'readwrite', s => s.put({ bytes, name, mime }, id)),
    getFile: id => tx('files', 'readonly', s => s.get(id)),
    delFile: id => tx('files', 'readwrite', s => s.delete(id)),
    saveFileAs: async (id, name) => { const f = await S.getFile(id); dl(new Blob([f.bytes], { type: f.mime }), name); return true; },
    exportPdf: async () => { window.print(); return true; },
    info: async () => ({ path: 'مخزن المتصفح (IndexedDB)', platform: 'web' }), openFolder: async () => {},
    backup: async () => {
      const db = await S.loadDb(), files = {};
      for (const f of db.files) { const r = await S.getFile(f.id); if (r) files[f.id] = { name: r.name, mime: r.mime, b64: await b64(r.bytes) }; }
      dl(new Blob([JSON.stringify({ v: 1, db, files })], { type: 'application/json' }), 'نسخة-التقويم-الذاتي-' + new Date().toISOString().slice(0, 10) + '.json');
      return { ok: true };
    },
    restore: async () => {
      const f = await pickJson(); if (!f) return { ok: false };
      try {
        const j = JSON.parse(await f.text()); if (!j.db || !j.files) throw 0;
        await tx('files', 'readwrite', s => s.clear());
        for (const [id, x] of Object.entries(j.files)) await S.putFile(id, x.name, x.mime, Uint8Array.from(atob(x.b64), c => c.charCodeAt(0)));
        await S.saveDb(j.db); return { ok: true, db: j.db };
      } catch { return { ok: false, error: 'الملف المختار ليس نسخة احتياطية صالحة' }; }
    },
  };
  S.openFile = S.saveFileAs;
  return S;
}
const Store = window.desktop || idbStore();
const isDesktop = !!window.desktop;

/* ---------- الحالة ---------- */
const fresh = () => ({ v: 1, school: { name: '', year: '1447هـ', lead: '', logo: '', theme: 'green' }, files: [], custom: [], labels: {}, welcomed: false });
let db = fresh();
const state = { view: 'home', dom: 1, open: null, q: '' };
let target = null;
const save = () => Store.saveDb(db);

const IND = new Map(); // code -> {ind, dom, crit}
D.domains.forEach(d => d.criteria.forEach(c => c.indicators.forEach(i => IND.set(i.code, { ind: i, dom: d, crit: c }))));
const schoolName = () => db.school.name || 'مدرستي';
const wl = ind => [...ind.requiredDocuments.map(k => ({ key: k, custom: null })), ...db.custom.filter(c => c.code === ind.code).map(c => ({ key: c.name, custom: c.id }))]
  .map(w => ({ ...w, name: db.labels[ind.code + '::' + w.key] || w.key }));
const fo = (code, key) => db.files.filter(f => f.code === code && f.witness === key);
const indStat = ind => { const w = wl(ind); return { total: w.length, done: w.filter(x => fo(ind.code, x.key).length).length }; };
const sum = (arr, k) => arr.reduce((a, b) => ({ total: a.total + b.total, done: a.done + b.done }), { total: 0, done: 0 });
const domStat = d => sum(d.criteria.flatMap(c => c.indicators.map(indStat)));
const stats = () => { const s = sum(D.domains.map(domStat)); s.pct = s.total ? Math.round(s.done / s.total * 100) : 0; s.files = db.files.length; s.inds = [...IND.values()].filter(x => { const t = indStat(x.ind); return t.total && t.done === t.total; }).length; return s; };
const missing = () => [...IND.values()].flatMap(({ ind, dom }) => wl(ind).filter(w => !fo(ind.code, w.key).length).map(w => ({ ind, dom, w })));
const LV = [[0, '🌱', 'بداية الرحلة', 'ابدأ برفع أول شاهد وشاهد التقدم يكبر أمامك.'], [1, '🧭', 'انطلاقة موفقة', 'بدأتم الطريق — واصلوا ربط الشواهد بالمؤشرات.'], [25, '📈', 'تقدم ملحوظ', 'ربع الطريق خلفكم، استمروا بنفس الوتيرة.'], [50, '🚀', 'في منتصف الطريق', 'أنجزتم نصف الشواهد المطلوبة.'], [75, '🏅', 'على مشارف الجاهزية', 'اقتربتم من اكتمال الملف — راجعوا الناقص.'], [100, '🏆', 'ملف مكتمل', 'أحسنتم! جميع الشواهد مرفوعة.']];
const level = p => [...LV].reverse().find(l => p >= l[0]);
const TIPS = ['سمِّ ملفات الشواهد بأسماء واضحة تسهّل الوصول إليها عند المراجعة.', 'يفضّل رفع الشواهد بصيغة PDF لسهولة معاينتها على أي جهاز.', 'استخدم «إضافة شاهد» لتوثيق أي دليل إضافي لا تتضمنه القائمة الأساسية.', 'اسحب الملف وأفلته مباشرة على الشاهد المطلوب لرفعه بثوانٍ.', 'خذ نسخة احتياطية من الإعدادات بعد كل جلسة عمل كبيرة وأودعها مكاناً آمناً.', 'راجع لوحة الإنجاز أسبوعياً وابدأ بالمجالات الأقل اكتمالاً.'];
const dcol = id => `style="--c:var(--d${id})"`;

/* ---------- واجهات ---------- */
const ring = (pct) => `<div class="ring"><svg viewBox="0 0 170 170"><circle class="tr" cx="85" cy="85" r="70"/><circle class="pg" cx="85" cy="85" r="70" style="stroke-dasharray:0 999" data-d="${(pct / 100 * 439.8).toFixed(1)} 999"/></svg><div class="c"><div><b>${pct}%</b><br><small>نسبة الإنجاز</small></div></div></div>`;
const bar = (p, col) => `<div class="bar" ${col || ''}><i style="width:${p}%"></i></div>`;

function vHome() {
  const s = stats(), lv = level(s.pct), miss = missing().slice(0, 5);
  const dom = d => { const t = domStat(d), p = t.total ? Math.round(t.done / t.total * 100) : 0; return `<article class="card dom" ${dcol(d.id)} data-act="dom" data-id="${d.id}"><div class="e">${d.icon}</div><h3>${esc(d.name)}</h3><p>${esc(d.desc)}</p>${bar(p)}<div class="row"><span>${t.done} من ${t.total} شاهد</span><b>${p}%</b></div></article>`; };
  return `<div class="wrap">
  <section class="hero"><div class="txt"><div class="date">${hijri()}</div><h2>${esc(schoolName())}</h2><div class="lvl">${lv[1]} ${lv[2]}</div><p>${lv[3]}</p><button class="btn gold" data-act="nav" data-v="standards">${ic('up')} ${s.done ? 'متابعة رفع الشواهد' : 'ابدأ رفع الشواهد'}</button></div>${ring(s.pct)}</section>
  <div class="stats"><div class="stat"><i>✓</i><div><b>${s.done}</b><span>شواهد مكتملة</span></div></div><div class="stat miss"><i>!</i><div><b>${s.total - s.done}</b><span>شواهد ناقصة</span></div></div><div class="stat"><i>📎</i><div><b>${s.files}</b><span>ملفات مرفوعة</span></div></div><div class="stat"><i>🎯</i><div><b>${s.inds}/${IND.size}</b><span>مؤشرات مكتملة</span></div></div></div>
  <h2 class="h2">المجالات الأربعة</h2><div class="grid g4">${D.domains.map(dom).join('')}</div>
  <div class="grid g2"><div><h2 class="h2">الخطوات التالية</h2>${miss.length ? miss.map(m => `<div class="next"><span class="cd">${esc(m.ind.code)}</span><div class="t"><b>${esc(m.w.name)}</b><small>${esc(m.ind.text)}</small></div><button class="btn sm pri" data-act="goto" data-code="${esc(m.ind.code)}">${ic('up')} ارفع</button></div>`).join('') : '<div class="card empty">🎉 لا توجد شواهد ناقصة</div>'}</div>
  <div><h2 class="h2">نصيحة اليوم</h2><div class="tip"><div class="e">💡</div><div>${TIPS[new Date().getDate() % TIPS.length]}</div></div></div></div></div>`;
}

function witRow(ind, w) {
  const fs = fo(ind.code, w.key), done = fs.length > 0;
  return `<div class="wit ${done ? 'done' : ''}" data-code="${esc(ind.code)}" data-key="${esc(w.key)}"><div class="st">${done ? ic('check') : '!'}</div>
  <div class="nm"><b>${esc(w.name)}</b>${w.custom ? ' <small class="muted">(شاهد مضاف)</small>' : ''}
  <div class="files">${fs.map(f => `<div class="file" data-id="${f.id}">${ic('file')}<span title="${esc(f.name)}">${esc(f.name)}</span><small>${size(f.size)}</small><button class="btn sm ico" title="معاينة" data-act="prev">${ic('eye')}</button><button class="btn sm ico" title="حفظ نسخة" data-act="saveas">${ic('down')}</button><button class="btn sm ico bad" title="حذف الملف" data-act="delf">${ic('trash')}</button></div>`).join('')}</div></div>
  <div class="acts"><button class="btn sm pri" data-act="pick">${ic('up')} رفع</button><button class="btn sm ico" title="تعديل المسمى" data-act="rename">${ic('pen')}</button>${done ? `<button class="btn sm ico bad" title="حذف كل ملفات الشاهد" data-act="clearw">${ic('trash')}</button>` : ''}${w.custom ? `<button class="btn sm bad" data-act="delcustom" data-cid="${w.custom}">إزالة الشاهد</button>` : ''}</div></div>`;
}
function indCard(ind, dom) {
  const open = state.open === ind.code, t = indStat(ind);
  return `<div class="ind ${open ? 'open' : ''}" ${dcol(dom.id)} data-ind="${esc(ind.code)}"><button class="hd" data-act="tog" data-code="${esc(ind.code)}"><span class="cd">${esc(ind.code)}</span><span class="tx">${esc(ind.text)}</span><span class="pc ${t.done === t.total ? 'ok' : ''}">${t.done}/${t.total}</span><span class="chev">${ic('chev')}</span></button>
  ${open ? `<div class="body"><div class="lbl">الوثائق المطلوبة لإثبات تحقق المؤشر · اسحب الملف وأفلته على الشاهد أو اضغط «رفع»</div>${wl(ind).map(w => witRow(ind, w)).join('')}<button class="btn sm add" data-act="addcustom" data-code="${esc(ind.code)}">${ic('plus')} إضافة شاهد جديد غير مدرج</button></div>` : ''}</div>`;
}
function vStandards() {
  const q = norm(state.q.trim());
  if (q) {
    const hits = [...IND.values()].filter(({ ind }) => norm(ind.code + ' ' + ind.text + ' ' + wl(ind).map(w => w.name).join(' ')).includes(q));
    return `<div class="wrap"><h2 class="h2">نتائج البحث (${hits.length})</h2>${hits.length ? hits.map(h => `<div style="margin-bottom:2px">${indCard(h.ind, h.dom)}</div>`).join('') : '<div class="card empty">لا توجد نتائج مطابقة</div>'}</div>`;
  }
  const d = D.domains.find(x => x.id === state.dom) || D.domains[0];
  return `<div class="wrap"><div class="tabs">${D.domains.map(x => { const t = domStat(x); return `<button class="tab ${x.id === d.id ? 'on' : ''}" ${dcol(x.id)} data-act="dom" data-id="${x.id}"><span style="font-size:22px">${x.icon}</span><span>${esc(x.name)}<small>${t.done}/${t.total} شاهد</small></span></button>`; }).join('')}</div>
  <p class="muted" style="margin-top:-6px">${esc(d.desc)}</p>
  ${d.criteria.map(c => { const t = sum(c.indicators.map(indStat)); return `<section class="crit" ${dcol(d.id)}><header><span class="no">${c.id}</span><h3>المعيار: ${esc(c.name)}</h3><span class="muted">${t.done}/${t.total} شاهد</span></header>${c.indicators.map(i => indCard(i, d)).join('')}</section>`; }).join('')}</div>`;
}
function vLearn() {
  const steps = ['أدخل اسم مدرستك من «الإعدادات» (مرة واحدة).', 'من «المجالات والمعايير» اختر المجال ثم افتح المؤشر.', 'ارفع الشاهد المطلوب أو اسحب الملف وأفلته عليه — ثم عاينه أو احفظ نسخة منه متى شئت.', 'تابع «الرئيسية» و«تقرير الإنجاز» لمعرفة الناقص، واطبع التقرير أو احفظه PDF.', 'خذ نسخة احتياطية دورية من «الإعدادات».'];
  return `<div class="wrap"><h2 class="h2" style="margin-top:0">كيف أستخدم البرنامج؟</h2><div class="card"><ol class="steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol></div>
  <h2 class="h2">لماذا التقويم الذاتي؟</h2><div class="grid g3">${D.goals.map((g, i) => `<article class="card goal"><span class="n">${String(i + 1).padStart(2, '0')}</span><div class="e">${g.icon}</div><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p></article>`).join('')}</div>
  <div class="note"><span style="font-size:26px">📌</span><div><b>الهدف العام</b><br>يهدف التقويم الذاتي بشكل عام إلى تمكين المدرسة من التعرف بذاتها على دوافع القوة وفرص التحسين لديها، كما يهدف إلى تحقيق التطوير والتحسين المستمر المنطقي.</div></div>
  <h2 class="h2">متطلبات تطبيق التقويم الذاتي</h2><div class="card">${D.requirements.map((r, i) => `<div class="req"><span class="n">${i + 1}</span><div><b>${esc(r.title)}</b><span>${esc(r.text)}</span></div></div>`).join('')}</div>
  <div class="note"><span style="font-size:26px">⚠️</span><div><b>ملاحظة مهمة</b><br>يتطلب تطبيق التقويم الذاتي للدورة الثانية وفق مستهدفات خطة التحسين للدورة الأولى. تمر العمليات بثلاث مراحل: الإعداد والتهيئة، ثم التنفيذ، ثم الإغلاق.</div></div>
  <h2 class="h2">أدوات التقويم</h2><div class="grid g3">${D.tools.map(t => `<article class="card tool"><span class="k">${esc(t.kind)}</span><div class="e">${t.icon}</div><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></article>`).join('')}</div></div>`;
}
function vReport() {
  const s = stats();
  return `<div class="wrap"><div class="no-print" style="display:flex;gap:10px;margin-bottom:16px"><button class="btn pri" data-act="print">${ic('print')} طباعة التقرير</button>${isDesktop ? `<button class="btn" data-act="pdf">${ic('down')} حفظ كملف PDF</button>` : ''}</div>
  <div class="card"><div class="rep-head"><div class="logo" style="width:64px;height:64px">${db.school.logo ? `<img src="${db.school.logo}" alt="">` : emblem(64)}</div><div style="flex:1"><h2>تقرير الإنجاز — التقويم الذاتي المدرسي</h2><div class="muted">${esc(schoolName())} · ${esc(db.school.year)}${db.school.lead ? ' · قائد الفريق: ' + esc(db.school.lead) : ''}</div></div><div class="muted" style="text-align:left">${hijri()}<br>${greg()}</div></div>
  <div class="stats" style="margin:0 0 20px"><div class="stat"><i>%</i><div><b>${s.pct}%</b><span>نسبة الإنجاز</span></div></div><div class="stat"><i>✓</i><div><b>${s.done}</b><span>شواهد مكتملة</span></div></div><div class="stat miss"><i>!</i><div><b>${s.total - s.done}</b><span>شواهد ناقصة</span></div></div><div class="stat"><i>📎</i><div><b>${s.files}</b><span>ملفات مرفوعة</span></div></div></div>
  ${D.domains.map(d => { const t = domStat(d); return `<section class="rd" ${dcol(d.id)}><h3><span>${d.icon} المجال ${d.id}: ${esc(d.name)}</span><span>${t.done}/${t.total}</span></h3>${d.criteria.map(c => `<div class="rc"><b>${c.id} — ${esc(c.name)}</b>${c.indicators.map(i => { const st = indStat(i); return `<div class="ri"><div class="t"><code>${esc(i.code)}</code><span>${esc(i.text)}</span><em>${st.done}/${st.total}</em></div>${wl(i).map(w => { const ok = fo(i.code, w.key).length > 0; return `<div class="rw ${ok ? '' : 'miss'}"><span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '!'}</span><span>${esc(w.name)}</span><span>${ok ? '' : '— ناقص'}</span></div>`; }).join('')}</div>`; }).join('')}</div>`).join('')}</section>`; }).join('')}</div></div>`;
}
function vSettings() {
  const s = db.school;
  return `<div class="wrap set"><div class="grid g2"><div class="card"><h3 style="margin-top:0">بيانات المدرسة</h3>
  <label>اسم المدرسة</label><input class="in" data-f="name" value="${esc(s.name)}" placeholder="مثال: ثانوية الملك خالد">
  <label>العام الدراسي</label><input class="in" data-f="year" value="${esc(s.year)}">
  <label>قائد فريق التقويم الذاتي (اختياري)</label><input class="in" data-f="lead" value="${esc(s.lead)}">
  <label>شعار المدرسة (اختياري)</label><div style="display:flex;gap:10px;align-items:center"><div style="width:56px;height:56px">${s.logo ? `<img src="${s.logo}" style="width:100%;height:100%;object-fit:contain">` : emblem(56)}</div><button class="btn sm" data-act="logo">${ic('up')} اختيار صورة</button>${s.logo ? '<button class="btn sm bad" data-act="logo-rm">إزالة</button>' : ''}</div>
  <label>الألوان</label><div class="themes"><button class="th ${s.theme !== 'violet' ? 'on' : ''}" data-act="theme" data-t="green"><i style="background:linear-gradient(135deg,#12714d 50%,#c9a227 50%)"></i>أخضر وذهبي</button><button class="th ${s.theme === 'violet' ? 'on' : ''}" data-act="theme" data-t="violet"><i style="background:linear-gradient(135deg,#4b20b8 50%,#08aaa5 50%)"></i>بنفسجي (الأصلي)</button></div></div>
  <div class="card"><h3 style="margin-top:0">النسخ الاحتياطي</h3><p class="muted">كل بياناتك وشواهدك محفوظة على هذا الجهاز فقط. خذ نسخة احتياطية دورياً، واستعدها عند الانتقال لجهاز آخر.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn pri" data-act="backup">${ic('down')} إنشاء نسخة احتياطية</button><button class="btn" data-act="restore">${ic('up')} استعادة نسخة</button>${isDesktop ? `<button class="btn" data-act="folder">${ic('folder')} فتح مجلد البيانات</button>` : ''}</div>
  <label>مكان التخزين</label><div class="path" id="dpath">…</div>
  <p class="muted" style="margin-top:14px">${ic('lock')} لا يتصل البرنامج بالإنترنت إطلاقاً ولا يرسل أي بيانات.</p></div></div>
  <div class="card" style="margin-top:16px"><h3 style="margin-top:0">عن البرنامج</h3><p class="muted" style="margin:0">مبني على «دليل التقويم الذاتي المدرسي» من إعداد مدرسة الموهوبين التقنية الثانوية بنين بجدة، تحت إشراف الدكتور محمود بن علي العسيري. ${IND.size} مؤشراً · ${D.domains.reduce((a, d) => a + d.criteria.length, 0)} معياراً · 4 مجالات.</p></div></div>`;
}

const NAV = [['home', 'home', 'الرئيسية'], ['standards', 'grid', 'المجالات والمعايير'], ['report', 'doc', 'تقرير الإنجاز'], ['learn', 'book', 'تعرّف على التقويم'], ['settings', 'set', 'الإعدادات']];
const TITLES = { home: ['لوحة القيادة', 'نظرة شاملة على تقدّم ملف مدرستك'], standards: ['المجالات والمعايير', 'ارفع الشواهد وتابع اكتمال كل مؤشر'], report: ['تقرير الإنجاز', 'جاهز للطباعة أو الحفظ بصيغة PDF'], learn: ['تعرّف على التقويم الذاتي', 'الأهداف والمتطلبات والأدوات'], settings: ['الإعدادات', 'بيانات المدرسة والنسخ الاحتياطي'] };
function render() {
  const old = $('.main'), top = old ? old.scrollTop : 0, f = document.activeElement, kf = f && f.id === 'q', pos = kf ? f.selectionStart : 0;
  const s = stats(), v = state.view, t = TITLES[v];
  const views = { home: vHome, standards: vStandards, report: vReport, learn: vLearn, settings: vSettings };
  $('#app').innerHTML = `<div class="shell"><aside class="side no-print"><div class="brand"><div class="logo ${db.school.logo ? 'img' : ''}">${db.school.logo ? `<img src="${db.school.logo}" alt="">` : emblem(52)}</div><div><b>${esc(schoolName())}</b><small>التقويم الذاتي · ${esc(db.school.year)}</small></div></div>
  ${NAV.map(([id, i, l]) => `<button class="nav ${v === id ? 'on' : ''}" data-act="nav" data-v="${id}">${ic(i)}<span>${l}</span>${id === 'standards' && s.total - s.done ? `<em class="badge">${s.total - s.done}</em>` : ''}</button>`).join('')}
  <div class="grow"></div><div class="mini">الإنجاز الكلي <b style="float:left">${s.pct}%</b><div class="bar"><i style="width:${s.pct}%"></i></div></div></aside>
  <div class="content"><div class="top no-print"><h1>${t[0]}<small>${t[1]}</small></h1><label class="search">${ic('search')}<input id="q" placeholder="ابحث في المؤشرات والشواهد…" value="${esc(state.q)}" autocomplete="off"></label></div><div class="main">${views[v]()}</div></div></div><input type="file" id="fi" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*">`;
  const m = $('.main'); if (m) m.scrollTop = top;
  if (kf) { const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); }
  document.querySelectorAll('.pg').forEach(e => requestAnimationFrame(() => requestAnimationFrame(() => { e.style.strokeDasharray = e.dataset.d; })));
  if (v === 'settings') Store.info().then(i => { const e = $('#dpath'); if (e) e.textContent = i.path; });
}

/* ---------- حوارات وإشعارات ---------- */
function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3200); }
function ask({ title, msg, emoji, input, value, ok = 'تأكيد', danger, hideCancel }) {
  return new Promise(res => {
    const d = $('#dlg');
    d.innerHTML = `<form class="dg"><div class="em">${emoji || ''}</div><h3>${esc(title)}</h3>${msg ? `<p>${esc(msg)}</p>` : ''}${input ? `<input class="in" id="dgi" value="${esc(value || '')}" placeholder="${esc(input)}" autocomplete="off">` : ''}<div class="row">${hideCancel ? '' : '<button type="button" class="btn" id="dgno">إلغاء</button>'}<button type="submit" class="btn ${danger ? 'dng' : 'pri'}">${ok}</button></div></form>`;
    d.querySelector('form').onsubmit = e => { e.preventDefault(); const v = input ? $('#dgi').value.trim() : true; d.close(); res(v || false); };
    const no = $('#dgno'); if (no) no.onclick = () => { d.close(); res(false); };
    d.oncancel = () => res(false);
    d.showModal(); if (input) $('#dgi').select();
  });
}
const confirmD = (title, msg) => ask({ title, msg, emoji: '⚠️', danger: true, ok: 'نعم، احذف' });

/* ---------- العمليات ---------- */
const okType = f => /^image\//.test(f.type) || /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|bmp)$/i.test(f.name);
async function addFiles(code, key, list) {
  let n = 0;
  for (const f of list) {
    if (!okType(f)) { toast('صيغة غير مدعومة: ' + f.name, true); continue; }
    if (f.size > MAX) { toast('الحد الأقصى للملف 50 م.ب: ' + f.name, true); continue; }
    const id = uid();
    try { await Store.putFile(id, f.name, f.type, new Uint8Array(await f.arrayBuffer())); db.files.push({ id, code, witness: key, name: f.name, size: f.size, mime: f.type, at: Date.now() }); n++; }
    catch { toast('تعذر حفظ الملف: ' + f.name, true); }
  }
  if (n) { await save(); render(); toast(n === 1 ? 'تم حفظ الشاهد' : `تم حفظ ${n} ملفات`); }
}
async function removeFile(id) { await Store.delFile(id); db.files = db.files.filter(f => f.id !== id); }
const guessType = f => f.mime || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'application/octet-stream');
async function preview(id) {
  const f = db.files.find(x => x.id === id); if (!f) return;
  const type = guessType(f), img = /^image\//.test(type), pdf = type === 'application/pdf';
  const act = `<button class="btn sm" id="pvs">${ic('down')} حفظ نسخة</button>${isDesktop ? `<button class="btn sm" id="pvo">فتح بالبرنامج الافتراضي</button>` : ''}<button class="btn sm ico" id="pvx">${ic('x')}</button>`;
  let url = '', body = `<div class="empty">لا يمكن معاينة هذا النوع داخل البرنامج.<br>استخدم «${isDesktop ? 'فتح بالبرنامج الافتراضي' : 'حفظ نسخة'}» لعرضه.</div>`;
  if (img || pdf) { const r = await Store.getFile(id); url = URL.createObjectURL(new Blob([r.bytes], { type })); body = img ? `<img src="${url}" alt="">` : `<iframe src="${url}" title="معاينة"></iframe>`; }
  const p = $('#pv'); p.innerHTML = `<div class="pvb"><header><b>${esc(f.name)}</b>${act}</header><div class="v">${body}</div></div>`;
  p.onclose = () => url && URL.revokeObjectURL(url);
  $('#pvx').onclick = () => p.close(); $('#pvs').onclick = () => Store.saveFileAs(id, f.name);
  if ($('#pvo')) $('#pvo').onclick = () => Store.openFile(id);
  p.addEventListener('click', e => { if (e.target === p) p.close(); }, { once: true });
  p.showModal();
}
function readLogo(file) { return new Promise(res => { const i = new Image(); i.onload = () => { const k = Math.min(1, 256 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; i.onerror = () => res(''); i.src = URL.createObjectURL(file); }); }
const domOf = code => IND.get(code)?.dom.id || 1;
async function welcome() {
  const d = $('#dlg');
  d.innerHTML = `<form class="dg welcome"><div class="logo">${emblem(84)}</div><h3>مرحباً بك في دليل التقويم الذاتي</h3><p>برنامج يعمل دون إنترنت — بياناتك وشواهدك تبقى على جهازك.</p><input class="in" id="dgi" placeholder="اكتب اسم مدرستك" autocomplete="off"><div class="row" style="justify-content:center"><button class="btn pri" type="submit">ابدأ الآن</button></div></form>`;
  d.querySelector('form').onsubmit = async e => { e.preventDefault(); const n = $('#dgi').value.trim(); if (n) db.school.name = n; db.welcomed = true; await save(); d.close(); render(); };
  d.oncancel = e => e.preventDefault(); d.showModal();
}

/* ---------- الأحداث ---------- */
const A = {
  nav: el => { state.view = el.dataset.v; state.q = ''; },
  dom: el => { state.view = 'standards'; state.dom = +el.dataset.id; state.open = null; state.q = ''; },
  tog: el => { state.open = state.open === el.dataset.code ? null : el.dataset.code; },
  goto: el => { const c = el.dataset.code; Object.assign(state, { view: 'standards', q: '', dom: domOf(c), open: c }); setTimeout(() => [...document.querySelectorAll('[data-ind]')].find(e => e.dataset.ind === c)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30); },
  pick: el => { const w = el.closest('.wit'); target = { code: w.dataset.code, key: w.dataset.key }; $('#fi').click(); return false; },
  prev: el => { preview(el.closest('.file').dataset.id); return false; },
  saveas: async el => { const id = el.closest('.file').dataset.id; await Store.saveFileAs(id, db.files.find(f => f.id === id).name); return false; },
  delf: async el => { const id = el.closest('.file').dataset.id; if (await confirmD('حذف الملف؟', 'لا يمكن التراجع عن الحذف.')) { await removeFile(id); await save(); toast('تم حذف الملف'); } else return false; },
  rename: async el => { const w = el.closest('.wit'), code = w.dataset.code, key = w.dataset.key, cur = db.labels[code + '::' + key] || key; const n = await ask({ title: 'تعديل مسمى الوثيقة', input: 'المسمى الجديد', value: cur, ok: 'حفظ', emoji: '✏️' }); if (!n) return false; if (n === key) delete db.labels[code + '::' + key]; else db.labels[code + '::' + key] = n; await save(); },
  clearw: async el => { const w = el.closest('.wit'); if (!(await confirmD('حذف جميع ملفات هذا الشاهد؟', 'سيبقى الشاهد مطلوباً ويظهر كناقص.'))) return false; for (const f of fo(w.dataset.code, w.dataset.key)) await removeFile(f.id); await save(); toast('تم حذف ملفات الشاهد'); },
  addcustom: async el => { const n = await ask({ title: 'إضافة شاهد جديد', msg: 'اكتب اسم الوثيقة التي تريد توثيقها لهذا المؤشر.', input: 'اسم الشاهد', ok: 'إضافة', emoji: '📎' }); if (!n) return false; db.custom.push({ id: uid(), code: el.dataset.code, name: n }); await save(); toast('تمت إضافة الشاهد'); },
  delcustom: async el => { const c = db.custom.find(x => x.id === el.dataset.cid); if (!c || !(await confirmD('إزالة هذا الشاهد المضاف؟', 'ستُحذف ملفاته أيضاً.'))) return false; for (const f of fo(c.code, c.name)) await removeFile(f.id); db.custom = db.custom.filter(x => x !== c); await save(); },
  print: () => { window.print(); return false; },
  pdf: async () => { if (await Store.exportPdf('تقرير-التقويم-الذاتي-' + schoolName())) toast('تم حفظ التقرير'); return false; },
  theme: async el => { db.school.theme = el.dataset.t; document.documentElement.dataset.theme = el.dataset.t; await save(); },
  logo: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { if (i.files[0]) { const d = await readLogo(i.files[0]); if (d) { db.school.logo = d; await save(); render(); } } }; i.click(); return false; },
  'logo-rm': async () => { db.school.logo = ''; await save(); },
  backup: async () => { const r = await Store.backup(); if (r.ok) toast('تم إنشاء النسخة الاحتياطية'); return false; },
  restore: async () => { if (!(await ask({ title: 'استعادة نسخة احتياطية؟', msg: 'ستُستبدل البيانات الحالية بمحتوى النسخة (مع حفظ نسخة أمان تلقائية).', emoji: '♻️', ok: 'متابعة' }))) return false; const r = await Store.restore(); if (r.ok) { db = Object.assign(fresh(), r.db); db.school = Object.assign(fresh().school, db.school); document.documentElement.dataset.theme = db.school.theme; toast('تمت استعادة النسخة'); } else { if (r.error) toast(r.error, true); return false; } },
  folder: () => { Store.openFolder(); return false; },
};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || !A[el.dataset.act]) return;
  const r = await A[el.dataset.act](el); if (r !== false) render();
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { state.q = e.target.value; if (state.q) state.view = 'standards'; render(); }
});
document.addEventListener('change', async e => {
  if (e.target.id === 'fi') { const fl = [...e.target.files]; e.target.value = ''; if (target && fl.length) addFiles(target.code, target.key, fl); }
  else if (e.target.dataset.f) { db.school[e.target.dataset.f] = e.target.value.trim(); await save(); render(); }
});
['dragover', 'drop'].forEach(t => document.addEventListener(t, e => { e.preventDefault(); const w = e.target.closest && e.target.closest('.wit'); document.querySelectorAll('.wit.drag').forEach(x => x !== w && x.classList.remove('drag')); if (t === 'dragover') w && w.classList.add('drag'); else { w && w.classList.remove('drag'); if (w && e.dataTransfer.files.length) addFiles(w.dataset.code, w.dataset.key, [...e.dataTransfer.files]); } }));
document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.querySelectorAll('.wit.drag').forEach(x => x.classList.remove('drag')); });

/* ---------- الإقلاع ---------- */
(async () => {
  try { const l = await Store.loadDb(); if (l) { db = Object.assign(fresh(), l); db.school = Object.assign(fresh().school, l.school); } } catch (e) { console.error(e); }
  document.documentElement.dataset.theme = db.school.theme;
  render();
  if (!db.welcomed) welcome();
})();
})();
