import os
import json
import hashlib
import secrets
import string
import shutil
import io
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps

import pandas as pd
from flask import (
    Flask, render_template, request, jsonify, session, send_file, url_for, redirect
)
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True)

DATA_DIR = "data"
PROJECTS_FILE = os.path.join(DATA_DIR, "projects.json")
GROUPS_FILE = os.path.join(DATA_DIR, "groups.json")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")
ADMIN_CREDENTIALS_FILE = os.path.join(DATA_DIR, "admin_credentials.json")
FORM_CONTENT_FILE = os.path.join(DATA_DIR, "form_content.json")
SHORT_URLS_FILE = os.path.join(DATA_DIR, "short_urls.json")
ARCHIVE_DIR = os.path.join(DATA_DIR, "archive")
FILE_SUBMISSIONS_FILE = os.path.join(DATA_DIR, "file_submissions.json")
LAB_MANUAL_FILE = os.path.join(DATA_DIR, "lab_manual.json")
CLASS_ASSIGNMENTS_FILE = os.path.join(DATA_DIR, "class_assignments.json")
DELETED_ITEMS_FILE = os.path.join(DATA_DIR, "deleted_items.json")
DEADLINES_FILE = os.path.join(DATA_DIR, "deadlines.json")
LAB_SETTINGS_FILE = os.path.join(DATA_DIR, "lab_settings.json")
CLASS_SETTINGS_FILE = os.path.join(DATA_DIR, "class_settings.json")
FILE_SUBMISSION_SETTINGS_FILE = os.path.join(DATA_DIR, "file_submission_settings.json")
FILE_FORMAT_SETTINGS_FILE = os.path.join(DATA_DIR, "file_format_settings.json")

Path(DATA_DIR).mkdir(exist_ok=True)
Path(ARCHIVE_DIR).mkdir(parents=True, exist_ok=True)
Path(os.path.join(DATA_DIR, "submitted_files")).mkdir(exist_ok=True)
Path(os.path.join(DATA_DIR, "lab_manual")).mkdir(exist_ok=True)
Path(os.path.join(DATA_DIR, "class_assignments")).mkdir(exist_ok=True)

def init_files():
    default_config = {
        "max_members": 3,
        "next_group_number": 1,
        "form_published": True,
        "base_url": "http://localhost:5000",
        "form_mode": "project_allocation",
        "allow_allocation_edit": False,
        "project_file_submission_open": False,
        "lab_manual_open": False,
        "lab_file_upload_required": False,
        "class_assignment_open": False,
        "course_name": "",
        "lab_subject_name": "",
        "current_assignment_no": 1,
        "project_allocation_project_optional": False,
        "tab_visibility": {
            "project_allocation": {"form": True, "allocations": True, "instructions": True},
            "project_file_submission": {"form": True, "allocations": True, "instructions": True},
            "lab_manual": {"form": True, "instructions": True},
            "class_assignment": {"form": True, "instructions": True}
        }
    }
    default_admin = {
        "username": "admin",
        "password_hash": hashlib.sha256("password123".encode()).hexdigest()
    }
    default_form_content = {
        "cover_page": {"enabled": True, "title": "🎓 Project Allocation", "content": "",
                       "background_color": "#1f2937", "text_color": "#e5e7eb"},
        "form_header": {
            "title": "Project Selection Form",
            "description": "Please fill in all required fields...",
            "show_deadline": False,
            "deadline": "",
            "show_contact": True,
            "contact_email": "coal@university.edu"
        },
        "instructions": {
            "enabled": True,
            "title": "ℹ️ Instructions & Guidelines",
            "content": "Default instructions...",
            "additional_notes": "",
            "visibility": {
                "project_allocation": True,
                "project_file_submission": True,
                "lab_manual": True,
                "class_assignment": True
            }
        }
    }
    default_deadlines = {
        "project_allocation": {"enabled": False, "datetime": "", "message": ""},
        "project_file_submission": {"enabled": False, "datetime": "", "message": ""},
        "lab_manual": {"enabled": False, "datetime": "", "message": ""},
        "class_assignment": {"enabled": False, "datetime": "", "message": ""}
    }
    default_lab_settings = {"max_size_mb": 5, "max_files": 1}
    default_class_settings = {"max_size_mb": 10, "max_files": 3}
    default_file_submission_settings = {
        "max_size_mb": 10,
        "max_files": 5,
        "allow_multiple_submissions": False,
        "instructions": "Please upload your project files in the specified formats."
    }
    default_file_format_settings = [
        ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".zip", ".rar"
    ]

    files = [
        (PROJECTS_FILE, []),
        (GROUPS_FILE, []),
        (CONFIG_FILE, default_config),
        (ADMIN_CREDENTIALS_FILE, default_admin),
        (FORM_CONTENT_FILE, default_form_content),
        (SHORT_URLS_FILE, {}),
        (FILE_SUBMISSIONS_FILE, {}),
        (LAB_MANUAL_FILE, []),
        (CLASS_ASSIGNMENTS_FILE, []),
        (DELETED_ITEMS_FILE, []),
        (DEADLINES_FILE, default_deadlines),
        (LAB_SETTINGS_FILE, default_lab_settings),
        (CLASS_SETTINGS_FILE, default_class_settings),
        (FILE_SUBMISSION_SETTINGS_FILE, default_file_submission_settings),
        (FILE_FORMAT_SETTINGS_FILE, default_file_format_settings)
    ]
    for file_path, default_data in files:
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                json.dump(default_data, f, indent=4)

