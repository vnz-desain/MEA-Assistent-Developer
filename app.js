// ======================================================
// MEA ASSISTANT V6
// APP.JS PART 1
// CORE INITIALIZATION ENGINE
// ======================================================

// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

const BACKEND_URL =
'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

const MAX_CREDITS = 10000;

// ------------------------------------------------------
// GLOBAL STATE
// ------------------------------------------------------

let currentMode = 'idle';

let sessionId =
'session_' + Date.now();

let localHistory = [];

let isGenerating = false;

// ------------------------------------------------------
// DOM
// ------------------------------------------------------

const chatContainer =
document.getElementById('chat-container');

const textarea =
document.getElementById('prompt-input');

const sendBtn =
document.getElementById('send-btn');

const creditCounter =
document.getElementById('credit-counter');

const loader =
document.getElementById('loader-wrapper');

const sidebar =
document.getElementById('sidebar');

const menuBtn =
document.getElementById('menu-btn');

const closeSidebarBtn =
document.getElementById('close-sidebar-btn');

const resetBtn =
document.getElementById('reset-btn');

const historyContainer =
document.getElementById('history-container');

// ------------------------------------------------------
// INIT
// ------------------------------------------------------

document.addEventListener(
'DOMContentLoaded',
initApplication
);

function initApplication(){

initializeTextarea();

initializeSidebar();

initializeSwiftSlider();

initializeReset();

loadHistory();

updateCreditCounter();

hideLoader();

console.log(
    'MEA Assistant V6 Ready'
);

}

// ------------------------------------------------------
// TEXTAREA
// ------------------------------------------------------

function initializeTextarea(){

textarea.addEventListener(
    'input',
    handleTextareaInput
);

textarea.addEventListener(
    'keydown',
    handleTextareaKeydown
);

}

function handleTextareaInput(){

autoResizeTextarea();

updateCreditCounter();

}

function handleTextareaKeydown(e){

if(
    e.key === 'Enter'
    &&
    !e.shiftKey
){

    e.preventDefault();

    executePrompt();
}

}

function autoResizeTextarea(){

textarea.style.height =
'auto';

textarea.style.height =
Math.min(
    textarea.scrollHeight,
    160
) + 'px';

}

function updateCreditCounter(){

let len =
textarea.value.length;

if(len > MAX_CREDITS){

    textarea.value =
    textarea.value.substring(
        0,
        MAX_CREDITS
    );

    len =
    MAX_CREDITS;
}

creditCounter.textContent =
len.toLocaleString()
+
' / '
+
MAX_CREDITS.toLocaleString();

}

// ------------------------------------------------------
// SIDEBAR
// ------------------------------------------------------

function initializeSidebar(){

menuBtn.addEventListener(
    'click',
    openSidebar
);

closeSidebarBtn.addEventListener(
    'click',
    closeSidebar
);

}

function openSidebar(){

sidebar.classList.remove(
    'sidebar-hidden'
);

}

function closeSidebar(){

sidebar.classList.add(
    'sidebar-hidden'
);

}

// ------------------------------------------------------
// SWIFT SLIDER
// ------------------------------------------------------

function initializeSwiftSlider(){

const buttons =
document.querySelectorAll(
    '.swift-btn'
);

const indicator =
document.getElementById(
    'swift-indicator'
);

buttons.forEach(
    (button,index)=>{

        button.addEventListener(
            'click',
            ()=>{

                buttons.forEach(
                    btn=>
                    btn.classList.remove(
                        'active'
                    )
                );

                button.classList.add(
                    'active'
                );

                currentMode =
                button.dataset.mode;

                moveIndicator(
                    indicator,
                    index
                );

                updateBodyMode(
                    currentMode
                );
            }
        );
    }
);

}

function moveIndicator(
indicator,
index
){

const width =
100 / 3;

indicator.style.transform =
`translateX(${width * index}%)`;

}

function updateBodyMode(
mode
){

document.body.classList.remove(
    'mode-idle',
    'mode-auto',
    'mode-core'
);

document.body.classList.add(
    `mode-${mode}`
);

}

