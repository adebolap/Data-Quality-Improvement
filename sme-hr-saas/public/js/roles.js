document.addEventListener('DOMContentLoaded', loadRoles);

async function loadRoles() {
  try {
    const { roles } = await API.get('/api/roles');
    const grid = document.getElementById('roles-grid');
    if (!roles.length) {
      grid.innerHTML = `<div class="card" style="padding:40px;text-align:center;grid-column:1/-1">
        <h3 style="color:var(--gray-500)">No role templates yet</h3>
        <p style="color:var(--gray-500);margin:8px 0 16px">Create your first role to start screening CVs with precision</p>
        <button class="btn btn-primary" onclick="showAddRoleModal()">+ Create Role Template</button>
      </div>`;
      return;
    }
    grid.innerHTML = roles.map(r => `
      <div class="card" style="cursor:pointer" onclick="showRoleDetail('${r._id}')">
        <div style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div>
              <h3 style="font-size:16px;margin-bottom:4px">${r.title}</h3>
              <p style="font-size:13px;color:var(--gray-500)">${r.department} &middot; ${r.level} &middot; ${r.contractType}</p>
            </div>
            <span class="badge ${r.isActive ? 'badge-success' : 'badge-warning'}">${r.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          ${r.mustHaveSkills?.length ? `<div style="margin-top:12px"><div class="tags">${r.mustHaveSkills.slice(0, 4).map(s => `<span class="tag">${s}</span>`).join('')}${r.mustHaveSkills.length > 4 ? `<span class="tag" style="background:var(--gray-200);color:var(--gray-700)">+${r.mustHaveSkills.length - 4}</span>` : ''}</div></div>` : ''}
          <div style="margin-top:12px;display:flex;gap:16px;font-size:13px;color:var(--gray-500)">
            <span>${r.workRegime || 'full-time'}</span>
            <span>${r.remotePolicy || 'hybrid'}</span>
            <span>${r.language?.toUpperCase() || 'EN'}</span>
            ${r.salaryRange?.min ? `<span>${r.salaryRange.currency || 'EUR'} ${(r.salaryRange.min/1000).toFixed(0)}k-${(r.salaryRange.max/1000).toFixed(0)}k</span>` : ''}
          </div>
        </div>
      </div>`).join('');
  } catch { /* static fallback */ }
}

