/* Student Dashboard — client-side (demo-ready)
   - Uses html5-qrcode (if available) to scan attendance QR codes
   - Uses Google Maps JS API (if included) for simple map marker demonstration
   - Stores demo attendance and complaints in localStorage for persistence
   Note: Replace or connect to your backend APIs for production use.
*/

(() => {
  const STATE = {
    student: { name: "User", avatar: "account-icon.svg", busNumber: "BUS-12", route: "North Campus" },
    qrScanner: null,
    scanning: false,
    map: null,
    busMarker: null
  };

  // Storage keys
  const STORAGE = {
    ATTENDANCE: "sbs_attendance_demo",
    COMPLAINTS: "sbs_complaints_demo"
  };

  // Utility: show toast
  function showToast(message, opts = {}) {
    const container = document.getElementById("toastContainer");
    const id = "toast-" + Date.now();
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
    // update URL hash (non-intrusive)
    history.replaceState(null, "", `#${sectionId}`);
    // handle map initialisation when entering tracking
    if (sectionId === "tracking") {
      setTimeout(setupMapIfNeeded, 200); // slight delay to ensure container visible
    }
  }

  // Load demo student info into UI
  function loadStudentInfo() {
    document.getElementById("studentNameNav").textContent = STATE.student.name;
    const avatar = document.getElementById("studentAvatar");
    avatar.src = STATE.student.avatar;
    document.getElementById("busNumber").textContent = STATE.student.busNumber;
    document.getElementById("routeInfo").textContent = `Route: ${STATE.student.route}`;
    document.getElementById("trackBusNumber").textContent = STATE.student.busNumber;
  }

  // Attendance history helpers
  function getAttendance() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.ATTENDANCE) || "[]");
    } catch { return []; }
  }
  function saveAttendance(arr) {
    localStorage.setItem(STORAGE.ATTENDANCE, JSON.stringify(arr.slice(0, 200)));
  }
  function addAttendanceEntry(entry) {
    const arr = getAttendance();
    arr.unshift(entry);
    saveAttendance(arr);
    renderAttendanceHistory();
  }
  function renderAttendanceHistory() {
    const tbody = document.getElementById("attendanceHistory");
    const rows = getAttendance().slice(0, 20).map(e => {
      const date = new Date(e.ts);
      return `<tr>
        <td>${date.toLocaleDateString()}</td>
        <td>${date.toLocaleTimeString()}</td>
        <td><span class="badge ${e.status === 'Present' ? 'bg-success' : 'bg-secondary'}">${e.status}</span></td>
        <td>${e.mode || '—'}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="4" class="text-muted">No attendance recorded yet.</td></tr>`;
    tbody.innerHTML = rows;
    const rate = computeAttendanceRate();
    document.getElementById("attendanceRate").textContent = `${rate}%`;
  }
  function computeAttendanceRate() {
    const arr = getAttendance();
    if (!arr.length) return 0;
    const present = arr.filter(x => x.status === "Present").length;
    return Math.round((present / arr.length) * 100);
  }

  // Complaints
  function getComplaints() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.COMPLAINTS) || "[]");
    } catch { return []; }
  }
  function saveComplaints(arr) {
    localStorage.setItem(STORAGE.COMPLAINTS, JSON.stringify(arr.slice(0, 200)));
  }
  function addComplaint(subject, description) {
    const arr = getComplaints();
    const item = {
      id: Date.now(),
      subject,
      description,
      status: "Submitted",
      createdAt: new Date().toISOString()
    };
    arr.unshift(item);
    saveComplaints(arr);
    renderComplaints();
    showToast("Complaint submitted");
  }
  function renderComplaints() {
    const wrap = document.getElementById("complaintsList");
    const arr = getComplaints();
    if (!arr.length) {
      wrap.innerHTML = `<div class="text-muted">You have not submitted any complaints.</div>`;
      document.getElementById("totalComplaints").textContent = "0";
      return;
    }
    const items = arr.map(c => {
      const date = new Date(c.createdAt).toLocaleString();
      return `<div class="list-group-item d-flex justify-content-between align-items-start">
        <div class="ms-2 me-auto">
          <div class="fw-semibold">${escapeHtml(c.subject)}</div>
          <small class="text-muted">${escapeHtml(c.description)}</small>
          <div class="mt-1"><small class="text-muted">${date}</small></div>
        </div>
        <div class="text-end">
          <div><span class="badge ${c.status === 'Resolved' ? 'bg-success' : 'bg-warning'}">${c.status}</span></div>
        </div>
      </div>`;
    }).join("");
    wrap.innerHTML = items;
    document.getElementById("totalComplaints").textContent = arr.length.toString();
  }

  // Escape HTML to avoid inserted markup
  function escapeHtml(s) {
    if (!s) return "";
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // QR scanning
  function setupQRScannerElements() {
    const startBtn = document.getElementById("startScanBtn");
    const stopBtn = document.getElementById("stopScanBtn");
    const qrStatus = document.getElementById("qrStatus");

    startBtn.addEventListener("click", () => startScanner());
    stopBtn.addEventListener("click", () => stopScanner());
    document.getElementById("submitCodeBtn").addEventListener("click", handleManualCode);
    document.getElementById("manualMarkBtn").addEventListener("click", () => showSection("attendance"));
  }

  async function startScanner() {
    const qrReaderContainer = document.getElementById("qrReader");
    const startBtn = document.getElementById("startScanBtn");
    const stopBtn = document.getElementById("stopScanBtn");
    const qrStatus = document.getElementById("qrStatus");

    if (STATE.scanning) return;
    if (!window.Html5Qrcode) {
      qrStatus.textContent = "QR library not loaded.";
      return;
    }

    // Create the scanner
    STATE.qrScanner = new Html5Qrcode(/* element id */ "qrReader", /* verbose= */ false);
    try {
      const devices = await Html5Qrcode.getCameras();
      const cameraId = (devices && devices.length) ? devices[0].id : null;
      if (!cameraId) {
        qrStatus.textContent = "No camera available.";
        return;
      }

      startBtn.classList.add("d-none");
      stopBtn.classList.remove("d-none");
      qrStatus.textContent = "Scanning for QR...";
      STATE.scanning = true;

      await STATE.qrScanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 300, height: 300 } },
        decodedText => {
          // on success
          stopScanner();
          qrStatus.textContent = "Code scanned";
          // process code
          processScannedCode(decodedText);
        },
        errorMsg => {
          // optionally handle scan failure per frame
        }
      );
    } catch (err) {
      console.error("QR start failed:", err);
      qrStatus.textContent = "Unable to start camera: " + (err && err.message ? err.message : "");
      STATE.scanning = false;
      startBtn.classList.remove("d-none");
      stopBtn.classList.add("d-none");
    }
  }

  async function stopScanner() {
    const startBtn = document.getElementById("startScanBtn");
    const stopBtn = document.getElementById("stopScanBtn");
    const qrStatus = document.getElementById("qrStatus");

    if (STATE.qrScanner && STATE.scanning) {
      try {
        await STATE.qrScanner.stop();
      } catch (e) { /* ignore */ }
      try { STATE.qrScanner.clear(); } catch {}
    }
    STATE.scanning = false;
    STATE.qrScanner = null;
    startBtn.classList.remove("d-none");
    stopBtn.classList.add("d-none");
    qrStatus.textContent = "Scanner stopped";
    // clear reader area to show placeholder
    const container = document.getElementById("qrReader");
    container.innerHTML = "";
  }

  function processScannedCode(code) {
    // Basic demo: treat any code as attendance confirmation
    addAttendanceEntry({ ts: Date.now(), status: "Present", mode: "QR", raw: code });
    showToast("Attendance marked (QR)");
  }

  function handleManualCode() {
    const input = document.getElementById("manualCode");
    const code = (input.value || "").trim();
    if (!code) {
      input.classList.add("is-invalid");
      setTimeout(() => input.classList.remove("is-invalid"), 1600);
      return;
    }
    addAttendanceEntry({ ts: Date.now(), status: "Present", mode: "Manual", raw: code });
    input.value = "";
    showToast("Attendance marked (manual)");
  }

  // Map & bus location (demo-only)
  function setupMapIfNeeded() {
    if (STATE.map) return;
    const mapEl = document.getElementById("map");
    if (!window.google || !window.google.maps) {
      mapEl.innerHTML = `<div class="p-4 text-muted">Google Maps not available. Please check your API key or use an alternative map provider.</div>`;
      return;
    }
    const defaultLatLng = { lat: 12.9716, lng: 77.5946 }; // sample coords (can be dynamic)
    STATE.map = new google.maps.Map(mapEl, {
      center: defaultLatLng,
      zoom: 13,
      disableDefaultUI: true,
      styles: []
    });
    STATE.busMarker = new google.maps.Marker({
      position: defaultLatLng,
      map: STATE.map,
      title: STATE.student.busNumber,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#0d6efd",
        fillOpacity: 1,
        strokeWeight: 0
      }
    });
    // initial fetch
    refreshLocation();
  }

  // Simulate a location refresh (replace with real API)
  function refreshLocation() {
    const lastUpdatedEl = document.getElementById("lastUpdated");
    const currentLocationEl = document.getElementById("currentLocation");

    // In production, fetch from API: GET /bus/:id/location
    // Demo: simulate movement near a center point
    const base = { lat: 12.9716, lng: 77.5946 };
    const jitter = () => (Math.random() - 0.5) * 0.02;
    const pos = { lat: base.lat + jitter(), lng: base.lng + jitter() };
    if (STATE.busMarker && STATE.map) {
      STATE.busMarker.setPosition(pos);
      STATE.map.panTo(pos);
    }
    currentLocationEl.textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    lastUpdatedEl.textContent = new Date().toLocaleTimeString();
    document.getElementById("trackBusNumber").textContent = STATE.student.busNumber;
    document.getElementById("currentLocation").textContent = currentLocationEl.textContent;
    document.getElementById("lastUpdated").textContent = lastUpdatedEl.textContent;
  }

  // Complaint form handling
  function setupComplaintForm() {
    const form = document.getElementById("complaintForm");
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const subject = document.getElementById("complaintSubject").value.trim();
      const description = document.getElementById("complaintDescription").value.trim();
      if (!subject || !description) {
        if (!subject) document.getElementById("complaintSubject").classList.add("is-invalid");
        if (!description) document.getElementById("complaintDescription").classList.add("is-invalid");
        setTimeout(() => {
          document.getElementById("complaintSubject").classList.remove("is-invalid");
          document.getElementById("complaintDescription").classList.remove("is-invalid");
        }, 1400);
        return;
      }
      addComplaint(subject, description);
      form.reset();
    });

    document.getElementById("newComplaintBtn").addEventListener("click", () => {
      showSection("complaints");
      // focus subject quickly
      setTimeout(() => document.getElementById("complaintSubject").focus(), 250);
    });
  }

  // Logout handling (confirm-only). Modal is opened via data attributes on the logout button.
  function setupLogout() {
    const confirmBtn = document.getElementById("confirmLogoutBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        // demo: clear local storage and redirect to index (or perform real logout)
        localStorage.clear();
        showToast("Logged out");
        setTimeout(() => { window.location.href = "index.html"; }, 800);
      });
    }

    // Safety: if your markup still uses an <a href="#"> for logout, prevent the default navigation
    const logoutTrigger = document.getElementById("logoutBtn");
    if (logoutTrigger) {
      logoutTrigger.addEventListener("click", (e) => {
        // if it's an anchor, stop it from jumping
        if (e.target && e.target.tagName === "A") {
          e.preventDefault();
        }
        // If it's a button with data-bs-toggle, Bootstrap will open the modal for us.
      });
    }
  }

  // Small helpers & event bindings
  function bindNavLinks() {
    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        const s = el.getAttribute('data-section');
        showSection(s);
      });
    });
    document.getElementById('refreshDashboardBtn').addEventListener('click', () => {
      document.getElementById('lastSync').textContent = "Syncing…";
      setTimeout(() => {
        renderAttendanceHistory();
        renderComplaints();
        document.getElementById('lastSync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        showToast("Dashboard updated", { delay: 1500 });
      }, 600);
    });

    document.getElementById('refreshLocationBtn').addEventListener('click', refreshLocation);
    document.getElementById('refreshLocationSmallBtn').addEventListener('click', refreshLocation);
    document.getElementById('centerMapBtn').addEventListener('click', () => {
      if (STATE.map && STATE.busMarker) STATE.map.panTo(STATE.busMarker.getPosition());
    });

    // handle hash on load
    const initial = (location.hash || "#dashboard").substring(1);
    showSection(initial);
  }

  // Init
  function init() {
    loadStudentInfo();
    renderAttendanceHistory();
    renderComplaints();
    setupQRScannerElements();
    setupComplaintForm();
    setupLogout();
    bindNavLinks();

    // mark last sync
    document.getElementById('lastSync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;

    // small demo: prepopulate attendance/complaints if none
    if (!getAttendance().length) {
      addAttendanceEntry({ ts: Date.now() - 1000 * 60 * 60 * 24 * 2, status: "Present", mode: "Demo" });
      addAttendanceEntry({ ts: Date.now() - 1000 * 60 * 60 * 24 * 1, status: "Absent", mode: "Demo" });
    }
    if (!getComplaints().length) {
      addComplaint("Seat broken", "The seat near window is broken and uncomfortable.");
    }

    // attempt to initialize map if the user opens tracking
    if (location.hash === "#tracking") setupMapIfNeeded();
  }

  // safe DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();