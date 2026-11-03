import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>', file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  files: '<rect x="8" y="7" width="12" height="15" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M12 12h4M12 16h4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.2"/><path d="m16 16 5 5"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 5 7 7-7 7"/>', arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>', external: '<path d="M7 17 17 7M7 7h10v10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', link: '<path d="m10 13 4-2M8 16H6a4 4 0 0 1 0-8h4M14 8h4a4 4 0 0 1 0 8h-4"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  bold: '<path d="M6 4h7a4 4 0 0 1 0 8H6zm0 8h8a4 4 0 0 1 0 8H6z"/>', italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>', underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/>',
  undo: '<path d="M3 10h12a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5" transform="translate(0 -3)"/>', redo: '<path d="M21 10H9a6 6 0 0 0 0 12m12-12-5-5m5 5-5 5" transform="translate(0 -3)"/>',
  ordered: '<path d="M10 6h11M10 12h11M10 18h11M3 4h1v5M3 9h2M3 14c3-2 3 1 0 4h3"/>', quote: '<path d="M3 6h7v7H6c0 3-2 5-3 5V6zm11 0h7v7h-4c0 3-2 5-3 5V6z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13 3M4.9 14.9a8 8 0 0 0 13 3"/>', sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const initials = name => String(name || '?').split(' ').map(part => part[0]).slice(0, 2).join('');
