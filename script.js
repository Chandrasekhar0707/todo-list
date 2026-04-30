/**
 * TASKR — Smart To-Do List
 * script.js
 *
 * Features:
 *  - Add / Edit / Delete tasks
 *  - Mark complete (checkbox + strikethrough)
 *  - localStorage persistence
 *  - Dark / Light theme toggle
 *  - Timestamps on each task
 *  - Filter: All / Pending / Completed
 *  - Search / live filter
 *  - Drag-and-drop reordering
 */

/* ─── State ─────────────────────────────────────── */
let tasks       = [];          // Array of task objects
let editId      = null;        // ID of task being edited
let currentFilter = 'all';     // 'all' | 'pending' | 'completed'
let dragSrcEl   = null;        // Element being dragged

/* ─── DOM References ─────────────────────────────── */
const taskList       = document.getElementById('taskList');
const taskInput      = document.getElementById('taskInput');
const addBtn         = document.getElementById('addBtn');
const searchInput    = document.getElementById('searchInput');
const filterTabs     = document.querySelectorAll('.filter-tab');
const emptyState     = document.getElementById('emptyState');
const listFooter     = document.getElementById('listFooter');
const themeToggle    = document.getElementById('themeToggle');
const editModal      = document.getElementById('editModal');
const editInput      = document.getElementById('editInput');
const saveEditBtn    = document.getElementById('saveEdit');
const cancelEditBtn  = document.getElementById('cancelEdit');
const closeModalBtn  = document.getElementById('closeModal');
const clearBtn       = document.getElementById('clearCompleted');
const statTotal      = document.getElementById('statTotal');
const statPending    = document.getElementById('statPending');
const statDone       = document.getElementById('statDone');

/* ─── Utilities ──────────────────────────────────── */

/** Generate a unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Format a timestamp into a readable string */
function formatDate(ts) {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

/* ─── Persistence ────────────────────────────────── */

/** Save tasks array to localStorage */
function saveTasks() {
  localStorage.setItem('taskr_tasks', JSON.stringify(tasks));
}

/** Load tasks from localStorage */
function loadTasks() {
  const raw = localStorage.getItem('taskr_tasks');
  tasks = raw ? JSON.parse(raw) : [];
}

/* ─── Theme ──────────────────────────────────────── */

/** Apply saved theme on load */
function loadTheme() {
  const saved = localStorage.getItem('taskr_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/** Toggle between dark and light */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskr_theme', next);
}

themeToggle.addEventListener('click', toggleTheme);

/* ─── Add Task ───────────────────────────────────── */

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    // Shake the input if empty
    taskInput.classList.add('shake');
    setTimeout(() => taskInput.classList.remove('shake'), 400);
    return;
  }

  const task = {
    id:        uid(),
    text:      text,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(task); // Add to beginning
  saveTasks();
  taskInput.value = '';
  render();
}

// Click add button
addBtn.addEventListener('click', addTask);

// Press Enter in task input
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

/* ─── Delete Task ────────────────────────────────── */

function deleteTask(id) {
  // Animate removal first
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  }
}

/* ─── Toggle Complete ────────────────────────────── */

function toggleComplete(id) {
  tasks = tasks.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTasks();
  render();
}

/* ─── Edit Task (Modal) ──────────────────────────── */

function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editId           = id;
  editInput.value  = task.text;
  editModal.classList.remove('hidden');
  editInput.focus();
  editInput.select();
}

function closeEdit() {
  editModal.classList.add('hidden');
  editId = null;
}

function saveEdit() {
  const text = editInput.value.trim();
  if (!text) return;
  tasks = tasks.map(t =>
    t.id === editId ? { ...t, text } : t
  );
  saveTasks();
  closeEdit();
  render();
}

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', closeEdit);
closeModalBtn.addEventListener('click', closeEdit);

// Save on Enter key in edit modal
editInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEdit();
});

// Close modal on backdrop click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEdit();
});

/* ─── Clear Completed ────────────────────────────── */

clearBtn.addEventListener('click', () => {
  // Animate all completed items out
  const completed = document.querySelectorAll('.task-item.completed');
  if (!completed.length) return;

  let count = 0;
  completed.forEach(el => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      count++;
      if (count === completed.length) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        render();
      }
    }, { once: true });
  });
});

/* ─── Filter Tabs ────────────────────────────────── */

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

/* ─── Search ─────────────────────────────────────── */

searchInput.addEventListener('input', () => render());

/* ─── Drag and Drop ──────────────────────────────── */

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Remove drag-over from all, add to current target
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
  this.classList.add('drag-over');
  return false;
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.stopPropagation();
  if (dragSrcEl !== this) {
    const srcId  = dragSrcEl.dataset.id;
    const destId = this.dataset.id;
    const srcIdx  = tasks.findIndex(t => t.id === srcId);
    const destIdx = tasks.findIndex(t => t.id === destId);
    // Swap in array
    const [moved] = tasks.splice(srcIdx, 1);
    tasks.splice(destIdx, 0, moved);
    saveTasks();
    render();
  }
  return false;
}

function handleDragEnd() {
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
  dragSrcEl = null;
}

/* ─── Render ─────────────────────────────────────── */

/**
 * Build and inject the visible task list based on current
 * filter and search query.
 */
function render() {
  const query = searchInput.value.trim().toLowerCase();

  // Apply filter
  let visible = tasks.filter(t => {
    if (currentFilter === 'pending')   return !t.completed;
    if (currentFilter === 'completed') return  t.completed;
    return true;
  });

  // Apply search
  if (query) {
    visible = visible.filter(t => t.text.toLowerCase().includes(query));
  }

  // Clear list
  taskList.innerHTML = '';

  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
    listFooter.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    listFooter.classList.remove('hidden');

    visible.forEach(task => {
      const li = createTaskEl(task);
      taskList.appendChild(li);
    });
  }

  // Re-initialise Lucide icons for newly created elements
  if (window.lucide) lucide.createIcons();

  // Update stats
  updateStats();
}

/** Create a <li> element for a task */
function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.dataset.id = task.id;
  li.setAttribute('draggable', 'true');

  li.innerHTML = `
    <input
      type="checkbox"
      class="task-checkbox"
      ${task.completed ? 'checked' : ''}
      aria-label="Mark task complete"
    />
    <div class="task-body">
      <div class="task-text">${escapeHtml(task.text)}</div>
      <div class="task-meta">
        <i data-lucide="clock"></i>
        <span>${formatDate(task.createdAt)}</span>
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
        <i data-lucide="pencil"></i>
      </button>
      <button class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  // Checkbox event
  li.querySelector('.task-checkbox').addEventListener('change', () => {
    toggleComplete(task.id);
  });

  // Edit button
  li.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openEdit(task.id);
  });

  // Delete button
  li.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  // Drag and drop events
  li.addEventListener('dragstart',  handleDragStart);
  li.addEventListener('dragover',   handleDragOver);
  li.addEventListener('dragleave',  handleDragLeave);
  li.addEventListener('drop',       handleDrop);
  li.addEventListener('dragend',    handleDragEnd);

  return li;
}

/** Update the stats counters */
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;

  statTotal.textContent   = total;
  statPending.textContent = pending;
  statDone.textContent    = done;
}

/** Safely escape HTML to prevent XSS */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Init ───────────────────────────────────────── */

(function init() {
  loadTheme();
  loadTasks();
  render();

  // Focus task input on load (desktop)
  if (window.innerWidth > 600) taskInput.focus();
})();