init_files()

# Helper functions
def load_data(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def save_data(data, file_path):
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
        return True
    except:
        return False

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def sanitize_filename(name):
    if not name:
        return "unknown"
    invalid_chars = '<>:"/\\|?*'
    for ch in invalid_chars:
        name = name.replace(ch, '_')
    name = name.replace(' ', '_')
    name = ''.join(c for c in name if c.isalnum() or c in ['_', '-', '.'])
    if not name:
        name = 'unknown'
    if len(name) > 100:
        name = name[:100]
    return name

def generate_short_code(length=8):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def archive_data(data_type, data, reason=""):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_deleted_{timestamp}.json"
    filepath = os.path.join(ARCHIVE_DIR, filename)
    record = {
        "data_type": data_type,
        "deleted_data": data,
        "deleted_at": datetime.now().isoformat(),
        "deleted_by": "admin",
        "reason": reason
    }
    try:
        with open(filepath, 'w') as f:
            json.dump(record, f, indent=4)
        return filepath
    except:
        return None

def add_to_deleted_items(item_type, item_data, reason=""):
    deleted = load_data(DELETED_ITEMS_FILE) or []
    deleted.append({
        "id": str(len(deleted)+1).zfill(3),
        "type": item_type,
        "data": item_data,
        "deleted_at": datetime.now().isoformat(),
        "reason": reason
    })
    save_data(deleted, DELETED_ITEMS_FILE)

def check_deadline(form_type):
    deadlines = load_data(DEADLINES_FILE) or {}
    d = deadlines.get(form_type, {})
    if not d.get("enabled") or not d.get("datetime"):
        return {"open": True, "message": None}
    try:
        deadline = datetime.fromisoformat(d["datetime"])
        now = datetime.now()
        if now <= deadline:
            delta = deadline - now
            hours = delta.total_seconds() / 3600
            if hours < 24:
                msg = f"⏰ Submission closes in {int(hours)} hours"
            else:
                msg = f"⏰ Submission closes in {int(hours/24)} days"
            return {"open": True, "message": msg, "deadline": deadline}
        else:
            return {"open": False, "message": f"⛔ Submission deadline has passed ({deadline.strftime('%Y-%m-%d %H:%M')})"}
    except:
        return {"open": True, "message": None}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Frontend routes
@app.route('/')
def index():
    short_code = request.args.get('short')
    if short_code:
        short_urls = load_data(SHORT_URLS_FILE) or {}
        if short_code in short_urls:
            short_urls[short_code]['clicks'] = short_urls[short_code].get('clicks', 0) + 1
            short_urls[short_code]['last_accessed'] = datetime.now().isoformat()
            save_data(short_urls, SHORT_URLS_FILE)
            return render_template('student_form.html', short_url_mode=True)
        else:
            return render_template('student_form.html', error="Invalid short URL", short_url_mode=True)
    return render_template('student_form.html', short_url_mode=False)

@app.route('/admin/login')
def admin_login_page():
    return render_template('admin_login.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login_page'))
    return render_template('admin_dashboard.html')

# API endpoints
@app.route('/api/config', methods=['GET'])
def get_config():
    config = load_data(CONFIG_FILE) or {}
    return jsonify(config)

@app.route('/api/form-content', methods=['GET'])
def get_form_content():
    content = load_data(FORM_CONTENT_FILE) or {}
    return jsonify(content)

