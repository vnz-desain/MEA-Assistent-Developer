// ============================================================
// MEA UI v5.2 — Swift Controller Engine
// ============================================================

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwgfTqS6lXwedsN7Q7RyJUzgQCJnIbB-ntM37P9JZHCGtrqErRx6yWgOhCXFUP5SjwD_g/exec';

let currentMode = 'idle';
let sessionHistoryId = 'session_' + new Date().getTime();
let localHistoryMemory = [];

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('question-input');
  
  inputEl.addEventListener('input', () => {
    let len = inputEl.value.length;
    if (len > 10000) { inputEl.value = inputEl.value.substring(0, 10000); len = 10000; }
    document.getElementById('credit-count').textContent = `${len.toLocaleString()} / 10K Credits`;
    
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executePrompt();
    }
  });

  renderChatRow('Sistem Mandiri MEA Terhubung. Layar dioptimalkan penuh.', 'assistant', 'rule');
  loadDrafts();
});

// ── NEW METHOD: SWIFT SLIDER CONTROL ──
function swiftMode(mode, offsetPercent) {
  currentMode = mode;
  
  // Geser background track slider secara mekanis & modern
  document.getElementById('swift-track').style.transform = `translateX(${offsetPercent}%)`;
  
  // Ubah status tombol aktif
  document.querySelectorAll('.swift-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Suntik tema aura ke tubuh aplikasi
  document.body.className = '';
  document.body.classList.add(`mode-${mode}-active`);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar-history');
  sidebar.classList.toggle('sidebar-hidden');
  if (!sidebar.classList.contains('sidebar-hidden')) renderSidebarList();
}

function pushToLocalHistory(prompt) {
  const shortText = prompt.length > 24 ? prompt.substring(0, 24) + '...' : prompt;
  localHistoryMemory.unshift({ id: 'hist_' + new Date().getTime(), text: shortText, fullText: prompt });
}

function renderSidebarList() {
  const container = document.getElementById('history-list-container');
  if (!localHistoryMemory.length) {
    container.innerHTML = `<div class="history-empty">Belum ada riwayat chat</div>`;
    return;
  }
  container.innerHTML = localHistoryMemory.map(item => `
    <div class="history-item" onclick="loadPastPrompt(\`${escapeHtml(item.fullText)}\`)">
      <div class="history-text">${escapeHtml(item.text)}</div>
      <button class="btn-del-single" onclick="deleteSingleHistoryItem(event, '${item.id}')">✕</button>
    </div>
  `).join('');
}

function loadPastPrompt(fullText) {
  document.getElementById('question-input').value = fullText;
  document.getElementById('question-input').dispatchEvent(new Event('input'));
  toggleSidebar();
}

function deleteSingleHistoryItem(event, itemId) {
  event.stopPropagation();
  localHistoryMemory = localHistoryMemory.filter(item => item.id !== itemId);
  renderSidebarList();
}

function clearAllHistoryFromDB() {
  if (confirm("Kosongkan semua sesi saat ini?")) {
    localHistoryMemory = [];
    renderSidebarList();
    toggleSidebar();
  }
}

function resetToHome() {
  document.getElementById('chat-dynamic-wall').innerHTML = '';
  renderChatRow('Sistem dibersihkan. Sesi dimulai kembali.', 'assistant', 'rule');
}

async function executePrompt() {
  const input = document.getElementById('question-input');
  const sendBtn = document.getElementById('execute-btn');
  const prompt = input.value.trim();

  if (!prompt) return;

  renderChatRow(prompt, 'user');
  pushToLocalHistory(prompt);
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('credit-count').textContent = `0 / 10K Credits`;

  sendBtn.disabled = true;
  toggleToastIndicator(true, currentMode === 'idle' ? 'Scanning DB...' : 'Invoking MEA AI Core...');

  try {
    const data = await postTransaction({
      action: 'chat', question: prompt, mode: currentMode, historyId: sessionHistoryId
    });

    if (data.error) {
      renderChatRow('❌ Error: ' + data.error, 'error');
    } else {
      renderChatRow(data.answer, 'assistant', data.source, data.contextUsed);
      if (data.draftCreated) await loadDrafts();
    }
  } catch (err) {
    renderChatRow('❌ Connection Timeout', 'error');
  } finally {
    sendBtn.disabled = false;
    toggleToastIndicator(false);
  }
}

function renderChatRow(text, speaker, source, context) {
  const area = document.getElementById('chat-dynamic-wall');
  const row = document.createElement('div');
  row.className = `message-row ${speaker}-row`;

  const speakerLabel = speaker === 'user' ? 'You' : 'MEA Assistant';
  let htmlContent = escapeHtml(String(text || ''))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  if (speaker === 'assistant' && source) {
    const srcLabels = { rule: 'DNA', search: 'Local DB', gemini: 'Gemini Engine' };
    htmlContent += `<div class="msg-meta-bar">
      <span class="badge-src">${srcLabels[source] || source}</span>
    </div>`;
  }

  row.innerHTML = `<div class="msg-speaker">${speakerLabel}</div><div class="msg-bubble">${htmlContent}</div>`;
  area.appendChild(row);
  
  // Auto-scroll area dalam secara presisi
  const scroller = document.getElementById('chat-scroll-area');
  requestAnimationFrame(() => { scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }); });
}

async function loadDrafts() {
  try {
    const res = await postTransaction({ action: 'drafts' });
    const panel = document.getElementById('draft-floating-panel');
    const rowsContainer = document.getElementById('draft-item-rows');
    const count = document.getElementById('draft-count');

    if (!res.drafts || !res.drafts.length) { panel.classList.add('panel-hidden'); return; }

    count.textContent = res.drafts.length;
    panel.classList.remove('panel-hidden');
    rowsContainer.innerHTML = res.drafts.map(d => `
      <div class="draft-row-item">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:55%">${escapeHtml(d.title)}</div>
        <div>
          <button class="draft-btn" onclick="actDraft('approve','${d.id}')" style="color:#34C759;">Approve</button>
          <button class="draft-btn" onclick="actDraft('reject','${d.id}')" style="color:#FF3B30;">Reject</button>
        </div>
      </div>
    `).join('');
  } catch (e) {}
}

async function actDraft(action, id) {
  try {
    const res = await postTransaction({ action: action, draftId: id });
    renderChatRow(res.answer || 'Draft updated.', 'assistant', 'rule');
    await loadDrafts();
  } catch (err) {}
}

async function postTransaction(payload) {
  const r = await fetch(BACKEND_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload)
  });
  return r.json();
}

function toggleToastIndicator(show, text = '') {
  const toast = document.getElementById('process-toast');
  const txt = document.getElementById('process-toast-text');
  if (show) { toast.classList.remove('toast-hidden'); txt.textContent = text; }
  else { toast.classList.add('toast-hidden'); }
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                             }