const state = { user: null, users: [], csrf: '', documents: [], filter: 'all', query: '', sort: 'updated', view: 'grid', doc: null, editor: null, revision: 0, savedRevision: 0, savePromise: null, saveTimer: null, saveError: null, conflict: null, navigation: false, editorLocked: false };
const $ = selector => document.querySelector(selector);
const app = $('#app');
const modal = $('#modal');
let toastTimer;
const templates = [
  { id: 'blank', name: 'Blank document', subtitle: 'A fresh start, all yours', icon: 'plus', color: 'blank', title: 'Untitled document', content: '<p></p>' },
  { id: 'brief', name: 'Project brief', subtitle: 'Give your next idea direction', icon: 'file', color: 'peach', title: 'Project brief', content: '<h1>Project brief</h1><p>Turn a promising idea into a shared plan.</p><h2>The opportunity</h2><p>What problem are we solving, and who are we solving it for?</p><h2>What success looks like</h2><ul><li><p>Our primary goal</p></li><li><p>How we will measure progress</p></li></ul><h2>Scope &amp; approach</h2><p>Describe the first useful version and the work it will take.</p><h2>Next steps</h2><ol><li><p>Align on the goal and owner.</p></li><li><p>Agree on the first milestone.</p></li></ol>' },
  { id: 'meeting', name: 'Meeting notes', subtitle: 'Less forgetting. More doing.', icon: 'users', color: 'mint', title: 'Meeting notes', content: '<h1>Meeting notes</h1><p>A little structure for a productive conversation.</p><h2>Agenda</h2><ul><li><p>What do we need to decide?</p></li><li><p>What needs a quick update?</p></li></ul><h2>Discussion</h2><p>Capture the useful context here.</p><h2>Decisions</h2><p>Write down what the team agreed on.</p><h2>Action items</h2><ol><li><p>Action — Owner — Due date</p></li></ol>' },
  { id: 'ideas', name: 'Ideas & inspiration', subtitle: 'Make room for the what-ifs', icon: 'sparkle', color: 'lavender', title: 'Ideas & inspiration', content: '<h1>Ideas &amp; inspiration</h1><p>Every good idea starts somewhere.</p><h2>The big question</h2><blockquote><p>What would we try if we were starting from scratch?</p></blockquote><h2>Possibilities</h2><ul><li><p>An idea worth exploring</p></li><li><p>A different way to approach it</p></li><li><p>Something a little unexpected</p></li></ul><h2>Worth a closer look</h2><p>Choose one direction and write down the smallest experiment.</p>' },
];

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast')?.classList.remove('visible'), 4500); }
async function api(action, data, method = data ? 'POST' : 'GET') {
  const url = new URL('./api.php', location.href); url.hash = ''; url.search = ''; url.searchParams.set('action', action);
  if (method === 'GET' && data) Object.entries(data).forEach(([key, val]) => url.searchParams.set(key, val));
  const headers = { Accept: 'application/json' };
  const options = { method, headers, credentials: 'same-origin' };
  if (method !== 'GET') { headers['X-CSRF-Token'] = state.csrf; if (data instanceof FormData) options.body = data; else { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(data || {}); } }
  let response;
  try { response = await fetch(url, options); } catch { throw new Error('Connection lost. Your changes are still here. Please try again.'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('The workspace could not respond. Please try again.'); }
  if (!response.ok) { const error = new Error(payload.error?.message || 'Something went wrong. Please try again.'); error.status = response.status; error.document = payload.document || payload.error?.document; error.code = payload.error?.code; throw error; }
  return payload;
}
function relativeDate(date) {
  const elapsed = Math.max(0, Date.now() - Date.parse(date));
  if (!Number.isFinite(elapsed)) return 'Recently edited';
  if (elapsed < 60000) return 'Just now';
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)} min ago`;
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)} hr ago`;
  if (elapsed < 604800000) return `${Math.floor(elapsed / 86400000)} days ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function avatar(user, extra = '') { return `<span class="avatar ${escape(user.id || user.userId || '')} ${extra}" aria-hidden="true">${escape(initials(user.name))}</span>`; }
function sidebar() {
  const counts = { all: state.documents.length, owned: state.documents.filter(doc => doc.role === 'owner').length, shared: state.documents.filter(doc => doc.role !== 'owner').length };
  return `<aside class="sidebar"><a href="#" class="brand" data-action="home" aria-label="Folio home"><span class="brand-mark">f<span></span></span><span>folio<span class="brand-period">.</span></span></a><div class="workspace-label"><span class="workspace-symbol">T</span><span>Tyson’s workspace<small>Personal workspace</small></span></div><button class="button primary new-doc" data-action="create">${icon('plus')}New document</button><div class="nav-caption">WORKSPACE</div><nav aria-label="Workspace">${[['all', 'files', 'All documents'], ['owned', 'file', 'My documents'], ['shared', 'users', 'Shared with me']].map(([key, glyph, label]) => `<button class="nav-item ${state.filter === key && !state.doc ? 'active' : ''}" data-action="filter" data-filter="${key}">${icon(glyph)}<span>${label}</span><span class="nav-count">${counts[key]}</span></button>`).join('')}</nav><div class="sidebar-bottom"><div class="demo-note"><span class="demo-tag"><i></i>Demo workspace</span><p>A shared space to try things out.<br>Switch accounts to explore sharing.</p><button class="text-button" data-action="about">How it works ${icon('right')}</button></div><button class="account" data-action="accounts" aria-label="Switch demo account">${avatar(state.user)}<span><strong>${escape(state.user.name)}</strong><small>Demo account</small></span>${icon('down')}</button></div></aside>`;
}
function renderHome() {
  destroyEditor();
  document.title = 'Folio — Your document workspace';
  app.innerHTML = `${sidebar()}<div class="workspace"><header class="topbar"><span class="breadcrumb">Workspace ${icon('right')} <strong>${state.filter === 'owned' ? 'My documents' : state.filter === 'shared' ? 'Shared with me' : 'All documents'}</strong></span><span class="topbar-right"><span class="saved-label">${icon('check')} A little space for big ideas</span>${avatar(state.user, 'small')}</span></header><main id="main" class="home-main" tabindex="-1"><section class="greeting"><div><span class="eyebrow">YOUR THOUGHTS, TOGETHER.</span><h1>A good place to start.</h1><p>Capture an idea. Make a plan. Bring someone along.</p></div><div class="import-action"><button class="button secondary" data-action="import">${icon('upload')}Import a file</button><small>.txt or .md · up to 1 MB</small></div></section><section class="templates-section" aria-labelledby="templates-heading"><div class="section-heading"><h2 id="templates-heading">Start something new</h2><span>Good ideas deserve a head start</span></div><div class="template-grid">${templates.map(template => `<button class="template-card ${template.color}" data-action="template" data-template="${template.id}"><span class="template-art">${template.id === 'blank' ? `<span class="blank-plus">${icon('plus')}</span>` : `<span class="mini-paper"><span class="mini-badge">${icon(template.icon)}</span><span class="mini-title"></span><span class="mini-line long"></span><span class="mini-line"></span><span class="mini-line short"></span><span class="mini-detail ${template.id}"></span></span>`}</span><span class="template-caption"><strong>${template.name}</strong><small>${template.subtitle}</small></span></button>`).join('')}</div></section><section class="documents-section" aria-labelledby="documents-heading"><div class="section-heading document-heading"><div><h2 id="documents-heading">${state.filter === 'owned' ? 'My documents' : state.filter === 'shared' ? 'Shared with me' : 'Your documents'} <span class="count-pill" id="doc-count"></span></h2><p>Pick up where you left off.</p></div><button class="icon-button refresh-button" data-action="refresh" title="Refresh documents" aria-label="Refresh documents">${icon('refresh')}</button></div><div class="document-controls"><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="Search your documents…" aria-label="Search documents" value="${escape(state.query)}"><span class="search-key">⌘ K</span></label><div class="document-tools"><label class="sort-control"><span>Sort by:</span><select id="sort" aria-label="Sort documents"><option value="updated" ${state.sort === 'updated' ? 'selected' : ''}>Last edited</option><option value="name" ${state.sort === 'name' ? 'selected' : ''}>Name A–Z</option><option value="created" ${state.sort === 'created' ? 'selected' : ''}>Date created</option></select></label><div class="view-switch" role="group" aria-label="Document view"><button data-action="view" data-view="grid" class="icon-button ${state.view === 'grid' ? 'selected' : ''}" aria-label="Grid view" aria-pressed="${state.view === 'grid'}">${icon('grid')}</button><button data-action="view" data-view="list" class="icon-button ${state.view === 'list' ? 'selected' : ''}" aria-label="List view" aria-pressed="${state.view === 'list'}">${icon('list')}</button></div></div></div><div id="documents"></div><div class="workspace-footer">${icon('lock')} Yours to create. Easy to share.<span>FOLIO · A LITTLE LESS FRICTION</span></div></section></main></div>`;
  renderDocuments();
  $('#search').addEventListener('input', event => { state.query = event.target.value; renderDocuments(); });
  $('#sort').addEventListener('change', event => { state.sort = event.target.value; renderDocuments(); });
}
function renderDocuments() {
  const filtered = state.documents.filter(doc => (state.filter === 'all' || (state.filter === 'owned' ? doc.role === 'owner' : doc.role !== 'owner')) && `${doc.title} ${doc.excerpt || ''}`.toLowerCase().includes(state.query.toLowerCase()));
  filtered.sort((a, b) => state.sort === 'name' ? a.title.localeCompare(b.title) : Date.parse(b[state.sort === 'created' ? 'createdAt' : 'updatedAt']) - Date.parse(a[state.sort === 'created' ? 'createdAt' : 'updatedAt']));
  $('#doc-count').textContent = filtered.length;
  if (!filtered.length) { $('#documents').innerHTML = `<div class="empty-state"><span>${icon(state.query ? 'search' : state.filter === 'shared' ? 'users' : 'file')}</span><h3>${state.query ? 'No documents found' : state.filter === 'shared' ? 'A little quiet in here' : 'Your next idea starts here'}</h3><p>${state.query ? 'Try another title or a word from your document.' : state.filter === 'shared' ? 'Documents shared with this account will appear here.' : 'Create a document or import a text file to get started.'}</p>${state.query ? '<button class="button secondary" data-action="clear-search">Clear search</button>' : state.filter === 'shared' ? '<button class="button secondary" data-action="accounts">Switch demo account</button>' : '<button class="button primary" data-action="create">Create a document</button>'}</div>`; return; }
  $('#documents').innerHTML = `<div class="document-${state.view}">${filtered.map((doc, index) => `<article class="document-card tone-${index % 4}"><button class="document-open" data-action="open" data-id="${escape(doc.id)}" aria-label="Open ${escape(doc.title)}"><div class="document-preview"><div class="preview-paper"><span class="preview-eyebrow">${doc.role === 'owner' ? 'YOUR WORKSPACE' : 'SHARED WITH YOU'}</span><h3>${escape(doc.title)}</h3><p>${escape(doc.excerpt || 'A blank page. A world of possibilities.')}</p><span class="preview-rule"></span><span class="preview-rule short"></span></div><span class="preview-corner">${icon('external')}</span></div><div class="document-details"><span class="doc-file-icon">${icon('file')}</span><div><h3>${escape(doc.title)}</h3><span class="document-time">Edited ${relativeDate(doc.updatedAt)}</span></div></div></button><div class="document-meta"><span>${doc.role === 'owner' ? `<span class="owner-dot"></span> Owned by you` : `${icon('users')} ${escape(doc.ownerName)}`}</span><span class="role-pill ${doc.role}">${doc.role === 'owner' ? doc.sharedWith?.length ? `Shared · ${doc.sharedWith.length + 1}` : 'Private' : doc.role === 'editor' ? 'Can edit' : 'View only'}</span></div></article>`).join('')}</div>`;
}
function updateSummary(doc) {
  const body = document.createElement('div'); body.innerHTML = doc.content || '';
  const summary = { ...doc, excerpt: body.textContent.replace(/\s+/g, ' ').trim().slice(0, 220), wordCount: body.textContent.trim().split(/\s+/).filter(Boolean).length };
  const index = state.documents.findIndex(item => item.id === doc.id); if (index < 0) state.documents.unshift(summary); else state.documents[index] = summary;
}
function destroyEditor() { if (state.editor) { state.editor.destroy(); state.editor = null; } clearTimeout(state.saveTimer); }
function lockEditor(locked) {
  state.editorLocked = locked;
  if (!state.editor || !state.doc) return;
  state.editor.setEditable(!locked && state.doc.role !== 'viewer', false);
  if ($('#document-title')) $('#document-title').readOnly = locked || state.doc.role === 'viewer';
  if ($('#text-style')) $('#text-style').disabled = locked || state.doc.role === 'viewer';
  updateToolbar();
}
function draftKey(id = state.doc?.id) { return `folio.draft.${state.user?.id}.${id}`; }
function persistDraft() { if (!state.doc || !state.editor || state.doc.role === 'viewer') return; try { localStorage.setItem(draftKey(), JSON.stringify({ title: $('#document-title').value, content: state.editor.getHTML(), version: state.doc.version, savedAt: Date.now() })); } catch { /* Saving to the server remains available if browser storage is full. */ } }
function clearDraft(id = state.doc?.id) { try { localStorage.removeItem(draftKey(id)); } catch { /* Browser storage may be unavailable. */ } }
function markDirty() { state.revision++; state.saveError = null; persistDraft(); updateSaveStatus(); clearTimeout(state.saveTimer); if (!state.conflict) state.saveTimer = setTimeout(() => saveDocument().catch(() => {}), 650); }
function updateSaveStatus() {
  if (!$('#save-status')) return;
  const dirty = state.revision !== state.savedRevision;
  $('#save-status').className = `save-status ${state.saveError || state.conflict ? 'error' : ''}`;
  $('#save-status').innerHTML = state.doc.role === 'viewer' ? `${icon('lock')} View only` : state.conflict ? `${icon('info')} Changes need your attention` : state.saveError ? `${icon('info')} Not saved <button class="text-button" data-action="retry-save">Retry</button>` : state.savePromise ? '<span class="spinner"></span> Saving…' : dirty ? `${icon('clock')} Unsaved changes` : `${icon('check')} All changes saved`;
  if ($('#word-count') && state.editor) { const words = state.editor.getText().trim().split(/\s+/).filter(Boolean).length; $('#word-count').textContent = `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`; }
  const alert = $('#editor-alert');
  if (state.conflict) alert.innerHTML = `<div class="editor-alert conflict" role="alert">${icon('info')}<div><strong>This document has a newer version.</strong><p>Your edits are safe here. Save them as a new document, or replace them with the latest saved version.</p></div><button class="button secondary small-button" data-action="save-copy">Save my copy</button><button class="text-button" data-action="reload-document">Load latest</button></div>`;
  else if (state.saveError) alert.innerHTML = `<div class="editor-alert" role="alert">${icon('info')}<div><strong>We couldn’t save your changes.</strong><p>${escape(state.saveError)} Your draft is retained in this browser.</p></div><button class="button secondary small-button" data-action="retry-save">Try again</button><button class="text-button" data-action="download">Download draft</button></div>`;
  else alert.innerHTML = '';
}
async function saveDocument() {
  clearTimeout(state.saveTimer);
  if (state.savePromise) return state.savePromise;
  if (!state.doc || state.doc.role === 'viewer' || state.revision === state.savedRevision) return;
  if (state.conflict) throw new Error('Resolve the newer version before leaving this document.');
  state.savePromise = (async () => {
    while (state.revision !== state.savedRevision) {
      const revision = state.revision;
      const payload = { id: state.doc.id, title: $('#document-title').value.trim() || 'Untitled document', content: state.editor.getHTML(), version: state.doc.version };
      try {
        const response = await api('update', payload);
        state.doc = { ...response.document };
        state.savedRevision = revision; state.saveError = null;
        updateSummary(state.doc);
        if (state.revision === revision) { clearDraft(); if (!$('#document-title').value.trim()) $('#document-title').value = state.doc.title; }
        else persistDraft();
      } catch (error) { state.saveError = error.message; if (error.status === 409) state.conflict = error.document || true; persistDraft(); throw error; }
    }
  })();
  updateSaveStatus();
  try { await state.savePromise; } finally { state.savePromise = null; updateSaveStatus(); }
}
async function readyToLeave() { try { await saveDocument(); return true; } catch { toast('Please save or resolve your document before leaving.'); return false; } }
async function navigate(id = null, { replace = false, skipGuard = false } = {}) {
  if (state.navigation) return;
  state.navigation = true;
  lockEditor(true);
  try {
    if (!skipGuard && !await readyToLeave()) { history.replaceState(null, '', state.doc ? `#doc=${encodeURIComponent(state.doc.id)}` : location.pathname); return; }
    if (id) {
      const response = await api('document', { id }, 'GET');
      state.doc = response.document; state.revision = state.savedRevision = 0; state.saveError = null; state.conflict = null;
      renderEditor();
    } else { const response = await api('documents'); state.documents = response.documents; state.doc = null; renderHome(); }
    history[replace ? 'replaceState' : 'pushState'](null, '', id ? `#doc=${encodeURIComponent(id)}` : location.pathname + location.search);
  } catch (error) { toast(error.message); history.replaceState(null, '', state.doc ? `#doc=${encodeURIComponent(state.doc.id)}` : location.pathname); if (!state.doc) renderHome(); }
  finally { state.navigation = false; lockEditor(false); }
}
function toolbarButton(action, glyph, label, shortcut = '') { return `<button class="icon-button format-button" data-format="${action}" aria-label="${label}${shortcut ? ` (${shortcut})` : ''}" title="${label}${shortcut ? ` · ${shortcut}` : ''}">${icon(glyph)}</button>`; }
function renderEditor() {
  destroyEditor(); const doc = state.doc; const canEdit = doc.role !== 'viewer';
  document.title = `${doc.title} — Folio`;
  app.innerHTML = `<div class="editor-layout"><header class="editor-header"><button class="editor-home" data-action="home" aria-label="Back to documents"><span class="brand-mark">f<span></span></span></button><div class="editor-title-area"><div class="editor-crumb"><button data-action="home">Your documents</button>${icon('right')}<span>${doc.role === 'owner' ? 'My document' : 'Shared with me'}</span></div><label class="sr-only" for="document-title">Document title</label><input id="document-title" class="document-title-input" value="${escape(doc.title)}" maxlength="160" ${canEdit ? '' : 'readonly'}><div id="save-status" class="save-status" aria-live="polite"></div></div><div class="editor-actions"><button class="icon-button" data-action="download" title="Download as text" aria-label="Download as text">${icon('download')}</button>${doc.role === 'owner' ? `<button class="icon-button delete-document" data-action="delete" title="Delete document" aria-label="Delete document">${icon('trash')}</button>` : ''}<span class="editor-avatar">${avatar(state.user)}</span><button class="button primary share-button" data-action="share">${icon('users')}${doc.role === 'owner' ? 'Share' : 'Access'}</button></div></header><div class="editor-toolbar" role="toolbar" aria-label="Text formatting"><div class="toolbar-group">${toolbarButton('undo', 'undo', 'Undo', 'Ctrl/⌘ Z')}${toolbarButton('redo', 'redo', 'Redo', 'Ctrl/⌘ Shift Z')}</div><span class="toolbar-divider"></span><label class="sr-only" for="text-style">Text style</label><select id="text-style" ${canEdit ? '' : 'disabled'}><option value="paragraph">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select><span class="toolbar-divider"></span><div class="toolbar-group">${toolbarButton('bold', 'bold', 'Bold', 'Ctrl/⌘ B')}${toolbarButton('italic', 'italic', 'Italic', 'Ctrl/⌘ I')}${toolbarButton('underline', 'underline', 'Underline', 'Ctrl/⌘ U')}</div><span class="toolbar-divider"></span><div class="toolbar-group">${toolbarButton('bulletList', 'list', 'Bulleted list')}${toolbarButton('orderedList', 'ordered', 'Numbered list')}${toolbarButton('blockquote', 'quote', 'Block quote')}</div><span class="toolbar-mode">${icon(canEdit ? 'file' : 'lock')}${canEdit ? 'Editing' : 'View only'}</span></div><div id="editor-alert"></div><main id="main" class="editor-main" tabindex="-1"><div class="page-topline"><span>${doc.role === 'owner' ? 'Your space to think out loud' : `Shared by ${escape(doc.ownerName)}`}</span><span>${canEdit ? 'Changes save automatically' : 'Ask the owner for editing access'}</span></div><div class="document-page"><div id="editor"></div></div><div class="page-bottomline"><span>One good thought leads to another.</span><span id="word-count">0 words</span></div></main><footer class="editor-footer"><button data-action="home">${icon('arrow')} Back to documents</button><span>Demo workspace · ${escape(state.user.name)}</span><button data-action="accounts">Switch account ${icon('down')}</button></footer></div>`;
  state.editor = new Editor({ element: $('#editor'), extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false })], content: doc.content || '<p></p>', editable: canEdit, editorProps: { attributes: { class: 'prose', 'aria-label': 'Document content', role: 'textbox', 'aria-multiline': 'true', 'data-placeholder': 'Start with a thought…' } }, onUpdate: () => markDirty(), onSelectionUpdate: () => updateToolbar(), onTransaction: () => updateToolbar() });
  $('#document-title').addEventListener('input', () => { document.title = `${$('#document-title').value || 'Untitled document'} — Folio`; markDirty(); });
  $('#text-style').addEventListener('change', event => { const chain = state.editor.chain().focus(); if (event.target.value === 'paragraph') chain.setParagraph().run(); else chain.toggleHeading({ level: Number(event.target.value.slice(1)) }).run(); });
  document.querySelectorAll('[data-format]').forEach(button => { button.addEventListener('mousedown', event => event.preventDefault()); button.addEventListener('click', () => { if (!canEdit) return; const command = { bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', bulletList: 'toggleBulletList', orderedList: 'toggleOrderedList', blockquote: 'toggleBlockquote', undo: 'undo', redo: 'redo' }[button.dataset.format]; state.editor.chain().focus()[command]().run(); }); });
  if (canEdit) {
    try { const draft = JSON.parse(localStorage.getItem(draftKey())); if (draft?.content && (draft.content !== doc.content || draft.title !== doc.title)) { $('#document-title').value = draft.title; state.editor.commands.setContent(draft.content, { emitUpdate: false }); state.revision = 1; if (draft.version !== doc.version) state.conflict = doc; else state.saveTimer = setTimeout(() => saveDocument().catch(() => {}), 1200); toast('Your unsaved draft was restored from this browser.'); } } catch { /* Ignore malformed drafts. */ }
  }
  lockEditor(state.editorLocked); updateToolbar(); updateSaveStatus();
}
function updateToolbar() { if (!state.editor || !$('#text-style')) return; document.querySelectorAll('[data-format]').forEach(button => { const type = button.dataset.format; const active = state.editor.isActive(type); button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); button.disabled = state.editorLocked || state.doc.role === 'viewer' || (type === 'undo' && !state.editor.can().undo()) || (type === 'redo' && !state.editor.can().redo()); }); $('#text-style').value = [1, 2, 3].find(level => state.editor.isActive('heading', { level })) ? `h${[1, 2, 3].find(level => state.editor.isActive('heading', { level }))}` : 'paragraph'; }
function applyAccessResponse(nextDoc) {
  if (nextDoc.id !== state.doc?.id) { updateSummary(nextDoc); return; }
  const contentChanged = nextDoc.content !== state.doc.content || nextDoc.title !== state.doc.title;
  if (contentChanged && state.revision !== state.savedRevision) {
    state.conflict = nextDoc; persistDraft(); updateSaveStatus(); return;
  }
  state.doc = nextDoc;
  updateSummary(nextDoc);
  if (contentChanged) { renderEditor(); toast('The latest document edits were loaded with the access update.'); }
}
function openModal(content, className = '') { modal.className = className; modal.innerHTML = content; modal.showModal(); }
function dialogHeader(title, subtitle = '') { return `<div class="dialog-header"><div><h2 id="dialog-title">${escape(title)}</h2>${subtitle ? `<p>${escape(subtitle)}</p>` : ''}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>`; }
function showAccounts() { openModal(`${dialogHeader('Try another perspective', 'Switch demo accounts to explore sharing and permissions.')}<div class="account-list">${state.users.map(user => `<button class="account-choice ${user.id === state.user.id ? 'current' : ''}" data-action="switch-account" data-user="${escape(user.id)}">${avatar(user)}<span><strong>${escape(user.name)}</strong><small>${escape(user.email)}</small></span>${user.id === state.user.id ? `<span class="current-label">Current ${icon('check')}</span>` : icon('right')}</button>`).join('')}</div><div class="dialog-note">${icon('info')}<p>These are shared demo accounts, not private sign-ins. Anyone with this link can try them. Please use sample content.</p></div>`); }
async function showShare() {
  if (!state.doc) return;
  if (!await readyToLeave()) return;
  const doc = state.doc;
  const available = state.users.filter(user => user.id !== doc.ownerId && !doc.sharedWith?.some(share => share.userId === user.id));
  openModal(`${dialogHeader(doc.role === 'owner' ? 'Good work is better together.' : 'Document access', doc.title)}<div class="share-intro">${icon('users')}<p>${doc.role === 'owner' ? 'Invite someone to read, write, and move the idea forward.' : 'These demo accounts have access to this document.'}</p></div>${doc.role === 'owner' && available.length ? `<form id="share-form" class="invite-form"><label class="sr-only" for="invite-user">Person to share with</label><select id="invite-user" required>${available.map(user => `<option value="${escape(user.id)}">${escape(user.name)}</option>`).join('')}</select><label class="sr-only" for="invite-role">Permission</label><select id="invite-role"><option value="editor">Can edit</option><option value="viewer">Can view</option></select><button class="button primary" type="submit">Invite</button></form>` : ''}<h3 class="dialog-section-title">People with access</h3><div class="access-row">${avatar({ id: doc.ownerId, name: doc.ownerName })}<span><strong>${escape(doc.ownerName)}${doc.ownerId === state.user.id ? ' (you)' : ''}</strong><small>Document owner</small></span><span class="access-role">Owner</span></div>${(doc.sharedWith || []).map(share => `<div class="access-row">${avatar(share)}<span><strong>${escape(share.name)}${share.userId === state.user.id ? ' (you)' : ''}</strong><small>${escape(share.email)}</small></span>${doc.role === 'owner' ? `<label class="sr-only" for="role-${escape(share.userId)}">${escape(share.name)} permission</label><select class="access-role-select" id="role-${escape(share.userId)}" data-share-user="${escape(share.userId)}"><option value="editor" ${share.role === 'editor' ? 'selected' : ''}>Can edit</option><option value="viewer" ${share.role === 'viewer' ? 'selected' : ''}>Can view</option><option value="remove">Remove access</option></select>` : `<span class="access-role">${share.role === 'editor' ? 'Can edit' : 'Can view'}</span>`}</div>`).join('')}<div class="link-access">${icon('lock')}<div><strong>Only invited accounts can open this document</strong><p>A link doesn’t grant access. Switch to an invited demo account to try it.</p></div></div><div class="dialog-footer"><button class="button secondary" data-action="copy-link">${icon('link')} Copy link</button><button class="button primary" data-action="close-modal">Done</button></div>`);
  $('#share-form')?.addEventListener('submit', async event => { event.preventDefault(); await mutateAccess('share', { id: doc.id, userId: $('#invite-user').value, role: $('#invite-role').value }); });
  document.querySelectorAll('[data-share-user]').forEach(select => select.addEventListener('change', async () => { await mutateAccess(select.value === 'remove' ? 'unshare' : 'share', { id: doc.id, userId: select.dataset.shareUser, ...(select.value !== 'remove' ? { role: select.value } : {}) }); }));
}
async function mutateAccess(action, payload) {
  if (state.operation || state.navigation) return;
  state.operation = true; lockEditor(true);
  modal.querySelectorAll('button,select').forEach(control => { control.disabled = true; });
  try { const result = await api(action, payload); applyAccessResponse(result.document); modal.close(); if (state.doc?.id === payload.id) await showShare(); toast('Document access updated. Switch accounts to try it.'); }
  catch (error) { toast(error.message); }
  finally { state.operation = false; lockEditor(false); modal.querySelectorAll('button,select').forEach(control => { control.disabled = false; }); }
}
async function createDocument(template = templates[0]) { if (!await readyToLeave()) return; const result = await api('create', { title: template.title, content: template.content }); state.documents.unshift(result.document); await navigate(result.document.id); if (template.id === 'blank') { $('#document-title').focus(); $('#document-title').select(); } }
function downloadDocument() { if (!state.doc || !state.editor) return; const text = `${$('#document-title').value}\n\n${state.editor.getText({ blockSeparator: '\n\n' })}`; const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${($('#document-title').value || 'Untitled document').replace(/[<>:"/\\|?*]/g, '_')}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast('Text file downloaded. Rich formatting stays in Folio.'); }
function confirmReload() { openModal(`${dialogHeader('Load the latest version?', 'This replaces the local draft you are currently editing.')}<p class="dialog-copy">Save a copy first if you want to keep your changes. The latest saved document will then open.</p><div class="dialog-footer"><button class="button secondary" data-action="close-modal">Keep my draft</button><button class="button primary" data-action="confirm-reload">Load latest</button></div>`); }
function confirmDelete() { openModal(`${dialogHeader('Delete this document?', state.doc.title)}<p class="dialog-copy">This will permanently delete the document and remove access for everyone it is shared with.</p><div class="dialog-footer"><button class="button secondary" data-action="close-modal">Keep document</button><button class="button danger" data-action="confirm-delete">Delete document</button></div>`); }

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  event.preventDefault(); const action = button.dataset.action;
  if (state.operation || state.navigation) return;
  const transition = ['switch-account', 'save-copy', 'confirm-reload', 'confirm-delete', 'create', 'template', 'refresh'].includes(action);
  if (transition) { state.operation = true; lockEditor(true); }
  try {
    if (action === 'close-modal') modal.close();
    else if (action === 'home') await navigate();
    else if (action === 'filter') { if (!await readyToLeave()) return; state.filter = button.dataset.filter; await navigate(); }
    else if (action === 'open') await navigate(button.dataset.id);
    else if (action === 'create' || action === 'template') { button.disabled = true; await createDocument(templates.find(template => template.id === button.dataset.template) || templates[0]); }
    else if (action === 'import') { if (await readyToLeave()) $('#import-file').click(); }
    else if (action === 'view') { state.view = button.dataset.view; renderHome(); }
    else if (action === 'clear-search') { state.query = ''; $('#search').value = ''; renderDocuments(); }
    else if (action === 'refresh') { button.disabled = true; const response = await api('documents'); state.documents = response.documents; renderHome(); toast('Workspace is up to date.'); }
    else if (action === 'accounts') showAccounts();
    else if (action === 'switch-account') { if (button.dataset.user === state.user.id) { modal.close(); return; } button.disabled = true; if (!await readyToLeave()) return; const response = await api('switch_user', { userId: button.dataset.user }); state.user = response.user; state.csrf = response.csrf; state.documents = response.documents; state.doc = null; state.filter = 'all'; state.query = ''; state.revision = state.savedRevision = 0; state.saveError = null; state.conflict = null; modal.close(); history.pushState(null, '', location.pathname); renderHome(); toast(`You’re now viewing as ${state.user.name}.`); }
    else if (action === 'share') await showShare();
    else if (action === 'copy-link') { const url = new URL(location.href); url.hash = `doc=${encodeURIComponent(state.doc.id)}`; try { await navigator.clipboard.writeText(url.href); toast('Document link copied.'); } catch { const input = document.createElement('input'); input.value = url.href; input.className = 'copy-link-fallback'; input.setAttribute('aria-label', 'Document link to copy'); modal.append(input); input.select(); toast('Select and copy the document link below.'); } }
    else if (action === 'retry-save') { state.saveError = null; await saveDocument(); toast('Your changes are saved.'); }
    else if (action === 'save-copy') { button.disabled = true; lockEditor(true); const oldId = state.doc.id; const response = await api('create', { title: `${$('#document-title').value.trim() || 'Untitled document'} (copy)`.slice(0, 160), content: state.editor.getHTML() }); clearDraft(oldId); state.revision = state.savedRevision; state.conflict = null; state.saveError = null; state.documents.unshift(response.document); await navigate(response.document.id, { skipGuard: true }); toast('Your edits were saved as a separate document.'); }
    else if (action === 'reload-document') confirmReload();
    else if (action === 'confirm-reload') { const id = state.doc.id; const response = await api('document', { id }, 'GET'); clearDraft(id); state.doc = response.document; state.revision = state.savedRevision = 0; state.conflict = null; state.saveError = null; modal.close(); renderEditor(); toast('Loaded the latest saved version.'); }
    else if (action === 'download') downloadDocument();
    else if (action === 'delete') confirmDelete();
    else if (action === 'confirm-delete') { button.disabled = true; clearTimeout(state.saveTimer); if (state.savePromise) await state.savePromise.catch(() => {}); await api('delete', { id: state.doc.id }); clearDraft(); state.revision = state.savedRevision; state.saveError = null; state.conflict = null; modal.close(); await navigate(null, { skipGuard: true }); toast('Document deleted.'); }
    else if (action === 'about') openModal(`${dialogHeader('A little space for shared work.', 'Welcome to the Folio demo.')}<div class="about-steps"><p><strong>01 · Make it yours</strong>Create a document, start from a template, or import a .txt or .md file up to 1 MB. Imports keep your text; Markdown syntax stays as text.</p><p><strong>02 · Put your thoughts on the page</strong>Format with the toolbar or familiar keyboard shortcuts. Changes save automatically, and a local draft protects unsaved work.</p><p><strong>03 · Bring someone along</strong>Share with a demo account as an editor or viewer. Switch accounts from the sidebar to see how access works.</p></div><div class="dialog-note">${icon('info')}<p>Edits appear when a document is reopened. Simultaneous edits are protected by version checks. This public demo uses shared accounts, so use sample content.</p></div><div class="dialog-footer"><span></span><button class="button primary" data-action="close-modal">Make yourself at home</button></div>`);
  } catch (error) { toast(error.message); } finally { if (transition) { state.operation = false; lockEditor(false); } if (button.isConnected) button.disabled = false; }
});
$('#import-file').addEventListener('change', async event => { const file = event.target.files[0]; event.target.value = ''; if (!file || state.operation || state.navigation) return; if (!/\.(txt|md)$/i.test(file.name)) { toast('Choose a .txt or .md file. Markdown is imported as plain text.'); return; } if (file.size > 1024 * 1024) { toast('Please choose a file smaller than 1 MB.'); return; } state.operation = true; lockEditor(true); try { if (!await readyToLeave()) return; toast('Importing your document…'); const data = new FormData(); data.append('file', file); const response = await api('import', data); state.documents.unshift(response.document); await navigate(response.document.id); toast('File imported as editable text.'); } catch (error) { toast(error.message); } finally { state.operation = false; lockEditor(false); } });
modal.addEventListener('cancel', event => { if (state.operation) event.preventDefault(); });
modal.addEventListener('click', event => { if (state.operation) return; if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
window.addEventListener('beforeunload', event => { if (state.revision !== state.savedRevision) { persistDraft(); event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('hashchange', () => { if (state.operation || state.navigation) { history.replaceState(null, '', state.doc ? `#doc=${encodeURIComponent(state.doc.id)}` : location.pathname); return; } const params = new URLSearchParams(location.hash.slice(1)); navigate(params.get('doc'), { replace: true }); });
window.addEventListener('online', () => { if (state.saveError && !state.conflict) saveDocument().catch(() => {}); });
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && $('#search')) { event.preventDefault(); $('#search').focus(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && state.doc) { event.preventDefault(); saveDocument().catch(error => toast(error.message)); } });
async function boot() { try { const response = await api('bootstrap'); Object.assign(state, { user: response.user, users: response.users, csrf: response.csrf, documents: response.documents }); const id = new URLSearchParams(location.hash.slice(1)).get('doc'); if (id) await navigate(id, { replace: true }); else renderHome(); } catch (error) { app.innerHTML = `<main class="startup-error"><div class="brand-mark">f</div><h1>Let’s try that again.</h1><p>${escape(error.message)}</p><button class="button primary" id="retry-startup">Reload workspace</button></main>`; $('#retry-startup').addEventListener('click', boot); } }
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); queueMicrotask(() => document.getElementById('main')?.focus()); });
export { state as workspaceState, saveDocument, navigate, createDocument, applyAccessResponse };
boot();
