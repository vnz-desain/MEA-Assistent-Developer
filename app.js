// ============================================================
// MEA Assistant v5 — app.js Execution Engine
// ============================================================

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwgfTqS6lXwedsN7Q7RyJUzgQCJnIbB-ntM37P9JZHCGtrqErRx6yWgOhCXFUP5SjwD_g/exec';

let currentMode = 'idle';
let chatHistoryId = 'session_' + new Date().getTime();

// ── UTURAN AMBANG COMPRESSION INPUT (10,000 CREDITS MAX) ──
const MAX_INPUT_LIMIT = 10000;

// ── INITIALIZATION ON SYSTEM LOAD ──
document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('question-input');
  
  // Realtime Character/Credit Counter
  inputEl.addEventListener('input', () => {
    let len = inputEl.value.length;
    if (len > MAX_INPUT_LIMIT) {
      inputEl.value = inputEl.value.substring(0, MAX_INPUT_LIMIT);
      len = MAX_INPUT_LIMIT;
    }
    document.getElementById('credit-count').textContent = `${len.toLocaleString()} / 10,000 Credits Used`;
  });

  // Ctrl + Enter interceptor execution
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Welcome Announcement
  appendMessageRender('Sistem Mandiri MEA Assistant v5 Terhubung 🚀\nMode Default saat ini: **IDLE** (Penelusuran basis data lokal tanpa konsumsi token AI).\n\nPilih Mode **CORE** di sub-header untuk bantuan pengembangan komprehensif website.', 'assistant', 'rule');
  
  // Ambil Draft Awal
  loadDrafts();
  setInterval(loadDrafts, 45000); // Sinkronisasi otomatis berkala tiap 45 detik
});

// ── MODE SWITCH CONTROL SYSTEM ──
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`mode-${mode}`).classList.add('active');
  
  // Update Body Theme Modifier for Core Mode Glow Effects
  if (mode === 'core') {
    document.body.classList.add('core-active-mode');
    setStatusVisual('idle', 'CORE SYSTEM ACTIVE');
  } else {
    document.body.classList.remove('core-active-mode');
    setStatusVisual('idle', 'SYSTEM READY');
  }
}

// ── TAB LAYOUT ROTATION NAVIGATION ──
function switchTab(targetTab) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  
  if (targetTab === 'chat') {
    document.querySelector("onclick*='chat'").classList.add('active'); // Fallback safe
    document.getElementById('tab-chat').classList.remove('hidden');
  } else {
    document.getElementById('tab-knowledge').classList.remove('hidden');
  }
  event.target.classList.add('active');
}

// ── MESSAGE EXECUTION TRANSACTIONS ──
async function sendMessage() {
  const input = document.getElementById('question-input');
  const sendBtn = document.getElementById('send-btn');
  const prompt = input.value.trim();
  
  if (!prompt) return;

  // Render teks ke layar obrolan lokal
  appendMessageRender(prompt, 'user');
  input.value = '';
  document.getElementById('credit-count').textContent = `0 / 10,000 Credits Used`;
  
  sendBtn.disabled = true;
  setIndicatorState(true, currentMode === 'idle' ? 'Scanning Local Database...' : 'Core Engine Analysing Stack...');
  setStatusVisual('process', 'PROCESSING');

  try {
    const res = await apiPostTransaction({
      action: 'chat',
      question: prompt,
      mode: currentMode,
      historyId: chatHistoryId
    });

    if (res.error) {
      appendMessageRender('❌ Gagal Memproses: ' + res.error, 'error');
      setStatusVisual('idle', 'ERROR STATE');
    } else {
      appendMessageRender(res.answer, 'assistant', res.source, res.contextUsed);
      if (res.draftCreated) await loadDrafts();
      setStatusVisual('ok', 'TRANSACTION SUCCESS');
      setTimeout(() => setStatusVisual('idle', currentMode === 'core' ? 'CORE SYSTEM ACTIVE' : 'SYSTEM READY'), 1500);
    }
  } catch (err) {
    appendMessageRender('❌ Jaringan Terputus: ' + err.message, 'error');
    setStatusVisual('idle', 'NETWORK FAIL');
  } finally {
    sendBtn.disabled = false;
    setIndicatorState(false);
  }
}

