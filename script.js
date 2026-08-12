/* =========================================================
   TUGASAI — MAIN JAVASCRIPT
   FINAL — Railway + OpenRouter Backend
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

    demoMode: false,

    /*
     * Backend Railway.
     * Frontend dan server.js berada
     * dalam service yang sama.
     */
    apiEndpoint: "/api/chat",

    typingDelay: 18,

    requestTimeout: 120000
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

    abortController: null,

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

            if (
                parsedSettings &&
                typeof parsedSettings === "object"
            ) {

                state.settings = {
                    ...state.settings,
                    ...parsedSettings
                };

            }

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

    const clean = String(text)
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

                return String(
                    conversation.title || ""
                )
                    .toLowerCase()
                    .includes(normalizedSearch);

            }
        );


    if (DOM.emptyConversationState) {

        DOM.emptyConversationState.hidden =
            filtered.length !== 0;

    }


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
            conversation.title ||
            "Percakapan baru";


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

    state.contextConversationId = id;

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
        !Array.isArray(conversation.messages) ||
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


    if (
        !Array.isArray(
            conversation.messages
        )
    ) {

        conversation.messages = [];

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

    clearAttachments();

    DOM.welcomeScreen.hidden = true;


    renderMessage(
        userMessage,
        true
    );


    saveData();

    renderConversationList();


    await generateAssistantResponse(
        conversation
    );

}


/* =========================================================
   14. AI RESPONSE
========================================================= */

async function generateAssistantResponse(
    conversation
) {

    state.isGenerating = true;

    state.generationStopped = false;

    state.abortController =
        new AbortController();


    updateGeneratingUI(true);


    try {

        await generateAPIResponse(
            conversation
        );

    } catch (error) {

        console.error(
            "TugasAI AI error:",
            error
        );


        if (!state.generationStopped) {

            let errorText =
                "Maaf, terjadi kesalahan saat menghubungkan ke AI.";


            if (
                error &&
                error.name === "AbortError"
            ) {

                errorText =
                    "Permintaan AI dihentikan atau melebihi batas waktu.";

            } else if (
                error &&
                error.message
            ) {

                errorText =
                    error.message;

            }


            const errorMessage = {

                id: createId("message"),

                role: "assistant",

                content: errorText,

                createdAt: Date.now()

            };


            conversation.messages.push(
                errorMessage
            );


            conversation.updatedAt =
                Date.now();


            renderMessage(
                errorMessage,
                true
            );

            saveData();

        }

    } finally {

        state.isGenerating = false;

        state.generationTimer = null;

        state.abortController = null;

        updateGeneratingUI(false);

        saveData();

        renderConversationList();

    }

}


/* =========================================================
   15. REAL API — RAILWAY
========================================================= */

async function generateAPIResponse(
    conversation
) {

    const endpoint =
        CONFIG.apiEndpoint;


    if (
        !endpoint ||
        typeof endpoint !== "string"
    ) {

        throw new Error(
            "Endpoint backend belum tersedia."
        );

    }


    const lastUserMessage =
        [...conversation.messages]
            .reverse()
            .find(
                message =>
                    message.role === "user"
            );


    const message =
        String(
            lastUserMessage?.content || ""
        ).trim();


    if (!message) {

        throw new Error(
            "Pesan tidak ditemukan."
        );

    }


    const controller =
        state.abortController ||
        new AbortController();


    const timeout =
        setTimeout(
            () => {

                controller.abort();

            },
            CONFIG.requestTimeout
        );


    try {

        const response =
            await fetch(
                endpoint,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            message

                        }),

                    signal:
                        controller.signal

                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        if (!response.ok) {

            const serverMessage =
                data?.error ||
                data?.message ||
                "";


            throw new Error(
                serverMessage ||
                `Backend AI mengembalikan HTTP ${response.status}.`
            );

        }


        const answer =
            extractAIAnswer(data);


        if (!answer) {

            throw new Error(
                "Backend berhasil merespons, tetapi jawaban AI kosong."
            );

        }


        const assistantMessage = {

            id: createId("message"),

            role: "assistant",

            content: answer,

            createdAt: Date.now()

        };


        conversation.messages.push(
            assistantMessage
        );


        conversation.updatedAt =
            Date.now();


        renderMessage(
            assistantMessage,
            true
        );


        saveData();

    } finally {

        clearTimeout(timeout);

    }

}


/* =========================================================
   16. EXTRACT AI RESPONSE
========================================================= */

function extractAIAnswer(data) {

    if (!data) {
        return "";
    }


    if (
        typeof data.answer === "string"
    ) {

        return data.answer.trim();

    }


    if (
        typeof data.message === "string"
    ) {

        return data.message.trim();

    }


    if (
        data.message &&
        typeof data.message.content ===
            "string"
    ) {

        return data.message.content.trim();

    }


    if (
        Array.isArray(data.choices) &&
        data.choices[0]
    ) {

        const choice =
            data.choices[0];


        if (
            choice.message &&
            typeof choice.message.content ===
                "string"
        ) {

            return choice.message.content.trim();

        }


        if (
            typeof choice.text === "string"
        ) {

            return choice.text.trim();

        }

    }


    if (
        typeof data.content === "string"
    ) {

        return data.content.trim();

    }


    return "";
}


/* =========================================================
   17. GENERATION UI
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
   18. STOP GENERATING
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


    if (state.abortController) {

        state.abortController.abort();

    }


    showToast(
        "Pembuatan jawaban dihentikan."
    );

}


/* =========================================================
   19. TEXTAREA
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
   20. KEYBOARD
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
   21. QUICK ACTIONS
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
   22. NEW CHAT
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
   23. SIDEBAR
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
   24. MODEL MENU
========================================================= */

function toggleModelMenu() {

    DOM.modelMenu.hidden =
        !DOM.modelMenu.hidden;

}


function closeModelMenu() {

    DOM.modelMenu.hidden = true;

}


function selectModel(model) {

    state.selectedModel =
        model || "default";


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
   25. SETTINGS
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
        String(name || "").trim();


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
   26. CLEAR HISTORY
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
   27. FILE ATTACHMENT
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
   28. VOICE INPUT
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
   29. COPY
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
   30. SHARE
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
   31. CONTEXT MENU
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
   32. TOAST
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
   33. SCROLL
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
   34. USER
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
   35. UTILITY
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
   36. EVENT LISTENERS
========================================================= */

function bindEvents() {

    DOM.newChatButton.addEventListener(
        "click",
        startNewChat
    );


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


    DOM.conversationSearch.addEventListener(
        "input",
        event => {

            renderConversationList(
                event.target.value
            );

        }
    );


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


    DOM.quickActions.addEventListener(
        "click",
        handleQuickAction
    );


    DOM.stopButton.addEventListener(
        "click",
        stopGenerating
    );


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


    DOM.attachButton.addEventListener(
        "click",
        openFilePicker
    );


    DOM.fileInput.addEventListener(
        "change",
        handleFiles
    );


    DOM.voiceButton.addEventListener(
        "click",
        startVoiceInput
    );


    DOM.shareButton.addEventListener(
        "click",
        shareConversation
    );


    DOM.profileMenuButton.addEventListener(
        "click",
        openSettings
    );


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


    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: light)"
        );


    if (
        typeof mediaQuery.addEventListener ===
        "function"
    ) {

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

}


/* =========================================================
   37. INITIAL UI
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
   38. APPLICATION START
========================================================= */

function initializeApp() {

    cacheDOM();

    loadData();

    bindEvents();

    initializeUI();


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
   39. START
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
