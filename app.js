// ============================================================
// MEA Assistant v5 — app.js Modern Execution Engine
// ============================================================

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwgfTqS6lXwedsN7Q7RyJUzgQCJnIbB-ntM37P9JZHCGtrqErRx6yWgOhCXFUP5SjwD_g/exec';

let currentMode = 'idle';
let sessionHistoryId = 'session_' + new Date().getTime();
let localHistoryMemory = []; // Menyimpan history lokal untuk dirender di sidebar

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('question-input');
  
  // Realtime Character Counter
  inputEl.addEventListener('input', () => {
    let len = inputEl.value.length;
    if (len > 10000) {
      inputEl.value = inputEl.value.substring(0, 10000);
      len = 10000;
    }
    document.getElementById('credit-count').textContent = `${len.toLocaleString()} / 10,000 Credits`;
    
    // Auto grow height textarea minimalis
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
  });

  // Interseptor Ctrl+Enter
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executePrompt();
    }
  });

  // Welcome Response
  renderChatRow('Sistem Mandiri MEA Terhubung. Siap mengoptimalkan kode arsitektur website.', 'assistant', 'rule');
  loadDrafts();
});

// ── ENGINE MODE CONTROLLER (MENGATUR TRANSFER BODY AURA) ──
function changeSystemMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
  document.getElementById(`pill-${mode}`).classList.add('active');

  // Bersihkan kelas body penampung aura
  document.body.className = '';
  document.body.classList.add(`mode-${mode}-active`);
}

// ── SIDEBAR FUNCTIONAL ENGINE ──
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar-history');
  sidebar.classList.toggle('sidebar-hidden');
  if (!sidebar.classList.contains('sidebar-hidden')) {
    renderSidebarList();
  }
}

// ── MANAJEMEN RIWAYAT CHAT LOKAL ──
function pushToLocalHistory(prompt) {
  const shortText = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
  localHistoryMemory.unshift({
    id: 'hist_' + new Date().getTime(),
    text: shortText,
    fullText: prompt
  });
}

function renderSidebarList() {
  const container = document.getElementById('history-list-container');
  if (localHistoryMemory.length === 0) {
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
  event.stopPropagation(); // Mencegah loadPastPrompt terpicu
  localHistoryMemory = localHistoryMemory.filter(item => item.id !== itemId);
  renderSidebarList();
}

function clearAllHistoryFromDB() {
  if (confirm("Hapus seluruh jejak riwayat chat dari antarmuka?")) {
    localHistoryMemory = [];
    renderSidebarList();
    renderChatRow("🧹 Seluruh riwayat sesi lokal dibersihkan.", "assistant", "rule");
    toggleSidebar();
  }
}

function resetToHome() {
  document.getElementById('chat-container-minimal').innerHTML = '';
  renderChatRow('Sistem di-reset. Workspace bersih kembali.', 'assistant', 'rule');
}

// ── TRANSAKSI EKSEKUSI PROMPT ──
async function executePrompt() {
  const input = document.getElementById('question-input');
  const sendBtn = document.getElementById('execute-btn');
  const prompt = input.value.trim();

  if (!prompt) return;

  renderChatRow(prompt, 'user');
  pushToLocalHistory(prompt);
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('credit-count').textContent = `0 / 10,000 Credits`;

  sendBtn.disabled = true;
  toggleToastIndicator(true, currentMode === 'idle' ? 'Scanning Sheet KB...' : 'Invoking Claude-Level Gemini Brain...');

  try {
    const data = await postTransaction({
      action: 'chat',
      question: prompt,
      mode: currentMode,
      historyId: sessionHistoryId
    });

    if (data.error) {
      renderChatRow('❌ Transaction Error: ' + data.error, 'error');
    } else {
      renderChatRow(data.answer, 'assistant', data.source, data.contextUsed);
      if (data.draftCreated) await loadDrafts();
    }
  } catch (err) {
    renderChatRow('❌ Fatal Connection Timeout: ' + err.message, 'error');
  } finally {
    sendBtn.disabled = false;
    toggleToastIndicator(false);
  }
}

// ── PARSER RENDERING ROW MINIMALIS ──
function renderChatRow(text, speaker, source, context) {
  const area = document.getElementById('chat-container-minimal');
  const row = document.createElement('div');
  row.className = `message-row ${speaker}-row`;

  const speakerLabel = speaker === 'user' ? 'You' : 'MEA Assistant';
  
  let htmlContent = escapeHtml(String(text || ''))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  if (speaker === 'assistant' && source) {
    const srcLabels = { rule: 'DNA Config', search: 'Spreadsheet DB', gemini: 'Gemini Engine' };
    const ctxTxt = context && context.length ? ' via ' + context.join(' · ') : '';
    htmlContent += `<div class="msg-meta-bar">
      <span class="badge-src">${srcLabels[source] || source}</span>
      <span style="color:#444;">${escapeHtml(ctxTxt)}</span>
    </div>`;
  }

  row.innerHTML = `
    <div class="msg-speaker">${speakerLabel}</div>
    <div class="msg-bubble">${htmlContent}</div>
  `;

  area.appendChild(row);
  
  // Auto scroll halus ke bawah khusus pada area chat scroller
  const scroller = document.getElementById('chat-scroller');
  requestAnimationFrame(() => {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  });
}

// ── DRAFT ENGINE AGGREGATOR ──
async function loadDrafts() {
  try {
    const res = await postTransaction({ action: 'drafts' });
    const panel = document.getElementById('draft-floating-panel');
    const rowsContainer = document.getElementById('draft-item-rows');
    const count = document.getElementById('draft-count');

    if (!res.drafts || !res.drafts.length) {
      panel.classList.add('panel-hidden');
      return;
    }

    count.textContent = res.drafts.length;
    panel.classList.remove('panel-hidden');

    rowsContainer.innerHTML = res.drafts.map(d => `
      <div class="draft-row-item">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%">${escapeHtml(d.title)}</div>
        <div>
          <button class="draft-btn" onclick="actDraft('approve','${d.id}')" style="color:#28A745;">Approve</button>
          <button class="draft-btn" onclick="actDraft('reject','${d.id}')" style="color:#E53935;">Reject</button>
        </div>
      </div>
    `).join('');
  } catch (e) { console.log(e); }
}

async function actDraft(action, id) {
  try {
    const res = await postTransaction({ action: action, draftId: id });
    renderChatRow(res.answer || 'Draft Updated.', 'assistant', 'rule');
    await loadDrafts();
  } catch (err) { renderChatRow('❌ Update Failed', 'error'); }
}

// ── CORE UTILITIES ──
async function postTransaction(payload) {
  const r = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

function toggleToastIndicator(show, text = '') {
  const toast = document.getElementById('process-toast');
  const txt = document.getElementById('process-toast-text');
  if (show) {
    toast.classList.remove('toast-hidden');
    txt.textContent = text;
  } else {
    toast.classList.add('toast-hidden');
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    