@app.route('/api/deadline/<form_type>', methods=['GET'])
def get_deadline(form_type):
    return jsonify(check_deadline(form_type))

@app.route('/api/projects/available', methods=['GET'])
def get_available_projects():
    projects = load_data(PROJECTS_FILE)
    if not isinstance(projects, list):
        projects = []
    available = [p for p in projects if p.get('status') == 'Not Selected' and not p.get('deleted')]
    return jsonify(available)

@app.route('/api/groups/allocations', methods=['GET'])
def get_allocations():
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    active = [g for g in groups if not g.get('deleted')]
    return jsonify(active)

@app.route('/api/group/verify', methods=['POST'])
def verify_group():
    data = request.json
    group_num = data.get('group_number')
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    group = next((g for g in groups if g['group_number'] == group_num and not g.get('deleted')), None)
    if group:
        leader = next((m for m in group['members'] if m.get('is_leader')), {})
        return jsonify({
            'exists': True,
            'group_number': group_num,
            'project_name': group.get('project_name', ''),
            'leader_name': leader.get('name', ''),
            'has_submitted': bool(group.get('files_submitted'))
        })
    return jsonify({'exists': False}), 404

# Submission endpoints (using unified formats)
@app.route('/api/submit/project-allocation', methods=['POST'])
def submit_project_allocation():
    data = request.json
    config = load_data(CONFIG_FILE) or {}
    deadline_check = check_deadline("project_allocation")
    if not deadline_check["open"]:
        return jsonify({'error': deadline_check['message']}), 403

    members = data.get('members', [])
    if not members or not members[0].get('name') or not members[0].get('roll_no'):
        return jsonify({'error': 'Group leader details required'}), 400

    rolls = [m['roll_no'] for m in members if m['roll_no'].strip()]
    if len(rolls) != len(set(rolls)):
        return jsonify({'error': 'Duplicate roll numbers within group'}), 400

    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    existing_rolls = set()
    for g in groups:
        if not g.get('deleted'):
            for m in g['members']:
                existing_rolls.add(m['roll_no'])
    for r in rolls:
        if r in existing_rolls:
            return jsonify({'error': f'Roll number {r} already registered'}), 400

    project_optional = config.get('project_allocation_project_optional', False)
    project_name = data.get('project_name')
    if not project_optional and not project_name:
        return jsonify({'error': 'Project selection required'}), 400

    if project_name:
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        proj = next((p for p in projects if p['name'] == project_name and not p.get('deleted')), None)
        if not proj or proj.get('status') != 'Not Selected':
            return jsonify({'error': 'Project no longer available'}), 400

    next_group = config.get('next_group_number', 1)
    new_group = {
        "group_number": next_group,
        "project_name": project_name or "",
        "status": "Submitted",
        "members": members,
        "submission_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "submission_timestamp": datetime.now().isoformat(),
        "deleted": False,
        "files_submitted": False
    }
    groups.append(new_group)
    save_data(groups, GROUPS_FILE)

    if project_name:
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        for p in projects:
            if p['name'] == project_name:
                p['status'] = 'Submitted'
                p['selected_by_group'] = next_group
                p['selected_at'] = datetime.now().isoformat()
                break
        save_data(projects, PROJECTS_FILE)

    config['next_group_number'] = next_group + 1
    save_data(config, CONFIG_FILE)

    return jsonify({'success': True, 'group_number': next_group})

