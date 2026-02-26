// admin.js
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('/admin/dashboard')) return;

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/';
    });

    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target').substring(1);
            loadTabContent(targetId);
        });
    });

    loadTabContent('short-urls');
});

// Toast notification system
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    })();

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

async function loadTabContent(tabId) {
    const contentDiv = document.getElementById(`${tabId}-content`);
    if (!contentDiv) return;

    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';

    try {
        if (tabId === 'short-urls') await loadShortUrls(contentDiv);
        else if (tabId === 'form-settings') await loadFormSettings(contentDiv);
        else if (tabId === 'projects') await loadProjects(contentDiv);
        else if (tabId === 'groups') await loadGroups(contentDiv);
        else if (tabId === 'archived') await loadArchived(contentDiv);
        else if (tabId === 'export') await loadExport(contentDiv);
        else if (tabId === 'file-submissions') await loadFileSubmissions(contentDiv);
        else if (tabId === 'lab-manual') await loadLabManual(contentDiv);
        else if (tabId === 'class-assignments') await loadClassAssignments(contentDiv);
        else if (tabId === 'change-password') await loadChangePassword(contentDiv);
        else contentDiv.innerHTML = 'Unknown tab';
    } catch (error) {
        contentDiv.innerHTML = `<div class="alert alert-danger">Error loading: ${error.message}</div>`;
    }
}

async function loadShortUrls(container) {
    const res = await fetch('/api/admin/short-urls', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const urls = await res.json();
    let html = `
        <h4>Short URL Management</h4>
        <button class="btn btn-primary mb-3" id="generate-short-url">Generate New Short URL</button>
        <table class="table table-striped">
            <thead><tr><th>Code</th><th>URL</th><th>Clicks</th><th>Created</th><th>Last Accessed</th><th>Actions</th></tr></thead>
            <tbody>
    `;
    for (const [code, data] of Object.entries(urls)) {
        html += `
            <tr>
                <td>${code}</td>
                <td><a href="${data.url}" target="_blank">${data.url}</a></td>
                <td>${data.clicks || 0}</td>
                <td>${data.created_at ? formatDate(data.created_at) : 'N/A'}</td>
                <td>${data.last_accessed ? formatDate(data.last_accessed) : 'Never'}</td>
                <td><button class="btn btn-sm btn-danger delete-url" data-code="${code}">Delete</button></td>
            </tr>
        `;
    }
    html += '</tbody></table>';
    container.innerHTML = html;

    document.getElementById('generate-short-url').addEventListener('click', async () => {
        const res = await fetch('/api/admin/short-urls', { method: 'POST', credentials: 'include' });
        if (res.ok) {
            showToast('Short URL generated');
            loadTabContent('short-urls');
        }
    });

    document.querySelectorAll('.delete-url').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const code = e.target.dataset.code;
            if (confirm('Delete this short URL?')) {
                await fetch(`/api/admin/short-urls/${code}`, { method: 'DELETE', credentials: 'include' });
                showToast('Short URL deleted');
                loadTabContent('short-urls');
            }
        });
    });
}





















































