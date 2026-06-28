let allEmployees = [];
let currentView = 'list';

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadEmployees();
  loadBirthdays();

  document.getElementById('add-employee-btn').addEventListener('click', showAddEmployeeModal);

  const debounced = debounce(() => applyFilters(), 300);
  document.getElementById('search-input').addEventListener('input', debounced);
  document.getElementById('dept-filter').addEventListener('change', applyFilters);
  document.getElementById('status-filter').addEventListener('change', applyFilters);
  document.getElementById('country-filter').addEventListener('change', applyFilters);

  document.getElementById('view-list').addEventListener('click', () => setView('list'));
  document.getElementById('view-grouped').addEventListener('click', () => setView('grouped'));
});

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function setView(v) {
  currentView = v;
  document.getElementById('view-list').classList.toggle('active', v === 'list');
  document.getElementById('view-grouped').classList.toggle('active', v === 'grouped');
  applyFilters();
}

async function loadStats() {
  try {
    const stats = await API.get('/api/employees/stats');
    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-active').textContent = stats.active || 0;
    document.getElementById('stat-depts').textContent = (stats.departments || []).length;
    document.getElementById('stat-countries').textContent = (stats.countries || []).filter(Boolean).length;

    const deptSel = document.getElementById('dept-filter');
    (stats.departments || []).sort().forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      deptSel.appendChild(o);
    });

    const countrySel = document.getElementById('country-filter');
    (stats.countries || []).filter(Boolean).sort().forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      countrySel.appendChild(o);
    });
  } catch { /* static fallback */ }
}

async function loadBirthdays() {
  try {
    const { birthdays } = await API.get('/api/employees/birthdays');
    if (!birthdays.length) return;
    const strip = document.getElementById('birthday-strip');
    birthdays.forEach(b => {
      const el = document.createElement('div');
      el.className = 'birthday-item';
      const label = b.daysUntil === 0 ? 'Today!' : b.daysUntil === 1 ? 'Tomorrow' : `in ${b.daysUntil} days`;
      el.innerHTML = `<strong>${b.firstName} ${b.lastName}</strong> <span>${label}</span>`;
      strip.appendChild(el);
    });
    strip.classList.add('show');
  } catch { /* no birthdays */ }
}

async function loadEmployees() {
  try {
    const { employees } = await API.get('/api/employees?limit=500');
    allEmployees = employees;
    applyFilters();
  } catch { /* static fallback */ }
}

function applyFilters() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const dept = document.getElementById('dept-filter').value;
  const status = document.getElementById('status-filter').value;
  const country = document.getElementById('country-filter').value;

  const filtered = allEmployees.filter(e => {
    const nameMatch = `${e.firstName} ${e.lastName} ${e.role} ${e.department} ${e.email}`.toLowerCase().includes(q);
    const deptMatch = !dept || e.department === dept;
    const statusMatch = !status || e.status === status;
    const countryMatch = !country || e.address?.country === country;
    return nameMatch && deptMatch && statusMatch && countryMatch;
  });

  currentView === 'grouped' ? renderGrouped(filtered) : renderList(filtered);
}

function tenure(hireDate) {
  if (!hireDate) return { label: '-', cls: '' };
  const ms = Date.now() - new Date(hireDate).getTime();
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  let label, cls = '';
  if (years >= 5) { label = `${years}y`; cls = 'veteran'; }
  else if (years >= 2) { label = `${years}y ${rem}m`; cls = 'senior'; }
  else if (years >= 1) { label = `${years}y ${rem}m`; }
  else { label = `${months}m`; }
  return { label, cls };
}

function birthdayIcon(dob) {
  if (!dob) return '';
  const today = new Date();
  const d = new Date(dob);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  const days = Math.ceil((next - today) / 86400000);
  if (days === 0) return ' &#127874;';
  if (days <= 7) return ' &#127873;';
  return '';
}

function statusBadgeCls(s) {
  return { active: 'badge-success', inactive: 'badge-warning', terminated: 'badge-danger' }[s] || 'badge-info';
}

function employeeRow(e, showDept = true) {
  const t = tenure(e.hireDate);
  const location = [e.address?.city, e.address?.country].filter(Boolean).join(', ') || '-';
  const sLabel = e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '-';
  return `
    <tr onclick="showEmployeeProfile('${e._id}')" style="cursor:pointer">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="avatar">${initials(e.firstName, e.lastName)}</span>
          <div>
            <div style="font-weight:600">${e.firstName} ${e.lastName}${birthdayIcon(e.dateOfBirth)}</div>
            <div style="font-size:12px;color:var(--gray-500)">${e.email || ''}</div>
          </div>
        </div>
      </td>
      ${showDept ? `<td>${e.department}</td>` : ''}
      <td>${e.role}</td>
      <td>${location}</td>
      <td><span class="badge ${statusBadgeCls(e.status)}">${sLabel}</span></td>
      <td><span class="tenure-badge ${t.cls}">${t.label}</span></td>
      <td>${e.hireDate ? new Date(e.hireDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '-'}</td>
    </tr>`;
}

