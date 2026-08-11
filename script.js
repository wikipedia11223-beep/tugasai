/* =========================================================
   TUGASAI — MAIN JAVASCRIPT
   Cocok dengan index.html + style.css
========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
========================================================= */

const CONFIG = {
    appName: "TugasAI",

    maxCharacters: 10000,

    storageKey: "tugasai_data_v1",

    settingsKey: "tugasai_settings_v1",

    maxHistory: 50,

    demoMode: true,

    typingDelay: 18
};


/* =========================================================
   2. APPLICATION STATE
========================================================= */

const state = {
    conversations: [],

    activeConversationId: null,

    isGenerating: false,

    generationTimer: null,

    generationStopped: false,

    selectedModel: "default",

    pendingFiles: [],

    contextConversationId: null,

    settings: {
        theme: "system",
        language: "id",
        name: "Pengguna"
    }
};


/* =========================================================
   3. DOM HELPER
========================================================= */

const $ = (id) => document.getElementById(id);

const DOM = {};


/* =========================================================
   4. INITIALIZE DOM
========================================================= */

function cacheDOM() {

    DOM.app = $("app");

    DOM.sidebar = $("sidebar");
    DOM.sidebarOverlay = $("sidebarOverlay");

    DOM.openSidebarButton = $("openSidebarButton");
    DOM.closeSidebarButton = $("closeSidebarButton");

    DOM.newChatButton = $("newChatButton");

    DOM.conversationSearch = $("conversationSearch");
    DOM.conversationList = $("conversationList");
    DOM.emptyConversationState = $("emptyConversationState");

    DOM.settingsButton = $("settingsButton");
    DOM.themeButton = $("themeButton");

    DOM.userName = $("userName");
    DOM.userPlan = $("userPlan");
    DOM.profileMenuButton = $("profileMenuButton");

    DOM.shareButton = $("shareButton");
    DOM.topbarMoreButton = $("topbarMoreButton");

    DOM.modelSelectorButton = $("modelSelectorButton");
    DOM.selectedModel = $("selectedModel");
    DOM.modelStatus = $("modelStatus");
    DOM.modelMenu = $("modelMenu");

    DOM.chatView = $("chatView");
    DOM.welcomeScreen = $("welcomeScreen");
    DOM.quickActions = $("quickActions");
    DOM.messageList = $("messageList");

    DOM.generatingIndicator = $("generatingIndicator");

    DOM.composerArea = $("composerArea");
    DOM.messageForm = $("messageForm");
    DOM.messageInput = $("messageInput");

    DOM.characterCounter = $("characterCounter");

    DOM.attachButton = $("attachButton");
    DOM.fileInput = $("fileInput");

    DOM.attachmentPreview = $("attachmentPreview");
    DOM.attachmentList = $("attachmentList");

    DOM.voiceButton = $("voiceButton");

    DOM.sendButton = $("sendButton");
    DOM.stopButton = $("stopButton");

    DOM.settingsModal = $("settingsModal");
    DOM.themeSelect = $("themeSelect");
    DOM.languageSelect = $("languageSelect");
    DOM.nameInput = $("nameInput");

    DOM.clearHistoryButton = $("clearHistoryButton");

    DOM.confirmModal = $("confirmModal");
    DOM.cancelConfirmButton = $("cancelConfirmButton");
    DOM.confirmActionButton = $("confirmActionButton");

    DOM.toastContainer = $("toastContainer");

    DOM.contextMenu = $("contextMenu");
}


/* =========================================================
   5. STORAGE
========================================================= */

function loadData() {

    try {

        const savedData =
            localStorage.getItem(CONFIG.storageKey);

        const savedSettings =
            localStorage.getItem(CONFIG.settingsKey);


        if (savedData) {

            const parsed = JSON.parse(savedData);

            if (Array.isArray(parsed)) {

                state.conversations = parsed;

            }

        }


        if (savedSettings) {

            const parsedSettings =
                JSON.parse(savedSettings);

            state.settings = {
                ...state.settings,
                ...parsedSettings
            };

        }

    } catch (error) {

        console.warn(
            "TugasAI: gagal membaca data lokal.",
            error
        );

    }
}


function saveData() {

    try {

        localStorage.setItem(
            CONFIG.storageKey,
            JSON.stringify(state.conversations)
        );

    } catch (error) {

        console.warn(
            "TugasAI: gagal menyimpan percakapan.",
            error
        );

    }
}


function saveSettings() {

    try {

        localStorage.setItem(
            CONFIG.settingsKey,
            JSON.stringify(state.settings)
        );

    } catch (error) {

        console.warn(
            "TugasAI: gagal menyimpan pengaturan.",
            error
        );

    }
}