async function loadFormSettings(container) {
    const [configRes, formRes, deadlinesRes, labSettingsRes, classSettingsRes, projectFileRes, fileFormatRes] = await Promise.all([
        fetch('/api/admin/config', { credentials: 'include' }),
        fetch('/api/admin/form-content', { credentials: 'include' }),
        fetch('/api/admin/deadlines', { credentials: 'include' }),
        fetch('/api/admin/lab-settings', { credentials: 'include' }),
        fetch('/api/admin/class-settings', { credentials: 'include' }),
        fetch('/api/admin/project-file-settings', { credentials: 'include' }),
        fetch('/api/admin/file-format-settings', { credentials: 'include' })
    ]);
    if (!configRes.ok || !formRes.ok || !deadlinesRes.ok || !labSettingsRes.ok || !classSettingsRes.ok || !projectFileRes.ok || !fileFormatRes.ok)
        throw new Error('Failed to load settings');
    const config = await configRes.json();
    const formContent = await formRes.json();
    const deadlines = await deadlinesRes.json();
    const labSettings = await labSettingsRes.json();
    const classSettings = await classSettingsRes.json();
    const projectFileSettings = await projectFileRes.json();
    const fileFormatSettings = await fileFormatRes.json();

    // Build deadlines HTML
    let deadlinesHtml = '';
    const deadlineTypes = [
        { id: 'project_allocation', name: 'Project Allocation' },
        { id: 'project_file_submission', name: 'Project File Submission' },
        { id: 'lab_manual', name: 'Lab Manual' },
        { id: 'class_assignment', name: 'Class Assignment' }
    ];
    deadlineTypes.forEach(type => {
        const d = deadlines[type.id] || { enabled: false, datetime: '', message: '' };
        deadlinesHtml += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6>${type.name}</h6>
                    <div class="form-check mb-2">
                        <input class="form-check-input deadline-enabled" type="checkbox" id="deadline_${type.id}" data-type="${type.id}" ${d.enabled ? 'checked' : ''}>
                        <label class="form-check-label" for="deadline_${type.id}">Enable Deadline</label>
                    </div>
                    <div class="mb-2">
                        <label>Deadline Date/Time</label>
                        <input type="datetime-local" class="form-control deadline-datetime" data-type="${type.id}" value="${d.datetime ? d.datetime.slice(0,16) : ''}">
                    </div>
                    <div class="mb-2">
                        <label>Custom Message (optional)</label>
                        <input type="text" class="form-control deadline-message" data-type="${type.id}" value="${d.message || ''}">
                    </div>
                </div>
            </div>
        `;
    });

    // Tab visibility
    const visibility = config.tab_visibility || {
        project_allocation: { form: true, allocations: true, instructions: true },
        project_file_submission: { form: true, allocations: true, instructions: true },
        lab_manual: { form: true, instructions: true },
        class_assignment: { form: true, instructions: true }
    };
    let visibilityHtml = '<h5>Tab Visibility</h5><div class="row">';
    const modes = [
        { id: 'project_allocation', name: 'Project Allocation', tabs: ['form', 'allocations', 'instructions'] },
        { id: 'project_file_submission', name: 'File Submission', tabs: ['form', 'allocations', 'instructions'] },
        { id: 'lab_manual', name: 'Lab Manual', tabs: ['form', 'instructions'] },
        { id: 'class_assignment', name: 'Class Assignment', tabs: ['form', 'instructions'] }
    ];
    modes.forEach(mode => {
        visibilityHtml += `<div class="col-md-6 mb-3"><strong>${mode.name}</strong><br>`;
        mode.tabs.forEach(tab => {
            const checked = visibility[mode.id]?.[tab] ? 'checked' : '';
            visibilityHtml += `
                <div class="form-check form-check-inline">
                    <input class="form-check-input tab-visibility" type="checkbox" data-mode="${mode.id}" data-tab="${tab}" ${checked}>
                    <label class="form-check-label">${tab.charAt(0).toUpperCase() + tab.slice(1)}</label>
                </div>
            `;
        });
        visibilityHtml += '</div>';
    });
    visibilityHtml += '</div>';

    // Format checkboxes
    const allFormats = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".zip", ".rar"];
    let formatsHtml = '<h5>Allowed File Formats (applies to all uploads)</h5><div class="row">';
    allFormats.forEach(fmt => {
        const checked = fileFormatSettings.includes(fmt) ? 'checked' : '';
        formatsHtml += `
            <div class="col-md-3">
                <div class="form-check">
                    <input class="form-check-input format-checkbox" type="checkbox" value="${fmt}" ${checked}>
                    <label class="form-check-label">${fmt}</label>
                </div>
            </div>
        `;
    });
    formatsHtml += '</div>';

    let html = `
        <h4>Form Settings</h4>
        <form id="config-form">
            <div class="mb-3">
                <label>Form Mode</label>
                <select class="form-select" name="form_mode">
                    <option value="project_allocation" ${config.form_mode === 'project_allocation' ? 'selected' : ''}>Project Allocation</option>
                    <option value="project_file_submission" ${config.form_mode === 'project_file_submission' ? 'selected' : ''}>Project File Submission</option>
                    <option value="lab_manual" ${config.form_mode === 'lab_manual' ? 'selected' : ''}>Lab Manual</option>
                    <option value="class_assignment" ${config.form_mode === 'class_assignment' ? 'selected' : ''}>Class Assignment</option>
                </select>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="form_published" id="form_published" ${config.form_published ? 'checked' : ''}>
                <label class="form-check-label" for="form_published">Form Published</label>
            </div>
            <div class="mb-3">
                <label>Max Members</label>
                <input type="number" class="form-control" name="max_members" value="${config.max_members}">
            </div>
            <div class="mb-3">
                <label>Base URL</label>
                <input type="text" class="form-control" name="base_url" value="${config.base_url || 'http://localhost:5000'}">
            </div>
            <hr>
            <h5>Mode‑Specific Settings</h5>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="allow_allocation_edit" id="allow_allocation_edit" ${config.allow_allocation_edit ? 'checked' : ''}>
                <label class="form-check-label" for="allow_allocation_edit">Project Allocation: Allow Edit</label>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="project_allocation_project_optional" id="project_allocation_project_optional" ${config.project_allocation_project_optional ? 'checked' : ''}>
                <label class="form-check-label" for="project_allocation_project_optional">Project Allocation: Project Optional</label>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="project_file_submission_open" id="project_file_submission_open" ${config.project_file_submission_open ? 'checked' : ''}>
                <label class="form-check-label" for="project_file_submission_open">Project File Submission Open</label>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="lab_manual_open" id="lab_manual_open" ${config.lab_manual_open ? 'checked' : ''}>
                <label class="form-check-label" for="lab_manual_open">Lab Manual Open</label>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="lab_file_upload_required" id="lab_file_upload_required" ${config.lab_file_upload_required ? 'checked' : ''}>
                <label class="form-check-label" for="lab_file_upload_required">Lab Manual: File Upload Required</label>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="class_assignment_open" id="class_assignment_open" ${config.class_assignment_open ? 'checked' : ''}>
                <label class="form-check-label" for="class_assignment_open">Class Assignment Open</label>
            </div>
            <hr>

            ${formatsHtml}
            <hr>

            <!-- Project File Submission Settings (without formats) -->
            <h5>Project File Submission Settings</h5>
            <div class="mb-3">
                <label>Max File Size (MB)</label>
                <input type="number" class="form-control" id="project_max_size" value="${projectFileSettings.max_size_mb || 10}">
            </div>
            <div class="mb-3">
                <label>Max Files</label>
                <input type="number" class="form-control" id="project_max_files" value="${projectFileSettings.max_files || 5}">
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="project_allow_multiple" ${projectFileSettings.allow_multiple_submissions ? 'checked' : ''}>
                <label class="form-check-label">Allow Multiple Submissions</label>
            </div>
            <div class="mb-3">
                <label>Instructions</label>
                <textarea class="form-control" id="project_instructions">${projectFileSettings.instructions || ''}</textarea>
            </div>
            <hr>

            <!-- Lab Manual Settings (without formats) -->
            <h5>Lab Manual Settings</h5>
            <div class="mb-3">
                <label>Max File Size (MB)</label>
                <input type="number" class="form-control" id="lab_max_size" value="${labSettings.max_size_mb || 5}">
            </div>
            <div class="mb-3">
                <label>Max Files</label>
                <input type="number" class="form-control" id="lab_max_files" value="${labSettings.max_files || 1}">
            </div>
            <div class="mb-3">
                <label>Lab Subject Name</label>
                <input type="text" class="form-control" id="lab_subject_name" value="${config.lab_subject_name || ''}">
            </div>
            <hr>

            <!-- Class Assignment Settings (without formats) -->
            <h5>Class Assignment Settings</h5>
            <div class="mb-3">
                <label>Max File Size (MB)</label>
                <input type="number" class="form-control" id="class_max_size" value="${classSettings.max_size_mb || 10}">
            </div>
            <div class="mb-3">
                <label>Max Files</label>
                <input type="number" class="form-control" id="class_max_files" value="${classSettings.max_files || 3}">
            </div>
            <div class="mb-3">
                <label>Course Name</label>
                <input type="text" class="form-control" id="course_name" value="${config.course_name || ''}">
            </div>
            <div class="mb-3">
                <label>Current Assignment Number</label>
                <input type="number" class="form-control" id="current_assignment_no" value="${config.current_assignment_no || 1}">
            </div>
            <hr>

            ${visibilityHtml}
            <button type="submit" class="btn btn-primary">Save Config</button>
        </form>
        <hr>
        <h5>Deadlines</h5>
        <div id="deadlines-container">${deadlinesHtml}</div>
        <button class="btn btn-primary mb-3" id="save-deadlines">Save Deadlines</button>
        <hr>
        <h5>Cover Page</h5>
        <form id="cover-form">
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="cover_enabled" id="cover_enabled" ${formContent.cover_page?.enabled ? 'checked' : ''}>
                <label class="form-check-label" for="cover_enabled">Enable Cover Page</label>
            </div>
            <div class="mb-3">
                <label>Cover Title</label>
                <input type="text" class="form-control" name="cover_title" value="${formContent.cover_page?.title || ''}">
            </div>
            <div class="mb-3">
                <label>Background Color</label>
                <input type="color" class="form-control" name="cover_bg" value="${formContent.cover_page?.background_color || '#1f2937'}">
            </div>
            <div class="mb-3">
                <label>Text Color</label>
                <input type="color" class="form-control" name="cover_text" value="${formContent.cover_page?.text_color || '#e5e7eb'}">
            </div>
            <button type="submit" class="btn btn-primary">Save Cover</button>
        </form>
        <hr>
        <h5>Form Header</h5>
        <form id="header-form">
            <div class="mb-3">
                <label>Title</label>
                <input type="text" class="form-control" name="header_title" value="${formContent.form_header?.title || ''}">
            </div>
            <div class="mb-3">
                <label>Description</label>
                <textarea class="form-control" name="header_description">${formContent.form_header?.description || ''}</textarea>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="show_contact" id="show_contact" ${formContent.form_header?.show_contact ? 'checked' : ''}>
                <label class="form-check-label" for="show_contact">Show Contact Email</label>
            </div>
            <div class="mb-3">
                <label>Contact Email</label>
                <input type="email" class="form-control" name="contact_email" value="${formContent.form_header?.contact_email || ''}">
            </div>
            <button type="submit" class="btn btn-primary">Save Header</button>
        </form>
        <hr>
        <h5>Instructions</h5>
        <form id="instructions-form">
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" name="instructions_enabled" id="instructions_enabled" ${formContent.instructions?.enabled ? 'checked' : ''}>
                <label class="form-check-label" for="instructions_enabled">Enable Instructions</label>
            </div>
            <div class="mb-3">
                <label>Title</label>
                <input type="text" class="form-control" name="instructions_title" value="${formContent.instructions?.title || ''}">
            </div>
            <div class="mb-3">
                <label>Content (Markdown)</label>
                <textarea class="form-control" name="instructions_content" rows="5">${formContent.instructions?.content || ''}</textarea>
            </div>
            <div class="mb-3">
                <label>Additional Notes</label>
                <textarea class="form-control" name="additional_notes">${formContent.instructions?.additional_notes || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Save Instructions</button>
        </form>
        <hr>
        <button class="btn btn-secondary" id="reset-defaults">Reset to Defaults</button>
    `;
    container.innerHTML = html;

    // Save config
    document.getElementById('config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.form_published = formData.get('form_published') === 'on';
        data.allow_allocation_edit = formData.get('allow_allocation_edit') === 'on';
        data.project_allocation_project_optional = formData.get('project_allocation_project_optional') === 'on';
        data.project_file_submission_open = formData.get('project_file_submission_open') === 'on';
        data.lab_manual_open = formData.get('lab_manual_open') === 'on';
        data.lab_file_upload_required = formData.get('lab_file_upload_required') === 'on';
        data.class_assignment_open = formData.get('class_assignment_open') === 'on';

        // Collect tab visibility
        const tabVisibility = {};
        document.querySelectorAll('.tab-visibility').forEach(cb => {
            const mode = cb.dataset.mode;
            const tab = cb.dataset.tab;
            if (!tabVisibility[mode]) tabVisibility[mode] = {};
            tabVisibility[mode][tab] = cb.checked;
        });
        data.tab_visibility = tabVisibility;

        // Collect selected formats
        const selectedFormats = [];
        document.querySelectorAll('.format-checkbox:checked').forEach(cb => {
            selectedFormats.push(cb.value);
        });

        // Lab settings
        const labSettings = {
            max_size_mb: parseInt(document.getElementById('lab_max_size').value),
            max_files: parseInt(document.getElementById('lab_max_files').value)
        };
        // Class settings
        const classSettings = {
            max_size_mb: parseInt(document.getElementById('class_max_size').value),
            max_files: parseInt(document.getElementById('class_max_files').value)
        };
        // Project file settings
        const projectSettings = {
            max_size_mb: parseInt(document.getElementById('project_max_size').value),
            max_files: parseInt(document.getElementById('project_max_files').value),
            allow_multiple_submissions: document.getElementById('project_allow_multiple').checked,
            instructions: document.getElementById('project_instructions').value
        };
        // Config extra fields
        data.lab_subject_name = document.getElementById('lab_subject_name').value;
        data.course_name = document.getElementById('course_name').value;
        data.current_assignment_no = parseInt(document.getElementById('current_assignment_no').value);

        // Save all
        await Promise.all([
            fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            }),
            fetch('/api/admin/lab-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(labSettings),
                credentials: 'include'
            }),
            fetch('/api/admin/class-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(classSettings),
                credentials: 'include'
            }),
            fetch('/api/admin/project-file-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectSettings),
                credentials: 'include'
            }),
            fetch('/api/admin/file-format-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedFormats),
                credentials: 'include'
            })
        ]);
        showToast('Settings saved');
    });

    // Save deadlines
    document.getElementById('save-deadlines').addEventListener('click', async () => {
        const deadlinesData = {};
        deadlineTypes.forEach(type => {
            const enabled = document.querySelector(`.deadline-enabled[data-type="${type.id}"]`).checked;
            const datetime = document.querySelector(`.deadline-datetime[data-type="${type.id}"]`).value;
            const message = document.querySelector(`.deadline-message[data-type="${type.id}"]`).value;
            deadlinesData[type.id] = {
                enabled,
                datetime: datetime ? new Date(datetime).toISOString() : '',
                message
            };
        });
        const res = await fetch('/api/admin/deadlines', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deadlinesData),
            credentials: 'include'
        });
        if (res.ok) showToast('Deadlines saved');
    });

    // Cover, header, instructions forms (same as before)
    document.getElementById('cover-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const cover = {
            enabled: formData.get('cover_enabled') === 'on',
            title: formData.get('cover_title'),
            background_color: formData.get('cover_bg'),
            text_color: formData.get('cover_text')
        };
        const content = await (await fetch('/api/admin/form-content', { credentials: 'include' })).json();
        content.cover_page = cover;
        await fetch('/api/admin/form-content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content),
            credentials: 'include'
        });
        showToast('Cover saved');
    });

    document.getElementById('header-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const header = {
            title: formData.get('header_title'),
            description: formData.get('header_description'),
            show_contact: formData.get('show_contact') === 'on',
            contact_email: formData.get('contact_email')
        };
        const content = await (await fetch('/api/admin/form-content', { credentials: 'include' })).json();
        content.form_header = header;
        await fetch('/api/admin/form-content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content),
            credentials: 'include'
        });
        showToast('Header saved');
    });

    document.getElementById('instructions-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const instructions = {
            enabled: formData.get('instructions_enabled') === 'on',
            title: formData.get('instructions_title'),
            content: formData.get('instructions_content'),
            additional_notes: formData.get('additional_notes')
        };
        const content = await (await fetch('/api/admin/form-content', { credentials: 'include' })).json();
        content.instructions = instructions;
        await fetch('/api/admin/form-content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content),
            credentials: 'include'
        });
        showToast('Instructions saved');
    });

    document.getElementById('reset-defaults').addEventListener('click', () => {
        showToast('Reset to defaults not implemented', 'warning');
    });
}












































async function loadProjects(container) {
    const res = await fetch('/api/admin/projects', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const projects = await res.json();
    let html = `
        <h4>Projects</h4>
        <button class="btn btn-primary mb-3" id="add-project">Add Project</button>
        <table class="table table-striped">
            <thead><tr><th>Name</th><th>Status</th><th>Selected By</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
    `;
    projects.forEach(p => {
        if (!p.deleted) {
            html += `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.status}</td>
                    <td>${p.selected_by || 0}</td>
                    <td>${p.created_at ? formatDate(p.created_at) : ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-project" data-name="${p.name}" data-status="${p.status}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-project" data-name="${p.name}">Delete</button>
                    </td>
                </tr>
            `;
        }
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    document.getElementById('add-project').addEventListener('click', () => {
        showProjectModal(null, null, (name, status) => {
            fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, status }),
                credentials: 'include'
            }).then(() => {
                showToast('Project added');
                loadTabContent('projects');
            });
        });
    });

    document.querySelectorAll('.edit-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const oldName = e.target.dataset.name;
            const oldStatus = e.target.dataset.status;
            showProjectModal(oldName, oldStatus, (newName, newStatus) => {
                fetch('/api/admin/projects', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ old_name: oldName, new_name: newName, status: newStatus }),
                    credentials: 'include'
                }).then(() => {
                    showToast('Project updated');
                    loadTabContent('projects');
                });
            });
        });
    });

    document.querySelectorAll('.delete-project').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const name = e.target.dataset.name;
            if (confirm(`Delete project "${name}"?`)) {
                await fetch(`/api/admin/projects?name=${encodeURIComponent(name)}`, { method: 'DELETE', credentials: 'include' });
                showToast('Project deleted');
                loadTabContent('projects');
            }
        });
    });
}

function showProjectModal(existingName, existingStatus, callback) {
    const isEdit = existingName !== null;
    const modalHtml = `
        <div class="modal fade" id="projectModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'Edit Project' : 'Add Project'}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="project-form">
                            <div class="mb-3">
                                <label for="project-name" class="form-label">Project Name</label>
                                <input type="text" class="form-control bg-dark text-light" id="project-name" value="${existingName || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="project-status" class="form-label">Status</label>
                                <select class="form-select bg-dark text-light" id="project-status">
                                    <option value="Not Selected" ${existingStatus === 'Not Selected' ? 'selected' : ''}>Not Selected</option>
                                    <option value="Submitted" ${existingStatus === 'Submitted' ? 'selected' : ''}>Submitted</option>
                                    <option value="Under Review" ${existingStatus === 'Under Review' ? 'selected' : ''}>Under Review</option>
                                    <option value="Approved" ${existingStatus === 'Approved' ? 'selected' : ''}>Approved</option>
                                    <option value="Rejected" ${existingStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="modal-save">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const oldModal = document.getElementById('projectModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();

    document.getElementById('modal-save').addEventListener('click', () => {
        const name = document.getElementById('project-name').value.trim();
        const status = document.getElementById('project-status').value;
        if (!name) {
            showToast('Project name required', 'danger');
            return;
        }
        modal.hide();
        callback(name, status);
    });
}
// ========== GROUPS ==========
async function loadGroups(container) {
    const res = await fetch('/api/admin/groups', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const groups = await res.json();

    // Search input
    let html = `
        <h4>Groups</h4>
        <div class="row mb-3">
            <div class="col-md-4">
                <input type="text" class="form-control" id="group-search" placeholder="Search by leader roll number">
            </div>
            <div class="col-md-2">
                <button class="btn btn-danger" id="delete-all-groups">Delete All Groups</button>
            </div>
        </div>
        <table class="table table-striped" id="groups-table">
            <thead><tr><th>Group #</th><th>Project</th><th>Leader</th><th>Leader Roll</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
    `;
    groups.forEach(g => {
        if (!g.deleted) {
            const leader = g.members.find(m => m.is_leader) || {};
            const leaderName = leader.name || '';
            const leaderRoll = leader.roll_no || '';
            const membersCount = g.members.filter(m => m.name).length;
            html += `
                <tr>
                    <td>${g.group_number}</td>
                    <td>${g.project_name || ''}</td>
                    <td>${leaderName}</td>
                    <td>${leaderRoll}</td>
                    <td>${membersCount}</td>
                    <td>${g.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-group-details" data-group='${JSON.stringify(g)}'>View</button>
                        <button class="btn btn-sm btn-warning edit-group" data-group='${JSON.stringify(g)}'>Edit</button>
                        <button class="btn btn-sm btn-danger delete-group" data-group="${g.group_number}">Delete</button>
                    </td>
                </tr>
            `;
        }
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    // Search functionality
    document.getElementById('group-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#groups-table tbody tr');
        rows.forEach(row => {
            const leaderRoll = row.cells[3].textContent.toLowerCase();
            row.style.display = leaderRoll.includes(searchTerm) ? '' : 'none';
        });
    });

    document.getElementById('delete-all-groups').addEventListener('click', async () => {
        if (confirm('Delete ALL groups? This action cannot be undone.')) {
            const reason = prompt('Reason for bulk deletion (optional):');
            await fetch(`/api/admin/groups/delete-all?reason=${encodeURIComponent(reason || '')}`, { method: 'DELETE', credentials: 'include' });
            showToast('All groups deleted');
            loadTabContent('groups');
        }
    });

    // View details modal
    document.querySelectorAll('.view-group-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = JSON.parse(e.target.dataset.group);
            let membersHtml = '<ul>';
            group.members.forEach(m => {
                membersHtml += `<li>${m.name} (${m.roll_no}) ${m.is_leader ? '👑' : ''}</li>`;
            });
            membersHtml += '</ul>';
            const modalHtml = `
                <div class="modal fade" id="viewGroupModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark text-light">
                            <div class="modal-header">
                                <h5 class="modal-title">Group ${group.group_number} Details</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p><strong>Project:</strong> ${group.project_name || 'None'}</p>
                                <p><strong>Status:</strong> ${group.status}</p>
                                <p><strong>Submission Date:</strong> ${group.submission_date || 'N/A'}</p>
                                <p><strong>Members:</strong> ${membersHtml}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const oldModal = document.getElementById('viewGroupModal');
            if (oldModal) oldModal.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('viewGroupModal'));
            modal.show();
        });
    });

    document.querySelectorAll('.edit-group').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = JSON.parse(e.target.dataset.group);
            showEditGroupModal(group, (updatedGroup) => {
                fetch(`/api/admin/groups/${group.group_number}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedGroup),
                    credentials: 'include'
                }).then(() => {
                    showToast('Group updated');
                    loadTabContent('groups');
                });
            });
        });
    });

    document.querySelectorAll('.delete-group').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const groupNum = e.target.dataset.group;
            const reason = prompt('Reason for deletion (optional):');
            if (confirm(`Delete group ${groupNum}?`)) {
                await fetch(`/api/admin/groups/${groupNum}?reason=${encodeURIComponent(reason || '')}`, { method: 'DELETE', credentials: 'include' });
                showToast('Group deleted');
                loadTabContent('groups');
            }
        });
    });
}