function renderList(list) {
  document.getElementById('employees-container').innerHTML = `
    <table id="employees-table">
      <thead><tr>
        <th>Name</th><th>Department</th><th>Role</th>
        <th>Location</th><th>Status</th><th>Tenure</th><th>Hire Date</th>
      </tr></thead>
      <tbody>${list.length ? list.map(e => employeeRow(e, true)).join('') :
        '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray-500)">No employees found</td></tr>'
      }</tbody>
    </table>`;
}

function renderGrouped(list) {
  const groups = {};
  list.forEach(e => { const d = e.department || 'Unassigned'; if (!groups[d]) groups[d] = []; groups[d].push(e); });
  const container = document.getElementById('employees-container');
  if (!Object.keys(groups).length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500)">No employees found</div>';
    return;
  }
  container.innerHTML = Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).map(([dept, emps]) => `
    <div class="dept-group">
      <div class="dept-group-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
        <h3>${dept}</h3>
        <span class="dept-count">${emps.length} people</span>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Status</th><th>Tenure</th><th>Hire Date</th></tr></thead>
        <tbody>${emps.map(e => employeeRow(e, false)).join('')}</tbody>
      </table>
    </div>`).join('');
}

async function showEmployeeProfile(id) {
  try {
    const e = await API.get(`/api/employees/${id}`);
    const t = tenure(e.hireDate);
    const location = [e.address?.city, e.address?.country].filter(Boolean).join(', ') || '-';
    const dob = e.dateOfBirth ? new Date(e.dateOfBirth) : null;
    const age = dob ? Math.floor((Date.now() - dob) / (1000 * 60 * 60 * 24 * 365.25)) : null;
    const wpExpiry = e.workPermit?.expiryDate ? new Date(e.workPermit.expiryDate) : null;
    const wpWarning = wpExpiry && (wpExpiry - Date.now()) < 90 * 86400000;

    openModal('', `
      <div class="profile-header">
        <div class="profile-avatar">${initials(e.firstName, e.lastName)}</div>
        <div>
          <h2>${e.firstName} ${e.lastName}</h2>
          <p>${e.role} &middot; ${e.department}</p>
          <p style="margin-top:4px;opacity:.75">${location}</p>
        </div>
        <div style="margin-left:auto;text-align:right;flex-shrink:0">
          <div style="font-size:28px;font-weight:800">${t.label || '-'}</div>
          <div style="font-size:12px;opacity:.75">tenure</div>
        </div>
      </div>

      <div class="profile-section">
        <h4>Contact</h4>
        <div class="profile-grid">
          <div class="profile-field"><label>Email</label><span>${e.email}</span></div>
          <div class="profile-field"><label>Phone</label><span>${e.phone || '-'}</span></div>
          <div class="profile-field"><label>City</label><span>${e.address?.city || '-'}</span></div>
          <div class="profile-field"><label>Country</label><span>${e.address?.country || '-'}</span></div>
        </div>
      </div>

      <div class="profile-section">
        <h4>Employment</h4>
        <div class="profile-grid">
          <div class="profile-field"><label>Hire Date</label><span>${formatDate(e.hireDate)}</span></div>
          <div class="profile-field"><label>Status</label><span class="badge ${statusBadgeCls(e.status)}">${e.status || '-'}</span></div>
          <div class="profile-field"><label>Salary</label><span>${e.salary ? `${e.currency} ${e.salary.toLocaleString()}` : '-'}</span></div>
          <div class="profile-field"><label>Manager</label><span>${e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : '-'}</span></div>
          <div class="profile-field"><label>Timezone</label><span>${e.timezone || '-'}</span></div>
          <div class="profile-field"><label>Locale</label><span>${e.locale || '-'}</span></div>
        </div>
      </div>

      <div class="profile-section">
        <h4>Personal</h4>
        <div class="profile-grid">
          <div class="profile-field"><label>Date of Birth</label><span>${dob ? formatDate(dob) + (age ? ` (${age} yrs)` : '') : '-'}</span></div>
          <div class="profile-field"><label>Tax ID</label><span>${e.taxId || '-'}</span></div>
          <div class="profile-field"><label>Work Permit</label><span>${e.workPermit?.required ? (wpExpiry ? `Expires ${formatDate(wpExpiry)}${wpWarning ? ' &#9888;&#65039;' : ''}` : 'Required') : 'Not required'}</span></div>
          <div class="profile-field"><label>GDPR Consent</label><span>${e.gdprConsent?.given ? `Given ${formatDate(e.gdprConsent.date)}` : 'Not given'}</span></div>
        </div>
      </div>

      ${e.emergencyContact?.name ? `
      <div class="profile-section">
        <h4>Emergency Contact</h4>
        <div class="profile-grid">
          <div class="profile-field"><label>Name</label><span>${e.emergencyContact.name}</span></div>
          <div class="profile-field"><label>Relationship</label><span>${e.emergencyContact.relationship || '-'}</span></div>
          <div class="profile-field"><label>Phone</label><span>${e.emergencyContact.phone || '-'}</span></div>
        </div>
      </div>` : ''}

      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <button type="button" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="deleteEmployee('${e._id}')">Delete</button>
        <button type="button" class="btn btn-primary" onclick="showEditEmployeeModal('${e._id}')">Edit Details</button>
      </div>
    `, async () => {});
  } catch (err) { toast(err.message, 'error'); }
}

