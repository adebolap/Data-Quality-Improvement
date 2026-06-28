let allEmployees = [];

document.addEventListener('DOMContentLoaded', () => {
  loadEmployees();
  document.querySelector('.page-header .btn-primary').addEventListener('click', showAddEmployeeModal);
  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      filterEmployees(e.target.value);
    }, 300));
  }
});

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function loadEmployees() {
  try {
    const { employees, total } = await API.get('/api/employees');
    allEmployees = employees;
    document.querySelector('.card-header h2').textContent = `All Employees (${total})`;
    renderEmployees(employees);
  } catch { /* use static fallback */ }
}

function renderEmployees(list) {
  const tbody = document.querySelector('#employees-table tbody');
  if (!tbody) return;
  tbody.innerHTML = list.map(e => `
    <tr onclick="showEmployeeDetail('${e._id}')" style="cursor:pointer">
      <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(e.firstName, e.lastName)}</span> ${e.firstName} ${e.lastName}</div></td>
      <td>${e.department}</td>
      <td>${e.role}</td>
      <td>${e.address?.city ? e.address.city + ', ' : ''}${e.address?.country || '—'}</td>
      <td><span class="badge badge-${e.status === 'active' ? 'success' : e.status === 'inactive' ? 'warning' : 'danger'}">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span></td>
      <td>${formatDate(e.hireDate)}</td>
    </tr>`).join('');
}

function filterEmployees(q) {
  if (!q) return renderEmployees(allEmployees);
  const lower = q.toLowerCase();
  renderEmployees(allEmployees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.role} ${e.department} ${e.email}`.toLowerCase().includes(lower)
  ));
}

async function showEmployeeDetail(id) {
  try {
    const e = await API.get(`/api/employees/${id}`);
    openModal(`${e.firstName} ${e.lastName}`, `
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
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="active" ${e.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${e.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="terminated" ${e.status === 'terminated' ? 'selected' : ''}>Terminated</option>
          </select>
        </div>
        <div class="form-group"><label>Currency</label>
          <select name="currency">${['EUR','NGN','GBP','USD','KES','GHS'].map(c => `<option value="${c}" ${c === e.currency ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Salary</label><input name="salary" type="number" value="${e.salary || ''}"></div>
      <input type="hidden" name="_id" value="${e._id}">
      <div style="margin-top:12px;text-align:right"><button type="button" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="deleteEmployee('${e._id}')">Delete Employee</button></div>
    `, async (data) => {
      await API.put(`/api/employees/${data._id}`, {
        firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
        role: data.role, department: data.department, status: data.status, currency: data.currency,
        salary: Number(data.salary) || undefined,
        address: { country: data.country, city: data.city }
      });
      toast('Employee updated');
      loadEmployees();
    });
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteEmployee(id) {
  if (!confirm('Are you sure you want to delete this employee?')) return;
  try {
    await API.del(`/api/employees/${id}`);
    toast('Employee deleted');
    closeModal();
    loadEmployees();
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
      <div class="form-group"><label>Country</label><input name="country" required placeholder="e.g. Germany"></div>
      <div class="form-group"><label>City</label><input name="city" placeholder="e.g. Berlin"></div>
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
      role: data.role, department: data.department, currency: data.currency, salary: Number(data.salary) || undefined,
      address: { country: data.country, city: data.city },
      gdprConsent: { given: data.gdpr === 'true', date: data.gdpr === 'true' ? new Date() : undefined }
    });
    toast('Employee added');
    loadEmployees();
  });
}