function showEditGroupModal(group, callback) {
    const modalHtml = `
        <div class="modal fade" id="editGroupModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Group ${group.group_number}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-group-form">
                            <div class="mb-3">
                                <label>Project Name</label>
                                <input type="text" class="form-control" name="project_name" value="${group.project_name || ''}">
                            </div>
                            <div class="mb-3">
                                <label>Status</label>
                                <select class="form-select" name="status">
                                    <option value="Not Selected" ${group.status === 'Not Selected' ? 'selected' : ''}>Not Selected</option>
                                    <option value="Submitted" ${group.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                                    <option value="Under Review" ${group.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                                    <option value="Approved" ${group.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                    <option value="Rejected" ${group.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                </select>
                            </div>
                            <h6>Members</h6>
                            <div id="members-container">
                                ${group.members.map((member, index) => `
                                    <div class="row mb-2 member-row">
                                        <div class="col-md-5">
                                            <input type="text" class="form-control" name="member_name_${index}" value="${member.name || ''}" placeholder="Name">
                                        </div>
                                        <div class="col-md-5">
                                            <input type="text" class="form-control" name="member_roll_${index}" value="${member.roll_no || ''}" placeholder="Roll Number">
                                        </div>
                                        <div class="col-md-2">
                                            <input type="checkbox" class="form-check-input" name="member_leader_${index}" ${member.is_leader ? 'checked' : ''}> Leader
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" id="add-member-row">+ Add Member</button>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-group">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const oldModal = document.getElementById('editGroupModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('editGroupModal'));
    modal.show();

    let memberCount = group.members.length;
    document.getElementById('add-member-row').addEventListener('click', () => {
        const container = document.getElementById('members-container');
        const newRow = document.createElement('div');
        newRow.className = 'row mb-2 member-row';
        newRow.innerHTML = `
            <div class="col-md-5">
                <input type="text" class="form-control" name="member_name_${memberCount}" placeholder="Name">
            </div>
            <div class="col-md-5">
                <input type="text" class="form-control" name="member_roll_${memberCount}" placeholder="Roll Number">
            </div>
            <div class="col-md-2">
                <input type="checkbox" class="form-check-input" name="member_leader_${memberCount}"> Leader
            </div>
        `;
        container.appendChild(newRow);
        memberCount++;
    });

    document.getElementById('save-group').addEventListener('click', () => {
        const form = document.getElementById('edit-group-form');
        const formData = new FormData(form);
        const updatedGroup = {
            project_name: formData.get('project_name'),
            status: formData.get('status'),
            members: []
        };
        for (let i = 0; i < memberCount; i++) {
            const name = formData.get(`member_name_${i}`);
            const roll = formData.get(`member_roll_${i}`);
            if (name || roll) {
                updatedGroup.members.push({
                    name: name || '',
                    roll_no: roll || '',
                    is_leader: formData.get(`member_leader_${i}`) === 'on'
                });
            }
        }
        modal.hide();
        callback(updatedGroup);
    });
}

// ========== ARCHIVED ==========
async function loadArchived(container) {
    const res = await fetch('/api/admin/archive', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const archives = await res.json();

    let html = `
        <h4>Archived Items</h4>
        <button class="btn btn-danger mb-3" id="delete-all-archive">Delete All Archived</button>
    `;
    if (archives.length === 0) {
        html += '<p>No archived items.</p>';
    } else {
        html += '<table class="table table-striped"><thead><tr><th>Filename</th><th>Type</th><th>Deleted At</th><th>Actions</th></tr></thead><tbody>';
        archives.forEach(a => {
            html += `
                <tr>
                    <td>${a.filename}</td>
                    <td>${a.data.data_type || 'unknown'}</td>
                    <td>${a.data.deleted_at ? formatDate(a.data.deleted_at) : ''}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-archive" data-file="${a.filename}">View</button>
                        <button class="btn btn-sm btn-danger delete-archive" data-file="${a.filename}">Delete</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
    }
    container.innerHTML = html;

    document.getElementById('delete-all-archive').addEventListener('click', async () => {
        if (confirm('Delete ALL archived items?')) {
            await fetch('/api/admin/archive/delete-all', { method: 'DELETE', credentials: 'include' });
            showToast('All archived items deleted');
            loadTabContent('archived');
        }
    });

    document.querySelectorAll('.view-archive').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const file = e.target.dataset.file;
            const archive = archives.find(a => a.filename === file);
            alert(JSON.stringify(archive.data, null, 2));
        });
    });

    document.querySelectorAll('.delete-archive').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const file = e.target.dataset.file;
            if (confirm(`Delete archive file ${file}?`)) {
                await fetch(`/api/admin/archive/${file}`, { method: 'DELETE', credentials: 'include' });
                showToast('Archive file deleted');
                loadTabContent('archived');
            }
        });
    });
}

// ========== EXPORT ==========
async function loadExport(container) {
    const [groupsRes, fileSubRes, labRes, classRes] = await Promise.all([
        fetch('/api/admin/groups', { credentials: 'include' }),
        fetch('/api/admin/file-submissions', { credentials: 'include' }),
        fetch('/api/admin/lab-manual', { credentials: 'include' }),
        fetch('/api/admin/class-assignments', { credentials: 'include' })
    ]);
    const groups = await groupsRes.json();
    const fileSubs = await fileSubRes.json();
    const lab = await labRes.json();
    const classAssign = await classRes.json();

    let previewHtml = '<h5>Data Preview</h5>';
    previewHtml += '<p>Project Allocations: ' + groups.filter(g => !g.deleted).length + ' groups</p>';
    previewHtml += '<p>File Submissions: ' + Object.keys(fileSubs).length + ' groups with files</p>';
    previewHtml += '<p>Lab Manuals: ' + lab.length + ' submissions</p>';
    previewHtml += '<p>Class Assignments: ' + classAssign.length + ' submissions</p>';

    container.innerHTML = `
        <h4>Export Data</h4>
        ${previewHtml}
        <div class="list-group">
            <a href="/api/admin/export/project-allocations" class="list-group-item list-group-item-action">Export Project Allocations (Excel)</a>
            <a href="/api/admin/export/file-submissions" class="list-group-item list-group-item-action">Export File Submissions (Excel)</a>
            <a href="/api/admin/export/lab-manual" class="list-group-item list-group-item-action">Export Lab Manual (Excel)</a>
            <a href="/api/admin/export/class-assignments" class="list-group-item list-group-item-action">Export Class Assignments (Excel)</a>
            <a href="/api/admin/export/comprehensive" class="list-group-item list-group-item-action">Export Comprehensive Report (Excel)</a>
        </div>
        <hr>
        <h5>Download All Files</h5>
        <div class="btn-group" role="group">
            <a href="/api/admin/download-all/project" class="btn btn-primary">Download All Project Files</a>
            <a href="/api/admin/download-all/lab" class="btn btn-primary">Download All Lab Manuals</a>
            <a href="/api/admin/download-all/class" class="btn btn-primary">Download All Class Assignments</a>
        </div>
    `;
}

// ========== FILE SUBMISSIONS ==========
async function loadFileSubmissions(container) {
    const res = await fetch('/api/admin/file-submissions', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const subs = await res.json();

    let html = `
        <h4>File Submissions</h4>
        <div class="row mb-3">
            <div class="col-md-4">
                <input type="text" class="form-control" id="file-sub-search" placeholder="Search by group number or leader name">
            </div>
            <div class="col-md-2">
                <button class="btn btn-danger" id="delete-all-file-subs">Delete All</button>
            </div>
        </div>
    `;
    if (Object.keys(subs).length === 0) {
        html += '<p>No submissions.</p>';
    } else {
        html += '<table class="table table-striped" id="file-sub-table"><thead><tr><th>Group</th><th>Files</th><th>Last Submission</th><th>Actions</th></tr></thead><tbody>';
        for (const [group, files] of Object.entries(subs)) {
            const last = files.length ? files[files.length-1].uploaded_at : '';
            html += `<tr>
                <td>${group}</td>
                <td>${files.length} file(s)</td>
                <td>${last ? formatDate(last) : ''}</td>
                <td>
                    <button class="btn btn-sm btn-info view-files" data-group="${group}">View</button>
                    <button class="btn btn-sm btn-danger delete-files" data-group="${group}">Delete</button>
                </td>
            </tr>`;
        }
        html += '</tbody></table>';
    }
    container.innerHTML = html;

    // Search functionality
    document.getElementById('file-sub-search')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#file-sub-table tbody tr');
        rows.forEach(row => {
            const group = row.cells[0].textContent.toLowerCase();
            row.style.display = group.includes(searchTerm) ? '' : 'none';
        });
    });

    document.getElementById('delete-all-file-subs')?.addEventListener('click', async () => {
        if (confirm('Delete ALL file submissions?')) {
            // Delete each group's files
            for (const group of Object.keys(subs)) {
                await fetch(`/api/admin/file-submissions/${group}`, { method: 'DELETE', credentials: 'include' });
            }
            showToast('All file submissions deleted');
            loadTabContent('file-submissions');
        }
    });

    document.querySelectorAll('.view-files').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = e.target.dataset.group;
            const files = subs[group];
            // Show files in a modal with download/view links
            let fileList = '<ul>';
            files.forEach(f => {
                const fileUrl = `/api/admin/download-file/project/${group}/${f.filename}`;
                fileList += `<li>${f.filename} - <a href="${fileUrl}" target="_blank">View</a> | <a href="${fileUrl}?view=0" download>Download</a></li>`;
            });
            fileList += '</ul>';
            const modalHtml = `
                <div class="modal fade" id="viewFilesModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark text-light">
                            <div class="modal-header">
                                <h5 class="modal-title">Files for Group ${group}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${fileList}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const oldModal = document.getElementById('viewFilesModal');
            if (oldModal) oldModal.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('viewFilesModal'));
            modal.show();
        });
    });

    document.querySelectorAll('.delete-files').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const group = e.target.dataset.group;
            if (confirm(`Delete all files for group ${group}?`)) {
                await fetch(`/api/admin/file-submissions/${group}`, { method: 'DELETE', credentials: 'include' });
                showToast(`Files for group ${group} deleted`);
                loadTabContent('file-submissions');
            }
        });
    });
}