// ------------------------------------------------------
// LOADER
// ------------------------------------------------------

function showLoader(
text='Processing...'
){

const loaderText =
document.getElementById(
    'loader-text'
);

loaderText.textContent =
text;

loader.classList.remove(
    'hidden'
);

}

function hideLoader(){

loader.classList.add(
    'hidden'
);

}

// ------------------------------------------------------
// AUTO SCROLL
// ------------------------------------------------------

function scrollToBottom(){

requestAnimationFrame(()=>{

    const container =
    document.getElementById(
        'chat-scroll'
    );

    container.scrollTop =
    container.scrollHeight;
});

}

// ------------------------------------------------------
// HISTORY STORAGE
// ------------------------------------------------------

function saveHistory(){

localStorage.setItem(
    'mea_history',
    JSON.stringify(
        localHistory
    )
);

}

function loadHistory(){

try{

    const data =
    localStorage.getItem(
        'mea_history'
    );

    if(!data) return;

    localHistory =
    JSON.parse(data);

    renderHistory();

}catch(err){

    console.error(err);
}

}

function addHistory(text){

localHistory.unshift({

    id:
    'hist_' + Date.now(),

    text
});

if(
    localHistory.length > 50
){

    localHistory =
    localHistory.slice(
        0,
        50
    );
}

saveHistory();

renderHistory();

}

function renderHistory(){

if(
    !localHistory.length
){

    historyContainer.innerHTML =
    `
    <div class="history-empty">
        Belum ada riwayat
    </div>
    `;

    return;
}

historyContainer.innerHTML =
localHistory.map(item=>`

    <div class="history-item">

        ${escapeHtml(item.text)}

    </div>

`).join('');

}

// ------------------------------------------------------
// ESCAPE HTML
// ------------------------------------------------------

function escapeHtml(text){

const div =
document.createElement('div');

div.textContent =
text;

return div.innerHTML;

}

// ======================================================
// MEA ASSISTANT V6
// APP.JS PART 2
// CHAT RENDER ENGINE
// ======================================================

// ------------------------------------------------------
// TEMPLATES
// ------------------------------------------------------

const userTemplate =
document.getElementById(
'user-message-template'
);

const assistantTemplate =
document.getElementById(
'assistant-message-template'
);

// ------------------------------------------------------
// WELCOME SCREEN
// ------------------------------------------------------

function removeWelcomeScreen(){

const welcome =
document.getElementById(
    'welcome-screen'
);

if(welcome){

    welcome.remove();
}

}

// ------------------------------------------------------
// USER MESSAGE
// ------------------------------------------------------

function renderUserMessage(text){

removeWelcomeScreen();

const clone =
userTemplate.content.cloneNode(
    true
);

clone.querySelector(
    '.message-content'
).textContent = text;

chatContainer.appendChild(
    clone
);

scrollToBottom();

}

// ------------------------------------------------------
// ASSISTANT MESSAGE
// ------------------------------------------------------

function renderAssistantMessage(
text
){

removeWelcomeScreen();

const clone =
assistantTemplate.content.cloneNode(
    true
);

const bubble =
clone.querySelector(
    '.message-content'
);

bubble.textContent = text;

chatContainer.appendChild(
    clone
);

initializeAssistantButtons();

scrollToBottom();

}

// ------------------------------------------------------
// ASSISTANT MESSAGE WITH TYPING
// ------------------------------------------------------

async function renderAssistantTyping(

text,

speed = 8

){

removeWelcomeScreen();

const clone =
assistantTemplate.content.cloneNode(
    true
);

const bubble =
clone.querySelector(
    '.message-content'
);

bubble.textContent = '';

chatContainer.appendChild(
    clone
);

scrollToBottom();

let current = '';

for(

    let i = 0;

    i < text.length;

    i++

){

    current += text[i];

    bubble.textContent =
    current;

    if(i % 3 === 0){

        scrollToBottom();
    }

    await delay(speed);
}

initializeAssistantButtons();

}

// ------------------------------------------------------
// TYPEWRITER FAST
// ------------------------------------------------------