/* =========================================================
   6. ID GENERATOR
========================================================= */

function createId(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/* =========================================================
   7. DATE
========================================================= */

function getDateLabel(timestamp) {

    const date = new Date(timestamp);

    const today = new Date();

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);


    if (
        date.toDateString() ===
        today.toDateString()
    ) {
        return "Hari ini";
    }


    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {
        return "Kemarin";
    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "numeric",
            month: "short"
        }
    );
}


/* =========================================================
   8. CONVERSATION
========================================================= */

function createConversation(firstMessage = "") {

    const now = Date.now();

    const conversation = {

        id: createId("conversation"),

        title:
            firstMessage.trim()
                ? createConversationTitle(firstMessage)
                : "Percakapan baru",

        createdAt: now,

        updatedAt: now,

        messages: []

    };


    state.conversations.unshift(conversation);

    state.activeConversationId =
        conversation.id;


    trimConversationHistory();

    saveData();

    renderConversationList();

    renderActiveConversation();

    return conversation;
}


function createConversationTitle(text) {

    const clean = text
        .replace(/\s+/g, " ")
        .trim();

    if (!clean) {
        return "Percakapan baru";
    }

    return clean.length > 42
        ? clean.slice(0, 42).trim() + "..."
        : clean;
}


function getActiveConversation() {

    return state.conversations.find(
        conversation =>
            conversation.id ===
            state.activeConversationId
    ) || null;
}


function trimConversationHistory() {

    if (
        state.conversations.length >
        CONFIG.maxHistory
    ) {

        state.conversations =
            state.conversations.slice(
                0,
                CONFIG.maxHistory
            );

    }
}


function deleteConversation(id) {

    state.conversations =
        state.conversations.filter(
            conversation =>
                conversation.id !== id
        );


    if (
        state.activeConversationId === id
    ) {

        state.activeConversationId =
            state.conversations.length
                ? state.conversations[0].id
                : null;

    }


    saveData();

    renderConversationList();

    renderActiveConversation();
}


function renameConversation(id) {

    const conversation =
        state.conversations.find(
            item => item.id === id
        );


    if (!conversation) {
        return;
    }


    const newTitle =
        window.prompt(
            "Masukkan nama percakapan:",
            conversation.title
        );


    if (
        newTitle === null
    ) {
        return;
    }


    const cleanTitle =
        newTitle.trim();


    if (!cleanTitle) {
        showToast("Nama tidak boleh kosong.");
        return;
    }


    conversation.title =
        cleanTitle.slice(0, 80);

    conversation.updatedAt =
        Date.now();


    saveData();

    renderConversationList();

    showToast("Nama percakapan diperbarui.");
}


/* =========================================================
   9. RENDER CONVERSATIONS
========================================================= */

function renderConversationList(
    searchTerm = ""
) {

    if (!DOM.conversationList) {
        return;
    }


    DOM.conversationList.innerHTML = "";


    const normalizedSearch =
        searchTerm
            .trim()
            .toLowerCase();


    const filtered =
        state.conversations.filter(
            conversation => {

                if (!normalizedSearch) {
                    return true;
                }

                return (
                    conversation.title
                        .toLowerCase()
                        .includes(normalizedSearch)
                );

            }
        );


    DOM.emptyConversationState.hidden =
        filtered.length !== 0;


    filtered.forEach(conversation => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "conversation-item";


        if (
            conversation.id ===
            state.activeConversationId
        ) {

            button.classList.add("active");

        }


        button.dataset.conversationId =
            conversation.id;


        const title =
            document.createElement("span");

        title.className =
            "conversation-item-title";

        title.textContent =
            conversation.title;


        button.appendChild(title);


        button.addEventListener(
            "click",
            () => {

                openConversation(
                    conversation.id
                );

            }
        );


        button.addEventListener(
            "contextmenu",
            event => {

                event.preventDefault();

                showContextMenu(
                    event.clientX,
                    event.clientY,
                    conversation.id
                );

            }
        );


        DOM.conversationList.appendChild(
            button
        );

    });

}


function openConversation(id) {

    const exists =
        state.conversations.some(
            conversation =>
                conversation.id === id
        );


    if (!exists) {
        return;
    }


    state.activeConversationId = id;

    saveData();

    renderConversationList();

    renderActiveConversation();

    closeSidebar();

    scrollMessagesToBottom(false);
}


/* =========================================================
   10. RENDER ACTIVE CHAT
========================================================= */