// ========== LAB MANUAL ==========
async function loadLabManual(container) {
    const [labRes, configRes] = await Promise.all([
        fetch('/api/admin/lab-manual', { credentials: 'include' }),
        fetch('/api/admin/config', { credentials: 'include' })
    ]);
    if (!labRes.ok || !configRes.ok) throw new Error('Failed to load');
    const lab = await labRes.json();
    const config = await configRes.json();

    let html = `
        <h4>Lab Manual Submissions</h4>
        <div class="row mb-3">
            <div class="col-md-4">
                <input type="text" class="form-control" id="lab-search" placeholder="Search by roll number or name">
            </div>
            <div class="col-md-2">
                <button class="btn btn-danger" id="delete-all-lab">Delete All</button>
            </div>
        </div>
        <h5>Admin Upload</h5>
        <form id="admin-lab-upload" enctype="multipart/form-data" class="mb-3">
            <div class="row">
                <div class="col-md-3">
                    <input type="text" class="form-control" name="name" placeholder="Name" required>
                </div>
                <div class="col-md-3">
                    <input type="text" class="form-control" name="roll_no" placeholder="Roll Number" required>
                </div>
                <div class="col-md-4">
                    <input type="file" class="form-control" name="files" multiple required>
                </div>
                <div class="col-md-2">
                    <button type="submit" class="btn btn-primary">Upload</button>
                </div>
            </div>
        </form>
    `;
    if (lab.length === 0) {
        html += '<p>No submissions.</p>';
    } else {
        html += '<table class="table table-striped" id="lab-table"><thead><tr><th>Name</th><th>Roll No</th><th>Subject</th><th>Files</th><th>Actions</th></tr></thead><tbody>';
        lab.forEach(s => {
            html += `<tr>
                <td>${s.name}</td>
                <td>${s.roll_no}</td>
                <td>${s.subject_name}</td>
                <td>${s.files?.length || 0}</td>
                <td>
                    <button class="btn btn-sm btn-info view-lab-files" data-roll="${s.roll_no}">View</button>
                    <button class="btn btn-sm btn-danger delete-lab" data-roll="${s.roll_no}">Delete</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
    }
    container.innerHTML = html;

    // Search functionality
    document.getElementById('lab-search')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#lab-table tbody tr');
        rows.forEach(row => {
            const roll = row.cells[1].textContent.toLowerCase();
            const name = row.cells[0].textContent.toLowerCase();
            row.style.display = (roll.includes(searchTerm) || name.includes(searchTerm)) ? '' : 'none';
        });
    });

    document.getElementById('delete-all-lab')?.addEventListener('click', async () => {
        if (confirm('Delete ALL lab manual submissions?')) {
            for (const s of lab) {
                await fetch(`/api/admin/lab-manual/${s.roll_no}`, { method: 'DELETE', credentials: 'include' });
            }
            showToast('All lab manuals deleted');
            loadTabContent('lab-manual');
        }
    });

    // Admin upload
    document.getElementById('admin-lab-upload').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const res = await fetch('/api/submit/lab-manual', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (res.ok) {
            showToast('Lab manual uploaded');
            loadTabContent('lab-manual');
        } else {
            const err = await res.json();
            showToast(err.error || 'Upload failed', 'danger');
        }
    });

    document.querySelectorAll('.view-lab-files').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roll = e.target.dataset.roll;
            const submission = lab.find(s => s.roll_no === roll);
            if (submission && submission.files) {
                let fileList = '<ul>';
                submission.files.forEach(f => {
                    const fileUrl = `/api/admin/download-file/lab/${roll}/${f.filename}`;
                    fileList += `<li>${f.original_filename || f.filename} - <a href="${fileUrl}" target="_blank">View</a> | <a href="${fileUrl}?view=0" download>Download</a></li>`;
                });
                fileList += '</ul>';
                const modalHtml = `
                    <div class="modal fade" id="viewLabModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content bg-dark text-light">
                                <div class="modal-header">
                                    <h5 class="modal-title">Files for ${submission.name} (${roll})</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    ${fileList}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const oldModal = document.getElementById('viewLabModal');
                if (oldModal) oldModal.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modal = new bootstrap.Modal(document.getElementById('viewLabModal'));
                modal.show();
            }
        });
    });

    document.querySelectorAll('.delete-lab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const roll = e.target.dataset.roll;
            if (confirm(`Delete submission for ${roll}?`)) {
                await fetch(`/api/admin/lab-manual/${roll}`, { method: 'DELETE', credentials: 'include' });
                showToast(`Submission for ${roll} deleted`);
                loadTabContent('lab-manual');
            }
        });
    });
}