@app.route('/api/submit/project-files', methods=['POST'])
def submit_project_files():
    group_num = request.form.get('group_number')
    files = request.files.getlist('files')
    if not group_num or not files:
        return jsonify({'error': 'Missing group number or files'}), 400

    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    group = next((g for g in groups if str(g['group_number']) == group_num and not g.get('deleted')), None)
    if not group:
        return jsonify({'error': 'Invalid group number'}), 404

    deadline_check = check_deadline("project_file_submission")
    if not deadline_check["open"]:
        return jsonify({'error': deadline_check['message']}), 403

    allowed_formats = load_data(FILE_FORMAT_SETTINGS_FILE) or []
    file_settings = load_data(FILE_SUBMISSION_SETTINGS_FILE) or {}
    max_size_mb = file_settings.get('max_size_mb', 10)
    max_files = file_settings.get('max_files', 5)
    allow_multiple = file_settings.get('allow_multiple_submissions', False)

    existing = file_settings.get(str(group_num), [])
    if existing and not allow_multiple:
        return jsonify({'error': 'Multiple submissions not allowed'}), 403

    if len(files) > max_files:
        return jsonify({'error': f'Max {max_files} files allowed'}), 400

    max_bytes = max_size_mb * 1024 * 1024
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in allowed_formats:
            return jsonify({'error': f'File type {ext} not allowed. Allowed: {", ".join(allowed_formats)}'}), 400
        if f.content_length > max_bytes:
            return jsonify({'error': f'File {f.filename} exceeds {max_size_mb}MB'}), 400

    saved_files = []
    group_dir = os.path.join(DATA_DIR, "submitted_files", str(group_num))
    Path(group_dir).mkdir(parents=True, exist_ok=True)

    for f in files:
        filename = sanitize_filename(f.filename)
        filepath = os.path.join(group_dir, filename)
        f.save(filepath)
        saved_files.append({
            'filename': filename,
            'size': os.path.getsize(filepath),
            'uploaded_at': datetime.now().isoformat()
        })

    file_submissions = load_data(FILE_SUBMISSIONS_FILE) or {}
    if str(group_num) not in file_submissions:
        file_submissions[str(group_num)] = []
    file_submissions[str(group_num)].extend(saved_files)
    save_data(file_submissions, FILE_SUBMISSIONS_FILE)

    group['files_submitted'] = True
    save_data(groups, GROUPS_FILE)

    return jsonify({'success': True, 'files': saved_files})

@app.route('/api/submit/lab-manual', methods=['POST'])
def submit_lab_manual():
    name = request.form.get('name')
    roll_no = request.form.get('roll_no')
    files = request.files.getlist('files')
    if not name or not roll_no:
        return jsonify({'error': 'Name and roll number required'}), 400

    deadline_check = check_deadline("lab_manual")
    if not deadline_check["open"]:
        return jsonify({'error': deadline_check['message']}), 403

    allowed_formats = load_data(FILE_FORMAT_SETTINGS_FILE) or []
    lab_settings = load_data(LAB_SETTINGS_FILE) or {}
    max_size_mb = lab_settings.get('max_size_mb', 5)
    max_files = lab_settings.get('max_files', 1)
    file_required = (load_data(CONFIG_FILE) or {}).get('lab_file_upload_required', False)

    if file_required and not files:
        return jsonify({'error': 'File upload required'}), 400

    if len(files) > max_files:
        return jsonify({'error': f'Max {max_files} file(s) allowed'}), 400
    max_bytes = max_size_mb * 1024 * 1024
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in allowed_formats:
            return jsonify({'error': f'File type {ext} not allowed. Allowed: {", ".join(allowed_formats)}'}), 400
        if f.content_length > max_bytes:
            return jsonify({'error': f'File {f.filename} exceeds {max_size_mb}MB'}), 400

    lab_manual = load_data(LAB_MANUAL_FILE)
    if not isinstance(lab_manual, list):
        lab_manual = []
    if any(s['roll_no'] == roll_no for s in lab_manual):
        return jsonify({'error': 'Roll number already submitted'}), 400

    saved_files = []
    if files:
        lab_dir = os.path.join(DATA_DIR, "lab_manual", sanitize_filename(roll_no))
        Path(lab_dir).mkdir(parents=True, exist_ok=True)
        for f in files:
            filename = sanitize_filename(f.filename)
            filepath = os.path.join(lab_dir, filename)
            f.save(filepath)
            saved_files.append({
                'filename': filename,
                'original_filename': f.filename,
                'size': os.path.getsize(filepath)
            })

    submission = {
        'name': name,
        'roll_no': roll_no,
        'subject_name': (load_data(CONFIG_FILE) or {}).get('lab_subject_name', ''),
        'submission_date': datetime.now().isoformat(),
        'status': 'Submitted',
        'files': saved_files
    }
    lab_manual.append(submission)
    save_data(lab_manual, LAB_MANUAL_FILE)

    return jsonify({'success': True})

