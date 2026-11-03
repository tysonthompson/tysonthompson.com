import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

// Exercise the real application and Tiptap editor against a deterministic API.
// HTTP/backend tests separately verify that permissions and storage are enforced.
const window = new Window({ url: 'http://localhost/googledocs/' });
window.document.write(readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').replace(/<link[^>]*>/g, ''));
for (const key of ['window', 'document', 'navigator', 'location', 'history', 'localStorage', 'HTMLElement', 'Node', 'Element', 'MutationObserver', 'DOMParser', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'File', 'FormData', 'DOMRect', 'Range']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(key) ? window[key].bind(window) : window[key] });
}
const users = [{ id: 'tyson', name: 'Tyson Thompson', email: 'tyson@example.test' }, { id: 'maya', name: 'Maya Chen', email: 'maya@example.test' }, { id: 'alex', name: 'Alex Morgan', email: 'alex@example.test' }];
let user = users[0];
let csrf = 'csrf-1';
let sequence = 0;
const docs = new Map();
const requests = [];
const gates = new Map();
let failedNextUpdate = false;
let concurrentUpdates = 0;
let maxConcurrentUpdates = 0;
const clone = value => structuredClone(value);
function makeDoc(id, title, content, ownerId = 'tyson') { const doc = { id, title, content, ownerId, ownerName: users.find(item => item.id === ownerId).name, createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z', version: 1, sharedWith: [] }; docs.set(id, doc); return doc; }
makeDoc('doc-a', 'An open canvas', '<h1>An open canvas</h1><p>First thought.</p>');
makeDoc('doc-b', 'Meeting notes', '<h1>Meeting notes</h1><p>A second document.</p>');
function visible(doc) { const role = doc.ownerId === user.id ? 'owner' : doc.sharedWith.find(share => share.userId === user.id)?.role; return role ? { ...clone(doc), role, excerpt: doc.content.replace(/<[^>]+>/g, ' ').trim(), wordCount: 5 } : null; }
function documents() { return [...docs.values()].map(visible).filter(Boolean); }
function defer(action) { let resolve; const promise = new Promise(done => { resolve = done; }); const gate = { promise, resolve }; gates.set(action, gate); return gate; }
function result(payload, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => clone(payload) }; }
globalThis.fetch = async (url, options) => {
  const action = new URL(url).searchParams.get('action');
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  requests.push({ action, body, csrf: options.headers['X-CSRF-Token'] });
  if (action === 'update') { concurrentUpdates++; maxConcurrentUpdates = Math.max(maxConcurrentUpdates, concurrentUpdates); }
  try {
    if (gates.has(action)) { const gate = gates.get(action); gates.delete(action); await gate.promise; }
    if (options.method === 'POST' && options.headers['X-CSRF-Token'] !== csrf) return result({ error: { code: 'csrf_invalid', message: 'The active demo account changed. Reload to continue.' } }, 403);
    if (action === 'bootstrap') return result({ user, users, csrf, documents: documents() });
    if (action === 'documents') return result({ documents: documents() });
    if (action === 'document') { const doc = docs.get(new URL(url).searchParams.get('id')); return visible(doc) ? result({ document: visible(doc) }) : result({ error: { message: 'Access denied.' } }, 403); }
    if (action === 'create' || action === 'import') {
      const imported = action === 'import';
      const file = imported ? body.get('file') : null;
      const title = imported ? file.name.replace(/\.(txt|md)$/i, '') : body.title;
      const content = imported ? `<p>${(await file.text()).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p>` : body.content;
      return result({ document: visible(makeDoc(`new-${++sequence}`, title, content, user.id)) });
    }
    if (action === 'switch_user') { user = users.find(item => item.id === body.userId); csrf = `csrf-${++sequence}`; return result({ user, csrf, documents: documents() }); }
    const doc = docs.get(body?.id);
    if (action === 'update') {
      if (failedNextUpdate) { failedNextUpdate = false; throw new Error('Network unavailable'); }
      if (doc.version !== body.version) return result({ error: { code: 'version_conflict', message: 'A newer version was saved.' }, document: visible(doc) }, 409);
      Object.assign(doc, { title: body.title, content: body.content, version: doc.version + 1, updatedAt: new Date().toISOString() });
      return result({ document: visible(doc) });
    }
    if (action === 'share') { const person = users.find(item => item.id === body.userId); const old = doc.sharedWith.find(item => item.userId === body.userId); if (old) old.role = body.role; else doc.sharedWith.push({ userId: person.id, name: person.name, email: person.email, role: body.role }); doc.version++; return result({ document: visible(doc) }); }
    if (action === 'unshare') { doc.sharedWith = doc.sharedWith.filter(item => item.userId !== body.userId); doc.version++; return result({ document: visible(doc) }); }
    if (action === 'delete') { docs.delete(body.id); return result({ ok: true }); }
    throw new Error(`Unexpected API action: ${action}`);
  } finally { if (action === 'update') concurrentUpdates--; }
};
const { workspaceState: state, navigate, saveDocument, applyAccessResponse } = await import('../src/app.js');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate) { for (let count = 0; count < 100; count++) { if (predicate()) return; await sleep(10); } assert.fail('Timed out waiting for application state'); }
const click = selector => { const target = document.querySelector(selector); assert.ok(target, `Missing control ${selector}`); target.click(); };