function renderActiveConversation() {

    const conversation =
        getActiveConversation();


    DOM.messageList.innerHTML = "";


    if (!conversation) {

        DOM.welcomeScreen.hidden = false;

        return;

    }


    if (
        conversation.messages.length === 0
    ) {

        DOM.welcomeScreen.hidden = false;

        return;

    }


    DOM.welcomeScreen.hidden = true;


    conversation.messages.forEach(
        message => {

            renderMessage(
                message,
                false
            );

        }
    );


    scrollMessagesToBottom(false);
}


/* =========================================================
   11. MESSAGE RENDER
========================================================= */

function renderMessage(
    message,
    scroll = true
) {

    const wrapper =
        document.createElement("article");

    wrapper.className =
        `message ${message.role}`;


    const inner =
        document.createElement("div");

    inner.className =
        "message-inner";


    if (message.role === "assistant") {

        const avatar =
            document.createElement("div");

        avatar.className =
            "assistant-avatar";

        avatar.textContent = "T";

        inner.appendChild(avatar);

    }


    const content =
        document.createElement("div");

    content.className =
        "message-content";


    content.innerHTML =
        formatMessage(message.content);


    inner.appendChild(content);


    if (message.role === "user") {

        const avatar =
            document.createElement("div");

        avatar.className =
            "user-avatar-message";

        avatar.textContent =
            getUserInitial();

        inner.appendChild(avatar);

    }


    wrapper.appendChild(inner);


    if (message.role === "assistant") {

        const actions =
            document.createElement("div");

        actions.className =
            "message-actions";


        const copyButton =
            createMessageAction(
                "⧉",
                "Salin",
                () => {

                    copyText(
                        message.content
                    );

                }
            );


        actions.appendChild(copyButton);

        wrapper.appendChild(actions);

    }


    DOM.messageList.appendChild(wrapper);


    if (scroll) {
        scrollMessagesToBottom(true);
    }


    return wrapper;
}


/* =========================================================
   12. MESSAGE FORMATTER
========================================================= */

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatMessage(text) {

    if (!text) {
        return "";
    }


    let safe =
        escapeHTML(text);


    const codeBlocks = [];


    safe = safe.replace(
        /```([\s\S]*?)```/g,
        (match, code) => {

            const index =
                codeBlocks.length;

            codeBlocks.push(code.trim());

            return `@@CODEBLOCK_${index}@@`;

        }
    );


    safe = safe.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );


    safe = safe.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    safe = safe.replace(
        /\n/g,
        "<br>"
    );


    codeBlocks.forEach(
        (code, index) => {

            const html =
                `<pre><code>${code}</code></pre>`;

            safe =
                safe.replace(
                    `@@CODEBLOCK_${index}@@`,
                    html
                );

        }
    );


    return safe;
}


function createMessageAction(
    icon,
    label,
    callback
) {

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "message-action-button";

    button.title = label;

    button.setAttribute(
        "aria-label",
        label
    );

    button.textContent = icon;

    button.addEventListener(
        "click",
        callback
    );


    return button;
}


/* =========================================================
   13. SEND MESSAGE
========================================================= */

async function handleSendMessage() {

    if (state.isGenerating) {
        return;
    }


    const text =
        DOM.messageInput.value.trim();


    if (!text) {
        return;
    }


    if (
        text.length >
        CONFIG.maxCharacters
    ) {

        showToast(
            "Pesan terlalu panjang."
        );

        return;
    }


    let conversation =
        getActiveConversation();


    if (!conversation) {

        conversation =
            createConversation(text);

    }


    const userMessage = {

        id: createId("message"),

        role: "user",

        content: text,

        createdAt: Date.now()

    };


    conversation.messages.push(
        userMessage
    );


    conversation.updatedAt =
        Date.now();


    if (
        conversation.messages.length === 1
    ) {

        conversation.title =
            createConversationTitle(text);

    }


    DOM.messageInput.value = "";

    updateCharacterCounter();

    autoResizeTextarea();

    DOM.welcomeScreen.hidden = true;


    renderMessage(
        userMessage,
        true
    );


    saveData();

    renderConversationList();


    await generateAssistantResponse(
        conversation,
        text
    );

}


/* =========================================================
   14. AI RESPONSE
========================================================= */

async function generateAssistantResponse(
    conversation,
    userText
) {

    state.isGenerating = true;

    state.generationStopped = false;

    updateGeneratingUI(true);


    try {

        if (CONFIG.demoMode) {

            await generateDemoResponse(
                conversation,
                userText
            );

        } else {

            await generateAPIResponse(
                conversation,
                userText
            );

        }

    } catch (error) {

        console.error(
            "TugasAI AI error:",
            error
        );


        if (!state.generationStopped) {

            const errorMessage = {

                id: createId("message"),

                role: "assistant",

                content:
                    "Maaf, terjadi kesalahan saat memproses pesan. Silakan coba lagi.",

                createdAt: Date.now()

            };


            conversation.messages.push(
                errorMessage
            );


            renderMessage(
                errorMessage,
                true
            );

        }

    } finally {

        state.isGenerating = false;

        state.generationTimer = null;

        updateGeneratingUI(false);

        saveData();

        renderConversationList();

    }

}


