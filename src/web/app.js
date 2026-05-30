const API = '/api';

// Tab switching
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  const tabEl = document.querySelector(`.tab:nth-child(${name === 'memories' ? 1 : name === 'tags' ? 2 : 3})`);
  if (tabEl) tabEl.classList.add('active');

  const contentId = name === 'memories' ? 'content-memories' : name === 'tags' ? 'content-tags' : 'content-stats';
  const contentEl = document.getElementById(contentId);
  if (contentEl) contentEl.classList.add('active');

  const sidebarId = 'tab-' + name;
  document.querySelectorAll('.sidebar .tab-content').forEach(t => t.classList.remove('active'));
  const sidebarEl = document.getElementById(sidebarId);
  if (sidebarEl) sidebarEl.classList.add('active');

  if (name === 'tags') { loadTags(); loadTagHierarchy(); }
  if (name === 'stats') { loadStats(); }
}

// Load memories
async function loadMemories() {
  const tier = document.getElementById('filter-tier').value;
  const tag = document.getElementById('filter-tag').value;
  const params = new URLSearchParams();
  if (tier) params.append('tier', tier);
  if (tag) params.append('tag', tag);

  try {
    const res = await fetch(`${API}/memories?${params}`);
    const json = await res.json();
    renderMemories(json.data || []);
    updateStats();
  } catch (e) {
    document.getElementById('memory-list').innerHTML = `<div class="empty-state">Error loading memories: ${e.message}</div>`;
  }
}

function renderMemories(memories) {
  const container = document.getElementById('memory-list');
  if (!memories.length) {
    container.innerHTML = '<div class="empty-state">No memories found</div>';
    return;
  }

  container.innerHTML = memories.map(m => `
    <div class="memory-item" id="mem-${m.id}">
      <div class="memory-header">
        <span class="memory-id">${m.id.substring(0, 8)}</span>
        <span class="memory-tier tier-${m.tier}">${m.tier}</span>
      </div>
      <div class="memory-content">${escapeHtml(m.content)}</div>
      <div class="memory-meta">
        ${m.tags?.map(t => `<span class="tag">${escapeHtml(t.name)}</span>`).join('') || ''}
        ${m.category ? `<span style="color: #666; margin-left: 10px;">📁 ${escapeHtml(m.category)}</span>` : ''}
      </div>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="promoteMem('${m.id}')">⬆ Promote</button>
        <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="demoteMem('${m.id}')">⬇ Demote</button>
        <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="deleteMem('${m.id}')">🗑 Delete</button>
      </div>
      <div class="links-section" id="links-${m.id.substring(0,8)}">
        <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="showLinks('${m.id}')">Show Links</button>
      </div>
    </div>
  `).join('');
}

async function promoteMem(id) {
  try {
    await fetch(`${API}/memories/${id}/promote`, { method: 'POST' });
    loadMemories();
  } catch (e) { alert('Error: ' + e.message); }
}

async function demoteMem(id) {
  try {
    await fetch(`${API}/memories/${id}/demote`, { method: 'POST' });
    loadMemories();
  } catch (e) { alert('Error: ' + e.message); }
}

async function deleteMem(id) {
  if (!confirm('Delete this memory?')) return;
  try {
    await fetch(`${API}/memories/${id}`, { method: 'DELETE' });
    loadMemories();
  } catch (e) { alert('Error: ' + e.message); }
}

async function showLinks(id) {
  try {
    const res = await fetch(`${API}/memories/${id}/links?depth=1`);
    const json = await res.json();
    const data = json.data;
    const container = document.getElementById('links-' + id.substring(0,8));
    if (data.edges.length === 0) {
      container.innerHTML = '<span style="color: #666; font-size: 0.85rem;">No links</span>';
    } else {
      container.innerHTML = data.edges.map(e => `
        <span class="link-item">
          <span class="link-arrow">→</span>
          ${e.link_type} (${e.weight})
          <span style="color: #888;">${e.target_id.substring(0,8)}</span>
        </span>
      `).join('');
    }
  } catch (e) { console.error(e); }
}

