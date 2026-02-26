// student.js
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('student-form-container');
    try {
        // Fetch config and form content
        const [configRes, formContentRes] = await Promise.all([
            fetch('/api/config'),
            fetch('/api/form-content')
        ]);
        if (!configRes.ok || !formContentRes.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await configRes.json();
        const formContent = await formContentRes.json();

        // Check if form is published
// Check if form is published
if (!config.form_published) {
    container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="min-height: 80vh;">
            <div class="alert alert-warning text-center" style="max-width: 500px;">
                <h4>⏸️ Form Closed</h4>
                <p>This form is currently closed. Please contact your clss CR.</p>
            </div>
        </div>
    `;
    return;
}

        // Display cover page if enabled
        if (formContent.cover_page?.enabled) {
            container.innerHTML = `
                <div class="cover-page" style="background: linear-gradient(135deg, ${formContent.cover_page.background_color || '#1f2937'} 0%, #111827 100%); color: ${formContent.cover_page.text_color || '#e5e7eb'};">
                    <h1>${formContent.cover_page.title || '🎓 Project Allocation'}</h1>
                </div>
            `;
        }

        // Display form header
        const header = formContent.form_header || {};
        container.innerHTML += `
            <h1 class="display-5 mb-3">${header.title || 'Project Selection Form'}</h1>
            <div class="alert alert-info">
                ${header.description || 'Please fill in all required fields...'}
            </div>
            ${header.show_contact ? `
                <div class="alert alert-secondary">
                    <strong>Contact:</strong> ${header.contact_email || 'coal@university.edu'}
                </div>
            ` : ''}
            <hr class="border-secondary">
        `;

        const mode = config.form_mode;
        const tabVisibility = config.tab_visibility?.[mode] || {};

        // Build tabs based on mode and visibility
        const tabs = [];

        if (mode === 'project_allocation') {
            if (tabVisibility.form) tabs.push({ id: 'allocation-form', label: '📋 Project Selection Form', content: renderAllocationForm });
            if (tabVisibility.allocations) tabs.push({ id: 'allocations', label: '📊 View Allocations', content: renderAllocations });
            if (tabVisibility.instructions) tabs.push({ id: 'instructions', label: 'ℹ️ Instructions', content: () => renderInstructions(formContent) });
        } else if (mode === 'project_file_submission') {
            if (config.project_file_submission_open && tabVisibility.form) tabs.push({ id: 'file-submit', label: '📁 Submit Files', content: renderFileSubmission });
            if (tabVisibility.allocations) tabs.push({ id: 'allocations', label: '📊 View Allocations', content: renderAllocations });
            if (tabVisibility.instructions) tabs.push({ id: 'instructions', label: 'ℹ️ Instructions', content: () => renderInstructions(formContent) });
        } else if (mode === 'lab_manual') {
            if (tabVisibility.form) tabs.push({ id: 'lab-manual', label: '📚 Lab Manual Submission', content: renderLabManual });
            if (tabVisibility.instructions) tabs.push({ id: 'instructions', label: 'ℹ️ Instructions', content: () => renderInstructions(formContent) });
        } else if (mode === 'class_assignment') {
            if (tabVisibility.form) tabs.push({ id: 'class-assignment', label: '📘 Class Assignment Submission', content: renderClassAssignment });
            if (tabVisibility.instructions) tabs.push({ id: 'instructions', label: 'ℹ️ Instructions', content: () => renderInstructions(formContent) });
        }

        if (tabs.length === 0) {
            container.innerHTML += '<div class="alert alert-warning">No tabs enabled. Contact administrator.</div>';
            return;
        }

        // Check deadline for the current mode
        const deadlineRes = await fetch(`/api/deadline/${mode}`);
        if (deadlineRes.ok) {
            const deadline = await deadlineRes.json();
            if (!deadline.open) {
                container.innerHTML += `<div class="alert alert-danger">${deadline.message}</div>`;
                return;
            }
            if (deadline.message) {
                container.innerHTML += `<div class="alert alert-info">${deadline.message}</div>`;
            }
        }

        // Render tabs
        let tabsHtml = '<ul class="nav nav-tabs" id="studentTabs" role="tablist">';
        tabs.forEach((tab, index) => {
            tabsHtml += `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${index === 0 ? 'active' : ''}" id="${tab.id}-tab" data-bs-toggle="tab" data-bs-target="#${tab.id}" type="button" role="tab">${tab.label}</button>
                </li>
            `;
        });
        tabsHtml += '</ul><div class="tab-content" id="studentTabContent">';

        tabs.forEach((tab, index) => {
            tabsHtml += `<div class="tab-pane fade ${index === 0 ? 'show active' : ''}" id="${tab.id}" role="tabpanel"><div class="card mt-3"><div class="card-body" id="${tab.id}-content"></div></div></div>`;
        });
        tabsHtml += '</div>';

        container.innerHTML += tabsHtml;

        // Load content into each tab
        tabs.forEach(tab => {
            const contentDiv = document.getElementById(`${tab.id}-content`);
            tab.content(contentDiv, config, formContent);
        });

    } catch (error) {
        // console.error('Student form error:', error);
        // container.innerHTML = '<div class="alert alert-danger">Error loading form. Please check console or contact admin.</div>';
    }
});

// ==================== Render Functions ====================

function renderAllocationForm(container, config, formContent) {
    const maxMembers = config.max_members || 3;
    const projectOptional = config.project_allocation_project_optional || false;

    container.innerHTML = `
        <h3>Project Allocation Form</h3>
        <form id="allocation-form">
            <!-- Group Members -->
            <div class="mb-3">
                <label class="form-label fw-bold">Group Leader (Member 1) *</label>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="leader-name" placeholder="Full Name" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="leader-roll" placeholder="Roll Number" required>
                    </div>
                </div>
            </div>
            <div id="additional-members"></div>
            <button type="button" class="btn btn-secondary btn-sm mb-3" id="add-member" ${maxMembers <= 1 ? 'disabled' : ''}>+ Add Member</button>

            <!-- Project Selection -->
            <div class="mb-3">
                <label class="form-label fw-bold">Project ${projectOptional ? '(Optional)' : '*'} </label>
                <select class="form-select" id="project-select">
                    <option value="">-- Select a project --</option>
                </select>
            </div>

            <!-- Terms -->
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="terms1" required>
                <label class="form-check-label">I confirm that all information is accurate</label>
            </div>
            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="terms2" required>
                <label class="form-check-label">I understand this selection is final</label>
            </div>

            <button type="submit" class="btn btn-primary">Submit Application</button>
        </form>
        <div id="allocation-result" class="mt-3"></div>
    `;

    // Populate project dropdown
    fetch('/api/projects/available')
        .then(res => res.json())
        .then(projects => {
            const select = document.getElementById('project-select');
            projects.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = p.name;
                select.appendChild(option);
            });
        })
        .catch(err => console.error('Failed to load projects:', err));

    // Handle add member
    let memberCount = 1;
    document.getElementById('add-member').addEventListener('click', () => {
        if (memberCount >= maxMembers) return;
        memberCount++;
        const div = document.createElement('div');
        div.className = 'row mb-2';
        div.innerHTML = `
            <div class="col-md-6"><input type="text" class="form-control" placeholder="Member ${memberCount} Name"></div>
            <div class="col-md-6"><input type="text" class="form-control" placeholder="Roll Number"></div>
        `;
        document.getElementById('additional-members').appendChild(div);
    });

    // Handle form submission
    document.getElementById('allocation-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const members = [];
        members.push({
            name: document.getElementById('leader-name').value.trim(),
            roll_no: document.getElementById('leader-roll').value.trim(),
            is_leader: true
        });

        const additionalRows = document.querySelectorAll('#additional-members .row');
        additionalRows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value.trim();
            const roll = inputs[1].value.trim();
            if (name && roll) {
                members.push({ name, roll_no: roll, is_leader: false });
            }
        });

        const project = document.getElementById('project-select').value;
        const terms1 = document.getElementById('terms1').checked;
        const terms2 = document.getElementById('terms2').checked;

        if (!terms1 || !terms2) {
            document.getElementById('allocation-result').innerHTML = '<div class="alert alert-danger">Please accept both terms.</div>';
            return;
        }

        const payload = { members, project_name: project };

        const res = await fetch('/api/submit/project-allocation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            document.getElementById('allocation-result').innerHTML = `
                <div class="alert alert-success">
                    ✅ Application submitted! Your group number is <strong>${result.group_number}</strong>.
                </div>
            `;
            document.getElementById('allocation-form').reset();
        } else {
            document.getElementById('allocation-result').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });
}

function renderAllocations(container) {
    container.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';
    fetch('/api/groups/allocations')
        .then(res => res.json())
        .then(groups => {
            if (groups.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No allocations yet.</div>';
                return;
            }
            let html = '<table class="table table-striped"><thead><tr><th>Group</th><th>Project</th><th>Status</th><th>Leader</th><th>Members</th></tr></thead><tbody>';
            groups.forEach(g => {
                const leader = g.members.find(m => m.is_leader)?.name || '';
                const membersCount = g.members.filter(m => m.name).length;
                html += `<tr><td>${g.group_number}</td><td>${g.project_name || '—'}</td><td>${g.status}</td><td>${leader}</td><td>${membersCount}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = '<div class="alert alert-danger">Failed to load allocations.</div>';
        });
}