/* =========================================================
   15. DEMO RESPONSE
========================================================= */

async function generateDemoResponse(
    conversation,
    userText
) {

    const response =
        createDemoResponse(userText);


    const assistantMessage = {

        id: createId("message"),

        role: "assistant",

        content: "",

        createdAt: Date.now()

    };


    conversation.messages.push(
        assistantMessage
    );


    const wrapper =
        renderMessage(
            assistantMessage,
            true
        );


    const content =
        wrapper.querySelector(
            ".message-content"
        );


    for (
        let i = 0;
        i < response.length;
        i++
    ) {

        if (
            state.generationStopped
        ) {

            assistantMessage.content +=
                "\n\n[Jawaban dihentikan]";

            break;

        }


        assistantMessage.content +=
            response[i];


        content.innerHTML =
            formatMessage(
                assistantMessage.content
            );


        scrollMessagesToBottom(true);


        await wait(
            CONFIG.typingDelay
        );

    }


    saveData();

}


/* =========================================================
   16. DEMO AI LOGIC
========================================================= */

function createDemoResponse(text) {

    const lower =
        text.toLowerCase();


    if (
        lower.includes("halo") ||
        lower.includes("hai") ||
        lower.includes("hello")
    ) {

        return (
            "Halo! Saya TugasAI. " +
            "Ada yang ingin kamu kerjakan?"
        );

    }


    if (
        lower.includes("html") ||
        lower.includes("css") ||
        lower.includes("javascript") ||
        lower.includes("js")
    ) {

        return (
            "Bisa. Untuk pengembangan web, " +
            "HTML digunakan untuk struktur, CSS untuk tampilan, " +
            "dan JavaScript untuk membuat interaksi serta fungsi aplikasi.\n\n" +
            "Kalau nanti TugasAI dihubungkan ke API AI, " +
            "JavaScript pada sisi aplikasi akan berkomunikasi " +
            "dengan backend secara aman."
        );

    }


    if (
        lower.includes("api")
    ) {

        return (
            "API adalah penghubung antara aplikasi dan layanan lain. " +
            "Pada TugasAI, API nantinya dapat digunakan untuk " +
            "mengirim pesan ke model AI dan menerima jawabannya kembali.\n\n" +
            "Untuk aplikasi yang dipakai banyak orang, API key " +
            "sebaiknya tidak diletakkan langsung di JavaScript browser."
        );

    }


    if (
        lower.includes("siapa kamu") ||
        lower.includes("kamu siapa")
    ) {

        return (
            "Saya adalah asisten AI di dalam TugasAI. " +
            "Saat ini saya masih menggunakan mode demo. " +
            "Setelah backend dan API AI dipasang, responsnya dapat " +
            "berasal dari model AI sungguhan."
        );

    }


    if (
        lower.includes("terima kasih") ||
        lower.includes("makasih")
    ) {

        return (
            "Sama-sama. Silakan lanjutkan kalau ada yang ingin dikerjakan."
        );

    }


    return (
        "Saya menerima pesan kamu:\n\n" +
        `"${text}"\n\n` +
        "Saat ini TugasAI sedang berjalan dalam mode demo. " +
        "Struktur aplikasinya sudah disiapkan agar nantinya " +
        "bisa dihubungkan ke backend dan API AI sungguhan."
    );

}


/* =========================================================
   17. REAL API PLACEHOLDER
========================================================= */

async function generateAPIResponse(
    conversation,
    userText
) {

    /*
        BAGIAN INI SENGAJA BELUM MEMAKAI API.

        Nanti alurnya:

        Browser
           ↓
        Backend TugasAI
           ↓
        API AI
           ↓
        Backend
           ↓
        Browser

        Jangan menaruh API key rahasia langsung
        di file JavaScript browser.
    */


    throw new Error(
        "API belum dikonfigurasi."
    );
}


/* =========================================================
   18. GENERATION UI
========================================================= */

function updateGeneratingUI(isGenerating) {

    DOM.generatingIndicator.hidden =
        !isGenerating;

    DOM.sendButton.hidden =
        isGenerating;

    DOM.stopButton.hidden =
        !isGenerating;


    DOM.messageInput.disabled =
        isGenerating;


    DOM.attachButton.disabled =
        isGenerating;


    DOM.voiceButton.disabled =
        isGenerating;


    if (isGenerating) {

        DOM.messageInput.placeholder =
            "Tunggu jawaban selesai...";

    } else {

        DOM.messageInput.placeholder =
            "Tulis pesan...";

        DOM.messageInput.disabled = false;

    }

}