// Search
async function searchMemories() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) { loadMemories(); return; }

  const tier = document.getElementById('filter-tier').value;
  const tag = document.getElementById('filter-tag').value;
  const params = new URLSearchParams({ q });
  if (tier) params.append('tier', tier);
  if (tag) params.append('tag', tag);

  try {
    const res = await fetch(`${API}/search?${params}`);
    const json = await res.json();
    renderMemories(json.data || []);
  } catch (e) {
    document.getElementById('memory-list').innerHTML = `<div class="empty-state">Search error: ${e.message}</div>`;
  }
}

// Tags
async function loadTags() {
  try {
    const res = await fetch(`${API}/tags`);
    const json = await res.json();
    const tags = json.data || [];

    // Update tag filter dropdown
    const tagSelect = document.getElementById('filter-tag');
    const currentVal = tagSelect.value;
    tagSelect.innerHTML = '<option value="">All Tags</option>' + tags.map(t =>
      `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`
    ).join('');
    tagSelect.value = currentVal;

    // Update tag list in tags tab
    const tagList = document.getElementById('tag-list');
    if (!tags.length) {
      tagList.innerHTML = '<div class="empty-state">No tags yet</div>';
    } else {
      tagList.innerHTML = tags.map(t => `
        <span class="tag-item" onclick="filterByTag('${escapeHtml(t.name)}')">${escapeHtml(t.name)}</span>
      `).join('');
    }
  } catch (e) { console.error(e); }
}

async function loadTagHierarchy() {
  try {
    const res = await fetch(`${API}/tags/hierarchy`);
    const json = await res.json();
    const container = document.getElementById('tag-hierarchy');
    container.innerHTML = renderTagTree(json.data || []);
  } catch (e) { console.error(e); }
}

function renderTagTree(nodes, depth = 0) {
  if (!nodes.length) return '<div class="empty-state">No tags</div>';
  return '<ul style="list-style: none; padding-left: ' + (depth * 20) + 'px;">' +
    nodes.map(n => `<li style="margin: 5px 0;">
      <span style="color: #a0a0ff;">📁 ${escapeHtml(n.name)}</span>
      ${n.children?.length ? renderTagTree(n.children, depth + 1) : ''}
    </li>`).join('') +
    '</ul>';
}

function filterByTag(name) {
  document.getElementById('filter-tag').value = name;
  showTab('memories');
  loadMemories();
}

// Stats
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const json = await res.json();
    const s = json.data;

    document.getElementById('stat-memories').textContent = s.total;
    document.getElementById('stat-tags').textContent = s.total_tags;
    document.getElementById('stat-links').textContent = s.total_links;

    const detail = document.getElementById('stats-detail');
    detail.innerHTML = `
      <p>Total memories: <strong>${s.total}</strong></p>
      <p>By tier:</p>
      <ul style="margin-left: 20px; color: #888;">
        ${Object.entries(s.by_tier).map(([t, c]) => `<li>${t}: ${c}</li>`).join('')}
      </ul>
      <p>Tags: <strong>${s.total_tags}</strong></p>
      <p>Links: <strong>${s.total_links}</strong></p>
    `;

    const content = document.getElementById('stats-content');
    content.innerHTML = `
      <div class="memory-item">
        <h4>Memory Distribution</h4>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          ${Object.entries(s.by_tier).map(([t, c]) => `
            <div style="flex: ${c}; background: var(--tier-${t}, #666); height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
              ${t} (${c})
            </div>
          `).join('')}
        </div>
      </div>
      ${s.linkStats?.length ? `
        <div class="memory-item" style="margin-top: 15px;">
          <h4>Links by Type</h4>
          <ul style="margin-top: 10px; color: #888;">
            ${s.linkStats.map(ls => `<li>${ls.link_type}: ${ls.count}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  } catch (e) { console.error(e); }
}

async function updateStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const json = await res.json();
    const s = json.data;
    document.getElementById('stat-memories').textContent = s.total;
    document.getElementById('stat-tags').textContent = s.total_tags;
    document.getElementById('stat-links').textContent = s.total_links;
  } catch (e) { console.error(e); }
}

// Form handlers
htmx.on('form[hx-post="/api/memories"]', 'htmx:afterRequest', function(evt) {
  if (evt.detail.successful) {
    this.reset();
    loadMemories();
    updateStats();
  }
});

htmx.on('form[hx-post="/api/tags"]', 'htmx:afterRequest', function(evt) {
  if (evt.detail.successful) {
    this.reset();
    loadTags();
  }
});

// Utility
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadMemories();
  loadTags();
});
