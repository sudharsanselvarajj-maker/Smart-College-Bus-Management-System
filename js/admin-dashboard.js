// Frontend-only admin dashboard logic (no backend).
// Updated: ensure DOM is ready before accessing elements or seeding data.
// Updated: clicking Logout now redirects to index.html (as requested).
// All data stored in localStorage for demo purposes.

(function () {
  function run() {
    const LS_KEYS = {
      STUDENTS: 'sb_students_v1',
      BUSES: 'sb_buses_v1',
      COMPLAINTS: 'sb_complaints_v1',
      ROLE: 'sb_role_v1',
      TOKEN: 'sb_token_v1',
      NOTIFICATIONS: 'sb_notifications_v1'
    };
    const PAGE_SIZE = 8;

    // Basic "protect" behavior: if no admin role found, seed demo data and set role
    function protectPage(role = 'admin') {
      const storedRole = localStorage.getItem(LS_KEYS.ROLE);
      if (storedRole !== role) {
        seedDemoData();
        localStorage.setItem(LS_KEYS.ROLE, role);
        localStorage.setItem(LS_KEYS.TOKEN, 'demo-token');
        showToast('Demo mode: admin session created (frontend-only).');
      }
      return true;
    }

    // Elements (grab after DOM ready)
    const toastContainer = document.getElementById('toastContainer');
    const logoutBtn = document.getElementById('logoutBtn');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const notifyDefaultersBtn = document.getElementById('notifyDefaultersBtn');

    // App state
    let students = [];
    let buses = [];
    let complaints = [];
    let notifications = [];
    let studentPage = 1;
    let studentSearchTerm = '';

    // Utility helpers
    function uid(prefix = '') {
      return prefix + Math.random().toString(36).slice(2, 9);
    }
    function nowISO() {
      return new Date().toISOString();
    }
    function escapeHtml(s = '') {
      return String(s).replace(/[&<>"'`=\/]/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
      });
    }
    function showToast(message, opts = {}) {
      // Defensive: if toastContainer isn't present, fallback to console.log
      if (!toastContainer) {
        // small visual fallback: alert could be intrusive; use console
        console.log('Toast:', message);
        return;
      }
      const el = document.createElement('div');
      el.className = 'toast align-items-center text-bg-white border shadow-sm';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('aria-atomic', 'true');
      el.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;
      toastContainer.appendChild(el);
      const t = new bootstrap.Toast(el, { delay: opts.delay || 3500 });
      t.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
    }

    // Seed demo data if none present
    function seedDemoData() {
      if (!localStorage.getItem(LS_KEYS.BUSES)) {
        const demoBuses = [
          { id: uid('b_'), bus_number: 'BUS-101', route: 'North — Central', capacity: 40, incharge_name: 'Mr. Ramesh' },
          { id: uid('b_'), bus_number: 'BUS-102', route: 'East — West', capacity: 35, incharge_name: 'Ms. Priya' },
          { id: uid('b_'), bus_number: 'BUS-103', route: 'South — North', capacity: 45, incharge_name: '' }
        ];
        localStorage.setItem(LS_KEYS.BUSES, JSON.stringify(demoBuses));
      }
      if (!localStorage.getItem(LS_KEYS.STUDENTS)) {
        const busses = JSON.parse(localStorage.getItem(LS_KEYS.BUSES));
        const demoStudents = [
          { id: uid('s_'), student_id: 'S1001', name: 'Aishwarya Kumar', email: 'aish@example.com', phone: '9876543210', bus_id: busses[0].id, bus_number: busses[0].bus_number, fee_status: 'Paid' },
          { id: uid('s_'), student_id: 'S1002', name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876501234', bus_id: busses[1].id, bus_number: busses[1].bus_number, fee_status: 'Due' },
          { id: uid('s_'), student_id: 'S1003', name: 'Neha Patel', email: 'neha@example.com', phone: '9876512345', bus_id: busses[2].id, bus_number: busses[2].bus_number, fee_status: 'Overdue' }
        ];
        localStorage.setItem(LS_KEYS.STUDENTS, JSON.stringify(demoStudents));
      }
      if (!localStorage.getItem(LS_KEYS.COMPLAINTS)) {
        const demoComplaints = [
          { id: uid('c_'), title: 'Late Arrival', summary: 'Bus arrived late on Monday', created_at: nowISO() },
          { id: uid('c_'), title: 'Driver Behavior', summary: 'Rash driving reported', created_at: nowISO() }
        ];
        localStorage.setItem(LS_KEYS.COMPLAINTS, JSON.stringify(demoComplaints));
      }
      if (!localStorage.getItem(LS_KEYS.NOTIFICATIONS)) {
        localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify([]));
      }
    }

    // Storage helpers
    function loadAll() {
      students = JSON.parse(localStorage.getItem(LS_KEYS.STUDENTS) || '[]');
      buses = JSON.parse(localStorage.getItem(LS_KEYS.BUSES) || '[]');
      complaints = JSON.parse(localStorage.getItem(LS_KEYS.COMPLAINTS) || '[]');
      notifications = JSON.parse(localStorage.getItem(LS_KEYS.NOTIFICATIONS) || '[]');
    }
    function saveStudents() { localStorage.setItem(LS_KEYS.STUDENTS, JSON.stringify(students)); }
    function saveBuses() { localStorage.setItem(LS_KEYS.BUSES, JSON.stringify(buses)); }
    function saveComplaints() { localStorage.setItem(LS_KEYS.COMPLAINTS, JSON.stringify(complaints)); }
    function saveNotifications() { localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(notifications)); }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = (link.getAttribute('href') || '').replace('#', '');
        if (!sectionId) return;
        document.querySelectorAll('.section').forEach(s => s.classList.add('d-none'));
        document.getElementById(sectionId).classList.remove('d-none');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Updated logout behavior: redirect to index.html
    logoutBtn?.addEventListener('click', () => {
      // clear demo session tokens/role then redirect to index.html
      localStorage.removeItem(LS_KEYS.ROLE);
      localStorage.removeItem(LS_KEYS.TOKEN);
      // Optionally show a brief toast before redirecting
      showToast('Logging out...');
      // Redirect to index.html
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 300);
    });

    // Dashboard rendering
    function updateStats() {
      const totalStudentsEl = document.getElementById('totalStudents');
      const totalBusesEl = document.getElementById('totalBuses');
      const pendingComplaintsEl = document.getElementById('pendingComplaints');
      const feeDefaultersEl = document.getElementById('feeDefaulters');

      if (totalStudentsEl) totalStudentsEl.textContent = students.length;
      if (totalBusesEl) totalBusesEl.textContent = buses.length;
      if (pendingComplaintsEl) pendingComplaintsEl.textContent = complaints.length;
      const defaulters = students.filter(s => (s.fee_status || '').toLowerCase() !== 'paid').length;
      if (feeDefaultersEl) feeDefaultersEl.textContent = defaulters;
      populateRecentComplaints();
      updateLastUpdated();
      if (notifyDefaultersBtn) {
        notifyDefaultersBtn.innerHTML = `<i class="bi bi-bell"></i> Notify Defaulters (${defaulters})`;
        notifyDefaultersBtn.disabled = defaulters === 0;
      }
    }
    function populateRecentComplaints() {
      const container = document.getElementById('recentComplaints');
      if (!container) return;
      container.innerHTML = '';
      if (!complaints.length) {
        container.innerHTML = '<div class="text-muted small">No recent complaints</div>';
        return;
      }
      complaints.slice(0, 6).forEach(c => {
        const el = document.createElement('div');
        el.className = 'list-group-item d-flex justify-content-between align-items-start';
        el.innerHTML = `
          <div>
            <div class="fw-semibold">${escapeHtml(c.title)}</div>
            <div class="small text-muted">${escapeHtml(c.summary)}</div>
          </div>
          <div class="text-end small text-muted">${timeAgo(c.created_at)}</div>
        `;
        container.appendChild(el);
      });
    }

    // Simple timeAgo
    function timeAgo(iso) {
      if (!iso) return '';
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins/60);
      if (hrs < 24) return `${hrs}h`;
      const days = Math.floor(hrs/24);
      return `${days}d`;
    }

    function updateLastUpdated(){
      if (lastUpdatedEl) lastUpdatedEl.textContent = 'Last updated: ' + new Date().toLocaleString();
    }

    // Upcoming Trips (replaces chart)
    function renderUpcomingTrips() {
      const container = document.getElementById('upcomingTrips');
      if (!container) return;
      container.innerHTML = '';
      if (!buses.length) {
        container.innerHTML = '<div class="text-muted small p-3">No buses configured</div>';
        return;
      }

      // For demo we simulate next trip time and seats available.
      buses.forEach(b => {
        const nextMinutes = Math.floor(Math.random() * 180) + 5; // 5 to 185 mins
        const nextAt = new Date(Date.now() + nextMinutes * 60_000);
        const occupied = Math.floor(Math.random() * Math.min(30, b.capacity || 40));
        const seats = Math.max(0, (b.capacity || 40) - occupied);

        const el = document.createElement('div');
        el.className = 'list-group-item';
        el.innerHTML = `
          <div class="d-flex align-items-center justify-content-between w-100">
            <div>
              <div class="fw-semibold">${escapeHtml(b.bus_number)} — ${escapeHtml(b.route)}</div>
              <div class="small text-muted">In-charge: ${escapeHtml(b.incharge_name || 'Not Assigned')}</div>
            </div>
            <div class="text-end">
              <div class="fw-semibold">${nextAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div class="small text-muted">${seats} seats available</div>
            </div>
          </div>
        `;
        container.appendChild(el);
      });
    }

    // Students: render, search, pagination, actions
    function renderStudents() {
      const tbody = document.getElementById('studentsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const filtered = students.filter(s => {
        const text = `${s.student_id} ${s.name} ${s.email} ${s.bus_number || ''}`.toLowerCase();
        return text.includes(studentSearchTerm.toLowerCase());
      });

      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      studentPage = Math.min(studentPage, pages);
      const start = (studentPage - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      pageItems.forEach(s => {
        const tr = document.createElement('tr');
        const feeLower = (s.fee_status || '').toLowerCase();
        const feeBadge = feeLower === 'paid' ? `<span class="badge badge-paid">Paid</span>` :
                         feeLower === 'due' ? `<span class="badge badge-due">Due</span>` :
                         `<span class="badge badge-overdue">Overdue</span>`;
        const notifyBtn = (feeLower !== 'paid') ? `<button class="btn btn-sm btn-warning me-1" data-action="notify-student" data-id="${s.id}" title="Notify"><i class="bi bi-bell"></i></button>` : '';
        tr.innerHTML = `
          <td>${escapeHtml(s.student_id)}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(s.bus_number || '—')}</td>
          <td>${feeBadge}</td>
          <td class="text-end">
            ${notifyBtn}
            <button class="btn btn-sm btn-outline-primary me-1" data-action="edit-student" data-id="${s.id}" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-student" data-id="${s.id}" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      renderStudentsPagination(total, pages, start, pageItems.length);
    }

    function renderStudentsPagination(total, pages, start = 0, shown = 0) {
      const container = document.getElementById('studentsPagination');
      if (!container) return;
      container.innerHTML = '';
      for (let p = 1; p <= pages; p++) {
        const li = document.createElement('li');
        li.className = `page-item ${p === studentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${p}">${p}</a>`;
        container.appendChild(li);
      }
      container.querySelectorAll('a.page-link').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          studentPage = Number(a.dataset.page);
          renderStudents();
        });
      });
      const info = document.getElementById('studentsInfo');
      if (info) {
        if (total === 0) info.textContent = 'No students';
        else info.textContent = `Showing ${start+1}-${start+shown} of ${total}`;
      }
    }

    // Debounce helper
    function debounce(fn, delay = 300) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
      };
    }

    const searchStudentEl = document.getElementById('searchStudent');
    if (searchStudentEl) {
      searchStudentEl.addEventListener('input', debounce(e => {
        studentSearchTerm = e.target.value.trim();
        studentPage = 1;
        renderStudents();
      }, 250));
    }

    // Students table actions (notify/edit/delete)
    const studentsTableBody = document.getElementById('studentsTableBody');
    if (studentsTableBody) {
      studentsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit-student') startEditStudent(id);
        if (action === 'delete-student') confirmDelete('student', id);
        if (action === 'notify-student') openComposeFor([id]);
      });
    }

    // Buses render & actions
    function renderBuses() {
      const tbody = document.getElementById('busesTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      buses.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(b.bus_number)}</td>
          <td>${escapeHtml(b.route)}</td>
          <td>${escapeHtml(String(b.capacity || '—'))}</td>
          <td>${escapeHtml(b.incharge_name || 'Not Assigned')}</td>
          <td><span class="badge bg-success">Active</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" data-action="edit-bus" data-id="${b.id}" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-bus" data-id="${b.id}" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    const busesTableBody = document.getElementById('busesTableBody');
    if (busesTableBody) {
      busesTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit-bus') startEditBus(id);
        if (action === 'delete-bus') confirmDelete('bus', id);
      });
    }

    // Populate bus select
    function populateBusSelect() {
      const sel = document.getElementById('studentBusSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">Select Bus</option>';
      buses.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.bus_number} — ${b.route}`;
        sel.appendChild(opt);
      });
    }

    // Add/Edit Student
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
      addStudentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!addStudentForm.checkValidity()) {
          addStudentForm.classList.add('was-validated');
          return;
        }
        const id = document.getElementById('editingStudentId').value;
        const payload = {
          student_id: generateStudentId(),
          name: document.getElementById('studentName').value.trim(),
          email: document.getElementById('studentEmail').value.trim(),
          phone: document.getElementById('studentPhone').value.trim(),
          bus_id: document.getElementById('studentBusSelect').value || null,
          bus_number: getBusNumberById(document.getElementById('studentBusSelect').value) || '—',
          fee_status: 'Paid'
        };
        if (id) {
          const idx = students.findIndex(s => s.id === id);
          if (idx >= 0) {
            payload.id = id;
            payload.student_id = students[idx].student_id;
            students[idx] = Object.assign({}, students[idx], payload);
            saveStudents();
            showToast('Student updated (local demo)');
          } else {
            showToast('Student not found');
          }
        } else {
          payload.id = uid('s_');
          students.unshift(payload);
          saveStudents();
          showToast('Student added (local demo)');
        }
        addStudentForm.reset();
        addStudentForm.classList.remove('was-validated');
        document.getElementById('editingStudentId').value = '';
        const modalEl = document.getElementById('addStudentModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        }
        refreshAllViews();
      });
    }

    function startEditStudent(id) {
      const s = students.find(x => x.id === id);
      if (!s) return showToast('Student not found');
      const editIdEl = document.getElementById('editingStudentId');
      if (editIdEl) editIdEl.value = s.id;
      const nameEl = document.getElementById('studentName');
      if (nameEl) nameEl.value = s.name || '';
      const emailEl = document.getElementById('studentEmail');
      if (emailEl) emailEl.value = s.email || '';
      const phoneEl = document.getElementById('studentPhone');
      if (phoneEl) phoneEl.value = s.phone || '';
      const busSel = document.getElementById('studentBusSelect');
      if (busSel) busSel.value = s.bus_id || '';
      const modalEl = document.getElementById('addStudentModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    function generateStudentId() {
      const existing = students.map(s => s.student_id).filter(Boolean);
      let max = 1000;
      existing.forEach(id => {
        const m = id.match(/(\d+)/);
        if (m) { const n = Number(m[1]); if (n > max) max = n; }
      });
      return 'S' + (max + 1);
    }
    function getBusNumberById(id) {
      const b = buses.find(x => x.id === id);
      return b ? b.bus_number : null;
    }

    // Add/Edit Bus
    const addBusForm = document.getElementById('addBusForm');
    if (addBusForm) {
      addBusForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!addBusForm.checkValidity()) {
          addBusForm.classList.add('was-validated');
          return;
        }
        const id = document.getElementById('editingBusId').value;
        const payload = {
          bus_number: document.getElementById('busNumber').value.trim(),
          route: document.getElementById('busRoute').value.trim(),
          capacity: Number(document.getElementById('busCapacity').value) || 0,
          incharge_name: ''
        };
        if (id) {
          const idx = buses.findIndex(b => b.id === id);
          if (idx >= 0) {
            payload.id = id;
            buses[idx] = Object.assign({}, buses[idx], payload);
            saveBuses();
            showToast('Bus updated (local demo)');
          } else {
            showToast('Bus not found');
          }
        } else {
          payload.id = uid('b_');
          buses.unshift(payload);
          saveBuses();
          showToast('Bus added (local demo)');
        }
        addBusForm.reset();
        addBusForm.classList.remove('was-validated');
        document.getElementById('editingBusId').value = '';
        const modalEl = document.getElementById('addBusModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        }
        refreshAllViews();
      });
    }

    function startEditBus(id) {
      const b = buses.find(x => x.id === id);
      if (!b) return showToast('Bus not found');
      const editIdEl = document.getElementById('editingBusId');
      if (editIdEl) editIdEl.value = b.id;
      const numEl = document.getElementById('busNumber');
      if (numEl) numEl.value = b.bus_number || '';
      const routeEl = document.getElementById('busRoute');
      if (routeEl) routeEl.value = b.route || '';
      const capEl = document.getElementById('busCapacity');
      if (capEl) capEl.value = b.capacity || '';
      const modalEl = document.getElementById('addBusModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    // Confirm deletion flow
    function confirmDelete(type, id) {
      const confirmModalEl = document.getElementById('confirmModal');
      if (!confirmModalEl) {
        // fallback
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
      }
      const confirmModal = confirmModalEl ? new bootstrap.Modal(confirmModalEl) : null;
      const confirmMessageEl = document.getElementById('confirmMessage');
      if (confirmMessageEl) confirmMessageEl.textContent = `Are you sure you want to delete this ${type}? This action cannot be undone.`;
      const okBtn = document.getElementById('confirmOkBtn');
      const handler = () => {
        if (type === 'student') {
          students = students.filter(s => s.id !== id);
          saveStudents();
          showToast('Student deleted (local demo)');
        } else if (type === 'bus') {
          students = students.map(s => s.bus_id === id ? Object.assign({}, s, { bus_id: null, bus_number: '—' }) : s);
          buses = buses.filter(b => b.id !== id);
          saveStudents();
          saveBuses();
          showToast('Bus deleted (local demo)');
        }
        refreshAllViews();
        if (okBtn) okBtn.removeEventListener('click', handler);
        if (confirmModal) confirmModal.hide();
      };
      if (okBtn) {
        okBtn.addEventListener('click', handler);
      } else {
        // If no modal, fallback to immediate deletion
        handler();
      }
      if (confirmModal) confirmModal.show();
    }

    // Notifications: create and render (notifications list not exposed in UI per request)
    function createNotification(studentId, message) {
      const student = students.find(s => s.id === studentId);
      const n = {
        id: uid('n_'),
        student_id: studentId,
        student_name: student ? student.name : null,
        student_email: student ? student.email : null,
        message,
        created_at: nowISO()
      };
      notifications.unshift(n);
      saveNotifications();
      showToast(`Notification queued to ${student ? student.name : 'student'}`);
    }

    function sendNotificationToMultiple(studentIds, message) {
      studentIds.forEach(id => createNotification(id, message));
    }

    // Compose modal behavior
    const composeForm = document.getElementById('composeForm');
    const composeRecipients = document.getElementById('composeRecipients');
    const composeMessage = document.getElementById('composeMessage');

    // Open compose with preselected recipients (array of ids)
    function openComposeFor(recipientIds = []) {
      if (!composeRecipients) return;
      // Build recipients options
      composeRecipients.innerHTML = '';
      students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.text = `${s.name} (${s.student_id})`;
        if (recipientIds.includes(s.id)) opt.selected = true;
        composeRecipients.appendChild(opt);
      });
      if (composeMessage) composeMessage.value = recipientIds.length ? `Reminder: your bus fees are pending. Please pay soon.` : '';
      const modalEl = document.getElementById('composeModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    if (composeForm) {
      composeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!composeMessage || !composeMessage.value.trim()) {
          composeForm.classList.add('was-validated');
          return;
        }
        const selected = Array.from(composeRecipients.selectedOptions).map(o => o.value);
        if (selected.length === 0) {
          sendNotificationToMultiple(students.map(s => s.id), composeMessage.value.trim());
          showToast('Notification sent to all students (local demo)');
        } else {
          sendNotificationToMultiple(selected, composeMessage.value.trim());
          showToast(`Notification sent to ${selected.length} student(s) (local demo)`);
        }
        composeForm.reset();
        composeForm.classList.remove('was-validated');
        const modalEl = document.getElementById('composeModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        }
      });
    }

    // Hook Notify Defaulters button
    notifyDefaultersBtn?.addEventListener('click', () => {
      const defaulters = students.filter(s => (s.fee_status || '').toLowerCase() !== 'paid').map(s => s.id);
      openComposeFor(defaulters);
    });

    // General refresh of UI
    function refreshAllViews() {
      loadAll();
      updateStats();
      renderStudents();
      renderBuses();
      populateBusSelect();
      renderUpcomingTrips();
    }

    // Initialize
    function init() {
      // Ensure demo data & role are present before loading data
      protectPage('admin');

      loadAll();
      populateBusSelect();
      renderBuses();
      renderStudents();
      updateStats();
      renderUpcomingTrips();
      setInterval(updateLastUpdated, 60_000);
    }

    // Load stored data into local state and start
    init();

    // Expose debug helpers
    window.SB = {
      resetDemo: () => {
        localStorage.removeItem(LS_KEYS.STUDENTS);
        localStorage.removeItem(LS_KEYS.BUSES);
        localStorage.removeItem(LS_KEYS.COMPLAINTS);
        localStorage.removeItem(LS_KEYS.NOTIFICATIONS);
        localStorage.removeItem(LS_KEYS.ROLE);
        localStorage.removeItem(LS_KEYS.TOKEN);
        location.reload();
      },
      getData: () => ({ students, buses, complaints, notifications })
    };
  }

  // Run when DOM ready (or immediately if already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();