@app.route('/api/submit/class-assignment', methods=['POST'])
def submit_class_assignment():
    name = request.form.get('name')
    roll_no = request.form.get('roll_no')
    assignment_no = request.form.get('assignment_no', type=int)
    files = request.files.getlist('files')
    if not name or not roll_no or not assignment_no:
        return jsonify({'error': 'Name, roll number, and assignment number required'}), 400

    deadline_check = check_deadline("class_assignment")
    if not deadline_check["open"]:
        return jsonify({'error': deadline_check['message']}), 403

    allowed_formats = load_data(FILE_FORMAT_SETTINGS_FILE) or []
    class_settings = load_data(CLASS_SETTINGS_FILE) or {}
    max_size_mb = class_settings.get('max_size_mb', 10)
    max_files = class_settings.get('max_files', 3)

    if not files:
        return jsonify({'error': 'At least one file required'}), 400
    if len(files) > max_files:
        return jsonify({'error': f'Max {max_files} files allowed'}), 400
    max_bytes = max_size_mb * 1024 * 1024
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in allowed_formats:
            return jsonify({'error': f'File type {ext} not allowed. Allowed: {", ".join(allowed_formats)}'}), 400
        if f.content_length > max_bytes:
            return jsonify({'error': f'File {f.filename} exceeds {max_size_mb}MB'}), 400

    assignments = load_data(CLASS_ASSIGNMENTS_FILE)
    if not isinstance(assignments, list):
        assignments = []
    if any(s['roll_no'] == roll_no and s['assignment_no'] == assignment_no for s in assignments):
        return jsonify({'error': 'Already submitted this assignment'}), 400

    saved_files = []
    class_dir = os.path.join(DATA_DIR, "class_assignments", f"{sanitize_filename(roll_no)}_assignment_{assignment_no}")
    Path(class_dir).mkdir(parents=True, exist_ok=True)
    for f in files:
        filename = sanitize_filename(f.filename)
        filepath = os.path.join(class_dir, filename)
        f.save(filepath)
        saved_files.append({
            'filename': filename,
            'original_filename': f.filename,
            'size': os.path.getsize(filepath),
            'file_type': f.content_type
        })

    submission = {
        'name': name,
        'roll_no': roll_no,
        'course_name': (load_data(CONFIG_FILE) or {}).get('course_name', ''),
        'assignment_no': assignment_no,
        'submission_date': datetime.now().isoformat(),
        'status': 'Submitted',
        'files': saved_files
    }
    assignments.append(submission)
    save_data(assignments, CLASS_ASSIGNMENTS_FILE)

    return jsonify({'success': True})

# Admin authentication
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    admin_data = load_data(ADMIN_CREDENTIALS_FILE)
    if not admin_data:
        return jsonify({'error': 'No admin user'}), 500
    if admin_data['username'] == username and admin_data['password_hash'] == hash_password(password):
        session['admin_logged_in'] = True
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({'success': True})

@app.route('/api/admin/check-session')
def check_session():
    if session.get('admin_logged_in'):
        return jsonify({'logged_in': True})
    return jsonify({'logged_in': False}), 401

@app.route('/api/admin/change-password', methods=['POST'])
@login_required
def admin_change_password():
    data = request.json
    current = data.get('current')
    new = data.get('new')
    admin_data = load_data(ADMIN_CREDENTIALS_FILE)
    if admin_data['password_hash'] != hash_password(current):
        return jsonify({'error': 'Current password incorrect'}), 400
    if len(new) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    admin_data['password_hash'] = hash_password(new)
    save_data(admin_data, ADMIN_CREDENTIALS_FILE)
    return jsonify({'success': True})