function renderInstructions(container, formContent) {
    const instructions = formContent.instructions || {};
    container.innerHTML = `
        <h3>${instructions.title || 'Instructions'}</h3>
        <div>${instructions.content || 'No instructions provided.'}</div>
        ${instructions.additional_notes ? `<div class="mt-3 alert alert-info">${instructions.additional_notes}</div>` : ''}
    `;
}

function renderFileSubmission(container, config) {
    container.innerHTML = `
        <h3>Project File Submission</h3>
        <div class="mb-3">
            <label for="file-group-number" class="form-label">Group Number</label>
            <div class="row">
                <div class="col-md-6">
                    <input type="number" class="form-control" id="file-group-number" min="1">
                </div>
                <div class="col-md-3">
                    <button class="btn btn-secondary" id="verify-group">Verify Group</button>
                </div>
            </div>
        </div>
        <div id="file-upload-area" style="display:none;">
            <form id="file-upload-form" enctype="multipart/form-data">
                <div class="mb-3">
                    <label for="files" class="form-label">Upload Files</label>
                    <input type="file" class="form-control" name="files" multiple required>
                </div>
                <button type="submit" class="btn btn-primary">Upload</button>
            </form>
            <div id="file-result" class="mt-3"></div>
        </div>
    `;

    document.getElementById('verify-group').addEventListener('click', async () => {
        const groupNum = document.getElementById('file-group-number').value;
        if (!groupNum) {
            alert('Please enter a group number');
            return;
        }
        const res = await fetch('/api/group/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_number: parseInt(groupNum) })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.exists) {
                document.getElementById('file-upload-area').style.display = 'block';
                alert(`Group verified! Project: ${data.project_name || 'N/A'}`);
            } else {
                alert('Group not found');
            }
        } else {
            alert('Group not found');
        }
    });

    document.getElementById('file-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('group_number', document.getElementById('file-group-number').value);
        const res = await fetch('/api/submit/project-files', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (res.ok) {
            document.getElementById('file-result').innerHTML = '<div class="alert alert-success">Files uploaded successfully!</div>';
            e.target.reset();
        } else {
            document.getElementById('file-result').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });
}

