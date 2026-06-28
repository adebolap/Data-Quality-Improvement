document.addEventListener('DOMContentLoaded', async () => {
  loadStats();
  loadRecentCandidates();
  loadPendingLeave();

  document.querySelector('.page-header .btn-primary').addEventListener('click', showAddEmployeeModal);
});

async function loadStats() {
  try {
    const [empStats, candStats, leaveStats] = await Promise.all([
      API.get('/api/employees/stats'),
      API.get('/api/candidates/stats'),
      API.get('/api/leave/stats')
    ]);
    const cards = document.querySelectorAll('.stat-card');
    cards[0].querySelector('.value').textContent = empStats.total || 0;
    cards[0].querySelector('.trend').textContent = `${empStats.active || 0} active`;
    cards[1].querySelector('.value').textContent = candStats.total || 0;
    const applied = candStats.byStage?.find(s => s._id === 'applied');
    cards[1].querySelector('.trend').textContent = `${applied?.count || 0} new applications`;
    cards[2].querySelector('.value').textContent = leaveStats.pending || 0;
    cards[2].querySelector('.trend').textContent = `${leaveStats.approved || 0} approved this period`;
    cards[3].querySelector('.value').textContent = candStats.avgAiScore || '-';
  } catch { /* use static fallback */ }
}

async function loadRecentCandidates() {
  try {
    const { candidates } = await API.get('/api/candidates?limit=5');
    if (!candidates.length) return;
    const tbody = document.querySelector('#recent-candidates tbody');
    if (!tbody) return;
    tbody.innerHTML = candidates.map(c => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(c.firstName, c.lastName)}</span> ${c.firstName} ${c.lastName}</div></td>
        <td>${c.jobTitle}</td>
        <td>${c.location || '-'}</td>
        <td><strong>${c.aiScore ?? '—'}</strong></td>
        <td>${stageBadge(c.stage)}</td>
        <td>${formatDate(c.createdAt)}</td>
      </tr>`).join('');
  } catch { /* use static fallback */ }
}

async function loadPendingLeave() {
  try {
    const { requests } = await API.get('/api/leave?status=pending&limit=5');
    if (!requests.length) return;
    const tbody = document.querySelector('#pending-leave tbody');
    if (!tbody) return;
    tbody.innerHTML = requests.map(r => {
      const emp = r.employee || {};
      return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(emp.firstName, emp.lastName)}</span> ${emp.firstName || ''} ${emp.lastName || ''}</div></td>
        <td>${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</td>
        <td>${formatDate(r.startDate)} - ${formatDate(r.endDate)}</td>
        <td>${r.days}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="approveLeave('${r._id}')">Approve</button>
          <button class="btn btn-outline btn-sm" onclick="rejectLeave('${r._id}')">Reject</button>
        </td>
      </tr>`;
    }).join('');
  } catch { /* use static fallback */ }
}

async function approveLeave(id) {
  try {
    await API.patch(`/api/leave/${id}/approve`, {});
    toast('Leave approved');
    loadPendingLeave();
    loadStats();
  } catch (err) { toast(err.message, 'error'); }
}

async function rejectLeave(id) {
  const reason = prompt('Rejection reason (optional):');
  try {
    await API.patch(`/api/leave/${id}/reject`, { reason });
    toast('Leave rejected');
    loadPendingLeave();
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
      <div class="form-group"><label>Country</label><input name="address.country" required placeholder="e.g. Germany"></div>
      <div class="form-group"><label>City</label><input name="address.city" placeholder="e.g. Berlin"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Currency</label>
        <select name="currency"><option value="EUR">EUR</option><option value="NGN">NGN</option><option value="GBP">GBP</option><option value="USD">USD</option><option value="KES">KES</option><option value="GHS">GHS</option></select>
      </div>
      <div class="form-group"><label>Salary</label><input name="salary" type="number"></div>
    </div>
    <div class="form-group"><label><input type="checkbox" name="gdprConsent.given" value="true"> GDPR consent given</label></div>
  `, async (data) => {
    const body = {
      firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
      role: data.role, department: data.department, currency: data.currency, salary: Number(data.salary) || undefined,
      address: { country: data['address.country'], city: data['address.city'] },
      gdprConsent: { given: data['gdprConsent.given'] === 'true', date: data['gdprConsent.given'] === 'true' ? new Date() : undefined }
    };
    await API.post('/api/employees', body);
    toast('Employee added');
    loadStats();
  });
}