# Admin data endpoints
@app.route('/api/admin/projects', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
def admin_projects():
    if request.method == 'GET':
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        return jsonify(projects)
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Project name required'}), 400
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        if any(p['name'] == name and not p.get('deleted') for p in projects):
            return jsonify({'error': 'Project already exists'}), 400
        projects.append({
            'name': name,
            'status': data.get('status', 'Not Selected'),
            'selected_by': 0,
            'created_at': datetime.now().isoformat(),
            'deleted': False
        })
        save_data(projects, PROJECTS_FILE)
        return jsonify({'success': True})
    elif request.method == 'PUT':
        data = request.json
        old_name = data.get('old_name')
        new_name = data.get('new_name')
        new_status = data.get('status')
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        for p in projects:
            if p['name'] == old_name:
                p['name'] = new_name
                p['status'] = new_status
                p['updated_at'] = datetime.now().isoformat()
                break
        save_data(projects, PROJECTS_FILE)
        return jsonify({'success': True})
    elif request.method == 'DELETE':
        name = request.args.get('name')
        projects = load_data(PROJECTS_FILE)
        if not isinstance(projects, list):
            projects = []
        for p in projects:
            if p['name'] == name:
                p['deleted'] = True
                p['deleted_at'] = datetime.now().isoformat()
                break
        save_data(projects, PROJECTS_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/short-urls', methods=['GET'])
@login_required
def get_short_urls():
    short_urls = load_data(SHORT_URLS_FILE) or {}
    return jsonify(short_urls)

@app.route('/api/admin/short-urls', methods=['POST'])
@login_required
def create_short_url():
    short_urls = load_data(SHORT_URLS_FILE) or {}
    short_code = generate_short_code()
    base_url = (load_data(CONFIG_FILE) or {}).get('base_url', 'http://localhost:5000')
    full_url = f"{base_url}/?short={short_code}"
    short_urls[short_code] = {
        'url': full_url,
        'created_at': datetime.now().isoformat(),
        'clicks': 0,
        'last_accessed': None
    }
    save_data(short_urls, SHORT_URLS_FILE)
    return jsonify({'success': True, 'short_code': short_code})

@app.route('/api/admin/short-urls/<code>', methods=['DELETE'])
@login_required
def delete_short_url(code):
    short_urls = load_data(SHORT_URLS_FILE) or {}
    if code in short_urls:
        archive_data('short_url', short_urls[code], 'Admin deleted short URL')
        del short_urls[code]
        save_data(short_urls, SHORT_URLS_FILE)
        return jsonify({'success': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/admin/config', methods=['GET', 'PUT'])
@login_required
def admin_config():
    config = load_data(CONFIG_FILE) or {}
    if request.method == 'GET':
        return jsonify(config)
    elif request.method == 'PUT':
        new_config = request.json
        if 'max_members' in new_config:
            new_config['max_members'] = int(new_config['max_members'])
        config.update(new_config)
        save_data(config, CONFIG_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/form-content', methods=['GET', 'PUT'])
@login_required
def admin_form_content():
    content = load_data(FORM_CONTENT_FILE) or {}
    if request.method == 'GET':
        return jsonify(content)
    elif request.method == 'PUT':
        new_content = request.json
        content.update(new_content)
        save_data(content, FORM_CONTENT_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/deadlines', methods=['GET', 'PUT'])
@login_required
def admin_deadlines():
    deadlines = load_data(DEADLINES_FILE) or {}
    if request.method == 'GET':
        return jsonify(deadlines)
    elif request.method == 'PUT':
        new_deadlines = request.json
        for key, value in new_deadlines.items():
            if key in deadlines and isinstance(deadlines[key], dict) and isinstance(value, dict):
                deadlines[key].update(value)
            else:
                deadlines[key] = value
        save_data(deadlines, DEADLINES_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/groups', methods=['GET'])
@login_required
def get_groups():
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    return jsonify(groups)

@app.route('/api/admin/groups/<int:group_num>', methods=['PUT'])
@login_required
def update_group(group_num):
    data = request.json
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    for g in groups:
        if g['group_number'] == group_num and not g.get('deleted'):
            if 'project_name' in data:
                g['project_name'] = data['project_name']
            if 'status' in data:
                g['status'] = data['status']
            if 'members' in data:
                g['members'] = data['members']
            g['updated_at'] = datetime.now().isoformat()
            save_data(groups, GROUPS_FILE)
            return jsonify({'success': True})
    return jsonify({'error': 'Group not found'}), 404

@app.route('/api/admin/groups/<int:group_num>', methods=['DELETE'])
@login_required
def delete_group(group_num):
    reason = request.args.get('reason', '')
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    for g in groups:
        if g['group_number'] == group_num and not g.get('deleted'):
            archive_data('group', g, reason)
            g['deleted'] = True
            g['deleted_at'] = datetime.now().isoformat()
            g['deleted_reason'] = reason
            if g.get('project_name'):
                projects = load_data(PROJECTS_FILE)
                if not isinstance(projects, list):
                    projects = []
                for p in projects:
                    if p['name'] == g['project_name']:
                        p['status'] = 'Not Selected'
                        p['selected_by'] = max(0, p.get('selected_by', 0) - 1)
                        break
                save_data(projects, PROJECTS_FILE)
            save_data(groups, GROUPS_FILE)
            return jsonify({'success': True})
    return jsonify({'error': 'Group not found'}), 404

@app.route('/api/admin/archive', methods=['GET'])
@login_required
def get_archive():
    try:
        files = os.listdir(ARCHIVE_DIR)
        archives = []
        for f in files:
            if f.endswith('.json'):
                with open(os.path.join(ARCHIVE_DIR, f), 'r') as fp:
                    data = json.load(fp)
                archives.append({
                    'filename': f,
                    'data': data,
                    'modified': datetime.fromtimestamp(os.path.getmtime(os.path.join(ARCHIVE_DIR, f))).isoformat()
                })
        return jsonify(archives)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/archive/<filename>', methods=['DELETE'])
@login_required
def delete_archive_file(filename):
    try:
        os.remove(os.path.join(ARCHIVE_DIR, filename))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/file-submissions', methods=['GET'])
@login_required
def get_file_submissions():
    submissions = load_data(FILE_SUBMISSIONS_FILE) or {}
    return jsonify(submissions)

@app.route('/api/admin/file-submissions/<group>', methods=['DELETE'])
@login_required
def delete_file_submissions(group):
    submissions = load_data(FILE_SUBMISSIONS_FILE) or {}
    if group in submissions:
        archive_data('file_submissions', {group: submissions[group]}, 'Admin deleted')
        del submissions[group]
        save_data(submissions, FILE_SUBMISSIONS_FILE)
        group_dir = os.path.join(DATA_DIR, "submitted_files", group)
        if os.path.exists(group_dir):
            shutil.rmtree(group_dir)
        return jsonify({'success': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/admin/lab-manual', methods=['GET'])
@login_required
def get_lab_manual():
    lab = load_data(LAB_MANUAL_FILE)
    if not isinstance(lab, list):
        lab = []
    return jsonify(lab)

@app.route('/api/admin/lab-manual/<roll>', methods=['DELETE'])
@login_required
def delete_lab_manual(roll):
    lab = load_data(LAB_MANUAL_FILE)
    if not isinstance(lab, list):
        lab = []
    for i, s in enumerate(lab):
        if s['roll_no'] == roll:
            archive_data('lab_manual', s, 'Admin deleted')
            del lab[i]
            save_data(lab, LAB_MANUAL_FILE)
            lab_dir = os.path.join(DATA_DIR, "lab_manual", sanitize_filename(roll))
            if os.path.exists(lab_dir):
                shutil.rmtree(lab_dir)
            return jsonify({'success': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/admin/class-assignments', methods=['GET'])
@login_required
def get_class_assignments():
    assignments = load_data(CLASS_ASSIGNMENTS_FILE)
    if not isinstance(assignments, list):
        assignments = []
    return jsonify(assignments)

@app.route('/api/admin/class-assignments/<roll>/<int:assignment>', methods=['DELETE'])
@login_required
def delete_class_assignment(roll, assignment):
    assignments = load_data(CLASS_ASSIGNMENTS_FILE)
    if not isinstance(assignments, list):
        assignments = []
    for i, s in enumerate(assignments):
        if s['roll_no'] == roll and s['assignment_no'] == assignment:
            archive_data('class_assignment', s, 'Admin deleted')
            del assignments[i]
            save_data(assignments, CLASS_ASSIGNMENTS_FILE)
            class_dir = os.path.join(DATA_DIR, "class_assignments", f"{sanitize_filename(roll)}_assignment_{assignment}")
            if os.path.exists(class_dir):
                shutil.rmtree(class_dir)
            return jsonify({'success': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/admin/download-file/<file_type>/<path:filepath>', methods=['GET'])
@login_required
def download_file(file_type, filepath):
    base_dirs = {
        'project': os.path.join(DATA_DIR, 'submitted_files'),
        'lab': os.path.join(DATA_DIR, 'lab_manual'),
        'class': os.path.join(DATA_DIR, 'class_assignments')
    }
    if file_type not in base_dirs:
        return jsonify({'error': 'Invalid file type'}), 400
    full_path = os.path.join(base_dirs[file_type], filepath)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found'}), 404
    as_attachment = request.args.get('view', '0') == '0'
    return send_file(full_path, as_attachment=as_attachment)

@app.route('/api/admin/download-all/<file_type>', methods=['GET'])
@login_required
def download_all_files(file_type):
    base_dirs = {
        'project': os.path.join(DATA_DIR, 'submitted_files'),
        'lab': os.path.join(DATA_DIR, 'lab_manual'),
        'class': os.path.join(DATA_DIR, 'class_assignments')
    }
    if file_type not in base_dirs:
        return jsonify({'error': 'Invalid file type'}), 400
    base_dir = base_dirs[file_type]
    if not os.path.exists(base_dir):
        return jsonify({'error': 'No files'}), 404

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, base_dir)
                zip_file.write(file_path, arcname)
    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=f'{file_type}_files_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip',
        mimetype='application/zip'
    )

@app.route('/api/admin/groups/delete-all', methods=['DELETE'])
@login_required
def delete_all_groups():
    reason = request.args.get('reason', 'Bulk delete')
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    for g in groups:
        if not g.get('deleted'):
            archive_data('group', g, reason)
    save_data([], GROUPS_FILE)
    projects = load_data(PROJECTS_FILE)
    if isinstance(projects, list):
        for p in projects:
            p['status'] = 'Not Selected'
            p['selected_by'] = 0
        save_data(projects, PROJECTS_FILE)
    return jsonify({'success': True})

@app.route('/api/admin/archive/delete-all', methods=['DELETE'])
@login_required
def delete_all_archive():
    try:
        for filename in os.listdir(ARCHIVE_DIR):
            filepath = os.path.join(ARCHIVE_DIR, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/lab-settings', methods=['GET', 'PUT'])
@login_required
def admin_lab_settings():
    settings = load_data(LAB_SETTINGS_FILE) or {}
    if request.method == 'GET':
        return jsonify(settings)
    elif request.method == 'PUT':
        new_settings = request.json
        if 'allowed_formats' in new_settings:
            del new_settings['allowed_formats']
        settings.update(new_settings)
        save_data(settings, LAB_SETTINGS_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/class-settings', methods=['GET', 'PUT'])
@login_required
def admin_class_settings():
    settings = load_data(CLASS_SETTINGS_FILE) or {}
    if request.method == 'GET':
        return jsonify(settings)
    elif request.method == 'PUT':
        new_settings = request.json
        if 'allowed_formats' in new_settings:
            del new_settings['allowed_formats']
        settings.update(new_settings)
        save_data(settings, CLASS_SETTINGS_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/project-file-settings', methods=['GET', 'PUT'])
@login_required
def admin_project_file_settings():
    settings = load_data(FILE_SUBMISSION_SETTINGS_FILE) or {}
    if request.method == 'GET':
        return jsonify(settings)
    elif request.method == 'PUT':
        new_settings = request.json
        if 'allowed_formats' in new_settings:
            del new_settings['allowed_formats']
        settings.update(new_settings)
        save_data(settings, FILE_SUBMISSION_SETTINGS_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/file-format-settings', methods=['GET', 'PUT'])
@login_required
def admin_file_format_settings():
    settings = load_data(FILE_FORMAT_SETTINGS_FILE) or []
    if request.method == 'GET':
        return jsonify(settings)
    elif request.method == 'PUT':
        new_settings = request.json
        if not isinstance(new_settings, list):
            return jsonify({'error': 'Invalid data, expected list'}), 400
        save_data(new_settings, FILE_FORMAT_SETTINGS_FILE)
        return jsonify({'success': True})

@app.route('/api/admin/export/project-allocations', methods=['GET'])
@login_required
def export_project_allocations():
    groups = load_data(GROUPS_FILE)
    if not isinstance(groups, list):
        groups = []
    active = [g for g in groups if not g.get('deleted')]
    config = load_data(CONFIG_FILE) or {}
    max_members = config.get('max_members', 3)

    data = []
    for g in active:
        row = {
            'Group Number': g['group_number'],
            'Project': g.get('project_name', ''),
            'Status': g['status'],
            'Submission Date': g.get('submission_date', '')
        }
        for i, m in enumerate(g['members'], 1):
            row[f'Member {i} Name'] = m.get('name', '')
            row[f'Member {i} Roll'] = m.get('roll_no', '')
        data.append(row)

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Allocations')
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name=f'project_allocations_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@app.route('/api/admin/export/file-submissions', methods=['GET'])
@login_required
def export_file_submissions():
    return jsonify({'message': 'Not implemented'}), 501

@app.route('/api/admin/export/lab-manual', methods=['GET'])
@login_required
def export_lab_manual():
    return jsonify({'message': 'Not implemented'}), 501

@app.route('/api/admin/export/class-assignments', methods=['GET'])
@login_required
def export_class_assignments():
    return jsonify({'message': 'Not implemented'}), 501

@app.route('/api/admin/export/comprehensive', methods=['GET'])
@login_required
def export_comprehensive():
    return jsonify({'message': 'Not implemented'}), 501

@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)