const STAGES = ['applied', 'screened', 'interview', 'offer', 'hired'];
let draggedId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadPipeline();
  document.querySelector('.btn-primary').addEventListener('click', showAddCandidateModal);
  document.querySelector('.btn-outline').addEventListener('click', showScreenCVModal);
});

async function loadPipeline() {
  try {
    const pipeline = await API.get('/api/candidates/pipeline');
    const container = document.querySelector('.kanban');
    container.innerHTML = STAGES.map(stage => {
      const items = pipeline[stage] || [];
      return `
        <div class="kanban-col" data-stage="${stage}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event,'${stage}')">
          <h3>${stage.charAt(0).toUpperCase() + stage.slice(1)} <span class="count">${items.length}</span></h3>
          ${items.map(c => `
            <div class="k-card" draggable="true" data-id="${c._id}" ondragstart="draggedId='${c._id}'" onclick="showCandidateDetail('${c._id}')">
              <div class="name">${c.firstName} ${c.lastName}</div>
              <div class="role">${c.jobTitle}${c.location ? ' &middot; ' + c.location : ''}</div>
              <div class="score">${scoreBadge(c.aiScore)}</div>
            </div>`).join('')}
        </div>`;
    }).join('');
  } catch {
    /* keep static fallback */
  }
}

async function handleDrop(e, newStage) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedId) return;
  try {
    await API.patch(`/api/candidates/${draggedId}/stage`, { stage: newStage });
    toast(`Moved to ${newStage}`);
    loadPipeline();
  } catch (err) { toast(err.message, 'error'); }
  draggedId = null;
}

