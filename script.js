const STORE_KEY = 'flow.board';

const COLUMNS = [
  { key: 'todo', title: 'To Do', color: '#6b8bff' },
  { key: 'progress', title: 'In Progress', color: '#ffb020' },
  { key: 'done', title: 'Done', color: '#3ddc97' },
];

const DEFAULT_BOARD = {
  todo: [
    { id: 'a1', text: 'Design the landing page hero', priority: 'high' },
    { id: 'a2', text: 'Collect customer feedback', priority: 'medium' },
  ],
  progress: [{ id: 'b1', text: 'Build the onboarding flow', priority: 'medium' }],
  done: [{ id: 'c1', text: 'Set up the project repository', priority: 'low' }],
};

let board = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || structuredClone(DEFAULT_BOARD);

const boardEl = document.getElementById('board');
const totalStat = document.getElementById('totalStat');
const clearBtn = document.getElementById('clearBtn');
const toast = document.getElementById('toast');

let dragData = null;
let addingTo = null;

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(board));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1700);
}

function totalCards() {
  return COLUMNS.reduce((sum, col) => sum + board[col.key].length, 0);
}

function findCard(id) {
  for (const col of COLUMNS) {
    const found = board[col.key].find((card) => card.id === id);
    if (found) return { card: found, column: col.key };
  }
  return null;
}

function render() {
  boardEl.innerHTML = '';

  COLUMNS.forEach((col) => {
    const column = document.createElement('section');
    column.className = 'column';
    column.dataset.column = col.key;

    const head = document.createElement('div');
    head.className = 'col-head';
    head.innerHTML = `
      <span class="col-title"><span class="col-dot" style="background:${col.color}"></span>${col.title}</span>
      <span class="col-count">${board[col.key].length}</span>`;
    column.appendChild(head);

    const list = document.createElement('div');
    list.className = 'card-list';
    list.dataset.column = col.key;

    if (board[col.key].length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-col';
      empty.textContent = 'Drop cards here';
      list.appendChild(empty);
    }

    board[col.key].forEach((card) => list.appendChild(buildCard(card, col.key)));
    column.appendChild(list);

    if (addingTo === col.key) {
      column.appendChild(buildAddForm(col.key));
    } else {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-card';
      addBtn.textContent = '+ Add a card';
      addBtn.addEventListener('click', () => {
        addingTo = col.key;
        render();
        const input = boardEl.querySelector('.add-form input');
        if (input) input.focus();
      });
      column.appendChild(addBtn);
    }

    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      handleDrop(col.key);
    });

    boardEl.appendChild(column);
  });

  const count = totalCards();
  totalStat.textContent = `${count} card${count === 1 ? '' : 's'}`;
}

function buildCard(card, columnKey) {
  const el = document.createElement('article');
  el.className = `card ${card.priority}`;
  el.draggable = true;
  el.dataset.id = card.id;

  const top = document.createElement('div');
  top.className = 'card-top';

  let textEl;
  if (editingId === card.id) {
    textEl = document.createElement('input');
    textEl.className = 'card-edit';
    textEl.value = card.text;
    const commit = () => {
      const value = textEl.value.trim();
      if (value) card.text = value;
      editingId = null;
      save();
      render();
    };
    textEl.addEventListener('blur', commit);
    textEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') {
        editingId = null;
        render();
      }
    });
    setTimeout(() => {
      textEl.focus();
      textEl.select();
    }, 0);
  } else {
    textEl = document.createElement('span');
    textEl.className = 'card-text';
    textEl.textContent = card.text;
    textEl.addEventListener('dblclick', () => {
      editingId = card.id;
      render();
    });
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const index = COLUMNS.findIndex((c) => c.key === columnKey);
  const leftBtn = document.createElement('button');
  leftBtn.className = 'mini';
  leftBtn.textContent = '◀';
  leftBtn.title = 'Move left';
  leftBtn.disabled = index === 0;
  leftBtn.style.opacity = index === 0 ? 0.3 : 1;
  leftBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveCard(card.id, columnKey, COLUMNS[index - 1].key);
  });

  const rightBtn = document.createElement('button');
  rightBtn.className = 'mini';
  rightBtn.textContent = '▶';
  rightBtn.title = 'Move right';
  rightBtn.disabled = index === COLUMNS.length - 1;
  rightBtn.style.opacity = index === COLUMNS.length - 1 ? 0.3 : 1;
  rightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveCard(card.id, columnKey, COLUMNS[index + 1].key);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'mini del';
  delBtn.textContent = '✕';
  delBtn.title = 'Delete';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    board[columnKey] = board[columnKey].filter((c) => c.id !== card.id);
    save();
    render();
    showToast('Card deleted');
  });

  actions.append(leftBtn, rightBtn, delBtn);
  top.append(textEl, actions);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.innerHTML = `<span class="priority ${card.priority}">${card.priority}</span>`;

  el.append(top, meta);

  el.addEventListener('dragstart', () => {
    dragData = { id: card.id, from: columnKey };
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));

  return el;
}

function buildAddForm(columnKey) {
  const form = document.createElement('form');
  form.className = 'add-form';
  form.innerHTML = `
    <input type="text" placeholder="Card title…" maxlength="80" required>
    <select>
      <option value="low">Low priority</option>
      <option value="medium" selected>Medium priority</option>
      <option value="high">High priority</option>
    </select>
    <div class="row">
      <button type="submit" class="confirm">Add card</button>
      <button type="button" class="cancel">Cancel</button>
    </div>`;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const priority = form.querySelector('select').value;
    const text = input.value.trim();
    if (!text) return;

    board[columnKey].push({ id: uid(), text, priority });
    addingTo = null;
    save();
    render();
    showToast('Card added');
  });

  form.querySelector('.cancel').addEventListener('click', () => {
    addingTo = null;
    render();
  });

  return form;
}

function handleDrop(targetColumn) {
  if (!dragData) return;
  moveCard(dragData.id, dragData.from, targetColumn);
  dragData = null;
}

function moveCard(id, from, to) {
  if (!from || !to || from === to) {
    render();
    return;
  }

  const index = board[from].findIndex((c) => c.id === id);
  if (index === -1) return;

  const [card] = board[from].splice(index, 1);
  board[to].push(card);
  save();
  render();
  showToast(`Moved to ${COLUMNS.find((c) => c.key === to).title}`);
}

let editingId = null;

clearBtn.addEventListener('click', () => {
  if (totalCards() === 0) return;
  if (!confirm('Delete every card? This cannot be undone.')) return;
  board = { todo: [], progress: [], done: [] };
  save();
  render();
  showToast('Board cleared');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && addingTo) {
    addingTo = null;
    render();
  }
});

render();
