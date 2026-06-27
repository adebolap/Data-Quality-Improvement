let currentFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  loadLeaveStats();
  loadLeaveRequests();
  document.querySelector('.page-header .btn-primary').addEventListener('click', showRequestLeaveModal);

  document.querySelectorAll('.card-header .btn-outline, .card-header .btn-primary').forEach(btn => {
    if (btn.closest('.page-header')) return;
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.card-header .btn-outline, .card-header [style*="primary-light"]').forEach(b => {
        b.removeAttribute('style');
        b.className = 'btn btn-outline btn-sm';
      });
      e.target.style.background = 'var(--primary-light)';
      e.target.style.color = 'var(--primary)';
      e.target.style.borderColor = 'var(--primary)';
      const text = e.target.textContent.toLowerCase();
      currentFilter = text === 'all' ? '' : text;
      loadLeaveRequests();
    });
  });
});

async function loadLeaveStats() {
  try {
    const stats = await API.get('/api/leave/stats');
    const cards = document.querySelectorAll('.stat-card');
    cards[2].querySelector('.value').textContent = `${stats.pending || 0}`;
    cards[2].querySelector('.trend').textContent = `${stats.approved || 0} approved`;
  } catch { /* use static fallback */ }
}

async function loadLeaveRequests() {
  try {
    const url = currentFilter ? `/api/leave?status=${currentFilter}` : '/api/leave';
    const { requests } = await API.get(url);
    const tbody = document.querySelector('#leave-table tbody');
    if (!tbody) return;
    tbody.innerHTML = requests.map(r => {
      const emp = r.employee || {};
      const isPending = r.status === 'pending';
      return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(emp.firstName, emp.lastName)}</span> ${emp.firstName || ''} ${emp.lastName || ''}</div></td>
        <td>${r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ')}</td>
        <td>${formatDate(r.startDate)}</td>
        <td>${formatDate(r.endDate)}</td>
        <td>${r.days}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${isPending ? `
          <button class="btn btn-primary btn-sm" onclick="approveLeave('${r._id}')">Approve</button>
          <button class="btn btn-outline btn-sm" onclick="rejectLeave('${r._id}')">Reject</button>
        ` : `<span style="color:var(--gray-500);font-size:13px">${r.status === 'approved' ? 'Approved' : 'Rejected'} ${formatDate(r.approvedAt || r.updatedAt)}</span>`}</td>
      </tr>`;
    }).join('');
  } catch { /* use static fallback */ }
}

async function approveLeave(id) {
  try {
    await API.patch(`/api/leave/${id}/approve`, {});
    toast('Leave approved');
    loadLeaveRequests();
    loadLeaveStats();
  } catch (err) { toast(err.message, 'error'); }
}

async function rejectLeave(id) {
  const reason = prompt('Rejection reason (optional):');
  try {
    await API.patch(`/api/leave/${id}/reject`, { reason });
    toast('Leave rejected');
    loadLeaveRequests();
    loadLeaveStats();
  } catch (err) { toast(err.message, 'error'); }
}

async function showRequestLeaveModal() {
  let employees = [];
  try {
    const data = await API.get('/api/employees?status=active&limit=200');
    employees = data.employees || [];
  } catch { /* empty */ }

  openModal('Request Leave', `
    <div class="form-group"><label>Employee</label>
      <select name="employee" required>
        <option value="">Select employee...</option>
        ${employees.map(e => `<option value="${e._id}">${e.firstName} ${e.lastName}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Type</label>
        <select name="type" required>
          <option value="annual">Annual</option>
          <option value="sick">Sick</option>
          <option value="maternity">Maternity</option>
          <option value="paternity">Paternity</option>
          <option value="parental">Parental</option>
          <option value="compassionate">Compassionate</option>
          <option value="study">Study</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Date</label><input name="startDate" type="date" required></div>
      <div class="form-group"><label>End Date</label><input name="endDate" type="date" required></div>
    </div>
    <div class="form-group"><label>Reason</label><textarea name="reason" rows="2" placeholder="Optional"></textarea></div>
  `, async (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw new Error('End date must be after start date');
    const days = Math.ceil((end - start) / 86400000) + 1;
    await API.post('/api/leave', {
      employee: data.employee, type: data.type,
      startDate: data.startDate, endDate: data.endDate, days, reason: data.reason
    });
    toast('Leave request submitted');
    loadLeaveRequests();
    loadLeaveStats();
  });
}