test('Folio frontend integration', async t => {
  await waitFor(() => document.querySelector('.home-main'));
  await t.test('boot renders real documents, filters search, and changes views', async () => {
    assert.equal(document.querySelectorAll('.document-card').length, 2);
    const search = document.querySelector('#search'); search.value = 'Meeting'; search.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(document.querySelectorAll('.document-card').length, 1);
    assert.match(document.querySelector('.document-card').textContent, /Meeting notes/);
    click('[data-view="list"]'); assert.ok(document.querySelector('.document-list'));
    document.querySelector('#search').value = ''; document.querySelector('#search').dispatchEvent(new Event('input', { bubbles: true }));
    click('[data-view="grid"]'); assert.equal(document.querySelectorAll('.document-card').length, 2);
  });
  await t.test('a delayed refresh cannot race with opening a document or switching accounts', async () => {
    const gate = defer('documents'); click('[data-action="refresh"]');
    await waitFor(() => gates.size === 0);
    click('[data-action="open"][data-id="doc-a"]'); click('[data-action="accounts"]');
    assert.equal(state.doc, null); assert.equal(document.querySelector('#modal').open, false);
    gate.resolve(); await waitFor(() => !state.operation);
    assert.ok(document.querySelector('.home-main')); assert.equal(state.doc, null);
  });
  await t.test('editor supports persistent rich formatting and single-flight saves with edits arriving in flight', async () => {
    await navigate('doc-a');
    state.editor.commands.setContent('<h1>Plan</h1><p><strong>Bold</strong> <em>italic</em> <u>underlined</u></p><ul><li><p>First</p></li></ul>');
    const gate = defer('update');
    const firstSave = saveDocument();
    await waitFor(() => concurrentUpdates === 1);
    state.editor.commands.insertContent('<p>Added while saving</p>');
    const secondSave = saveDocument();
    gate.resolve(); await Promise.all([firstSave, secondSave]);
    assert.equal(maxConcurrentUpdates, 1);
    assert.match(docs.get('doc-a').content, /<strong>Bold<\/strong>/);
    assert.match(docs.get('doc-a').content, /<u>underlined<\/u>/);
    assert.match(docs.get('doc-a').content, /Added while saving/);
    assert.equal(state.savedRevision, state.revision);
    assert.equal(localStorage.getItem('folio.draft.tyson.doc-a'), null);
    assert.match(document.querySelector('#save-status').textContent, /All changes saved/);
  });
  await t.test('navigation locks the previous editor while loading another document', async () => {
    const gate = defer('document'); const navigation = navigate('doc-b');
    await waitFor(() => gates.size === 0);
    assert.equal(state.editor.isEditable, false);
    assert.equal(document.querySelector('#document-title').readOnly, true);
    assert.equal(document.querySelector('[data-format="bold"]').disabled, true);
    gate.resolve(); await navigation;
    assert.equal(state.doc.id, 'doc-b'); assert.equal(state.editor.isEditable, true);
    assert.match(state.editor.getText(), /A second document/);
  });
  await t.test('version conflicts preserve local draft and prevent navigating away', async () => {
    state.editor.commands.setContent('<p>My local edit must survive.</p>');
    docs.get('doc-b').content = '<p>A remote teammate edit.</p>'; docs.get('doc-b').version++;
    await assert.rejects(saveDocument(), /newer version/);
    assert.match(state.editor.getText(), /My local edit must survive/);
    assert.ok(state.conflict);
    assert.match(localStorage.getItem('folio.draft.tyson.doc-b'), /My local edit must survive/);
    await navigate('doc-a'); assert.equal(state.doc.id, 'doc-b');
    assert.ok(document.querySelector('[data-action="save-copy"]'));
  });
  await t.test('save-copy locks editing and retains both local and remote versions', async () => {
    const gate = defer('create'); click('[data-action="save-copy"]');
    await waitFor(() => gates.size === 0);
    assert.equal(state.editor.isEditable, false);
    gate.resolve(); await waitFor(() => state.doc.id.startsWith('new-') && !state.navigation);
    assert.match(state.editor.getText(), /My local edit must survive/);
    assert.match(docs.get('doc-b').content, /remote teammate edit/);
    assert.equal(state.editor.isEditable, true); assert.equal(state.conflict, null);
  });
  await t.test('sharing responses cannot silently adopt a newer version while leaving stale editor content', async () => {
    const remote = { ...clone(state.doc), content: '<p>A remote revision arrived before the share update.</p>', title: 'Latest title', version: state.doc.version + 2 };
    docs.set(remote.id, clone(remote));
    applyAccessResponse(remote);
    assert.match(state.editor.getText(), /A remote revision arrived/);
    assert.equal(document.querySelector('#document-title').value, 'Latest title');
    state.editor.commands.insertContent(' My next edit.'); await saveDocument();
    assert.match(docs.get(remote.id).content, /A remote revision arrived/);
    assert.match(docs.get(remote.id).content, /My next edit/);
    const currentId = state.doc.id;
    applyAccessResponse({ ...clone(docs.get('doc-b')), role: 'owner' });
    assert.equal(state.doc.id, currentId, 'A delayed response for another document must not replace the open editor');
    assert.match(state.documents.find(doc => doc.id === 'doc-b').excerpt, /remote teammate edit/);
    assert.doesNotMatch(state.documents.find(doc => doc.id === 'doc-b').excerpt, /My next edit/);
  });
  await t.test('loading the latest conflict version blocks editing and competing navigation while in flight', async () => {
    state.editor.commands.setContent('<p>Local draft before reload.</p>');
    const remote = docs.get(state.doc.id); remote.content = '<p>Latest shared revision.</p>'; remote.version++;
    await assert.rejects(saveDocument());
    click('[data-action="reload-document"]');
    const gate = defer('document'); click('[data-action="confirm-reload"]');
    await waitFor(() => gates.size === 0);
    assert.equal(state.editor.isEditable, false); assert.equal(document.querySelector('#document-title').readOnly, true);
    const cancel = new Event('cancel', { cancelable: true }); document.querySelector('#modal').dispatchEvent(cancel); assert.equal(cancel.defaultPrevented, true);
    click('[data-action="home"]'); assert.equal(state.doc.id, remote.id);
    gate.resolve(); await waitFor(() => !state.operation);
    assert.match(state.editor.getText(), /Latest shared revision/); assert.equal(state.editor.isEditable, true); assert.equal(state.conflict, null);
  });
  await t.test('share form grants viewer access and account switching installs new CSRF token', async () => {
    const sharedId = state.doc.id;
    click('[data-action="share"]'); await waitFor(() => document.querySelector('#share-form'));
    document.querySelector('#invite-user').value = 'maya'; document.querySelector('#invite-role').value = 'viewer';
    const shareGate = defer('share');
    const form = document.querySelector('#share-form'); form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: form.querySelector('button') }));
    await waitFor(() => gates.size === 0); assert.equal(state.editor.isEditable, false); click('[data-action="close-modal"]'); assert.equal(document.querySelector('#modal').open, true);
    shareGate.resolve();
    await waitFor(() => docs.get(sharedId).sharedWith.some(share => share.userId === 'maya'));
    await waitFor(() => document.querySelector('[data-share-user="maya"]'));
    click('[data-action="close-modal"]');
    click('[data-action="accounts"]'); await waitFor(() => document.querySelector('[data-user="maya"]'));
    const previousToken = state.csrf; const switchGate = defer('switch_user'); click('[data-user="maya"]');
    await waitFor(() => gates.size === 0); assert.equal(state.editor.isEditable, false); click('[data-action="close-modal"]'); assert.equal(document.querySelector('#modal').open, true); switchGate.resolve();
    await waitFor(() => state.user.id === 'maya' && document.querySelector('.home-main'));
    assert.notEqual(state.csrf, previousToken);
    assert.equal(state.documents.find(doc => doc.id === sharedId).role, 'viewer');
    await navigate(sharedId); assert.equal(state.editor.isEditable, false);
    assert.equal(document.querySelector('#document-title').readOnly, true);
    assert.equal(document.querySelector('[data-format="bold"]').disabled, true);
    assert.equal(document.querySelector('[data-action="delete"]'), null);
    assert.match(document.querySelector('#save-status').textContent, /View only/);
    click('[data-action="accounts"]'); click('[data-user="tyson"]'); await waitFor(() => state.user.id === 'tyson' && document.querySelector('.home-main'));
  });
  await t.test('failed save keeps draft and retry writes it without loss', async () => {
    await navigate('doc-a'); state.editor.commands.setContent('<p>Keep this offline draft.</p>');
    failedNextUpdate = true; await assert.rejects(saveDocument());
    assert.match(state.editor.getText(), /offline draft/);
    assert.match(localStorage.getItem('folio.draft.tyson.doc-a'), /offline draft/);
    assert.match(document.querySelector('#editor-alert').textContent, /couldn’t save/);
    await saveDocument(); assert.match(docs.get('doc-a').content, /offline draft/); assert.equal(state.saveError, null);
  });
  await t.test('browser draft recovery restores unsaved content after reopening', async () => {
    await navigate(); localStorage.setItem('folio.draft.tyson.doc-a', JSON.stringify({ title: 'Recovered title', content: '<p>Recovered unsaved thought.</p>', version: docs.get('doc-a').version }));
    await navigate('doc-a'); assert.equal(document.querySelector('#document-title').value, 'Recovered title'); assert.match(state.editor.getText(), /Recovered unsaved thought/);
    await saveDocument(); assert.match(docs.get('doc-a').content, /Recovered unsaved thought/);
  });
  await t.test('skip link focuses content without navigating out of the editor', async () => {
    const originalId = state.doc.id; const main = document.getElementById('main'); let focusRequested = false; const originalFocus = main.focus.bind(main); main.focus = () => { focusRequested = true; originalFocus(); }; click('.skip-link'); await sleep(20);
    assert.equal(state.doc.id, originalId); assert.equal(main.getAttribute('tabindex'), '-1'); assert.equal(focusRequested, true);
  });
  await t.test('TXT import creates an editable document and rejects unsupported types', async () => {
    await navigate(); const input = document.querySelector('#import-file'); const file = new File(['A useful imported note.'], 'notes.txt', { type: 'text/plain' });
    const gate = defer('import');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] }); input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => gates.size === 0);
    click('[data-action="accounts"]'); click('[data-action="open"][data-id="doc-a"]');
    assert.equal(state.user.id, 'tyson'); assert.equal(state.doc, null); assert.equal(document.querySelector('#modal').open, false);
    gate.resolve();
    await waitFor(() => state.doc?.title === 'notes' && !state.navigation);
    assert.match(state.editor.getText(), /A useful imported note/);
    assert.equal(state.editor.isEditable, true);
    const previous = requests.filter(item => item.action === 'import').length;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['bad'], 'notes.exe')] }); input.dispatchEvent(new Event('change', { bubbles: true })); await sleep(20);
    assert.equal(requests.filter(item => item.action === 'import').length, previous);
  });
  await t.test('document titles are rendered as text and cannot inject HTML', async () => {
    const title = document.querySelector('#document-title'); title.value = '<img src=x onerror=alert(1)>'; title.dispatchEvent(new Event('input', { bubbles: true }));
    await saveDocument(); await navigate();
    assert.equal(document.querySelector('.document-card img'), null);
    assert.match(document.querySelector('#documents').textContent, /<img src=x onerror=alert\(1\)>/);
  });
  clearTimeout(state.saveTimer); state.editor?.destroy(); await window.happyDOM.close();
});
