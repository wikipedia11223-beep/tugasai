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
     * Karena server.js dan frontend berada
     * dalam service yang sama, gunakan relative URL.
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

const $ = id => document.getElementById(id);

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
   5. SAFE EVENT HELPER
========================================================= */

function on(element, event, handler) {

    if (!element) {
        return;
    }

    element.addEventListener(event, handler);
}


/* =========================================================
   6. STORAGE
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
   7. ID
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
   8. DATE
========================================================= */

function getDateLabel(timestamp) {

    const date = new Date(timestamp);

    const today = new Date();

    const yesterday = new Date();

    yesterday.setDate(
        today.getDate() - 1
    );


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
   9. CONVERSATION
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


    state.conversations.unshift(
        conversation
    );

    state.activeConversationId =
        conversation.id;


    trimConversationHistory();

    saveData();

    renderConversationList();

    renderActiveConversation();

    return conversation;

}


function createConversationTitle(text) {

    const clean =
        String(text)
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


    if (newTitle === null) {

        return;

    }


    const cleanTitle =
        newTitle.trim();


    if (!cleanTitle) {

        showToast(
            "Nama tidak boleh kosong."
        );

        return;

    }


    conversation.title =
        cleanTitle.slice(0, 80);

    conversation.updatedAt =
        Date.now();


    saveData();

    renderConversationList();

    showToast(
        "Nama percakapan diperbarui."
    );

}


/* =========================================================
   10. RENDER CONVERSATIONS
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
                    .includes(
                        normalizedSearch
                    );

            }
        );


    if (DOM.emptyConversationState) {

        DOM.emptyConversationState.hidden =
            filtered.length !== 0;

    }


    filtered.forEach(
        conversation => {

            const button =
                document.createElement(
                    "button"
                );


            button.type = "button";

            button.className =
                "conversation-item";


            if (
                conversation.id ===
                state.activeConversationId
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.dataset.conversationId =
                conversation.id;


            const title =
                document.createElement(
                    "span"
                );


            title.className =
                "conversation-item-title";


            title.textContent =
                conversation.title ||
                "Percakapan baru";


            button.appendChild(title);


            on(
                button,
                "click",
                () => {

                    openConversation(
                        conversation.id
                    );

                }
            );


            on(
                button,
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

        }
    );

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
   11. ACTIVE CHAT
========================================================= */