/* =========================================================
   19. STOP GENERATING
========================================================= */

function stopGenerating() {

    if (!state.isGenerating) {
        return;
    }


    state.generationStopped = true;


    if (state.generationTimer) {

        clearTimeout(
            state.generationTimer
        );

        state.generationTimer = null;

    }


    showToast(
        "Pembuatan jawaban dihentikan."
    );

}


/* =========================================================
   20. TEXTAREA
========================================================= */

function updateCharacterCounter() {

    const length =
        DOM.messageInput.value.length;


    DOM.characterCounter.textContent =
        `${length} / ${CONFIG.maxCharacters}`;


    if (
        length >
        CONFIG.maxCharacters * 0.9
    ) {

        DOM.characterCounter.style.color =
            "#ff8b91";

    } else {

        DOM.characterCounter.style.color =
            "";

    }

}


function autoResizeTextarea() {

    const textarea =
        DOM.messageInput;


    textarea.style.height =
        "auto";


    const newHeight =
        Math.min(
            textarea.scrollHeight,
            180
        );


    textarea.style.height =
        `${newHeight}px`;

}


/* =========================================================
   21. KEYBOARD
========================================================= */

function handleInputKeydown(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        if (!state.isGenerating) {
            handleSendMessage();
        }

    }

}


/* =========================================================
   22. QUICK ACTIONS
========================================================= */

function handleQuickAction(event) {

    const button =
        event.target.closest(
            ".quick-action"
        );


    if (!button) {
        return;
    }


    const prompt =
        button.dataset.prompt;


    if (!prompt) {
        return;
    }


    DOM.messageInput.value =
        prompt;


    updateCharacterCounter();

    autoResizeTextarea();

    DOM.messageInput.focus();

}


/* =========================================================
   23. NEW CHAT
========================================================= */

function startNewChat() {

    if (state.isGenerating) {

        showToast(
            "Tunggu sampai jawaban selesai."
        );

        return;
    }


    state.activeConversationId =
        null;


    DOM.messageList.innerHTML = "";

    DOM.welcomeScreen.hidden = false;

    DOM.messageInput.value = "";

    updateCharacterCounter();

    autoResizeTextarea();

    clearAttachments();

    renderConversationList();

    closeSidebar();

    DOM.messageInput.focus();

}


/* =========================================================
   24. SIDEBAR
========================================================= */

function openSidebar() {

    DOM.sidebar.classList.add("open");

    DOM.sidebarOverlay.classList.add(
        "active"
    );

}


function closeSidebar() {

    DOM.sidebar.classList.remove(
        "open"
    );

    DOM.sidebarOverlay.classList.remove(
        "active"
    );

}


/* =========================================================
   25. MODEL MENU
========================================================= */

function toggleModelMenu() {

    DOM.modelMenu.hidden =
        !DOM.modelMenu.hidden;

}


function closeModelMenu() {

    DOM.modelMenu.hidden = true;

}


function selectModel(model) {

    state.selectedModel = model;


    const options =
        DOM.modelMenu.querySelectorAll(
            ".model-option"
        );


    options.forEach(option => {

        const isSelected =
            option.dataset.model === model;


        option.classList.toggle(
            "active",
            isSelected
        );


        option.setAttribute(
            "aria-selected",
            String(isSelected)
        );

    });


    if (model === "fast") {

        DOM.selectedModel.textContent =
            "TugasAI Fast";

        DOM.modelStatus.textContent =
            "Fast";

    } else {

        DOM.selectedModel.textContent =
            "TugasAI AI";

        DOM.modelStatus.textContent =
            "AI";

    }


    closeModelMenu();

}


/* =========================================================
   26. SETTINGS
========================================================= */

function openSettings() {

    DOM.settingsModal.hidden = false;

    syncSettingsUI();

}


function closeSettings() {

    DOM.settingsModal.hidden = true;

}


function syncSettingsUI() {

    DOM.themeSelect.value =
        state.settings.theme;

    DOM.languageSelect.value =
        state.settings.language;

    DOM.nameInput.value =
        state.settings.name;

    DOM.userName.textContent =
        state.settings.name || "Pengguna";

}


function updateTheme(theme) {

    state.settings.theme = theme;

    applyTheme();

    saveSettings();

}


function applyTheme() {

    let theme =
        state.settings.theme;


    if (theme === "system") {

        theme =
            window.matchMedia(
                "(prefers-color-scheme: light)"
            ).matches
                ? "light"
                : "dark";

    }


    document.body.classList.toggle(
        "light-theme",
        theme === "light"
    );

}