async function showRoleDetail(id) {
  try {
    const r = await API.get(`/api/roles/${id}`);
    openModal(r.title, `
      <div class="form-row">
        <div class="form-group"><label>Title</label><input name="title" value="${r.title}" required></div>
        <div class="form-group"><label>Department</label><input name="department" value="${r.department}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Level</label>
          <select name="level">${['junior','mid','senior','lead','head'].map(l => `<option value="${l}" ${l===r.level?'selected':''}>${l}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Language</label>
          <select name="language">${[['en','English'],['nl','Dutch'],['fr','French'],['de','German']].map(([v,l]) => `<option value="${v}" ${v===r.language?'selected':''}>${l}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Must-have skills (comma separated)</label><input name="mustHaveSkills" value="${(r.mustHaveSkills||[]).join(', ')}"></div>
      <div class="form-group"><label>Nice-to-have skills</label><input name="niceToHaveSkills" value="${(r.niceToHaveSkills||[]).join(', ')}"></div>
      <div class="form-group"><label>Deal breakers</label><input name="dealBreakers" value="${(r.dealBreakers||[]).join(', ')}" placeholder="Auto-reject if missing"></div>
      <div class="form-row">
        <div class="form-group"><label>Min. years experience</label><input name="minYearsExperience" type="number" value="${r.minYearsExperience||0}"></div>
        <div class="form-group"><label>Education</label><input name="educationLevel" value="${r.educationLevel||''}" placeholder="e.g. Bachelor's CS"></div>
      </div>
      <div class="form-group"><label>Responsibilities (one per line)</label><textarea name="responsibilities" rows="3">${(r.responsibilities||[]).join('\n')}</textarea></div>
      <div class="form-group"><label>Culture fit notes</label><textarea name="cultureFit" rows="2">${r.cultureFit||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Contract</label>
          <select name="contractType">${['permanent','fixed-term','freelance','interim','student'].map(c => `<option value="${c}" ${c===r.contractType?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Work regime</label>
          <select name="workRegime">${['full-time','part-time','4/5','3/5'].map(w => `<option value="${w}" ${w===r.workRegime?'selected':''}>${w}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Remote policy</label>
          <select name="remotePolicy">${['on-site','hybrid','remote'].map(p => `<option value="${p}" ${p===r.remotePolicy?'selected':''}>${p}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Joint Committee</label><input name="jointCommittee" value="${r.jointCommittee||''}" placeholder="e.g. PC 200"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Salary min (EUR/yr)</label><input name="salaryMin" type="number" value="${r.salaryRange?.min||''}"></div>
        <div class="form-group"><label>Salary max (EUR/yr)</label><input name="salaryMax" type="number" value="${r.salaryRange?.max||''}"></div>
      </div>
      <h3 style="font-size:14px;margin:12px 0 8px;color:var(--gray-700)">Scoring Weights (must total 100)</h3>
      <div class="form-row">
        <div class="form-group"><label>Skills %</label><input name="wSkills" type="number" value="${r.scoringWeights?.skills||35}"></div>
        <div class="form-group"><label>Experience %</label><input name="wExperience" type="number" value="${r.scoringWeights?.experience||25}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Education %</label><input name="wEducation" type="number" value="${r.scoringWeights?.education||15}"></div>
        <div class="form-group"><label>Language %</label><input name="wLanguage" type="number" value="${r.scoringWeights?.language||15}"></div>
      </div>
      <div class="form-group"><label>Culture fit %</label><input name="wCulture" type="number" value="${r.scoringWeights?.cultureFit||10}"></div>
      <input type="hidden" name="_id" value="${r._id}">
      <div style="margin-top:12px;display:flex;justify-content:space-between">
        <button type="button" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="deleteRole('${r._id}')">Delete</button>
        <button type="button" class="btn btn-outline" onclick="generateDescription('${r._id}')">Generate Job Description</button>
      </div>
    `, async (data) => {
      await API.put(`/api/roles/${data._id}`, buildRoleBody(data));
      toast('Role updated');
      loadRoles();
    });
  } catch (err) { toast(err.message, 'error'); }
}

function showAddRoleModal() {
  openModal('New Role Template', `
    <div class="form-row">
      <div class="form-group"><label>Title</label><input name="title" required placeholder="e.g. Backend Engineer"></div>
      <div class="form-group"><label>Department</label><input name="department" required placeholder="e.g. Engineering"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Level</label>
        <select name="level"><option value="junior">Junior</option><option value="mid" selected>Mid</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="head">Head</option></select>
      </div>
      <div class="form-group"><label>Language</label>
        <select name="language"><option value="en">English</option><option value="nl">Dutch</option><option value="fr">French</option><option value="de">German</option></select>
      </div>
    </div>
    <div class="form-group"><label>Must-have skills (comma separated)</label><input name="mustHaveSkills" placeholder="e.g. Node.js, MongoDB, REST APIs"></div>
    <div class="form-group"><label>Nice-to-have skills</label><input name="niceToHaveSkills" placeholder="e.g. TypeScript, Docker, AWS"></div>
    <div class="form-group"><label>Deal breakers</label><input name="dealBreakers" placeholder="e.g. No Node.js experience, No EU work permit"></div>
    <div class="form-row">
      <div class="form-group"><label>Min. years experience</label><input name="minYearsExperience" type="number" value="0"></div>
      <div class="form-group"><label>Education</label><input name="educationLevel" placeholder="e.g. Bachelor's CS"></div>
    </div>
    <div class="form-group"><label>Key responsibilities (one per line)</label><textarea name="responsibilities" rows="3" placeholder="Design and implement APIs\nCode reviews\nMentor juniors"></textarea></div>
    <div class="form-group"><label>Culture fit notes</label><textarea name="cultureFit" rows="2" placeholder="e.g. Autonomous, comfortable with ambiguity, strong communicator"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Contract</label>
        <select name="contractType"><option value="permanent">Permanent</option><option value="fixed-term">Fixed-term</option><option value="freelance">Freelance</option><option value="interim">Interim</option><option value="student">Student</option></select>
      </div>
      <div class="form-group"><label>Work regime</label>
        <select name="workRegime"><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="4/5">4/5</option><option value="3/5">3/5</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Remote policy</label>
        <select name="remotePolicy"><option value="hybrid">Hybrid</option><option value="on-site">On-site</option><option value="remote">Remote</option></select>
      </div>
      <div class="form-group"><label>Joint Committee</label><input name="jointCommittee" placeholder="e.g. PC 200"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Salary min (EUR/yr)</label><input name="salaryMin" type="number"></div>
      <div class="form-group"><label>Salary max (EUR/yr)</label><input name="salaryMax" type="number"></div>
    </div>
  `, async (data) => {
    await API.post('/api/roles', buildRoleBody(data));
    toast('Role template created');
    loadRoles();
  });
}

function buildRoleBody(data) {
  return {
    title: data.title, department: data.department, level: data.level, language: data.language,
    mustHaveSkills: data.mustHaveSkills ? data.mustHaveSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
    niceToHaveSkills: data.niceToHaveSkills ? data.niceToHaveSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
    dealBreakers: data.dealBreakers ? data.dealBreakers.split(',').map(s => s.trim()).filter(Boolean) : [],
    minYearsExperience: Number(data.minYearsExperience) || 0,
    educationLevel: data.educationLevel || undefined,
    responsibilities: data.responsibilities ? data.responsibilities.split('\n').map(s => s.trim()).filter(Boolean) : [],
    cultureFit: data.cultureFit || undefined,
    contractType: data.contractType, workRegime: data.workRegime, remotePolicy: data.remotePolicy,
    jointCommittee: data.jointCommittee || undefined,
    salaryRange: data.salaryMin ? { min: Number(data.salaryMin), max: Number(data.salaryMax), currency: 'EUR' } : undefined,
    scoringWeights: data.wSkills ? {
      skills: Number(data.wSkills), experience: Number(data.wExperience),
      education: Number(data.wEducation), language: Number(data.wLanguage), cultureFit: Number(data.wCulture)
    } : undefined
  };
}

async function deleteRole(id) {
  if (!confirm('Delete this role template?')) return;
  try {
    await API.del(`/api/roles/${id}`);
    toast('Role deleted');
    closeModal();
    loadRoles();
  } catch (err) { toast(err.message, 'error'); }
}

async function generateDescription(id) {
  toast('Generating job description...');
  try {
    const { description } = await API.post('/api/ai/generate-description', { roleId: id });
    closeModal();
    openModal('Generated Job Description', `
      <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;max-height:60vh;overflow-y:auto">${description}</pre>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="navigator.clipboard.writeText(document.querySelector('.modal pre').textContent);toast('Copied!')">Copy</button>
        <button type="button" class="btn btn-primary modal-cancel">Close</button>
      </div>
    `, () => {});
  } catch (err) { toast(err.message, 'error'); }
}
