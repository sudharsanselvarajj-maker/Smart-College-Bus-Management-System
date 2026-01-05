/* Bus In-Charge Dashboard — client-side (demo-ready)
   - View student attendance records
   - Track bus routes and live location
   - Manage student complaints
   - Update complaint status
*/

(() => {
  const STATE = {
    busInfo: { busNumber: "BUS-12", route: "North Campus", totalStops: 8 },
    map: null,
    busMarker: null,
    currentComplaintId: null
  };

  // Storage keys
  const STORAGE = {
    ATTENDANCE: "sbs_attendance_demo",
    COMPLAINTS: "sbs_complaints_demo"
  };

  // Utility: show toast
  function showToast(message, opts = {}) {
    const container = document.getElementById("toastContainer");
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center text-bg-white border shadow-sm";
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    container.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: opts.delay || 4000 });
    bsToast.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  // Section navigation
  function showSection(sectionId) {
    document.querySelectorAll("section[id]").forEach(s => {
      s.classList.toggle("d-none", s.id !== sectionId);
    });
    history.replaceState(null, "", `#${sectionId}`);
    
    if (sectionId === "routes") {
      setTimeout(setupMapIfNeeded, 200);
    }
  }

  // Load bus info
  function loadBusInfo() {
    document.getElementById("busNumber").textContent = STATE.busInfo.busNumber;
    document.getElementById("routeInfo").textContent = `Route: ${STATE.busInfo.route}`;
    document.getElementById("trackBusNumber").textContent = STATE.busInfo.busNumber;
    document.getElementById("routeName").textContent = STATE.busInfo.route;
    document.getElementById("routeBusNumber").textContent = STATE.busInfo.busNumber;
    document.getElementById("totalStops").textContent = STATE.busInfo.totalStops;
  }

  // Get attendance data
  function getAttendance() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.ATTENDANCE) || "[]");
    } catch { return []; }
  }

  // Render attendance list
  function renderAttendanceList() {
    const tbody = document.getElementById("attendanceTableBody");
    const searchTerm = document.getElementById("searchStudent").value.toLowerCase();
    const selectedDate = document.getElementById("attendanceDate").value;
    
    let attendance = getAttendance();
    
    // Filter by date if selected
    if (selectedDate) {
      const filterDate = new Date(selectedDate).toLocaleDateString();
      attendance = attendance.filter(a => {
        const aDate = new Date(a.ts).toLocaleDateString();
        return aDate === filterDate;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      attendance = attendance.filter(a => {
        const studentId = `STU-${String(a.ts).slice(-4)}`;
        const studentName = `Student ${String(a.ts).slice(-3)}`;
        return studentId.toLowerCase().includes(searchTerm) || 
               studentName.toLowerCase().includes(searchTerm);
      });
    }

    // Count present/absent
    const presentCount = attendance.filter(a => a.status === "Present").length;
    const absentCount = attendance.length - presentCount;
    
    document.getElementById("presentCount").textContent = presentCount;
    document.getElementById("absentCount").textContent = absentCount;

    if (!attendance.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No attendance records found</td></tr>`;
      return;
    }

    const rows = attendance.slice(0, 50).map(a => {
      const date = new Date(a.ts);
      const studentId = `STU-${String(a.ts).slice(-4)}`;
      const studentName = `Student ${String(a.ts).slice(-3)}`;
      const statusBadge = a.status === "Present" 
        ? '<span class="badge bg-success">Present</span>'
        : '<span class="badge bg-secondary">Absent</span>';
      
      return `<tr>
        <td><strong>${studentId}</strong></td>
        <td>${studentName}</td>
        <td>${date.toLocaleDateString()}</td>
        <td>${date.toLocaleTimeString()}</td>
        <td>${statusBadge}</td>
        <td><span class="badge bg-info">${a.mode || 'Manual'}</span></td>
      </tr>`;
    }).join("");

    tbody.innerHTML = rows;
  }

  // Get complaints data
  function getComplaints() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.COMPLAINTS) || "[]");
    } catch { return []; }
  }

  // Save complaints
  function saveComplaints(arr) {
    localStorage.setItem(STORAGE.COMPLAINTS, JSON.stringify(arr));
  }

  // Render complaints
  function renderComplaints() {
    const container = document.getElementById("complaintsList");
    const filterStatus = document.getElementById("filterStatus").value;
    
    let complaints = getComplaints();
    
    // Filter by status
    if (filterStatus !== "all") {
      complaints = complaints.filter(c => c.status === filterStatus);
    }

    // Count by status
    const allComplaints = getComplaints();
    const pending = allComplaints.filter(c => c.status === "Submitted").length;
    const inProgress = allComplaints.filter(c => c.status === "In Progress").length;
    const resolved = allComplaints.filter(c => c.status === "Resolved").length;
    
    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("inProgressCount").textContent = inProgress;
    document.getElementById("resolvedCount").textContent = resolved;

    if (!complaints.length) {
      container.innerHTML = `<div class="text-center text-muted py-4">No complaints found</div>`;
      return;
    }

    const html = complaints.map(c => {
      const date = new Date(c.createdAt);
      const statusClass = c.status === "Resolved" ? "bg-success" 
                        : c.status === "In Progress" ? "bg-info" 
                        : "bg-warning";
      
      return `<div class="complaint-card">
        <div class="complaint-header">
          <div>
            <h6 class="mb-1 fw-semibold">${escapeHtml(c.subject)}</h6>
            <p class="mb-0 text-muted small">${escapeHtml(c.description)}</p>
          </div>
          <span class="badge ${statusClass}">${c.status}</span>
        </div>
        <div class="complaint-meta">
          <span><i class="bi bi-calendar3"></i> ${date.toLocaleDateString()}</span>
          <span class="ms-3"><i class="bi bi-clock"></i> ${date.toLocaleTimeString()}</span>
          <span class="ms-3"><i class="bi bi-hash"></i> ${c.id}</span>
        </div>
        ${c.notes ? `<div class="mt-2 small"><strong>Notes:</strong> ${escapeHtml(c.notes)}</div>` : ''}
        <div class="mt-3">
          <button class="btn btn-sm btn-outline-primary" onclick="window.openUpdateModal(${c.id})">
            <i class="bi bi-pencil"></i> Update Status
          </button>
        </div>
      </div>`;
    }).join("");

    container.innerHTML = html;
  }

  // Open update complaint modal
  window.openUpdateModal = function(complaintId) {
    const complaints = getComplaints();
    const complaint = complaints.find(c => c.id === complaintId);
    
    if (!complaint) return;
    
    STATE.currentComplaintId = complaintId;
    
    document.getElementById("modalComplaintId").textContent = complaint.id;
    document.getElementById("modalComplaintSubject").textContent = complaint.subject;
    document.getElementById("modalComplaintDescription").textContent = complaint.description;
    document.getElementById("modalStatus").value = complaint.status;
    document.getElementById("modalNotes").value = complaint.notes || "";
    
    const modal = new bootstrap.Modal(document.getElementById("updateComplaintModal"));
    modal.show();
  };

  // Save complaint status
  function saveComplaintStatus() {
    if (!STATE.currentComplaintId) return;
    
    const complaints = getComplaints();
    const index = complaints.findIndex(c => c.id === STATE.currentComplaintId);
    
    if (index === -1) return;
    
    const newStatus = document.getElementById("modalStatus").value;
    const newNotes = document.getElementById("modalNotes").value.trim();
    
    complaints[index].status = newStatus;
    complaints[index].notes = newNotes;
    complaints[index].updatedAt = new Date().toISOString();
    
    saveComplaints(complaints);
    renderComplaints();
    updateDashboardStats();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("updateComplaintModal"));
    modal.hide();
    
    showToast("Complaint status updated successfully");
    STATE.currentComplaintId = null;
  }

  // Escape HTML
  function escapeHtml(s) {
    if (!s) return "";
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // Map setup
  function setupMapIfNeeded() {
    if (STATE.map) return;
    
    const mapEl = document.getElementById("map");
    if (!window.google || !window.google.maps) {
      mapEl.innerHTML = `<div class="p-4 text-muted">Google Maps not available. Please check your API key.</div>`;
      return;
    }
    
    const defaultLatLng = { lat: 12.9716, lng: 77.5946 };
    STATE.map = new google.maps.Map(mapEl, {
      center: defaultLatLng,
      zoom: 13,
      disableDefaultUI: true
    });
    
    STATE.busMarker = new google.maps.Marker({
      position: defaultLatLng,
      map: STATE.map,
      title: STATE.busInfo.busNumber,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#0d6efd",
        fillOpacity: 1,
        strokeWeight: 0
      }
    });
    
    refreshLocation();
  }

  // Refresh location
  function refreshLocation() {
    const base = { lat: 12.9716, lng: 77.5946 };
    const jitter = () => (Math.random() - 0.5) * 0.02;
    const pos = { lat: base.lat + jitter(), lng: base.lng + jitter() };
    
    if (STATE.busMarker && STATE.map) {
      STATE.busMarker.setPosition(pos);
      STATE.map.panTo(pos);
    }
    
    document.getElementById("currentLocation").textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
  }

  // Update dashboard stats
  function updateDashboardStats() {
    const attendance = getAttendance();
    const complaints = getComplaints();
    
    // Get unique students (by date grouping)
    const uniqueStudents = new Set(attendance.map(a => Math.floor(a.ts / 100000)));
    document.getElementById("totalStudents").textContent = uniqueStudents.size || 45;
    
    // Get today's present count
    const today = new Date().toLocaleDateString();
    const todayPresent = attendance.filter(a => {
      const aDate = new Date(a.ts).toLocaleDateString();
      return aDate === today && a.status === "Present";
    }).length;
    document.getElementById("presentToday").textContent = todayPresent;
    
    // Pending complaints
    const pending = complaints.filter(c => c.status === "Submitted").length;
    document.getElementById("pendingComplaints").textContent = pending;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        showSection(el.getAttribute('data-section'));
      });
    });

    // Dashboard refresh
    document.getElementById('refreshDashboardBtn').addEventListener('click', () => {
      document.getElementById('lastSync').textContent = "Syncing…";
      setTimeout(() => {
        updateDashboardStats();
        document.getElementById('lastSync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        showToast("Dashboard updated", { delay: 1500 });
      }, 600);
    });

    // Attendance filters
    document.getElementById('filterAttendanceBtn').addEventListener('click', renderAttendanceList);
    document.getElementById('searchStudent').addEventListener('input', renderAttendanceList);

    // Complaint filter
    document.getElementById('filterStatus').addEventListener('change', renderComplaints);

    // Map controls
    document.getElementById('refreshLocationBtn').addEventListener('click', refreshLocation);
    document.getElementById('centerMapBtn').addEventListener('click', () => {
      if (STATE.map && STATE.busMarker) STATE.map.panTo(STATE.busMarker.getPosition());
    });

    // Save complaint status
    document.getElementById('saveComplaintStatusBtn').addEventListener('click', saveComplaintStatus);

    // Logout
    setupLogout();
  }

  // Logout handling
  function setupLogout() {
    const confirmBtn = document.getElementById("confirmLogoutBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        const modalEl = document.getElementById('logoutModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        showToast("Logged out");
        setTimeout(() => { window.location.href = "index.html"; }, 800);
      });
    }
  }

  // Initialize demo data if needed
  function initializeDemoData() {
    // Add demo attendance if none exists
    const attendance = getAttendance();
    if (attendance.length === 0) {
      const demoAttendance = [];
      const now = Date.now();
      
      for (let i = 0; i < 30; i++) {
        demoAttendance.push({
          ts: now - (i * 1000 * 60 * 60 * 2),
          status: Math.random() > 0.2 ? "Present" : "Absent",
          mode: Math.random() > 0.5 ? "QR" : "Manual"
        });
      }
      
      localStorage.setItem(STORAGE.ATTENDANCE, JSON.stringify(demoAttendance));
    }

    // Add demo complaints if none exists
    const complaints = getComplaints();
    if (complaints.length === 0) {
      const demoComplaints = [
        {
          id: Date.now(),
          subject: "Broken seat",
          description: "The seat near the window is broken and uncomfortable",
          status: "Submitted",
          createdAt: new Date().toISOString()
        },
        {
          id: Date.now() + 1,
          subject: "AC not working",
          description: "Air conditioning is not functioning properly",
          status: "In Progress",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          notes: "Technician assigned, will be fixed by tomorrow"
        },
        {
          id: Date.now() + 2,
          subject: "Late arrival",
          description: "Bus arrived 15 minutes late today",
          status: "Resolved",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          notes: "Route optimized to prevent delays"
        }
      ];
      
      localStorage.setItem(STORAGE.COMPLAINTS, JSON.stringify(demoComplaints));
    }
  }

  // Initialize
  function init() {
    // Set today's date in attendance filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;

    initializeDemoData();
    loadBusInfo();
    updateDashboardStats();
    renderAttendanceList();
    renderComplaints();
    setupEventListeners();

    document.getElementById('lastSync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;

    // Handle hash on load
    const initial = (location.hash || "#dashboard").substring(1);
    showSection(initial);
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();