function updateName(name) {

    const clean =
        name.trim();


    state.settings.name =
        clean || "Pengguna";


    DOM.userName.textContent =
        state.settings.name;


    saveSettings();


    showToast(
        "Nama diperbarui."
    );

}


/* =========================================================
   27. CLEAR HISTORY
========================================================= */

function askClearHistory() {

    if (
        state.conversations.length === 0
    ) {

        showToast(
            "Belum ada percakapan."
        );

        return;
    }


    DOM.confirmModal.hidden = false;

}


function closeConfirmModal() {

    DOM.confirmModal.hidden = true;

}


function confirmClearHistory() {

    state.conversations = [];

    state.activeConversationId = null;

    saveData();

    renderConversationList();

    renderActiveConversation();

    closeConfirmModal();

    showToast(
        "Semua percakapan telah dihapus."
    );

}


/* =========================================================
   28. FILE ATTACHMENT
========================================================= */

function openFilePicker() {

    if (state.isGenerating) {
        return;
    }


    DOM.fileInput.click();

}


function handleFiles(event) {

    const files =
        Array.from(
            event.target.files || []
        );


    if (!files.length) {
        return;
    }


    const validFiles =
        files.filter(file => {

            const maxSize =
                15 * 1024 * 1024;

            return file.size <= maxSize;

        });


    if (
        validFiles.length !==
        files.length
    ) {

        showToast(
            "Beberapa file terlalu besar. Maksimal 15 MB per file."
        );

    }


    state.pendingFiles.push(
        ...validFiles
    );


    renderAttachments();


    DOM.fileInput.value = "";

}


function renderAttachments() {

    DOM.attachmentList.innerHTML = "";


    DOM.attachmentPreview.hidden =
        state.pendingFiles.length === 0;


    state.pendingFiles.forEach(
        (file, index) => {

            const item =
                document.createElement("div");

            item.className =
                "attachment-item";


            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                const image =
                    document.createElement("img");

                image.alt =
                    file.name;


                const reader =
                    new FileReader();


                reader.onload =
                    event => {

                        image.src =
                            event.target.result;

                    };


                reader.readAsDataURL(file);

                item.appendChild(image);

            } else {

                item.textContent =
                    file.name;

                item.style.padding =
                    "8px";

                item.style.fontSize =
                    "10px";

                item.style.wordBreak =
                    "break-word";

            }


            const removeButton =
                document.createElement("button");

            removeButton.type =
                "button";

            removeButton.textContent =
                "×";

            removeButton.style.position =
                "absolute";

            removeButton.style.right =
                "4px";

            removeButton.style.top =
                "4px";

            removeButton.style.width =
                "20px";

            removeButton.style.height =
                "20px";

            removeButton.style.borderRadius =
                "50%";

            removeButton.style.background =
                "rgba(0,0,0,.65)";

            removeButton.style.color =
                "#fff";


            removeButton.addEventListener(
                "click",
                () => {

                    state.pendingFiles.splice(
                        index,
                        1
                    );

                    renderAttachments();

                }
            );


            item.appendChild(
                removeButton
            );


            DOM.attachmentList.appendChild(
                item
            );

        }
    );

}


function clearAttachments() {

    state.pendingFiles = [];

    DOM.fileInput.value = "";

    renderAttachments();

}


/* =========================================================
   29. VOICE INPUT
========================================================= */

function startVoiceInput() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        showToast(
            "Input suara belum didukung browser ini."
        );

        return;
    }


    if (state.isGenerating) {
        return;
    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        state.settings.language === "en"
            ? "en-US"
            : "id-ID";


    recognition.interimResults = true;

    recognition.continuous = false;


    let finalText = "";


    recognition.onstart = () => {

        DOM.voiceButton.style.background =
            "var(--accent-soft)";

        DOM.voiceButton.style.color =
            "var(--accent-hover)";

        showToast(
            "Silakan berbicara..."
        );

    };


    recognition.onresult =
        event => {

            let transcript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                transcript +=
                    event.results[i][0].transcript;

            }


            finalText = transcript;


            DOM.messageInput.value =
                finalText;

            updateCharacterCounter();

            autoResizeTextarea();

        };


    recognition.onerror =
        error => {

            console.warn(
                "Speech recognition:",
                error
            );

            showToast(
                "Input suara tidak dapat digunakan."
            );

        };


    recognition.onend = () => {

        DOM.voiceButton.style.background =
            "";

        DOM.voiceButton.style.color =
            "";

    };


    recognition.start();

}


/* =========================================================
   30. COPY
========================================================= */

