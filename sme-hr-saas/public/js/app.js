// ── Shared utilities ──
const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  },
  async patch(url, data) {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  },
  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  }
};

function initials(first, last) {
  return (first?.[0] || '') + (last?.[0] || '');
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Modal ──
function openModal(title, bodyHTML, onSubmit) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" type="button">&times;</button>
      </div>
      <form class="modal-body">${bodyHTML}
        <div class="modal-actions">
          <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.querySelector('.modal-close').onclick = closeModal;
  overlay.querySelector('.modal-cancel').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      const result = await onSubmit(data);
      if (result !== '__keep_open__') closeModal();
    } catch (err) {
      if (err.message === '__keep_open__') return;
      toast(err.message, 'error');
    }
  };
}

function closeModal() {
  const m = document.querySelector('.modal-overlay');
  if (m) { m.classList.remove('show'); setTimeout(() => m.remove(), 200); }
}

// ── Score badge ──
function scoreBadge(score) {
  if (score == null) return '';
  const cls = score >= 75 ? 'badge-success' : score >= 50 ? 'badge-info' : score >= 35 ? 'badge-warning' : 'badge-danger';
  return `<span class="badge ${cls}">AI: ${score}</span>`;
}

function stageBadge(stage) {
  const map = { applied: 'badge-info', screened: 'badge-warning', interview: 'badge-info', offer: 'badge-success', hired: 'badge-success', rejected: 'badge-danger' };
  return `<span class="badge ${map[stage] || 'badge-info'}">${stage.charAt(0).toUpperCase() + stage.slice(1)}</span>`;
}

function statusBadge(s) {
  const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
  return `<span class="badge ${map[s] || 'badge-info'}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
}
