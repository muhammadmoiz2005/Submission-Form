// main.js – common functions

// Update sidebar navigation based on login status
async function updateSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;

    // Check if admin is logged in
    try {
        const res = await fetch('/api/admin/check-session');
        const isAdmin = res.ok;
        if (isAdmin) {
            // Admin sidebar: show admin dashboard link and logout
            sidebarNav.innerHTML = `
                <li class="nav-item"><a class="nav-link" href="/admin/dashboard">📊 Admin Dashboard</a></li>
                <li class="nav-item"><a class="nav-link" href="#" id="sidebar-logout">🚪 Logout</a></li>
            `;
            document.getElementById('sidebar-logout')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await fetch('/api/admin/logout', { method: 'POST' });
                window.location.href = '/';
            });
        } else {
            // Public sidebar
            // Hide admin login link if short URL parameter exists
            const hideAdmin = window.location.search.includes('short=');
            sidebarNav.innerHTML = `
                <li class="nav-item"><a class="nav-link" href="/">📝 Student Form</a></li>
                ${hideAdmin ? '' : '<li class="nav-item"><a class="nav-link" href="/admin/login">🔐 Admin Login</a></li>'}
            `;
        }
    } catch {
        // Fallback to public
        sidebarNav.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="/">📝 Student Form</a></li>
            <li class="nav-item"><a class="nav-link" href="/admin/login">🔐 Admin Login</a></li>
        `;
    }
}

// Format date to local string
function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString();
}

// Show a toast message (simple alert for now)
function showToast(message, type = 'success') {
    alert(message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', updateSidebar);