async function renderAssistantTypingSmart(
text
){

const length =
text.length;

let speed = 8;

if(length > 500){

    speed = 4;
}

if(length > 1000){

    speed = 2;
}

await renderAssistantTyping(
    text,
    speed
);

}

// ------------------------------------------------------
// COPY BUTTON
// ------------------------------------------------------

function initializeAssistantButtons(){

const copyButtons =
document.querySelectorAll(
    '.copy-btn'
);

copyButtons.forEach(btn=>{

    if(
        btn.dataset.bound
    ) return;

    btn.dataset.bound =
    'true';

    btn.addEventListener(
        'click',
        handleCopy
    );
});

const downloadButtons =
document.querySelectorAll(
    '.download-btn'
);

downloadButtons.forEach(btn=>{

    if(
        btn.dataset.bound
    ) return;

    btn.dataset.bound =
    'true';

    btn.addEventListener(
        'click',
        handleDownload
    );
});

}

// ------------------------------------------------------
// COPY
// ------------------------------------------------------

async function handleCopy(e){

try{

    const row =
    e.target.closest(
        '.assistant-row'
    );

    const text =
    row.querySelector(
        '.message-content'
    ).innerText;

    await navigator.clipboard.writeText(
        text
    );

    const original =
    e.target.textContent;

    e.target.textContent =
    'Copied';

    setTimeout(()=>{

        e.target.textContent =
        original;

    },1500);

}catch(err){

    console.error(err);
}

}

// ------------------------------------------------------
// DOWNLOAD TXT
// ------------------------------------------------------

function handleDownload(e){

const row =
e.target.closest(
    '.assistant-row'
);

const text =
row.querySelector(
    '.message-content'
).innerText;

const blob =
new Blob(

    [text],

    {
        type:
        'text/plain'
    }

);

const url =
URL.createObjectURL(
    blob
);

const a =
document.createElement(
    'a'
);

a.href =
url;

a.download =
'MEA_Response.txt';

document.body.appendChild(
    a
);

a.click();

a.remove();

URL.revokeObjectURL(
    url
);

}

// ------------------------------------------------------
// SYSTEM MESSAGE
// ------------------------------------------------------

function renderSystemMessage(
text
){

const div =
document.createElement(
    'div'
);

div.className =
'message-row assistant-row';

div.innerHTML =
`
<div class="message-bubble">

    <div class="message-content">

        ${escapeHtml(text)}

    </div>

</div>
`;

chatContainer.appendChild(
    div
);

scrollToBottom();

}

// ------------------------------------------------------
// ERROR MESSAGE
// ------------------------------------------------------

function renderErrorMessage(
text
){

const div =
document.createElement(
    'div'
);

div.className =
'message-row assistant-row';

div.innerHTML =
`
<div class="message-bubble">

    <div
    style="
    color:#ff6b63;
    ">

    ${escapeHtml(text)}

    </div>

</div>
`;

chatContainer.appendChild(
    div
);

scrollToBottom();

}

// ------------------------------------------------------
// MESSAGE ANIMATION
// ------------------------------------------------------

function animateLatestMessage(){

const messages =
document.querySelectorAll(
    '.message-row'
);

const latest =
messages[
    messages.length - 1
];

if(!latest) return;

latest.animate(

    [

        {
            opacity:0,
            transform:
            'translateY(10px)'
        },

        {
            opacity:1,
            transform:
            'translateY(0)'
        }

    ],

    {

        duration:250,
        easing:'ease-out'
    }
);

}

// ------------------------------------------------------
// DELAY
// ------------------------------------------------------

function delay(ms){

return new Promise(

    resolve=>{

        setTimeout(
            resolve,
            ms
        );
    }

);

  }
// ======================================================
// MEA ASSISTANT V6
// APP.JS PART 3
// BACKEND ENGINE
// ======================================================

// ------------------------------------------------------
// SEND BUTTON
// ------------------------------------------------------

sendBtn.addEventListener(
'click',
executePrompt
);

// ------------------------------------------------------
// EXECUTE PROMPT
// ------------------------------------------------------

