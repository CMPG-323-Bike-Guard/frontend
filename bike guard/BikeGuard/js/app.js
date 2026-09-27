(function () {
  const STORAGE_KEY = 'bikeguard';
  const SESSION_KEY = 'bikeguard_session';

  function buildMockCrossingData() {
    const bikeNames = ['Silver Mountain Bike', 'Road Bike', 'City Bike', 'Hybrid Bike', 'Campus Cruiser'];
    const tags = ['ABC123', 'DEF456', 'FGH100', 'QRT771', 'LPP015', 'TIL888', 'MNO456', 'VWX999', 'ZAB123'];
    const students = ['41768421', '41568914', '44378210', '41109441', '45021134', '42112263', '41190010', '46499843', '43433019', '40820491'];
    const resultPool = ['Success', 'Success', 'Success', 'Alarm', 'Alarm', 'Resolved', 'Success'];
    const now = new Date();
    const entries = [];

    const today = new Date();
    const currentDayExamples = [
      {
        id: 'demo-active-1',
        when: formatEntryDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 15)),
        person: '41768421',
        bike: 'Silver Mountain Bike',
        gate: 'Gate 3',
        tag: 'FGH100',
        result: 'Alarm',
        check: 'Automatic',
        reason: 'Unregistered tag',
        notes: ''
      },
      {
        id: 'demo-active-2',
        when: formatEntryDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 40)),
        person: '42112263',
        bike: 'Campus Cruiser',
        gate: 'Gate 6',
        tag: 'LPP015',
        result: 'Alarm',
        check: 'Manual',
        reason: 'Tag belongs to another bike',
        notes: ''
      },
      {
        id: 'demo-resolved-1',
        when: formatEntryDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 50)),
        person: '43433019',
        bike: 'Road Bike',
        gate: 'Gate 8',
        tag: 'QRT771',
        result: 'Resolved',
        check: 'Automatic',
        reason: 'False alarm',
        notes: 'Tag checked and verified as valid.'
      }
    ];

    entries.push(...currentDayExamples);

    for (let offset = 0; offset < 30; offset += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - offset);
      const dayCount = 7 + (offset % 5) + Math.floor((offset * 2) % 4);

      for (let i = 0; i < dayCount; i += 1) {
        const gateNumber = (i + offset + 1) % 9 + 1;
        const gateName = `Gate ${gateNumber}`;
        const realDate = new Date(date);
        const hour = String(7 + ((i * 3 + offset) % 10)).padStart(2, '0');
        const minute = String((i * 9 + offset * 3) % 60).padStart(2, '0');
        realDate.setHours(Number(hour), Number(minute), 0, 0);
        const result = resultPool[(i + offset) % resultPool.length];
        const entry = {
          id: `cross-${offset}-${i}`,
          when: formatEntryDate(realDate),
          person: students[(i + offset) % students.length],
          bike: bikeNames[(i + offset) % bikeNames.length],
          gate: gateName,
          tag: tags[(i + offset) % tags.length],
          result,
          check: i % 2 === 0 ? 'Automatic' : 'Manual',
          reason: result === 'Resolved' ? ['False alarm', 'Tag belongs to another bike', 'Tag reported lost/stolen', 'Unregistered tag', 'Manual verification completed', 'Other'][(i + offset) % 6] : 'Unspecified',
          notes: result === 'Resolved' ? 'Review completed by guard.' : ''
        };

        if (result === 'Resolved') {
          entry.reason = ['False alarm', 'Tag belongs to another bike', 'Tag reported lost/stolen', 'Unregistered tag', 'Manual verification completed', 'Other'][(i + offset) % 6];
        }

        entries.push(entry);
      }
    }

    return entries;
  }

  function getDefaultState() {
    return {
      users: [
        { id: '20123456', name: 'Student User', role: 'student', email: 'student@nwu.ac.za', campus: 'Potchefstroom', faculty: 'Engineering', active: true, password: 'student123' },
        { id: 'GUARD001', name: 'Guard User', role: 'guard', email: 'guard@nwu.ac.za', active: true, password: 'guard123' },
        { id: 'ADMIN001', name: 'Admin User', role: 'admin', email: 'admin@nwu.ac.za', active: true, password: 'admin123' },
        { id: '20234567', name: 'Alex Hart', role: 'student', email: 'alex.hart@nwu.ac.za', active: true, password: 'demo123' },
        { id: '20345678', name: 'Jamie Stone', role: 'student', email: 'jamie.stone@nwu.ac.za', active: true, password: 'demo123' }
      ],
      bikes: [
        { id: 1, name: 'Silver Mountain Bike', make: 'Trek', model: 'Marlin 5', color: 'Silver', status: 'approved', owner: '20123456', photo: '', sharedWith: ['GUARD001', 'ADMIN001'] },
        { id: 2, name: 'Road Bike', make: 'Giant', model: 'Contend 3', color: 'Blue', status: 'approved', owner: '20123456', photo: '', sharedWith: ['ADMIN001', '20234567'] },
        { id: 3, name: 'Hybrid Bike', make: 'Specialized', model: 'Sirrus', color: 'Red', status: 'pending', owner: '20123456', photo: '', sharedWith: ['GUARD001', '20345678'] },
        { id: 4, name: 'City Bike', make: 'Cube', model: 'Travel', color: 'Black', status: 'approved', owner: '20234567', photo: '', sharedWith: ['ADMIN001'] },
        { id: 5, name: 'Campus Cruiser', make: 'Scott', model: 'Sub 10', color: 'Green', status: 'pending', owner: '20345678', photo: '', sharedWith: ['20234567'] },
        { id: 6, name: 'Urban Commuter', make: 'Cube', model: 'Agree C:62', color: 'Graphite', status: 'approved', owner: '20123456', photo: '', sharedWith: ['GUARD001'] },
        { id: 7, name: 'Weekend Trail Bike', make: 'Merida', model: 'Big Nine', color: 'Orange', status: 'approved', owner: '20123456', photo: '', sharedWith: ['ADMIN001', '20234567', '20345678'] }
      ],
      tags: [
        { id: 'ABC123', status: 'active', assigned: '20123456' },
        { id: 'DEF456', status: 'active', assigned: '20234567' },
        { id: 'GH4789', status: 'inactive', assigned: '20345678' }
      ],
      gates: [
        { id: 1, name: 'Gate 1', status: 'automatic', lastActivity: '08:12', openAlarms: 0 },
        { id: 2, name: 'Gate 2', status: 'automatic', lastActivity: '08:17', openAlarms: 0 },
        { id: 3, name: 'Gate 3', status: 'manual', lastActivity: '08:20', openAlarms: 1 },
        { id: 4, name: 'Gate 4', status: 'automatic', lastActivity: '08:26', openAlarms: 0 },
        { id: 5, name: 'Gate 5', status: 'automatic', lastActivity: '08:32', openAlarms: 0 },
        { id: 6, name: 'Gate 6', status: 'manual', lastActivity: '08:44', openAlarms: 1 },
        { id: 7, name: 'Gate 7', status: 'automatic', lastActivity: '08:51', openAlarms: 0 },
        { id: 8, name: 'Gate 8', status: 'automatic', lastActivity: '08:58', openAlarms: 0 },
        { id: 9, name: 'Gate 9', status: 'automatic', lastActivity: '09:02', openAlarms: 0 }
      ],
      crossings: buildMockCrossingData()
    };
  }

  function init() {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(getDefaultState()));
    }
  }

  function getState() {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || JSON.stringify(getDefaultState()));
  }

  function setState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function setCurrentSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function getCurrentUserId() {
    return currentSession().userId || '20123456';
  }

  function showToast(message, variant = 'success') {
    let toast = q('#toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    toast.style.background = variant === 'success' ? 'var(--success-bg)' : 'var(--warning-bg)';
    toast.style.color = variant === 'success' ? 'var(--success)' : 'var(--warning)';
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '../index.html';
  }

  function wireLoginRoleCards() {
    qa('.role-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        event.preventDefault();
        const role = card.dataset.role;
        const href = card.getAttribute('href');
        showLoginPrompt(role, href);
      });
    });
  }

  function showLoginPrompt(role, href) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    const roleText = role === 'student' ? 'Student / Staff' : role === 'guard' ? 'Security Guard' : 'Administrator';
    const expected = {
      student: { username: '20123456', password: 'student123' },
      guard: { username: 'GUARD001', password: 'guard123' },
      admin: { username: 'ADMIN001', password: 'admin123' }
    }[role];

    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Continue as ${roleText}</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label class="form-label" for="login-username">Username / student number</label>
            <input id="login-username" class="input" value="${expected.username}" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="login-password">Password</label>
            <input id="login-password" type="password" class="input" value="${expected.password}" />
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-primary" type="button" data-confirm="true">Continue</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-confirm="true"]').addEventListener('click', () => {
      const username = q('#login-username', modal).value.trim();
      const password = q('#login-password', modal).value.trim();
      if (username !== expected.username || password !== expected.password) {
        showToast('Invalid username or password', 'warning');
        return;
      }
      setCurrentSession({ role, userId: expected.username });
      modal.remove();
      window.location.href = href;
    });

    document.body.appendChild(modal);
  }

  function markActiveNav() {
    qa('.menu a').forEach((link) => {
      const current = window.location.pathname.split('/').pop();
      link.classList.toggle('active', current === link.getAttribute('href'));
    });
  }

  function statusLabel(value) {
    const labels = {
      approved: 'Approved',
      pending: 'Pending',
      lost: 'Lost',
      stolen: 'Stolen',
      automatic: 'Automatic',
      manual: 'Manual'
    };
    return labels[value] || value;
  }

  function parseDateString(value) {
    if (!value) return new Date();
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!match) return new Date();
    const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const [, day, monthName, year, hour, minute] = match;
    return new Date(Number(year), monthMap[monthName], Number(day), Number(hour), Number(minute));
  }

  function formatEntryDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hour}:${minute}`;
  }

  function getDateKey(date) {
    const d = date instanceof Date ? date : parseDateString(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function resolveImagePath(path) {
    if (!path) return '../images/bike-placeholder.svg';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    if (path.startsWith('../') || path.startsWith('/')) return path;
    return `../${path}`;
  }

  function renderSidebarUser() {
    const session = currentSession();
    const username = q('#sidebar-user-name');
    const userId = q('#sidebar-user-id');
    if (username) {
      username.textContent = session.role === 'guard' ? 'Guard User' : session.role === 'admin' ? 'Admin User' : 'Student User';
    }
    if (userId) {
      userId.textContent = session.userId || '20123456';
    }
  }

  function renderMyBikes() {
    const container = q('#my-bikes-list');
    if (!container) return;
    const state = getState();
    const currentUserId = getCurrentUserId();
    const bikes = state.bikes.filter((bike) => bike.owner === currentUserId && bike.removed !== true);
    container.innerHTML = '';

    if (!bikes.length) {
      container.innerHTML = '<div class="empty-state">No bikes registered yet.</div>';
      renderSharedAccessOverview();
      renderRemovedBikes();
      return;
    }

    bikes.forEach((bike) => {
      const card = document.createElement('div');
      card.className = 'bike-card';
      const sharedNames = (bike.sharedWith || []).map((id) => displaySharedId(id)).join(', ') || 'No shared users';
      const isLost = bike.status === 'lost';
      const statusClass = bike.status === 'approved' ? 'protected' : bike.status === 'pending' ? 'pending' : bike.status === 'lost' ? 'warning' : 'danger';

      card.innerHTML = `
        <div class="bike-image">
          <img src="${resolveImagePath(bike.photo)}" alt="${bike.name}" onerror="this.src='../images/bike-placeholder.svg';" />
        </div>
        <div class="bike-details">
          <h3>${bike.name}</h3>
          <div class="meta">Make: ${bike.make}<br />Model: ${bike.model}<br />Colour: ${bike.color}</div>
          <div style="margin-top:10px;"><span class="badge status-${statusClass}">${statusLabel(bike.status)}</span></div>
          <div class="bike-actions">
            <button class="btn btn-primary btn-inline" type="button" onclick="openSharedAccess(${bike.id})">Shared Access</button>
            <button class="btn ${isLost ? 'btn-success' : 'btn-warning'} btn-inline" type="button" onclick="${isLost ? `markBikeFound(${bike.id})` : `reportBike(${bike.id})`}">${isLost ? 'Found' : 'Report Lost'}</button>
            <button class="btn btn-danger btn-inline" type="button" onclick="removeBike(${bike.id})">Remove Bike</button>
          </div>
          <div class="meta" style="margin-top:10px;">Shared with: ${sharedNames}</div>
        </div>
      `;
      container.appendChild(card);
    });

    renderSharedAccessOverview();
    renderRemovedBikes();
  }

  function displaySharedId(id) {
    if (/^\d{8}$/.test(String(id))) return id;
    if (String(id).toUpperCase().startsWith('GUARD')) return '80000001';
    if (String(id).toUpperCase().startsWith('ADMIN')) return '80000002';
    return String(id).slice(0,8).padEnd(8,'0');
  }

  function confirmPrompt(title, message, exactText, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>${message}</p>
          <div class="modal-field">
            <label class="form-label" for="confirm-input">Type exactly: ${exactText}</label>
            <input id="confirm-input" class="input" type="text" />
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-danger" type="button" data-confirm="true">Confirm</button>
          </div>
        </div>
      </div>
    `;
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-confirm="true"]').addEventListener('click', () => {
      const value = q('#confirm-input', modal).value.trim();
      if (value !== exactText) {
        showToast('Confirmation value does not match.', 'warning');
        return;
      }
      modal.remove();
      callback();
    });
    document.body.appendChild(modal);
  }

  window.reportBike = function (bikeId) {
    confirmPrompt('Report bike lost', 'To confirm this action, type exactly CONFIRM.', 'CONFIRM', () => {
      const state = getState();
      const bike = state.bikes.find((entry) => entry.id === bikeId);
      if (!bike) return;
      bike.status = 'lost';
      setState(state);
      renderMyBikes();
      showToast(`${bike.name} reported lost`, 'warning');
    });
  };

  window.markBikeFound = function (bikeId) {
    const state = getState();
    const bike = state.bikes.find((entry) => entry.id === bikeId);
    if (!bike) return;
    bike.status = 'approved';
    setState(state);
    renderMyBikes();
    showToast(`${bike.name} marked as found`, 'success');
  };

  window.removeBike = function (bikeId) {
    confirmPrompt('Remove bike', 'To remove this bike from active use, type exactly REMOVE.', 'REMOVE', () => {
      const state = getState();
      const bike = state.bikes.find((entry) => entry.id === bikeId);
      if (!bike) return;
      bike.removed = true;
      bike.status = 'removed';
      setState(state);
      renderMyBikes();
      showToast(`${bike.name} removed from active use`, 'warning');
    });
  };

  window.restoreBike = function (bikeId) {
    const state = getState();
    const bike = state.bikes.find((entry) => entry.id === bikeId);
    if (!bike) return;
    bike.removed = false;
    bike.status = 'approved';
    setState(state);
    renderMyBikes();
    showToast(`${bike.name} restored`, 'success');
  };

  function renderSharedAccessOverview() {
    const target = q('#shared-access-overview');
    if (!target) return;
    const state = getState();
    const currentUserId = getCurrentUserId();
    const bikes = state.bikes.filter((bike) => bike.owner === currentUserId);
    target.innerHTML = '';

    if (!bikes.length) {
      target.innerHTML = '<div class="empty-state">No bikes yet.</div>';
      return;
    }

    const select = q('#shared-access-bike-select');
    if (select) {
      select.innerHTML = bikes.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    bikes.forEach((bike) => {
      const row = document.createElement('div');
      row.className = 'overview-item';
      const users = (bike.sharedWith || []).length
        ? (bike.sharedWith || []).map((id) => `<span class="user-chip">${displaySharedId(id)}</span>`).join('')
        : '<span class="empty-state">No shared users</span>';
      row.innerHTML = `<strong>${bike.name}</strong>${users}`;
      target.appendChild(row);
    });
  }

  function addSharedUserFromPanel() {
    const bikeSelect = q('#shared-access-bike-select');
    const input = q('#shared-access-add-number');
    if (!bikeSelect || !input) return;
    const bikeId = Number(bikeSelect.value);
    const value = input.value.trim();
    if (!/^\d{8}$/.test(value)) {
      showToast('Student number must be 8 digits', 'warning');
      return;
    }
    const state = getState();
    const bike = state.bikes.find((b) => b.id === bikeId);
    if (!bike) return;
    if (!bike.sharedWith) bike.sharedWith = [];
    if (!bike.sharedWith.includes(value)) bike.sharedWith.push(value);
    // Ensure the added shared user also exists in the global users list
    if (!state.users.some((u) => String(u.id) === value)) {
      state.users.push({ id: value, name: value, role: 'student', email: '', active: true, password: '' });
    }
    setState(state);
    input.value = '';
    renderMyBikes();
    showToast('Shared user added', 'success');
  }

  function renderRemovedBikes() {
    const container = q('#removed-bikes-list');
    if (!container) return;
    const state = getState();
    const currentUserId = getCurrentUserId();
    const removed = state.bikes.filter((b) => b.owner === currentUserId && b.removed === true);
    container.innerHTML = '';
    if (!removed.length) return;
    const header = document.createElement('div');
    header.className = 'card action-panel';
    header.innerHTML = '<h3>Removed bikes</h3>';
    container.appendChild(header);
    removed.forEach((bike) => {
      const card = document.createElement('div');
      card.className = 'bike-card';
      card.innerHTML = `
        <div class="bike-image">
          <img src="${resolveImagePath(bike.photo)}" alt="${bike.name}" onerror="this.src='../images/bike-placeholder.svg';" />
        </div>
        <div class="bike-details">
          <h3>${bike.name}</h3>
          <div class="meta">Removed from active use</div>
          <div class="bike-actions"><button class="btn btn-success" onclick="restoreBike(${bike.id})">Restore</button></div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function openSharedAccess(bikeId) {
    const state = getState();
    const bike = state.bikes.find((entry) => entry.id === bikeId);
    if (!bike) return;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    const users = state.users.filter((user) => user.id !== bike.owner);
    const options = users.map((user) => {
      const checked = (bike.sharedWith || []).includes(user.id) ? 'checked' : '';
      return `
        <div class="access-item">
          <label>
            <input type="checkbox" value="${user.id}" ${checked} />
            <span>${displaySharedId(user.id)}</span>
          </label>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Shared access for ${bike.name}</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="access-list">${options || '<div class="empty-state">No other users available.</div>'}</div>
          <div class="form-actions" style="margin-top:18px;">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-primary" type="button" data-save="true">Save access</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-save="true"]').addEventListener('click', () => {
      const selected = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
      bike.sharedWith = selected;
      setState(state);
      renderMyBikes();
      modal.remove();
      showToast('Shared access updated', 'success');
    });
    document.body.appendChild(modal);
  }

  window.openSharedAccess = openSharedAccess;

  function bindRegisterForm() {
    const form = q('#register-form');
    if (!form) return;
    const fileInput = q('#bikePhoto');
    const preview = q('#photo-preview');
    const uploadText = q('#photo-help');

    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          preview.innerHTML = '<span>Add photo</span>';
          uploadText.textContent = 'No file chosen';
          return;
        }
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          preview.innerHTML = `<img src="${loadEvent.target.result}" alt="Bike photo preview" />`;
          uploadText.textContent = file.name;
        };
        reader.readAsDataURL(file);
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const make = q('[name="make"]', form).value.trim();
      const model = q('[name="model"]', form).value.trim();
      const color = q('[name="color"]', form).value.trim();
      const photoFile = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!make || !model || !color) {
        showToast('Make, model and colour are required', 'warning');
        return;
      }

      if (photoFile) {
        const reader = new FileReader();
        reader.onload = () => {
          const state = getState();
          state.bikes.push({
            id: Date.now(),
            name: q('[name="bikeName"]', form).value.trim() || `${make} ${model}`,
            make,
            model,
            color,
            status: 'pending',
            owner: getCurrentUserId(),
            photo: reader.result,
            sharedWith: []
          });
          setState(state);
          form.reset();
          if (preview) preview.innerHTML = '<span>Add photo</span>';
          if (uploadText) uploadText.textContent = 'No file chosen';
          showToast('Bike submitted for approval', 'success');
        };
        reader.readAsDataURL(photoFile);
      } else {
        showToast('Photo is required', 'warning');
      }
    });
  }

  function bindAccountForm() {
    const form = q('#account-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstName = q('#firstName', form).value.trim();
      const lastName = q('#lastName', form).value.trim();
      const email = q('#email', form).value.trim();
      const studentNumber = q('#studentNumber', form).value.trim();
      if (!/^\d{8}$/.test(studentNumber)) {
        showToast('Student number must contain exactly 8 numeric digits', 'warning');
        return;
      }

      const state = getState();
      const currentId = getCurrentUserId();
      state.users = state.users.map((entry) => entry.id === currentId ? { ...entry, id: studentNumber, name: `${firstName} ${lastName}`.trim(), email } : entry);
      setState(state);
      setCurrentSession({ role: 'student', userId: studentNumber });
      q('#studentNumber', form).value = studentNumber;
      showToast('Account updated successfully', 'success');
    });

    const passwordForm = q('#password-form');
    if (!passwordForm) return;
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const current = q('#currentPassword', passwordForm).value.trim();
      const next = q('#newPassword', passwordForm).value.trim();
      const confirm = q('#confirmPassword', passwordForm).value.trim();
      if (!current || !next || !confirm) {
        showToast('Please complete all password fields', 'warning');
        return;
      }
      if (next.length < 8) {
        showToast('New password must be at least 8 characters', 'warning');
        return;
      }
      if (next !== confirm) {
        showToast('Passwords do not match', 'warning');
        return;
      }

      const state = getState();
      const user = state.users.find((entry) => entry.id === getCurrentUserId()) || state.users[0];
      user.password = next;
      setState(state);
      passwordForm.reset();
      showToast('Password updated successfully', 'success');
    });
  }

  function renderGateBoard() {
    const state = getState();
    const crossings = q('#k-crossings');
    const alarms = q('#k-alarms');
    const manual = q('#k-manual');
    const gateActivity = q('#gate-activity');
    const alarmList = q('#alarms-list');
    const todayKey = getDateKey(new Date());
    const todayCrossings = state.crossings.filter((c) => getDateKey(parseDateString(c.when)) === todayKey);
    const openAlarmCount = todayCrossings.filter((c) => c.result === 'Alarm').length;

    if (crossings) crossings.textContent = String(todayCrossings.length);
    if (alarms) alarms.textContent = String(openAlarmCount);
    if (manual) manual.textContent = String(state.gates.filter((gate) => gate.status === 'manual').length);

    if (gateActivity) {
      gateActivity.innerHTML = '';
      state.gates.forEach((gate) => {
        const row = document.createElement('div');
        row.className = 'gate-activity-card';
        row.innerHTML = `
          <div class="alarm-top">
            <span class="alarm-title">${gate.name}</span>
            <span class="badge status-${gate.status === 'manual' ? 'warning' : 'protected'}">${gate.status === 'manual' ? 'Manual' : 'Automatic'}</span>
          </div>
          <div class="alarm-meta">Last check: ${gate.lastActivity}</div>
        `;
        gateActivity.appendChild(row);
      });
    }

    if (alarmList) {
      alarmList.innerHTML = '';
      const alerts = todayCrossings.filter((entry) => entry.result === 'Alarm' || entry.result === 'Resolved');
      if (!alerts.length) {
        alarmList.innerHTML = '<div class="empty-state">No alarm activity recorded today.</div>';
        return;
      }

      alerts.forEach((entry, idx) => {
        if (!entry.id) entry.id = `cross-${Date.now()}-${idx}`;
        const row = document.createElement('div');
        row.className = 'alarm-item';
        const isResolved = entry.result === 'Resolved';
        const statusClass = isResolved ? 'status-success' : 'status-danger';
        const actionMarkup = isResolved
          ? ''
          : `<div class="alarm-action-row"><button class="btn btn-primary" type="button" onclick="handleAlarm('${entry.id}')">Handle Alarm</button></div>`;

        const displayReason = entry.reason && entry.reason.trim() ? entry.reason : (isResolved ? 'Manual verification completed' : 'Unregistered tag');
        row.innerHTML = `
          <div class="alarm-top">
            <span class="alarm-title">${entry.bike || 'Unknown bike'}</span>
            <span class="badge ${statusClass}">${entry.result}</span>
          </div>
          <div class="alarm-detail">
            <div class="alarm-detail-row"><strong>Reason:</strong> ${displayReason}</div>
            <div class="alarm-detail-row"><strong>Student:</strong> ${entry.person || 'Unknown'}</div>
            <div class="alarm-detail-row"><strong>Tag:</strong> ${entry.tag || 'Unknown'}</div>
            <div class="alarm-detail-row"><strong>Gate:</strong> ${entry.gate}</div>
            <div class="alarm-detail-row"><strong>Time:</strong> ${entry.when}</div>
            ${isResolved && entry.notes ? `<div class="alarm-detail-row"><strong>Notes:</strong> ${entry.notes}</div>` : ''}
          </div>
          ${actionMarkup}
        `;
        alarmList.appendChild(row);
      });
      setState(state);
    }
  }

  function renderManualChecks() {
    const container = q('#manual-checks');
    if (!container) return;
    const state = getState();
    container.innerHTML = '';

    state.gates.forEach((gate) => {
      const card = document.createElement('div');
      card.className = 'gate-card';
      card.innerHTML = `
        <div class="gate-head">
          <span class="gate-name">${gate.name}</span>
          <span class="gate-status ${gate.status === 'manual' ? 'manual' : 'auto'}">${gate.status === 'manual' ? 'Manual' : 'Automatic'}</span>
        </div>
        <div class="gate-body">
          <span class="gate-time">Last update: ${gate.lastActivity}</span>
        </div>
        <div class="gate-cta">
          <button class="btn ${gate.status === 'manual' ? 'btn-ghost' : 'btn-primary'}" type="button" onclick="toggleManualMode(${gate.id})">${gate.status === 'manual' ? 'Switch to automatic' : 'Switch to manual'}</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  window.toggleManualMode = function (gateId) {
    const state = getState();
    const gate = state.gates.find((entry) => entry.id === gateId);
    if (!gate) return;
    gate.status = gate.status === 'manual' ? 'automatic' : 'manual';
    gate.openAlarms = gate.status === 'manual' ? 1 : 0;
    setState(state);
    renderManualChecks();
    renderGateBoard();
  };

  function handleAlarm(entryId) {
    const state = getState();
    const entry = state.crossings.find((item) => item.id === entryId);
    if (!entry || entry.result === 'Resolved') return;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Resolve alarm</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-field required">
            <label class="form-label" for="alarm-reason">Resolution reason</label>
            <select id="alarm-reason" class="input" required>
              <option value="">Select a reason</option>
              <option value="False alarm">False alarm</option>
              <option value="Tag belongs to another bike">Tag belongs to another bike</option>
              <option value="Tag reported lost/stolen">Tag reported lost/stolen</option>
              <option value="Unregistered tag">Unregistered tag</option>
              <option value="Manual verification completed">Manual verification completed</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="modal-field">
            <label class="form-label" for="alarm-notes">Notes</label>
            <textarea id="alarm-notes" class="textarea" placeholder="Optional notes"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-primary" type="button" data-save="true">Submit result</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-save="true"]').addEventListener('click', () => {
      const reason = q('#alarm-reason', modal).value.trim();
      const notes = q('#alarm-notes', modal).value.trim();
      if (!reason) {
        showToast('Please select a resolution reason before completing the alarm.', 'warning');
        q('#alarm-reason', modal).focus();
        return;
      }
      const target = state.crossings.find((item) => item.id === entryId);
      if (target) {
        target.result = 'Resolved';
        target.reason = reason;
        target.notes = notes;
      }
      setState(state);
      renderGateBoard();
      renderCrossingLog();
      modal.remove();
      showToast('Alarm resolved and recorded in history', 'success');
    });
    document.body.appendChild(modal);
  }

  window.handleAlarm = handleAlarm;

  function renderCrossingLog() {
    const tbody = q('#crossing-body');
    if (!tbody) return;
    const state = getState();
    tbody.innerHTML = '';
    const gateFilter = q('#crossing-gate');
    const studentFilter = q('#crossing-student');
    const resultFilter = q('#crossing-result');
    const dateFilter = q('#crossing-date');

    let entries = [...state.crossings];
    if (gateFilter && gateFilter.value) entries = entries.filter((entry) => entry.gate === gateFilter.value);
    if (studentFilter && studentFilter.value) entries = entries.filter((entry) => entry.person.includes(studentFilter.value.trim()));
    if (resultFilter && resultFilter.value) entries = entries.filter((entry) => entry.result === resultFilter.value);
    if (dateFilter && dateFilter.value) entries = entries.filter((entry) => getDateKey(parseDateString(entry.when)) === dateFilter.value);

    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No matching crossings.</td></tr>';
      return;
    }

    entries.forEach((entry) => {
      const tr = document.createElement('tr');
      const resultClass = entry.result === 'Resolved' ? 'status-success' : entry.result === 'Alarm' ? 'status-danger' : 'status-protected';
      const normalizedReason = entry.reason && entry.reason.trim() ? entry.reason : (entry.result === 'Resolved' ? 'Manual verification completed' : 'Unregistered tag');
      const reasonCell = `${normalizedReason}${entry.notes ? ` · ${entry.notes}` : ''}`;
      tr.innerHTML = `
        <td>${entry.when}</td>
        <td>${entry.person}</td>
        <td>${entry.bike}</td>
        <td>${entry.gate}</td>
        <td>${entry.tag}</td>
        <td><span class="badge ${resultClass}">${entry.result}</span></td>
        <td>${reasonCell}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function exportCsv() {
    const state = getState();
    const gateFilter = q('#crossing-gate');
    const studentFilter = q('#crossing-student');
    const resultFilter = q('#crossing-result');
    const dateFilter = q('#crossing-date');

    let entries = [...state.crossings];
    if (gateFilter && gateFilter.value) entries = entries.filter((entry) => entry.gate === gateFilter.value);
    if (studentFilter && studentFilter.value) entries = entries.filter((entry) => entry.person.includes(studentFilter.value.trim()));
    if (resultFilter && resultFilter.value) entries = entries.filter((entry) => entry.result === resultFilter.value);
    if (dateFilter && dateFilter.value) entries = entries.filter((entry) => getDateKey(parseDateString(entry.when)) === dateFilter.value);

    const rows = [
      ['When', 'Person', 'Bike', 'Gate', 'Tag', 'Result', 'Check', 'Reason', 'Notes'],
      ...entries.map((entry) => [entry.when, entry.person, entry.bike, entry.gate, entry.tag, entry.result, entry.check, entry.reason || '', entry.notes || ''])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'crossings.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded', 'success');
  }

  function renderRegistrations() {
    const body = q('#registrations-body');
    if (!body) return;
    const state = getState();
    const pending = state.bikes.filter((bike) => bike.status === 'pending');
    body.innerHTML = '';

    if (!pending.length) {
      body.innerHTML = '<tr><td colspan="5"><span class="empty-state">No pending registrations.</span></td></tr>';
      return;
    }

    pending.forEach((bike) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${bike.owner}</td>
        <td>${bike.name}</td>
        <td>${bike.make} / ${bike.model}</td>
        <td><span class="badge status-pending">Pending</span></td>
        <td class="table-actions">
          <button class="btn btn-success" type="button" onclick="approveRegistration(${bike.id})">Approve</button>
          <button class="btn btn-ghost" type="button" onclick="sendBackRegistration(${bike.id})">Send back</button>
        </td>
      `;
      body.appendChild(row);
    });
  }

  window.approveRegistration = function (bikeId) {
    const state = getState();
    const bike = state.bikes.find((entry) => entry.id === bikeId);
    if (!bike || bike.status !== 'pending') return;
    bike.status = 'approved';
    setState(state);
    renderRegistrations();
    showToast('Registration approved', 'success');
  };

  window.sendBackRegistration = function (bikeId) {
    const state = getState();
    const bike = state.bikes.find((entry) => entry.id === bikeId);
    if (!bike) return;
    bike.status = 'pending';
    setState(state);
    renderRegistrations();
    showToast('Registration sent back for edits', 'warning');
  };

  function renderTags() {
    const body = q('#tags-body');
    if (!body) return;
    const state = getState();
    body.innerHTML = '';

    state.tags.forEach((tag) => {
      const row = document.createElement('tr');
      const statusClass = tag.status === 'active' ? 'status-protected' : 'status-danger';
      row.innerHTML = `
        <td>${tag.id}</td>
        <td><span class="badge ${statusClass}">${tag.status === 'active' ? 'Active' : 'Inactive'}</span></td>
        <td>${tag.assigned || '—'}</td>
        <td class="table-actions">
          <button class="btn btn-primary" type="button" onclick="replaceTag('${tag.id}')">Replace</button>
          <button class="btn ${tag.status === 'active' ? 'btn-danger' : 'btn-success'}" type="button" onclick="toggleTagStatus('${tag.id}')">${tag.status === 'active' ? 'Deactivate' : 'Activate'}</button>
        </td>
      `;
      body.appendChild(row);
    });
  }

  window.replaceTag = function (tagId) {
    showToast(`Replacement issued for ${tagId}`, 'success');
  };

  window.toggleTagStatus = function (tagId) {
    const state = getState();
    const tag = state.tags.find((entry) => entry.id === tagId);
    if (!tag) return;
    tag.status = tag.status === 'active' ? 'inactive' : 'active';
    setState(state);
    renderTags();
    showToast(tag.status === 'active' ? 'Tag activated' : 'Tag deactivated', 'success');
  };

  function renderUsers() {
    const body = q('#users-body');
    if (!body) return;
    const state = getState();
    body.innerHTML = '';

    state.users.forEach((user) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email || ''}</td>
        <td><span class="badge status-info">${user.role}</span></td>
        <td class="table-actions">
          <button class="btn ${user.active === false ? 'btn-success' : 'btn-danger'}" type="button" onclick="toggleUserStatus('${user.id}')">${user.active === false ? 'Activate' : 'Deactivate'}</button>
        </td>
      `;
      body.appendChild(row);
    });
  }

  window.toggleUserStatus = function (userId) {
    const state = getState();
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.active = user.active === false;
    setState(state);
    renderUsers();
    showToast(user.active === true ? 'User activated' : 'User deactivated', 'success');
  };

  function showAddUserModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Add user</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label class="form-label" for="new-user-id">ID (student number or user id)</label>
            <input id="new-user-id" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-name">Full name</label>
            <input id="new-user-name" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-email">Email</label>
            <input id="new-user-email" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-role">Role</label>
            <select id="new-user-role" class="input">
              <option value="student">Student</option>
              <option value="guard">Guard</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-campus">Campus (optional)</label>
            <input id="new-user-campus" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-faculty">Faculty (optional)</label>
            <input id="new-user-faculty" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-user-password">Password</label>
            <input id="new-user-password" type="password" class="input" />
          </div>
          <div class="modal-field">
            <label><input id="new-user-active" type="checkbox" checked /> Active</label>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-primary" type="button" data-save="true">Create user</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-save="true"]').addEventListener('click', () => {
      const id = q('#new-user-id', modal).value.trim();
      const name = q('#new-user-name', modal).value.trim();
      const email = q('#new-user-email', modal).value.trim();
      const role = q('#new-user-role', modal).value;
      const campus = q('#new-user-campus', modal).value.trim();
      const faculty = q('#new-user-faculty', modal).value.trim();
      const password = q('#new-user-password', modal).value.trim();
      const active = q('#new-user-active', modal).checked;

      if (!id || !name) {
        showToast('Please provide an ID and name for the user', 'warning');
        return;
      }

      const state = getState();
      if (state.users.some((u) => String(u.id) === id)) {
        showToast('A user with that ID already exists', 'warning');
        return;
      }

      state.users.push({ id, name, role, email, campus: campus || undefined, faculty: faculty || undefined, active: active === true, password: password || '' });
      setState(state);
      renderUsers();
      modal.remove();
      showToast('User added', 'success');
    });

    document.body.appendChild(modal);
  }

  function showAddTagModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Add tag</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label class="form-label" for="new-tag-id">Tag ID</label>
            <input id="new-tag-id" class="input" />
          </div>
          <div class="modal-field">
            <label class="form-label" for="new-tag-status">Status</label>
            <select id="new-tag-status" class="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
            <div class="modal-field required">
              <label class="form-label" for="new-tag-assigned">Assigned to (required — any user ID)</label>
              <input id="new-tag-assigned" class="input" />
            </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" data-close="true">Cancel</button>
            <button class="btn btn-primary" type="button" data-save="true">Create tag</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-close="true"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-save="true"]').addEventListener('click', () => {
      const id = q('#new-tag-id', modal).value.trim();
      const status = q('#new-tag-status', modal).value;
      const assigned = q('#new-tag-assigned', modal).value.trim();
      if (!id) {
        showToast('Please provide a tag ID', 'warning');
        return;
      }
      if (!assigned) {
        showToast('Please provide an assigned ID for this tag', 'warning');
        return;
      }
      const state = getState();
      if (state.tags.some((t) => String(t.id) === id)) {
        showToast('A tag with that ID already exists', 'warning');
        return;
      }
      state.tags.push({ id, status, assigned });
      setState(state);
      renderTags();
      modal.remove();
      showToast('Tag added', 'success');
    });

    document.body.appendChild(modal);
  }

  function getCanvasSize(canvas, fallbackWidth, fallbackHeight) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || fallbackWidth;
    const height = rect.height || fallbackHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height, ctx, dpr };
  }

  function buildGateCountsForDate(dateValue) {
    const counts = Array.from({ length: 9 }, (_, i) => ({ gate: `Gate ${i + 1}`, count: 0 }));
    const state = getState();
    state.crossings.forEach((entry) => {
      if (getDateKey(parseDateString(entry.when)) !== dateValue) return;
      const gateNumber = Number((entry.gate || 'Gate 1').replace(/\D/g, '')) || 1;
      if (gateNumber >= 1 && gateNumber <= 9) counts[gateNumber - 1].count += 1;
    });
    return counts;
  }

  function drawBarChart(canvas, data, xLabel) {
    const { width, height, ctx } = getCanvasSize(canvas, 720, 220);
    const labels = data.map((item) => item.gate);
    const values = data.map((item) => item.count);
    const padding = { top: 18, right: 18, bottom: 42, left: 42 };
    const max = Math.max(...values, 1);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#D9DEE8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + ((height - padding.top - padding.bottom) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#172033';
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'center';

    const innerWidth = width - padding.left - padding.right;
    const barWidth = innerWidth / labels.length * 0.62;
    const step = innerWidth / labels.length;

    values.forEach((value, index) => {
      const x = padding.left + index * step + (step - barWidth) / 2;
      const barHeight = (value / max) * (height - padding.top - padding.bottom);
      const y = height - padding.bottom - barHeight;
      ctx.fillStyle = '#3B20B2';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#172033';
      ctx.font = '12px Segoe UI';
      if (value > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(String(value), x + barWidth / 2, y - 8);
      }
      ctx.font = '11px Segoe UI';
      ctx.fillText(labels[index], x + barWidth / 2, height - 18);
    });
  }

  function drawHistoryChart(canvas, days) {
    const today = new Date();
    const labels = [];
    const values = [];
    const state = getState();

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      labels.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      const dayKey = getDateKey(date);
      const count = state.crossings.filter((c) => getDateKey(parseDateString(c.when)) === dayKey).length;
      values.push(count);
    }

    const { width, height, ctx } = getCanvasSize(canvas, 720, 220);
    const padding = { top: 18, right: 18, bottom: 42, left: 42 };
    const max = Math.max(...values, 1);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#D9DEE8';
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + ((height - padding.top - padding.bottom) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const innerWidth = width - padding.left - padding.right;
    const step = innerWidth / labels.length;
    const barWidth = Math.max(18, step * 0.62);

    values.forEach((value, index) => {
      const x = padding.left + index * step + (step - barWidth) / 2;
      const barHeight = (value / max) * (height - padding.top - padding.bottom);
      const y = height - padding.bottom - barHeight;
      ctx.fillStyle = index % 2 === 0 ? '#3B20B2' : '#4B2AC7';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#172033';
      ctx.font = '11px Segoe UI';
      ctx.textAlign = 'center';
      if (value > 0) ctx.fillText(String(value), x + barWidth / 2, y - 8);
      ctx.fillText(labels[index], x + barWidth / 2, height - 18);
    });
  }

  function renderMonthCalendar() {
    const calendar = q('#date-calendar');
    const picker = q('#date-specific-picker');
    if (!calendar || !picker) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cells = [];

    dayNames.forEach((day) => {
      cells.push(`<div class="calendar-day-label">${day}</div>`);
    });

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="calendar-day is-outside"></div>');
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const d = new Date(year, month, day);
      const dateKey = getDateKey(d);
      const selected = picker.value === dateKey;
      const isToday = getDateKey(today) === dateKey;
      const future = d > today;
      const disabledClass = future ? 'is-disabled' : '';
      const todayClass = isToday ? 'is-today' : '';
      const selectedClass = selected ? 'is-selected' : '';
      cells.push(`<button type="button" class="calendar-day ${todayClass} ${selectedClass} ${disabledClass}" data-date="${dateKey}" ${future ? 'disabled' : ''}>${day}</button>`);
    }

    calendar.innerHTML = cells.join('');

    qa('.calendar-day[data-date]', calendar).forEach((button) => {
      button.addEventListener('click', () => {
        const selected = button.dataset.date;
        if (!selected) return;
        const selectedDate = new Date(selected + 'T00:00:00');
        if (selectedDate > today) return;
        picker.value = selected;
        renderDateSpecificChart();
        renderMonthCalendar();
      });
    });
  }

  function renderDateSpecificChart() {
    const picker = q('#date-specific-picker');
    const panel = q('#date-specific-panel');
    const chart = q('#date-gate-chart');

    if (!picker || !panel || !chart) return;
    if (!picker.value) {
      panel.classList.add('hidden');
      return;
    }
    const selected = new Date(`${picker.value}T00:00:00`);
    const today = new Date();
    if (selected > today) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    drawBarChart(chart, buildGateCountsForDate(picker.value), 'Gate');
  }

  function renderReportsCharts() {
    const state = getState();
    const todayCanvas = q('#today-crossings-chart');
    const historyCanvas = q('#history-crossings-chart');
    const dateChart = q('#date-gate-chart');
    const picker = q('#date-specific-picker');
    const datePanel = q('#date-specific-panel');

    if (todayCanvas) {
      const todayKey = getDateKey(new Date());
      const counts = buildGateCountsForDate(todayKey);
      drawBarChart(todayCanvas, counts, 'Gate');
    }

    if (historyCanvas) drawHistoryChart(historyCanvas, 7);
    qa('.range-btn').forEach((button) => {
      button.addEventListener('click', () => {
        qa('.range-btn').forEach((item) => item.classList.toggle('active', item === button));
        drawHistoryChart(historyCanvas, Number(button.dataset.days || 7));
      });
    });

    if (picker) {
      renderMonthCalendar();
      renderDateSpecificChart();
      if (dateChart && picker.value) {
        drawBarChart(dateChart, buildGateCountsForDate(picker.value), 'Gate');
      }
    }

    if (datePanel && !picker.value) {
      datePanel.classList.add('hidden');
    }

    const repCrossings = q('#rep-crossings');
    const repGates = q('#rep-gates');
    const repSuccess = q('#rep-success');
    if (repCrossings) repCrossings.textContent = String(state.crossings.filter((c) => getDateKey(parseDateString(c.when)) === getDateKey(new Date())).length);
    if (repGates) repGates.textContent = String(state.gates.filter((g) => g.status === 'manual').length || 0);
    if (repSuccess) repSuccess.textContent = '96.8%';
  }

  function renderAllCharts() {
    renderReportsCharts();
    const historyCanvas = q('#history-crossings-chart');
    const selected = q('#date-specific-picker');
    const todayCanvas = q('#today-crossings-chart');
    const dateChart = q('#date-gate-chart');
    if (historyCanvas) {
      const active = q('.range-btn.active') || q('.range-btn');
      const days = Number((active || {}).dataset?.days || 7);
      drawHistoryChart(historyCanvas, days);
    }
    if (todayCanvas) drawBarChart(todayCanvas, buildGateCountsForDate(getDateKey(new Date())), 'Gate');
    if (selected && selected.value && dateChart) drawBarChart(dateChart, buildGateCountsForDate(selected.value), 'Gate');
  }

  function bindManualCrossingForm() {
    const form = q('#manual-crossing-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const student = q('#manual-student-number', form).value.trim();
      const bike = q('#manual-bike', form).value.trim();
      const tag = q('#manual-tag', form).value.trim();
      const gate = q('#manual-gate', form).value.trim();

      if (!student || !bike || !tag || !gate) {
        showToast('Please complete all manual crossing fields.', 'warning');
        return;
      }

      const state = getState();
      const studentExists = state.users.some((user) => user.id === student);
      const bikeMatch = state.bikes.some((entry) => entry.name.toLowerCase() === bike.toLowerCase() && entry.owner === student);
      const tagMatch = state.tags.some((entry) => entry.id.toLowerCase() === tag.toLowerCase() && entry.assigned === student);
      const matchesSystem = studentExists && bikeMatch && tagMatch;
      const mismatchReason = !studentExists
        ? 'Student not found in system'
        : !bikeMatch
          ? 'Bike does not match the student record'
          : !tagMatch
            ? 'RFID tag does not match the student record'
            : '';

      const whenDate = new Date();
      const result = matchesSystem ? 'Success' : 'Alarm';
      const newEntry = {
        id: `manual-${Date.now()}`,
        when: formatEntryDate(whenDate),
        person: student,
        bike,
        gate,
        tag,
        result,
        check: 'Manual',
        reason: matchesSystem ? 'Manual verification completed' : (mismatchReason || 'Manual verification failed'),
        notes: ''
      };

      state.crossings.unshift(newEntry);
      setState(state);
      form.reset();
      renderGateBoard();
      renderCrossingLog();
      renderReportsCharts();
      showToast(matchesSystem ? 'Crossing logged successfully' : 'Alarm raised for unmatched crossing', matchesSystem ? 'success' : 'warning');
    });
  }

  function bindInventoryActions() {
    const exportBtn = q('#export-csv');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);
    const signoutButton = q('#signout-button');
    if (signoutButton) signoutButton.addEventListener('click', signOut);
    const addSharedBtn = q('#shared-access-add-btn');
    if (addSharedBtn) addSharedBtn.addEventListener('click', addSharedUserFromPanel);
    const addUserBtn = q('#add-user-btn');
    if (addUserBtn) addUserBtn.addEventListener('click', showAddUserModal);
    const addTagBtn = q('#add-tag-btn');
    if (addTagBtn) addTagBtn.addEventListener('click', showAddTagModal);

    const crossingDate = q('#crossing-date');
    if (crossingDate) {
      const today = new Date();
      const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      crossingDate.max = todayIso;
      if (crossingDate.value && crossingDate.value > todayIso) {
        crossingDate.value = todayIso;
      }
    }

    [
      q('#crossing-gate'),
      q('#crossing-student'),
      q('#crossing-result'),
      q('#crossing-date')
    ].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (input.id === 'crossing-date') {
          const todayIso = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          if (input.value && input.value > todayIso) {
            input.value = todayIso;
          }
        }
        renderCrossingLog();
      });
      input.addEventListener('change', () => {
        if (input.id === 'crossing-date') {
          const todayIso = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          if (input.value && input.value > todayIso) {
            input.value = todayIso;
          }
        }
        renderCrossingLog();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    markActiveNav();
    wireLoginRoleCards();
    renderSidebarUser();
    renderMyBikes();
    bindRegisterForm();
    bindAccountForm();
    renderGateBoard();
    renderManualChecks();
    renderCrossingLog();
    renderRegistrations();
    renderTags();
    renderUsers();
    renderReportsCharts();
    bindManualCrossingForm();
    bindInventoryActions();
    window.addEventListener('resize', renderAllCharts);

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    if (!q('#toast')) document.body.appendChild(toast);
  });
})();