async function showCandidateDetail(id) {
  try {
    const c = await API.get(`/api/candidates/${id}`);
    openModal(`${c.firstName} ${c.lastName}`, `
      <div class="detail-grid">
        <div><strong>Position:</strong> ${c.jobTitle}</div>
        <div><strong>Stage:</strong> ${stageBadge(c.stage)}</div>
        <div><strong>Location:</strong> ${c.location || '—'}</div>
        <div><strong>Email:</strong> ${c.email}</div>
        <div><strong>AI Score:</strong> ${c.aiScore ?? 'Not screened'}</div>
        <div><strong>Source:</strong> ${c.source}</div>
      </div>
      ${c.aiSummary ? `<div class="detail-section"><h3>AI Summary</h3><p>${c.aiSummary}</p></div>` : ''}
      ${c.aiSkills?.length ? `<div class="detail-section"><h3>Skills</h3><div class="tags">${c.aiSkills.map(s => `<span class="tag">${s}</span>`).join('')}</div></div>` : ''}
      ${c.aiRedFlags?.length ? `<div class="detail-section"><h3>Red Flags</h3><div class="tags">${c.aiRedFlags.map(s => `<span class="tag tag-danger">${s}</span>`).join('')}</div></div>` : ''}
      <div class="detail-section">
        <h3>Notes</h3>
        <div id="notes-list">${(c.notes || []).map(n => `<div class="note"><p>${n.text}</p><small>${formatDate(n.createdAt)}</small></div>`).join('') || '<p style="color:var(--gray-500)">No notes yet</p>'}</div>
        <textarea name="note" placeholder="Add a note..." rows="2" style="width:100%;margin-top:8px;padding:8px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px"></textarea>
      </div>
      <input type="hidden" name="_candidateId" value="${c._id}">
      <div class="form-row" style="margin-top:12px">
        <div class="form-group">
          <label>Move to stage</label>
          <select name="stage">${STAGES.map(s => `<option value="${s}" ${s === c.stage ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    `, async (data) => {
      if (data.note?.trim()) {
        await API.post(`/api/candidates/${data._candidateId}/notes`, { text: data.note });
      }
      if (data.stage !== c.stage) {
        await API.patch(`/api/candidates/${data._candidateId}/stage`, { stage: data.stage });
      }
      toast('Candidate updated');
      loadPipeline();
    });
  } catch (err) { toast(err.message, 'error'); }
}

function showAddCandidateModal() {
  openModal('Add Candidate', `
    <div class="form-row">
      <div class="form-group"><label>First Name</label><input name="firstName" required></div>
      <div class="form-group"><label>Last Name</label><input name="lastName" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input name="email" type="email" required></div>
      <div class="form-group"><label>Phone</label><input name="phone"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Job Title</label><input name="jobTitle" required></div>
      <div class="form-group"><label>Department</label><input name="department"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Location</label><input name="location" placeholder="e.g. Berlin, DE"></div>
      <div class="form-group"><label>Source</label>
        <select name="source"><option value="direct">Direct</option><option value="referral">Referral</option><option value="linkedin">LinkedIn</option><option value="jobboard">Job Board</option><option value="other">Other</option></select>
      </div>
    </div>
    <div class="form-group"><label><input type="checkbox" name="gdprConsent.given" value="true"> GDPR consent given</label></div>
  `, async (data) => {
    const body = {
      firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
      jobTitle: data.jobTitle, department: data.department, location: data.location, source: data.source,
      gdprConsent: { given: data['gdprConsent.given'] === 'true', date: data['gdprConsent.given'] === 'true' ? new Date() : undefined }
    };
    await API.post('/api/candidates', body);
    toast('Candidate added');
    loadPipeline();
  });
}

async function showScreenCVModal() {
  let rolesOptions = '<option value="">-- No template (manual) --</option>';
  try {
    const { roles } = await API.get('/api/roles?active=true');
    rolesOptions += roles.map(r => `<option value="${r._id}">${r.title} (${r.department})</option>`).join('');
  } catch { /* no roles available */ }

  openModal('Screen CV with AI', `
    <div class="form-group"><label>Role Template</label>
      <select name="roleId" onchange="document.querySelector('[name=jobTitle]').disabled=!!this.value;if(this.value)document.querySelector('[name=jobTitle]').value=''">
        ${rolesOptions}
      </select>
    </div>
    <div class="form-group"><label>Job Title (if no template)</label><input name="jobTitle" placeholder="e.g. Backend Engineer"></div>
    <div class="form-group"><label>Additional requirements (optional)</label><textarea name="jobRequirements" rows="2" placeholder="e.g. Must speak Dutch fluently"></textarea></div>
    <div class="form-group"><label>Paste CV Text</label><textarea name="cvText" rows="8" required placeholder="Paste the candidate's CV here..."></textarea></div>
    <div id="screen-result" style="display:none;margin-top:12px"></div>
  `, async (data) => {
    if (!data.roleId && !data.jobTitle) throw new Error('Select a role template or enter a job title');
    const resultDiv = document.querySelector('#screen-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>Screening with AI...</p>';
    const result = await API.post('/api/ai/screen-cv', data);
    const skills = result.skills || {};
    resultDiv.innerHTML = `
      <div class="card" style="margin:0;padding:16px">
        <h3>Score: ${result.score}/100 — ${result.recommendation?.toUpperCase()}</h3>
        <p>${result.summary || ''}</p>
        ${result.reasoning ? `<p style="font-style:italic;color:var(--gray-500)">${result.reasoning}</p>` : ''}
        ${skills.matched?.length ? `<p><strong>Matched skills:</strong> ${skills.matched.join(', ')}</p>` : ''}
        ${skills.missing?.length ? `<p style="color:var(--danger)"><strong>Missing:</strong> ${skills.missing.join(', ')}</p>` : ''}
        ${skills.bonus?.length ? `<p style="color:var(--success)"><strong>Bonus:</strong> ${skills.bonus.join(', ')}</p>` : ''}
        ${result.experience ? `<p><strong>Experience:</strong> ~${result.experience.years} years (${result.experience.relevance} relevance)</p>` : ''}
        ${result.languageMatch ? `<p><strong>Language:</strong> ${result.languageMatch.detected?.join(', ') || '?'} — ${result.languageMatch.match ? 'Match' : 'Mismatch'}</p>` : ''}
        ${result.strengths?.length ? `<p><strong>Strengths:</strong> ${result.strengths.join(', ')}</p>` : ''}
        ${result.redFlags?.length ? `<p style="color:var(--danger)"><strong>Red flags:</strong> ${result.redFlags.join(', ')}</p>` : ''}
      </div>`;
    throw new Error('__keep_open__');
  });
  const form = document.querySelector('.modal-body');
  form.querySelector('[type="submit"]').textContent = 'Screen CV';
}