async function copyText(text) {

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                text
            );

        } else {

            const textarea =
                document.createElement("textarea");

            textarea.value = text;

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();

        }


        showToast(
            "Jawaban disalin."
        );

    } catch (error) {

        console.error(
            "Copy error:",
            error
        );

        showToast(
            "Gagal menyalin."
        );

    }

}


/* =========================================================
   31. SHARE
========================================================= */

async function shareConversation() {

    const conversation =
        getActiveConversation();


    if (!conversation) {

        showToast(
            "Belum ada percakapan untuk dibagikan."
        );

        return;
    }


    const text =
        conversation.messages
            .map(message => {

                const label =
                    message.role === "user"
                        ? "Pengguna"
                        : "TugasAI";

                return (
                    `${label}:\n${message.content}`
                );

            })
            .join("\n\n");


    if (
        navigator.share
    ) {

        try {

            await navigator.share({

                title:
                    conversation.title,

                text

            });

        } catch (error) {

            if (
                error.name !==
                "AbortError"
            ) {

                console.warn(
                    "Share error:",
                    error
                );

            }

        }

        return;
    }


    await copyText(text);

    showToast(
        "Percakapan disalin karena fitur berbagi tidak tersedia."
    );

}


/* =========================================================
   32. CONTEXT MENU
========================================================= */

function showContextMenu(
    x,
    y,
    conversationId
) {

    state.contextConversationId =
        conversationId;


    const menu =
        DOM.contextMenu;


    menu.hidden = false;


    const width =
        menu.offsetWidth;

    const height =
        menu.offsetHeight;


    const safeX =
        Math.min(
            x,
            window.innerWidth - width - 8
        );


    const safeY =
        Math.min(
            y,
            window.innerHeight - height - 8
        );


    menu.style.left =
        `${Math.max(8, safeX)}px`;

    menu.style.top =
        `${Math.max(8, safeY)}px`;

}


function hideContextMenu() {

    DOM.contextMenu.hidden = true;

    state.contextConversationId =
        null;

}


function handleContextAction(
    action
) {

    const id =
        state.contextConversationId;


    if (!id) {
        return;
    }


    if (action === "rename") {

        renameConversation(id);

    }


    if (action === "share") {

        state.activeConversationId =
            id;

        shareConversation();

    }


    if (action === "delete") {

        deleteConversation(id);

        showToast(
            "Percakapan dihapus."
        );

    }


    hideContextMenu();

}


/* =========================================================
   33. TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.createElement("div");

    toast.className =
        "toast";

    toast.textContent =
        message;


    DOM.toastContainer.appendChild(
        toast
    );


    window.setTimeout(
        () => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(7px)";


            window.setTimeout(
                () => {

                    toast.remove();

                },
                180
            );

        },
        2300
    );

}


/* =========================================================
   34. SCROLL
========================================================= */

function scrollMessagesToBottom(
    smooth = true
) {

    if (!DOM.messageList) {
        return;
    }


    DOM.messageList.scrollTo({

        top:
            DOM.messageList.scrollHeight,

        behavior:
            smooth
                ? "smooth"
                : "auto"

    });

}


/* =========================================================
   35. USER
========================================================= */

function getUserInitial() {

    const name =
        state.settings.name ||
        "Pengguna";


    return name
        .trim()
        .charAt(0)
        .toUpperCase();

}


/* =========================================================
   36. UTILITY
========================================================= */

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   37. EVENT LISTENERS
========================================================= */