function renderActiveConversation() {

    if (!DOM.messageList) {

        return;

    }


    const conversation =
        getActiveConversation();


    DOM.messageList.innerHTML = "";


    if (!conversation) {

        if (DOM.welcomeScreen) {

            DOM.welcomeScreen.hidden = false;

        }

        return;

    }


    if (
        !Array.isArray(
            conversation.messages
        ) ||
        conversation.messages.length === 0
    ) {

        if (DOM.welcomeScreen) {

            DOM.welcomeScreen.hidden = false;

        }

        return;

    }


    if (DOM.welcomeScreen) {

        DOM.welcomeScreen.hidden = true;

    }


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
   12. MESSAGE RENDER
========================================================= */

function renderMessage(
    message,
    scroll = true
) {

    if (!DOM.messageList) {

        return null;

    }


    const wrapper =
        document.createElement(
            "article"
        );


    wrapper.className =
        `message ${message.role}`;


    const inner =
        document.createElement(
            "div"
        );


    inner.className =
        "message-inner";


    if (
        message.role === "assistant"
    ) {

        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            "assistant-avatar";


        avatar.textContent = "T";


        inner.appendChild(avatar);

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    content.innerHTML =
        formatMessage(
            message.content
        );


    inner.appendChild(content);


    if (
        message.role === "user"
    ) {

        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            "user-avatar-message";


        avatar.textContent =
            getUserInitial();


        inner.appendChild(avatar);

    }


    wrapper.appendChild(inner);


    if (
        message.role === "assistant"
    ) {

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "message-actions";


        actions.appendChild(
            createMessageAction(
                "⧉",
                "Salin",
                () =>
                    copyText(
                        message.content
                    )
            )
        );


        wrapper.appendChild(actions);

    }


    DOM.messageList.appendChild(
        wrapper
    );


    if (scroll) {

        scrollMessagesToBottom(true);

    }


    return wrapper;

}


/* =========================================================
   13. FORMAT MESSAGE
========================================================= */

function escapeHTML(text) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

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


            codeBlocks.push(
                code.trim()
            );


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

            safe =
                safe.replace(
                    `@@CODEBLOCK_${index}@@`,
                    `<pre><code>${code}</code></pre>`
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
        document.createElement(
            "button"
        );


    button.type = "button";

    button.className =
        "message-action-button";


    button.title = label;


    button.setAttribute(
        "aria-label",
        label
    );


    button.textContent = icon;


    on(
        button,
        "click",
        callback
    );


    return button;

}


/* =========================================================
   14. SEND MESSAGE
========================================================= */

async function handleSendMessage() {

    if (state.isGenerating) {

        return;

    }


    if (!DOM.messageInput) {

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
            createConversationTitle(
                text
            );

    }


    DOM.messageInput.value = "";

    updateCharacterCounter();

    autoResizeTextarea();

    clearAttachments();


    if (DOM.welcomeScreen) {

        DOM.welcomeScreen.hidden = true;

    }


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
   15. AI RESPONSE
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


        if (
            !state.generationStopped
        ) {

            let errorText =
                "Maaf, terjadi kesalahan saat menghubungkan ke AI.";


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                errorText =
                    "Permintaan AI melebihi batas waktu.";

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
   16. REAL API — RAILWAY
========================================================= */

async function generateAPIResponse(
    conversation
) {

    /*
     * Endpoint final:
     *
     * /api/chat
     *
     * Browser akan otomatis memakai
     * domain Railway tempat web ini berjalan.
     */

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


    const messages =
        conversation.messages.map(
            message => ({

                role:
                    message.role === "assistant"
                        ? "assistant"
                        : "user",

                content:
                    String(
                        message.content || ""
                    )

            })
        );


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

                            model:
                                state.selectedModel,

                            messages,

                            conversationId:
                                conversation.id,

                            user: {

                                name:
                                    state.settings.name,

                                language:
                                    state.settings.language

                            }

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
   17. EXTRACT AI RESPONSE
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
   18. GENERATION UI
========================================================= */

function updateGeneratingUI(
    isGenerating
) {

    if (DOM.generatingIndicator) {

        DOM.generatingIndicator.hidden =
            !isGenerating;

    }


    if (DOM.sendButton) {

        DOM.sendButton.hidden =
            isGenerating;

    }


    if (DOM.stopButton) {

        DOM.stopButton.hidden =
            !isGenerating;

    }


    if (DOM.messageInput) {

        DOM.messageInput.disabled =
            isGenerating;


        DOM.messageInput.placeholder =
            isGenerating
                ? "Tunggu jawaban selesai..."
                : "Tulis pesan...";

    }


    if (DOM.attachButton) {

        DOM.attachButton.disabled =
            isGenerating;

    }


    if (DOM.voiceButton) {

        DOM.voiceButton.disabled =
            isGenerating;

    }

}


/* =========================================================
   19. STOP
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
   20. TEXTAREA
========================================================= */

function updateCharacterCounter() {

    if (!DOM.messageInput) {

        return;

    }


    const length =
        DOM.messageInput.value.length;


    if (DOM.characterCounter) {

        DOM.characterCounter.textContent =
            `${length} / ${CONFIG.maxCharacters}`;


        DOM.characterCounter.style.color =
            length >
            CONFIG.maxCharacters * 0.9
                ? "#ff8b91"
                : "";

    }

}


function autoResizeTextarea() {

    if (!DOM.messageInput) {

        return;

    }


    const textarea =
        DOM.messageInput;


    textarea.style.height = "auto";


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


    if (!button || !DOM.messageInput) {

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


    state.activeConversationId = null;


    if (DOM.messageList) {

        DOM.messageList.innerHTML = "";

    }


    if (DOM.welcomeScreen) {

        DOM.welcomeScreen.hidden = false;

    }


    if (DOM.messageInput) {

        DOM.messageInput.value = "";

    }


    updateCharacterCounter();

    autoResizeTextarea();

    clearAttachments();

    renderConversationList();

    closeSidebar();


    if (DOM.messageInput) {

        DOM.messageInput.focus();

    }

}


/* =========================================================
   24. SIDEBAR
========================================================= */

function openSidebar() {

    if (DOM.sidebar) {

        DOM.sidebar.classList.add(
            "open"
        );

    }


    if (DOM.sidebarOverlay) {

        DOM.sidebarOverlay.classList.add(
            "active"
        );

    }

}


function closeSidebar() {

    if (DOM.sidebar) {

        DOM.sidebar.classList.remove(
            "open"
        );

    }


    if (DOM.sidebarOverlay) {

        DOM.sidebarOverlay.classList.remove(
            "active"
        );

    }

}


/* =========================================================
   25. MODEL
========================================================= */

function toggleModelMenu() {

    if (!DOM.modelMenu) {

        return;

    }


    DOM.modelMenu.hidden =
        !DOM.modelMenu.hidden;

}


function closeModelMenu() {

    if (DOM.modelMenu) {

        DOM.modelMenu.hidden = true;

    }

}


function selectModel(model) {

    state.selectedModel =
        model || "default";


    if (!DOM.modelMenu) {

        return;

    }


    const options =
        DOM.modelMenu.querySelectorAll(
            ".model-option"
        );


    options.forEach(
        option => {

            const isSelected =
                option.dataset.model ===
                model;


            option.classList.toggle(
                "active",
                isSelected
            );


            option.setAttribute(
                "aria-selected",
                String(isSelected)
            );

        }
    );


    if (DOM.selectedModel) {

        DOM.selectedModel.textContent =
            model === "fast"
                ? "TugasAI Fast"
                : "TugasAI AI";

    }


    if (DOM.modelStatus) {

        DOM.modelStatus.textContent =
            model === "fast"
                ? "Fast"
                : "AI";

    }


    closeModelMenu();

}


/* =========================================================
   26. SETTINGS
========================================================= */

function openSettings() {

    if (!DOM.settingsModal) {

        return;

    }


    DOM.settingsModal.hidden = false;

    syncSettingsUI();

}


function closeSettings() {

    if (DOM.settingsModal) {

        DOM.settingsModal.hidden = true;

    }

}


function syncSettingsUI() {

    if (DOM.themeSelect) {

        DOM.themeSelect.value =
            state.settings.theme;

    }


    if (DOM.languageSelect) {

        DOM.languageSelect.value =
            state.settings.language;

    }


    if (DOM.nameInput) {

        DOM.nameInput.value =
            state.settings.name;

    }


    if (DOM.userName) {

        DOM.userName.textContent =
            state.settings.name ||
            "Pengguna";

    }

}


function updateTheme(theme) {

    state.settings.theme =
        theme;


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


    if (DOM.userName) {

        DOM.userName.textContent =
            state.settings.name;

    }


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


    if (DOM.confirmModal) {

        DOM.confirmModal.hidden = false;

    }

}


function closeConfirmModal() {

    if (DOM.confirmModal) {

        DOM.confirmModal.hidden = true;

    }

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

    if (
        state.isGenerating ||
        !DOM.fileInput
    ) {

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
        files.filter(
            file =>
                file.size <=
                15 * 1024 * 1024
        );


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

    if (
        !DOM.attachmentList ||
        !DOM.attachmentPreview
    ) {

        return;

    }


    DOM.attachmentList.innerHTML = "";


    DOM.attachmentPreview.hidden =
        state.pendingFiles.length === 0;


    state.pendingFiles.forEach(
        (file, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "attachment-item";


            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


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
                document.createElement(
                    "button"
                );


            removeButton.type = "button";

            removeButton.textContent = "×";


            removeButton.style.position =
                "absolute";

            removeButton.style.right = "4px";

            removeButton.style.top = "4px";

            removeButton.style.width = "20px";

            removeButton.style.height = "20px";

            removeButton.style.borderRadius =
                "50%";

            removeButton.style.background =
                "rgba(0,0,0,.65)";

            removeButton.style.color =
                "#fff";


            on(
                removeButton,
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


    if (DOM.fileInput) {

        DOM.fileInput.value = "";

    }


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


    if (
        state.isGenerating ||
        !DOM.messageInput
    ) {

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


    recognition.onstart = () => {

        if (DOM.voiceButton) {

            DOM.voiceButton.style.background =
                "var(--accent-soft)";

            DOM.voiceButton.style.color =
                "var(--accent-hover)";

        }


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


            DOM.messageInput.value =
                transcript;


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

        if (DOM.voiceButton) {

            DOM.voiceButton.style.background =
                "";

            DOM.voiceButton.style.color =
                "";

        }

    };


    try {

        recognition.start();

    } catch (error) {

        console.warn(
            "Voice start:",
            error
        );

    }

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
                document.createElement(
                    "textarea"
                );


            textarea.value = text;

            textarea.style.position =
                "fixed";

            textarea.style.opacity = "0";


            document.body.appendChild(
                textarea
            );


            textarea.select();

            document.execCommand("copy");

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
            .map(
                message => {

                    const label =
                        message.role === "user"
                            ? "Pengguna"
                            : "TugasAI";


                    return (
                        `${label}:\n${message.content}`
                    );

                }
            )
            .join("\n\n");


    if (navigator.share) {

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

}


/* =========================================================
   32. CONTEXT MENU
========================================================= */

function showContextMenu(
    x,
    y,
    conversationId
) {

    if (!DOM.contextMenu) {

        return;

    }


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
            window.innerWidth -
                width -
                8
        );


    const safeY =
        Math.min(
            y,
            window.innerHeight -
                height -
                8
        );


    menu.style.left =
        `${Math.max(8, safeX)}px`;


    menu.style.top =
        `${Math.max(8, safeY)}px`;

}


function hideContextMenu() {

    if (DOM.contextMenu) {

        DOM.contextMenu.hidden = true;

    }


    state.contextConversationId =
        null;

}


function handleContextAction(action) {

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

    if (!DOM.toastContainer) {

        return;

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className = "toast";

    toast.textContent =
        message;


    DOM.toastContainer.appendChild(
        toast
    );


    window.setTimeout(
        () => {

            toast.style.opacity = "0";

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
   36. EVENT LISTENERS
========================================================= */

function bindEvents() {

    on(
        DOM.newChatButton,
        "click",
        startNewChat
    );


    on(
        DOM.openSidebarButton,
        "click",
        openSidebar
    );


    on(
        DOM.closeSidebarButton,
        "click",
        closeSidebar
    );


    on(
        DOM.sidebarOverlay,
        "click",
        closeSidebar
    );


    on(
        DOM.conversationSearch,
        "input",
        event => {

            renderConversationList(
                event.target.value
            );

        }
    );


    on(
        DOM.settingsButton,
        "click",
        openSettings
    );


    on(
        DOM.themeButton,
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


    on(
        DOM.themeSelect,
        "change",
        event => {

            updateTheme(
                event.target.value
            );

        }
    );


    on(
        DOM.languageSelect,
        "change",
        event => {

            state.settings.language =
                event.target.value;

            saveSettings();

        }
    );


    on(
        DOM.nameInput,
        "change",
        event => {

            updateName(
                event.target.value
            );

        }
    );


    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            element => {

                on(
                    element,
                    "click",
                    closeSettings
                );

            }
        );


    document
        .querySelectorAll(
            "[data-close-confirm]"
        )
        .forEach(
            element => {

                on(
                    element,
                    "click",
                    closeConfirmModal
                );

            }
        );


    on(
        DOM.clearHistoryButton,
        "click",
        askClearHistory
    );


    on(
        DOM.cancelConfirmButton,
        "click",
        closeConfirmModal
    );


    on(
        DOM.confirmActionButton,
        "click",
        confirmClearHistory
    );


    on(
        DOM.messageInput,
        "input",
        () => {

            updateCharacterCounter();

            autoResizeTextarea();

        }
    );


    on(
        DOM.messageInput,
        "keydown",
        handleInputKeydown
    );


    on(
        DOM.messageForm,
        "submit",
        event => {

            event.preventDefault();

            handleSendMessage();

        }
    );


    on(
        DOM.quickActions,
        "click",
        handleQuickAction
    );


    on(
        DOM.stopButton,
        "click",
        stopGenerating
    );


    on(
        DOM.modelSelectorButton,
        "click",
        event => {

            event.stopPropagation();

            toggleModelMenu();

        }
    );


    if (DOM.modelMenu) {

        DOM.modelMenu
            .querySelectorAll(
                ".model-option"
            )
            .forEach(
                option => {

                    on(
                        option,
                        "click",
                        () => {

                            selectModel(
                                option.dataset.model
                            );

                        }
                    );

                }
            );

    }


    on(
        DOM.attachButton,
        "click",
        openFilePicker
    );


    on(
        DOM.fileInput,
        "change",
        handleFiles
    );


    on(
        DOM.voiceButton,
        "click",
        startVoiceInput
    );


    on(
        DOM.shareButton,
        "click",
        shareConversation
    );


    on(
        DOM.profileMenuButton,
        "click",
        openSettings
    );


    if (DOM.contextMenu) {

        DOM.contextMenu
            .querySelectorAll(
                "[data-context-action]"
            )
            .forEach(
                button => {

                    on(
                        button,
                        "click",
                        () => {

                            handleContextAction(
                                button.dataset.contextAction
                            );

                        }
                    );

                }
            );

    }


    on(
        document,
        "click",
        event => {

            if (
                DOM.modelMenu &&
                !DOM.modelMenu.hidden &&
                !DOM.modelMenu.contains(
                    event.target
                ) &&
                DOM.modelSelectorButton &&
                !DOM.modelSelectorButton.contains(
                    event.target
                )
            ) {

                closeModelMenu();

            }


            if (
                DOM.contextMenu &&
                !DOM.contextMenu.hidden &&
                !DOM.contextMenu.contains(
                    event.target
                )
            ) {

                hideContextMenu();

            }

        }
    );


    on(
        document,
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


    on(
        window,
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
        mediaQuery.addEventListener
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
        !state.activeConversationId &&
        DOM.welcomeScreen
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