async function showEditEmployeeModal(id) {
  try {
    closeModal();
    const e = await API.get(`/api/employees/${id}`);
    openModal(`Edit - ${e.firstName} ${e.lastName}`, `
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input name="firstName" value="${e.firstName}" required></div>
        <div class="form-group"><label>Last Name</label><input name="lastName" value="${e.lastName}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input name="email" value="${e.email}" type="email" required></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${e.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Role</label><input name="role" value="${e.role}" required></div>
        <div class="form-group"><label>Department</label><input name="department" value="${e.department}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Country</label><input name="country" value="${e.address?.country || ''}"></div>
        <div class="form-group"><label>City</label><input name="city" value="${e.address?.city || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date of Birth</label><input name="dateOfBirth" type="date" value="${e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().split('T')[0] : ''}"></div>
        <div class="form-group"><label>Hire Date</label><input name="hireDate" type="date" value="${e.hireDate ? new Date(e.hireDate).toISOString().split('T')[0] : ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="active" ${e.status==='active'?'selected':''}>Active</option>
            <option value="inactive" ${e.status==='inactive'?'selected':''}>Inactive</option>
            <option value="terminated" ${e.status==='terminated'?'selected':''}>Terminated</option>
          </select>
        </div>
        <div class="form-group"><label>Currency</label>
          <select name="currency">${['EUR','NGN','GBP','USD','KES','GHS'].map(c => `<option value="${c}" ${c===e.currency?'selected':''}>${c}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Salary</label><input name="salary" type="number" value="${e.salary || ''}"></div>
        <div class="form-group"><label>Timezone</label><input name="timezone" value="${e.timezone || ''}" placeholder="e.g. Europe/Brussels"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Emergency Contact</label><input name="ecName" value="${e.emergencyContact?.name || ''}" placeholder="Full name"></div>
        <div class="form-group"><label>EC Phone</label><input name="ecPhone" value="${e.emergencyContact?.phone || ''}"></div>
      </div>
      <div class="form-group"><label>EC Relationship</label><input name="ecRelationship" value="${e.emergencyContact?.relationship || ''}" placeholder="e.g. Spouse, Parent"></div>
      <input type="hidden" name="_id" value="${e._id}">
    `, async (data) => {
      await API.put(`/api/employees/${data._id}`, {
        firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
        role: data.role, department: data.department, status: data.status, currency: data.currency,
        salary: Number(data.salary) || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        hireDate: data.hireDate || undefined,
        timezone: data.timezone || undefined,
        address: { country: data.country, city: data.city },
        emergencyContact: data.ecName ? { name: data.ecName, phone: data.ecPhone, relationship: data.ecRelationship } : undefined
      });
      toast('Employee updated');
      loadEmployees();
      loadStats();
    });
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteEmployee(id) {
  if (!confirm('Delete this employee permanently?')) return;
  try {
    await API.del(`/api/employees/${id}`);
    toast('Employee deleted');
    closeModal();
    loadEmployees();
    loadStats();
  } catch (err) { toast(err.message, 'error'); }
}

function showAddEmployeeModal() {
  openModal('Add Employee', `
    <div class="form-row">
      <div class="form-group"><label>First Name</label><input name="firstName" required></div>
      <div class="form-group"><label>Last Name</label><input name="lastName" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input name="email" type="email" required></div>
      <div class="form-group"><label>Phone</label><input name="phone"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Role</label><input name="role" required></div>
      <div class="form-group"><label>Department</label><input name="department" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Country</label><input name="country" required placeholder="e.g. Belgium"></div>
      <div class="form-group"><label>City</label><input name="city" placeholder="e.g. Brussels"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date of Birth</label><input name="dateOfBirth" type="date"></div>
      <div class="form-group"><label>Hire Date</label><input name="hireDate" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Currency</label>
        <select name="currency"><option value="EUR">EUR</option><option value="NGN">NGN</option><option value="GBP">GBP</option><option value="USD">USD</option><option value="KES">KES</option><option value="GHS">GHS</option></select>
      </div>
      <div class="form-group"><label>Salary</label><input name="salary" type="number"></div>
    </div>
    <div class="form-group"><label><input type="checkbox" name="gdpr" value="true"> GDPR consent given</label></div>
  `, async (data) => {
    await API.post('/api/employees', {
      firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
      role: data.role, department: data.department, currency: data.currency,
      salary: Number(data.salary) || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      hireDate: data.hireDate || undefined,
      address: { country: data.country, city: data.city },
      gdprConsent: { given: data.gdpr === 'true', date: data.gdpr === 'true' ? new Date() : undefined }
    });
    toast('Employee added');
    loadEmployees();
    loadStats();
  });
}
