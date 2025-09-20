// To-Do App — full yellow + datepicker + edit + dashboard + delegation
(function(){
  "use strict";

  /** @type {Array<{id:string,text:string,due:string, dueTime?:string|null,done:boolean,createdAt?:string,completedAt?:string}>} */
  let todos = load();

  // ==== ELEMENTS ====
  const form = document.getElementById('todo-form');
  const textInput = document.getElementById('todo-text');

  const dateInput = document.getElementById('todo-date');
  const timeInput = document.getElementById('todo-time');      // opsional
  const dateTrigger = document.getElementById('date-trigger');

  const textError = document.getElementById('text-error');
  const dateError = document.getElementById('date-error');

  const statusFilter = document.getElementById('status-filter');
  const searchInput  = document.getElementById('search-input');
  const dateScope    = document.getElementById('date-scope');

  const list       = document.getElementById('todo-list');
  const emptyState = document.getElementById('empty-state');

  // NEW: tombol Delete All
  const deleteAllBtn = document.getElementById('delete-all');

  // dashboard
  const dashTotal = document.getElementById('dash-total');
  const dashDone  = document.getElementById('dash-done');
  const dashRate  = document.getElementById('dash-rate');

  // ==== DATE/TIME HELPERS ====
  function parseDateToIso(s){
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!m) return null;
    let dd = m[1], mm = m[2], yyyy = m[3];
    const a = parseInt(dd,10), b = parseInt(mm,10);
    if (a > 12 && b <= 12) { /* dd/mm */ }
    else if (b > 12 && a <= 12) { [dd, mm] = [mm, dd]; }
    else { [dd, mm] = [mm, dd]; }
    dd = String(parseInt(dd,10)).padStart(2,'0');
    mm = String(parseInt(mm,10)).padStart(2,'0');

    const di = parseInt(dd,10), mi = parseInt(mm,10);
    if (mi < 1 || mi > 12) return null;
    if (di < 1 || di > 31) return null;

    const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (isNaN(dt.getTime())) return null;
    const check = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if (check !== `${yyyy}-${mm}-${dd}`) return null;
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseTimeOrNull(s){
    const v = (s||'').trim();
    if (!v) return null;
    const m = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;
    return `${m[1]}:${m[2]}`;
  }

  function isoToMDY(iso){
    const [y,m,d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }

  function nowLocalISOMinute(){
    const dt = new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  }

  function combineDueISO(dueISO, timeHHMM){
    return `${dueISO}T${timeHHMM || '23:59'}`;
  }

  function prettyDateTime(iso){
    try{
      const dt = new Date(iso);
      return dt.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    }catch{ return iso; }
  }
  function formatMDY(date){
    const mm=String(date.getMonth()+1).padStart(2,'0');
    const dd=String(date.getDate()).padStart(2,'0');
    const yyyy=String(date.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }
  function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }

  // ==== MASKER INPUT ====
  dateInput.addEventListener('input', () => {
    let v = dateInput.value.replace(/[^\d]/g,'');
    if (v.length > 8) v = v.slice(0,8);
    if (v.length > 4) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
    else if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
    dateInput.value = v;
  });

  timeInput.addEventListener('input', ()=>{
    let v = timeInput.value.replace(/[^\d]/g,'');
    if (v.length > 4) v = v.slice(0,4);
    if (v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2);
    timeInput.value = v;
  });

  // ==== DATE PICKER (popover) ====
  let dpEl=null, dpMonth=null;
  function ensureDatePicker(){
    if (dpEl) return dpEl;
    dpEl = document.createElement('div');
    dpEl.className = 'datepicker';
    dpEl.innerHTML = `
      <div class="dp-header">
        <div class="dp-nav">
          <button type="button" class="dp-btn" data-dp="prev-year">«</button>
          <button type="button" class="dp-btn" data-dp="prev">◀</button>
          <button type="button" class="dp-btn" data-dp="next">▶</button>
          <button type="button" class="dp-btn" data-dp="next-year">»</button>
        </div>
        <div class="dp-title"></div>
      </div>
      <div class="dp-grid">
        <div class="dp-dow">Su</div><div class="dp-dow">Mo</div><div class="dp-dow">Tu</div>
        <div class="dp-dow">We</div><div class="dp-dow">Th</div><div class="dp-dow">Fr</div><div class="dp-dow">Sa</div>
      </div>
      <div class="dp-footer">
        <button type="button" class="dp-btn dp-today" data-dp="today">Today</button>
        <button type="button" class="dp-btn dp-clear" data-dp="clear">Clear</button>
      </div>
    `;
    document.body.appendChild(dpEl);

    dpEl.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const act=b.dataset.dp;
      if (act==='prev')      { dpMonth.setMonth(dpMonth.getMonth()-1); renderPicker(); }
      if (act==='next')      { dpMonth.setMonth(dpMonth.getMonth()+1); renderPicker(); }
      if (act==='prev-year') { dpMonth.setFullYear(dpMonth.getFullYear()-1); renderPicker(); }
      if (act==='next-year') { dpMonth.setFullYear(dpMonth.getFullYear()+1); renderPicker(); }
      if (act==='today')     { setInputToToday(); hidePicker(); }
      if (act==='clear')     { dateInput.value=''; hidePicker(); dateInput.dispatchEvent(new Event('input')); }
    });

    document.addEventListener('click', (e)=>{
      if (!dpEl) return;
      if (e.target===dateInput || e.target===dateTrigger || dpEl.contains(e.target)) return;
      hidePicker();
    });
    return dpEl;
  }
  function showPicker(){
    ensureDatePicker();
    dpMonth = new Date();
    renderPicker();
    const r = dateInput.getBoundingClientRect();
    dpEl.style.display='block';
    dpEl.style.top  = (window.scrollY + r.bottom + 6) + 'px';
    dpEl.style.left = (window.scrollX + r.left   + 0) + 'px';
  }
  function hidePicker(){ if (dpEl) dpEl.style.display='none'; }
  function setInputToToday(){ dateInput.value = formatMDY(new Date()); dateInput.dispatchEvent(new Event('input')); }
  function renderPicker(){
    const titleEl = dpEl.querySelector('.dp-title');
    const grid    = dpEl.querySelector('.dp-grid');
    grid.querySelectorAll('.dp-day').forEach(n=>n.remove());

    const y=dpMonth.getFullYear(), m=dpMonth.getMonth();
    titleEl.textContent = dpMonth.toLocaleString(undefined,{month:'long',year:'numeric'});

    const first=new Date(y,m,1), start=first.getDay(), days=daysInMonth(y,m);

    for (let i=0;i<start;i++){ const cell=document.createElement('div'); cell.className='dp-day dp-cell'; cell.style.visibility='hidden'; grid.appendChild(cell); }
    const today=new Date();
    for (let d=1; d<=days; d++){
      const cell=document.createElement('button'); cell.type='button'; cell.className='dp-day dp-cell'; cell.textContent=String(d);
      const thisDate=new Date(y,m,d);
      if (thisDate.toDateString()===today.toDateString()) cell.classList.add('today');
      cell.addEventListener('click', ()=>{
        dateInput.value = formatMDY(thisDate); // mm/dd/yyyy
        dateInput.dispatchEvent(new Event('input'));
        hidePicker();
      });
      grid.appendChild(cell);
    }
  }
  dateInput.addEventListener('focus', showPicker);
  dateInput.addEventListener('click', showPicker);
  if (dateTrigger) dateTrigger.addEventListener('click', showPicker);

  // ==== INIT ====
  render();

  // ==== SHORTCUTS ====
  document.addEventListener('keydown', (e)=>{
    if (e.key==='N' || e.key==='n') textInput.focus();
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); searchInput.focus(); }
  });

  // ==== SUBMIT ====
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    clearErrors();

    const text = textInput.value.trim();
    const rawDate = dateInput.value.trim();
    const rawTime = timeInput.value.trim();

    let ok = true;
    if (text.length < 3){ textError.textContent='Task must be at least 3 characters.'; ok=false; }

    const iso = parseDateToIso(rawDate);
    if (!iso){ dateError.textContent='Tanggal wajib & format mm/dd/yyyy atau dd/mm/yyyy yang valid.'; ok=false; }

    let timeHHMM = null;
    if (rawTime){
      timeHHMM = parseTimeOrNull(rawTime);
      if (!timeHHMM){ dateError.textContent='Format jam harus hh:mm (00–23:00–59).'; ok=false; }
    }

    if (!ok) return;

    const todo = {
      id: String(Date.now()),
      text,
      due: iso,
      dueTime: timeHHMM,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    todos.push(todo);
    save();
    form.reset();
    render();
  });

  // ==== FILTERS ====
  statusFilter.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  dateScope.addEventListener('change', render);

  // ==== DELETE ALL ====
  if (deleteAllBtn){
    deleteAllBtn.addEventListener('click', ()=>{
      if (!todos.length) { alert('Tidak ada task untuk dihapus.'); return; }
      const ok = confirm(`Delete ALL (${todos.length}) tasks? This cannot be undone.`);
      if (!ok) return;
      todos = [];
      save();
      render();
    });
  }

  // ==== DELEGATION (delete, toggle, edit) ====
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    const li  = e.target.closest('.item');
    if (!li) return;
    const id = li.dataset.id;

    if (btn && btn.dataset.action==='delete'){ e.preventDefault(); remove(id); return; }
    if (btn && btn.dataset.action==='toggle'){ e.preventDefault(); toggleDone(id); return; }
    if (btn && btn.dataset.action==='edit')  { e.preventDefault(); startEdit(li); return; }
    if (btn && btn.dataset.action==='save')  { e.preventDefault(); commitEdit(li,id); return; }
    if (btn && btn.dataset.action==='cancel'){ e.preventDefault(); cancelEdit(li); return; }
  });
  list.addEventListener('change', (e)=>{
    if (e.target.matches('input[type="checkbox"]')){
      const li = e.target.closest('.item'); if (!li) return;
      toggleDone(li.dataset.id);
    }
  });

  // ==== RENDER LIST + DASHBOARD ====
  function render(){
    const nowISO = nowLocalISOMinute();

    const filtered = todos.filter(t=>{
      if (statusFilter.value==='pending' && t.done) return false;
      if (statusFilter.value==='done'    && !t.done) return false;

      const q = searchInput.value.trim().toLowerCase();
      if (q && !t.text.toLowerCase().includes(q)) return false;

      const dueDT = combineDueISO(t.due, t.dueTime);
      const todayOnly = new Date().toDateString() === new Date(t.due).toDateString();

      if (dateScope.value!=='any'){
        if (dateScope.value==='today'   && !todayOnly) return false;
        if (dateScope.value==='overdue' && !(dueDT < nowISO && !t.done)) return false;
        if (dateScope.value==='upcoming'&& !(dueDT > nowISO)) return false;
      }
      return true;
    });

    list.innerHTML='';
    emptyState.style.display = filtered.length ? 'none' : 'block';

    filtered
      .sort((a,b)=> {
        const adt = combineDueISO(a.due, a.dueTime);
        const bdt = combineDueISO(b.due, b.dueTime);
        return adt.localeCompare(bdt) || a.text.localeCompare(b.text);
      })
      .forEach(t=>{
        const li = document.createElement('li');
        li.className = 'item' + (t.done ? ' done' : '');
        li.dataset.id = t.id;

        const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.checked=t.done;

        const textWrap = document.createElement('div'); textWrap.className='text';

        const title = document.createElement('b'); title.textContent = t.text;

        // badge: Done | Pending | Due mm/dd/yyyy [hh:mm]
        const badge = document.createElement('span');
        const dueDT = combineDueISO(t.due, t.dueTime);
        const nowISO = nowLocalISOMinute();
        const overdue = (dueDT < nowISO) && !t.done;

        badge.className = 'badge ' + (t.done ? 'ok' : overdue ? 'pending' : '');
        badge.title = 'Double-click to snooze +1 day';

        const dueLabel = t.dueTime ? `Due ${isoToMDY(t.due)} ${t.dueTime}` : `Due ${isoToMDY(t.due)}`;
        badge.textContent = t.done ? 'Done' : (overdue ? 'Pending' : dueLabel);

        badge.addEventListener('dblclick', ()=>{
          const [y,m,d] = t.due.split('-').map(Number);
          const dt = new Date(y,m-1,d); dt.setDate(dt.getDate()+1);
          const ny=dt.getFullYear(), nm=String(dt.getMonth()+1).padStart(2,'0'), nd=String(dt.getDate()).padStart(2,'0');
          t.due = `${ny}-${nm}-${nd}`;
          save(); render();
        });

        const meta = document.createElement('small');
        meta.className='meta-note';
        const addedStr = t.createdAt ? prettyDateTime(t.createdAt) : '—';
        const doneStr  = (t.done && t.completedAt) ? prettyDateTime(t.completedAt) : null;
        meta.textContent = doneStr ? `Added: ${addedStr} • Done: ${doneStr}` : `Added: ${addedStr}`;

        textWrap.appendChild(title);
        textWrap.appendChild(badge);
        textWrap.appendChild(meta);

        // EDITOR (inline)
        const editWrap = document.createElement('div');
        editWrap.className='edit-wrap';
        editWrap.innerHTML = `
          <input class="edit-input" type="text" value="${escapeHtml(t.text)}" />
          <button type="button" class="icon-btn neutral" data-action="save">Save</button>
          <button type="button" class="icon-btn danger" data-action="cancel">Cancel</button>
        `;
        textWrap.appendChild(editWrap);

        // actions
        const actions = document.createElement('div'); actions.className='actions';
        const editBtn = document.createElement('button'); editBtn.type='button'; editBtn.dataset.action='edit'; editBtn.className='icon-btn neutral'; editBtn.textContent='Edit';
        const toggleBtn = document.createElement('button'); toggleBtn.type='button'; toggleBtn.dataset.action='toggle'; toggleBtn.className='icon-btn primary'; toggleBtn.textContent=t.done?'Mark Pending':'Mark Done';
        const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.dataset.action='delete'; delBtn.className='icon-btn danger'; delBtn.textContent='Delete';

        actions.appendChild(editBtn); actions.appendChild(toggleBtn); actions.appendChild(delBtn);

        li.appendChild(checkbox);
        li.appendChild(textWrap);
        li.appendChild(actions);
        list.appendChild(li);
      });

    renderDashboard();
  }

  // ==== EDIT ====
  function startEdit(li){ li.classList.add('editing'); const i=li.querySelector('.edit-input'); if(i){i.focus(); i.select();} }
  function commitEdit(li,id){
    const i=li.querySelector('.edit-input'); if(!i) return cancelEdit(li);
    const val=i.value.trim(); if (val.length<3){ alert('Minimal 3 karakter.'); return; }
    const k=todos.findIndex(t=>t.id===id);
    if (k!==-1){ todos[k].text=val; todos[k].updatedAt=new Date().toISOString(); save(); li.classList.remove('editing'); render(); }
  }
  function cancelEdit(li){ li.classList.remove('editing'); }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ==== DASHBOARD ====
  function renderDashboard(){
    const total=todos.length;
    const done =todos.filter(t=>t.done).length;
    const rate = total ? Math.round(done*100/total) : 0;
    dashTotal.textContent=String(total);
    dashDone.textContent =String(done);
    dashRate.textContent = rate+'%';
  }

  // ==== TOGGLE / DELETE (single) ====
  function toggleDone(id){
    const i=todos.findIndex(t=>t.id===id);
    if(i!==-1){
      const next=!todos[i].done;
      todos[i].done=next;
      todos[i].completedAt = next ? new Date().toISOString() : null;
      save(); render();
    }
  }
  function remove(id){
    const t=todos.find(x=>x.id===id); if(!t) return;
    const ok=confirm(`Delete "${t.text}"? This cannot be undone.`);
    if(!ok) return;
    todos=todos.filter(t=>t.id!==id);
    save(); render();
  }

  // ==== MISC ====
  function clearErrors(){ textError.textContent=''; dateError.textContent=''; }
  function save(){ localStorage.setItem('codingcamp_todos', JSON.stringify(todos)); }
  function load(){
    try{ const raw=localStorage.getItem('codingcamp_todos'); if(!raw) return []; const arr=JSON.parse(raw); return Array.isArray(arr)?arr:[]; }
    catch{ return []; }
  }
})();