function bindEvents() {

    /* -----------------------------------------
       New conversation
    ----------------------------------------- */

    DOM.newChatButton.addEventListener(
        "click",
        startNewChat
    );


    /* -----------------------------------------
       Sidebar
    ----------------------------------------- */

    DOM.openSidebarButton.addEventListener(
        "click",
        openSidebar
    );


    DOM.closeSidebarButton.addEventListener(
        "click",
        closeSidebar
    );


    DOM.sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );


    /* -----------------------------------------
       Search
    ----------------------------------------- */

    DOM.conversationSearch.addEventListener(
        "input",
        event => {

            renderConversationList(
                event.target.value
            );

        }
    );


    /* -----------------------------------------
       Settings
    ----------------------------------------- */

    DOM.settingsButton.addEventListener(
        "click",
        openSettings
    );


    DOM.themeButton.addEventListener(
        "click",
        () => {

            const current =
                state.settings.theme;


            const next =
                current === "dark"
                    ? "light"
                    : current === "light"
                        ? "system"
                        : "dark";


            updateTheme(next);

            syncSettingsUI();

        }
    );


    DOM.themeSelect.addEventListener(
        "change",
        event => {

            updateTheme(
                event.target.value
            );

        }
    );


    DOM.languageSelect.addEventListener(
        "change",
        event => {

            state.settings.language =
                event.target.value;

            saveSettings();

        }
    );


    DOM.nameInput.addEventListener(
        "change",
        event => {

            updateName(
                event.target.value
            );

        }
    );


    /* -----------------------------------------
       Modal close
    ----------------------------------------- */

    document.querySelectorAll(
        "[data-close-modal]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeSettings
        );

    });


    document.querySelectorAll(
        "[data-close-confirm]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeConfirmModal
        );

    });


    /* -----------------------------------------
       Clear history
    ----------------------------------------- */

    DOM.clearHistoryButton.addEventListener(
        "click",
        askClearHistory
    );


    DOM.cancelConfirmButton.addEventListener(
        "click",
        closeConfirmModal
    );


    DOM.confirmActionButton.addEventListener(
        "click",
        confirmClearHistory
    );


    /* -----------------------------------------
       Input
    ----------------------------------------- */

    DOM.messageInput.addEventListener(
        "input",
        () => {

            updateCharacterCounter();

            autoResizeTextarea();

        }
    );


    DOM.messageInput.addEventListener(
        "keydown",
        handleInputKeydown
    );


    DOM.messageForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            handleSendMessage();

        }
    );


    /* -----------------------------------------
       Quick actions
    ----------------------------------------- */

    DOM.quickActions.addEventListener(
        "click",
        handleQuickAction
    );


    /* -----------------------------------------
       Stop
    ----------------------------------------- */

    DOM.stopButton.addEventListener(
        "click",
        stopGenerating
    );


    /* -----------------------------------------
       Model
    ----------------------------------------- */

    DOM.modelSelectorButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toggleModelMenu();

        }
    );


    DOM.modelMenu
        .querySelectorAll(
            ".model-option"
        )
        .forEach(option => {

            option.addEventListener(
                "click",
                () => {

                    selectModel(
                        option.dataset.model
                    );

                }
            );

        });


    /* -----------------------------------------
       Attachment
    ----------------------------------------- */

    DOM.attachButton.addEventListener(
        "click",
        openFilePicker
    );


    DOM.fileInput.addEventListener(
        "change",
        handleFiles
    );


    /* -----------------------------------------
       Voice
    ----------------------------------------- */

    DOM.voiceButton.addEventListener(
        "click",
        startVoiceInput
    );


    /* -----------------------------------------
       Share
    ----------------------------------------- */

    DOM.shareButton.addEventListener(
        "click",
        shareConversation
    );


    /* -----------------------------------------
       Profile
    ----------------------------------------- */

    DOM.profileMenuButton.addEventListener(
        "click",
        openSettings
    );


    /* -----------------------------------------
       Context menu
    ----------------------------------------- */

    DOM.contextMenu
        .querySelectorAll(
            "[data-context-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    handleContextAction(
                        button.dataset.contextAction
                    );

                }
            );

        });


    /* -----------------------------------------
       Close floating elements
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            if (
                !DOM.modelMenu.hidden &&
                !DOM.modelMenu.contains(event.target) &&
                !DOM.modelSelectorButton.contains(event.target)
            ) {

                closeModelMenu();

            }


            if (
                !DOM.contextMenu.hidden &&
                !DOM.contextMenu.contains(event.target)
            ) {

                hideContextMenu();

            }

        }
    );


    /* -----------------------------------------
       Escape
    ----------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            closeModelMenu();

            hideContextMenu();

            closeSettings();

            closeConfirmModal();

            closeSidebar();

        }
    );


    /* -----------------------------------------
       Window resize
    ----------------------------------------- */

    window.addEventListener(
        "resize",
        () => {

            autoResizeTextarea();

            if (
                window.innerWidth > 700
            ) {

                closeSidebar();

            }

        }
    );


    /* -----------------------------------------
       System theme
    ----------------------------------------- */

    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: light)"
        );


    mediaQuery.addEventListener(
        "change",
        () => {

            if (
                state.settings.theme ===
                "system"
            ) {

                applyTheme();

            }

        }
    );

}


/* =========================================================
   38. INITIAL UI
========================================================= */

function initializeUI() {

    syncSettingsUI();

    applyTheme();

    updateCharacterCounter();

    autoResizeTextarea();

    renderConversationList();

    renderActiveConversation();

    renderAttachments();

}


/* =========================================================
   39. APPLICATION START
========================================================= */

function initializeApp() {

    cacheDOM();

    loadData();

    bindEvents();

    initializeUI();


    /*
        Kalau belum ada percakapan,
        tampilkan welcome screen.
    */

    if (
        !state.activeConversationId
    ) {

        DOM.welcomeScreen.hidden =
            false;

    }


    console.log(
        `${CONFIG.appName} berhasil dimuat.`
    );

}


/* =========================================================
   40. START
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}