// ========== CLASS ASSIGNMENTS ==========
async function loadClassAssignments(container) {
    const [classRes, configRes] = await Promise.all([
        fetch('/api/admin/class-assignments', { credentials: 'include' }),
        fetch('/api/admin/config', { credentials: 'include' })
    ]);
    if (!classRes.ok || !configRes.ok) throw new Error('Failed to load');
    const assignments = await classRes.json();
    const config = await configRes.json();

    let html = `
        <h4>Class Assignments</h4>
        <div class="row mb-3">
            <div class="col-md-4">
                <input type="text" class="form-control" id="class-search" placeholder="Search by roll number or name">
            </div>
            <div class="col-md-2">
                <button class="btn btn-danger" id="delete-all-class">Delete All</button>
            </div>
        </div>
        <h5>Admin Upload</h5>
        <form id="admin-class-upload" enctype="multipart/form-data" class="mb-3">
            <div class="row">
                <div class="col-md-3">
                    <input type="text" class="form-control" name="name" placeholder="Name" required>
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control" name="roll_no" placeholder="Roll Number" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" name="assignment_no" placeholder="Assignment No" required>
                </div>
                <div class="col-md-3">
                    <input type="file" class="form-control" name="files" multiple required>
                </div>
                <div class="col-md-2">
                    <button type="submit" class="btn btn-primary">Upload</button>
                </div>
            </div>
        </form>
    `;
    if (assignments.length === 0) {
        html += '<p>No submissions.</p>';
    } else {
        html += '<table class="table table-striped" id="class-table"><thead><tr><th>Name</th><th>Roll No</th><th>Assignment</th><th>Files</th><th>Actions</th></tr></thead><tbody>';
        assignments.forEach(s => {
            html += `<tr>
                <td>${s.name}</td>
                <td>${s.roll_no}</td>
                <td>${s.assignment_no}</td>
                <td>${s.files?.length || 0}</td>
                <td>
                    <button class="btn btn-sm btn-info view-class-files" data-roll="${s.roll_no}" data-assignment="${s.assignment_no}">View</button>
                    <button class="btn btn-sm btn-danger delete-assignment" data-roll="${s.roll_no}" data-assignment="${s.assignment_no}">Delete</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
    }
    container.innerHTML = html;

    // Search functionality
    document.getElementById('class-search')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#class-table tbody tr');
        rows.forEach(row => {
            const roll = row.cells[1].textContent.toLowerCase();
            const name = row.cells[0].textContent.toLowerCase();
            row.style.display = (roll.includes(searchTerm) || name.includes(searchTerm)) ? '' : 'none';
        });
    });

    document.getElementById('delete-all-class')?.addEventListener('click', async () => {
        if (confirm('Delete ALL class assignment submissions?')) {
            for (const s of assignments) {
                await fetch(`/api/admin/class-assignments/${s.roll_no}/${s.assignment_no}`, { method: 'DELETE', credentials: 'include' });
            }
            showToast('All class assignments deleted');
            loadTabContent('class-assignments');
        }
    });

    // Admin upload
    document.getElementById('admin-class-upload').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const res = await fetch('/api/submit/class-assignment', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (res.ok) {
            showToast('Class assignment uploaded');
            loadTabContent('class-assignments');
        } else {
            const err = await res.json();
            showToast(err.error || 'Upload failed', 'danger');
        }
    });

    document.querySelectorAll('.view-class-files').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roll = e.target.dataset.roll;
            const assignment = e.target.dataset.assignment;
            const submission = assignments.find(s => s.roll_no === roll && s.assignment_no == assignment);
            if (submission && submission.files) {
                let fileList = '<ul>';
                submission.files.forEach(f => {
                    const fileUrl = `/api/admin/download-file/class/${roll}_assignment_${assignment}/${f.filename}`;
                    fileList += `<li>${f.original_filename || f.filename} - <a href="${fileUrl}" target="_blank">View</a> | <a href="${fileUrl}?view=0" download>Download</a></li>`;
                });
                fileList += '</ul>';
                const modalHtml = `
                    <div class="modal fade" id="viewClassModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content bg-dark text-light">
                                <div class="modal-header">
                                    <h5 class="modal-title">Files for ${submission.name} (${roll}) - Assignment ${assignment}</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    ${fileList}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const oldModal = document.getElementById('viewClassModal');
                if (oldModal) oldModal.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modal = new bootstrap.Modal(document.getElementById('viewClassModal'));
                modal.show();
            }
        });
    });

    document.querySelectorAll('.delete-assignment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const roll = e.target.dataset.roll;
            const assignment = e.target.dataset.assignment;
            if (confirm(`Delete assignment ${assignment} for ${roll}?`)) {
                await fetch(`/api/admin/class-assignments/${roll}/${assignment}`, { method: 'DELETE', credentials: 'include' });
                showToast(`Assignment ${assignment} for ${roll} deleted`);
                loadTabContent('class-assignments');
            }
        });
    });
}

// Change password and formatDate
async function loadChangePassword(container) {
    container.innerHTML = `
        <h4>Change Password</h4>
        <form id="change-password-form">
            <div class="mb-3">
                <label>Current Password</label>
                <input type="password" class="form-control" id="current-password" required>
            </div>
            <div class="mb-3">
                <label>New Password</label>
                <input type="password" class="form-control" id="new-password" required>
            </div>
            <div class="mb-3">
                <label>Confirm New Password</label>
                <input type="password" class="form-control" id="confirm-password" required>
            </div>
            <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
        <div id="password-result" class="mt-3"></div>
    `;
    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        if (newPass !== confirm) {
            showToast('Passwords do not match', 'danger');
            return;
        }
        const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current: current, new: newPass }),
            credentials: 'include'
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Password changed successfully');
            document.getElementById('change-password-form').reset();
        } else {
            showToast(result.error, 'danger');
        }
    });
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString();
}