async function executePrompt(){

if(isGenerating) return;

const prompt =
textarea.value.trim();

if(!prompt) return;

isGenerating = true;

sendBtn.disabled = true;

renderUserMessage(
    prompt
);

addHistory(
    prompt
);

textarea.value = '';

autoResizeTextarea();

updateCreditCounter();

showLoader(
    'MEA Processing...'
);

try{

    const response =
    await sendToBackend(
        prompt
    );

    hideLoader();

    await renderAssistantTypingSmart(
        response
    );

}catch(error){

    hideLoader();

    renderErrorMessage(

        'Koneksi gagal atau server tidak merespons.'

    );

    console.error(
        error
    );
}

sendBtn.disabled = false;

isGenerating = false;

}

// ------------------------------------------------------
// SEND TO BACKEND
// ------------------------------------------------------

async function sendToBackend(
prompt
){

const payload = {

    action:
    'chat',

    question:
    prompt,

    mode:
    currentMode,

    historyId:
    sessionId
};

const response =
await fetch(

    BACKEND_URL,

    {

        method:'POST',

        headers:{
            'Content-Type':
            'application/json'
        },

        body:
        JSON.stringify(
            payload
        )
    }

);

if(
    !response.ok
){

    throw new Error(
        'HTTP Error'
    );
}

const data =
await response.json();

if(
    data.error
){

    throw new Error(
        data.error
    );
}

return (

    data.answer ||

    data.response ||

    'Tidak ada respons.'
);

}

// ------------------------------------------------------
// RESET CHAT
// ------------------------------------------------------

function initializeReset(){

resetBtn.addEventListener(

    'click',

    resetConversation
);

}

function resetConversation(){

const confirmed =
confirm(

    'Mulai sesi baru?'

);

if(!confirmed)
return;

sessionId =
'session_' +
Date.now();

chatContainer.innerHTML =

`
<div id="welcome-screen">

    <div class="welcome-logo">
        M
    </div>

    <h1>
        MEA Assistant
    </h1>

    <p>
        Sistem siap menerima instruksi.
    </p>

</div>
`;

}

// ------------------------------------------------------
// CLEAR HISTORY
// ------------------------------------------------------

const clearHistoryBtn =
document.getElementById(
'clear-history-btn'
);

if(clearHistoryBtn){

clearHistoryBtn.addEventListener(

    'click',

    clearHistory
);

}

function clearHistory(){

const confirmed =
confirm(
    'Hapus semua riwayat?'
);

if(!confirmed)
return;

localHistory = [];

saveHistory();

renderHistory();

}

// ------------------------------------------------------
// TIMEOUT FETCH
// ------------------------------------------------------

async function fetchWithTimeout(

url,

options = {},

timeout = 45000

){

const controller =
new AbortController();

const timer =
setTimeout(

    ()=>{

        controller.abort();

    },

    timeout
);

try{

    const response =
    await fetch(

        url,

        {

            ...options,

            signal:
            controller.signal
        }

    );

    clearTimeout(
        timer
    );

    return response;

}catch(err){

    clearTimeout(
        timer
    );

    throw err;
}

}

// ------------------------------------------------------
// IMPROVED BACKEND REQUEST
// ------------------------------------------------------

async function sendToBackendSafe(
prompt
){

const payload = {

    action:
    'chat',

    question:
    prompt,

    mode:
    currentMode,

    historyId:
    sessionId
};

const response =
await fetchWithTimeout(

    BACKEND_URL,

    {

        method:'POST',

        headers:{

            'Content-Type':
            'application/json'
        },

        body:
        JSON.stringify(
            payload
        )
    },

    45000
);

const data =
await response.json();

return (

    data.answer ||

    data.response ||

    'Tidak ada jawaban.'
);

}

// ------------------------------------------------------
// AUTO SCROLL OBSERVER
// ------------------------------------------------------

const observer =
new MutationObserver(

()=>{

    scrollToBottom();
}

);

observer.observe(

chatContainer,

{

    childList:true,

    subtree:true
}

);

// ------------------------------------------------------
// STARTUP MESSAGE
// ------------------------------------------------------

setTimeout(

()=>{

    console.log(
        'MEA Ready'
    );

},

500

);