function renderLabManual(container) {
    container.innerHTML = `
        <h3>Lab Manual Submission</h3>
        <form id="lab-manual-form" enctype="multipart/form-data">
            <div class="row mb-3">
                <div class="col-md-6">
                    <input type="text" class="form-control" name="name" placeholder="Full Name" required>
                </div>
                <div class="col-md-6">
                    <input type="text" class="form-control" name="roll_no" placeholder="Roll Number" required>
                </div>
            </div>
            <div class="mb-3">
                <label for="lab-files" class="form-label">Upload File(s)</label>
                <input type="file" class="form-control" name="files" multiple required>
            </div>
            <button type="submit" class="btn btn-primary">Submit</button>
        </form>
        <div id="lab-result" class="mt-3"></div>
    `;

    document.getElementById('lab-manual-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const res = await fetch('/api/submit/lab-manual', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (res.ok) {
            document.getElementById('lab-result').innerHTML = '<div class="alert alert-success">Submitted successfully!</div>';
            e.target.reset();
        } else {
            document.getElementById('lab-result').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });
}

function renderClassAssignment(container) {
    container.innerHTML = `
        <h3>Class Assignment Submission</h3>
        <form id="class-assignment-form" enctype="multipart/form-data">
            <div class="row mb-3">
                <div class="col-md-6">
                    <input type="text" class="form-control" name="name" placeholder="Full Name" required>
                </div>
                <div class="col-md-6">
                    <input type="text" class="form-control" name="roll_no" placeholder="Roll Number" required>
                </div>
            </div>
            <div class="mb-3">
                <label for="assignment-no" class="form-label">Assignment Number</label>
                <input type="number" class="form-control" name="assignment_no" required>
            </div>
            <div class="mb-3">
                <label for="assignment-files" class="form-label">Upload File(s)</label>
                <input type="file" class="form-control" name="files" multiple required>
            </div>
            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="confirm-work" required>
                <label class="form-check-label">I confirm this is my own work</label>
            </div>
            <button type="submit" class="btn btn-primary">Submit</button>
        </form>
        <div id="class-result" class="mt-3"></div>
    `;

    document.getElementById('class-assignment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!document.getElementById('confirm-work').checked) {
            document.getElementById('class-result').innerHTML = '<div class="alert alert-danger">You must confirm your work.</div>';
            return;
        }
        const formData = new FormData(e.target);
        const res = await fetch('/api/submit/class-assignment', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (res.ok) {
            document.getElementById('class-result').innerHTML = '<div class="alert alert-success">Submitted successfully!</div>';
            e.target.reset();
        } else {
            document.getElementById('class-result').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });
}