// ── PENDING DRAFTS ENGINE INTEGRATION ──
async function loadDrafts() {
  try {
    const res = await apiPostTransaction({ action: 'drafts' });
    const panel = document.getElementById('draft-panel');
    const list = document.getElementById('draft-list');
    const countBadge = document.getElementById('draft-count');

    if (!res.drafts || !res.drafts.length) {
      panel.classList.add('hidden');
      return;
    }

    countBadge.textContent = res.drafts.length;
    panel.classList.remove('hidden');

    list.innerHTML = res.drafts.map(d => `
      <div class="draft-item">
        <div class="d-info"><strong>${escapeHtmlEntities(d.title)}</strong> (${d.id})</div>
        <div class="d-actions">
          <button class="btn-act btn-act--ok" onclick="executeDraftAction('approve','${d.id}')">APPROVE</button>
          <button class="btn-act btn-act--no" onclick="executeDraftAction('reject','${d.id}')">REJECT</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('DraftSyncError:', e);
  }
}

async function executeDraftAction(action, draftId) {
  setStatusVisual('process', 'UPDATING DB');
  try {
    const res = await apiPostTransaction({ action: action, draftId: draftId });
    appendMessageRender(res.answer || '✅ Selesai memperbarui arsip.', 'assistant', 'rule');
    await loadDrafts();
  } catch(err) {
    appendMessageRender('❌ Gagal eksekusi: ' + err.message, 'error');
  } finally {
    setStatusVisual('idle', 'SYSTEM READY');
  }
}

// ── RENDER ENGINE & MARKDOWN PARSER LUXURY MINIMALIST ──
function appendMessageRender(text, type, source, contextArray) {
  const area = document.getElementById('chat-area');
  const div = document.createElement('div');
  div.className = `message message--${type}`;

  // Pembersihan & Pengubahan Karakter Khusus Regulasi Markdown
  let html = escapeHtmlEntities(String(text || ''))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  if (type === 'assistant' && source) {
    const labels = { rule: 'DNA CONFIG', search: 'LOCAL SPREADSHEET', gemini: 'GEMINI AI THREAD' };
    const ctxString = contextArray && contextArray.length ? ' dari: ' + contextArray.join(' · ') : '';
    html += `<div class="msg-meta">
      <span class="badge badge--${source}">${labels[source] || source}</span>
      <span style="font-size:0.52rem; color:#666;">${escapeHtmlEntities(ctxString)}</span>
    </div>`;
  }

  div.innerHTML = html;
  area.appendChild(div);
  
  // Auto Scroll Stabilizer smooth 1 layar
  requestAnimationFrame(() => {
    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
  });
}

// ── AJAX POST TRANSACTION HELPER SAFE FROM CORS PREFLIGHT ──
async function apiPostTransaction(payload) {
  // Menggunakan text/plain agar browser tidak mengirimkan preflight OPTIONS request
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Network status fault code: ' + response.status);
  return response.json();
}

// ── INTERFACE STATUS VISUAL STATE CONTROL ──
function setStatusVisual(state, labelString) {
  const dot = document.getElementById('status-dot');
  const lbl = document.getElementById('status-label');
  if (dot) dot.className = 'dot dot--' + state;
  if (lbl) lbl.textContent = labelString.toUpperCase();
}

function setIndicatorState(show, textStr = '') {
  const ind = document.getElementById('ai-process-indicator');
  const txt = document.getElementById('process-text');
  if (show) {
    ind.classList.remove('hidden');
    txt.textContent = textStr;
  } else {
    ind.classList.add('hidden');
  }
}

function escapeHtmlEntities(string) {
  return String(string || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
    
