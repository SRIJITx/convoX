```javascript
// ======= chat.js for ConvoX =======

// ======= GET DOM ELEMENTS =======

const chatContainer = document.querySelector(".chat");

const msgInput =
    document.querySelector(".msg input") ||
    document.querySelector("input");

const sendBtn =
    document.querySelector(".msg .send") ||
    document.querySelector(".send") ||
    document.querySelector(".send-btn") ||
    document.querySelector("#sendBtn");

const uploadBtn =
    document.querySelector(".msg .upload") ||
    document.querySelector(".upload") ||
    document.querySelector(".upload-btn") ||
    document.querySelector("#uploadBtn");

const clearBtn =
    document.querySelector(".top button:nth-child(1)") ||
    document.querySelector(".clear") ||
    document.querySelector(".clear-btn") ||
    document.querySelector("#clearBtn");

const inviteBtn =
    document.querySelector(".top button:nth-child(2)") ||
    document.querySelector(".invite") ||
    document.querySelector(".invite-btn") ||
    document.querySelector("#inviteBtn");

// ======= SAFETY CHECK =======

if (!chatContainer) {
    console.error("❌ Chat container not found");
}

if (!msgInput) {
    console.error("❌ Message input not found");
}

if (!sendBtn) {
    console.error("❌ Send button not found");
}

if (!uploadBtn) {
    console.error("❌ Upload button not found");
}

if (!clearBtn) {
    console.error("❌ Clear button not found");
}

if (!inviteBtn) {
    console.error("❌ Invite button not found");
}

// ======= CREATE FILE INPUT =======

const fileInput = document.createElement("input");

fileInput.type = "file";

fileInput.style.display = "none";

fileInput.accept =
    "image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

document.body.appendChild(fileInput);

// ======= USER INFO =======

const username =
    localStorage.getItem("convox_username") || "Guest";

const room =
    localStorage.getItem("convox_room") || "NoRoom";

// ======= UNIQUE CLIENT ID =======

const clientId = crypto.randomUUID();

// ======= REDIRECT IF NO LOGIN =======

if (
    !localStorage.getItem("convox_username") ||
    !localStorage.getItem("convox_room")
) {
    window.location.href = "index.html";
}

// ======= SESSION MESSAGES =======

let messages = [];

// ======= SECURITY =======

function escapeHTML(str) {

    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ======= WEBSOCKET =======

const PIESOCKET_API_KEY =
    "RISge0Z62ctXhdrgVlmftrWvDZ2igqJpAw1m23Qn";

const PIESOCKET_CLUSTER = "free.blr2";

let ws = null;

let reconnectTimeout = null;

let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;

// ======= INIT WEBSOCKET =======

function initWebSocket() {

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {

        console.error("❌ Max reconnect attempts reached.");

        return;
    }

    const wsUrl =
        `wss://${PIESOCKET_CLUSTER}.piesocket.com/v3/${encodeURIComponent(room)}?api_key=${PIESOCKET_API_KEY}&notify_self=1`;

    console.log("🔄 Connecting to room:", room);

    ws = new WebSocket(wsUrl);

    // ===== CONNECTED =====

    ws.onopen = () => {

        console.log("✅ Connected to room:", room);

        reconnectAttempts = 0;
    };

    // ===== MESSAGE =====

    ws.onmessage = (event) => {

        try {

            const data = JSON.parse(event.data);

            // Ignore system messages
            if (!data.username) return;

            // Ignore own messages
            if (data.clientId === clientId) return;

            displayMessage({
                sender: data.username,
                content: data.content,
                type: data.type || "text",
                fileURL: data.fileURL || "",
                mimeType: data.mimeType || ""
            });

        } catch (e) {

            // Ignore non JSON
        }
    };

    // ===== CLOSE =====

    ws.onclose = () => {

        console.log("❌ Disconnected");

        reconnectAttempts++;

        clearTimeout(reconnectTimeout);

        reconnectTimeout = setTimeout(() => {

            console.log(`🔄 Reconnecting (${reconnectAttempts})...`);

            initWebSocket();

        }, 2000);
    };

    // ===== ERROR =====

    ws.onerror = (err) => {

        console.error("❌ WebSocket error:", err);
    };
}

// ======= START =======

console.log(`${username} joined room: ${room}`);

initWebSocket();

// ======= DISPLAY MESSAGE =======

function displayMessage({
    sender,
    content,
    type = "text",
    fileURL = "",
    mimeType = ""
}) {

    if (!chatContainer) return;

    const msgDiv = document.createElement("div");

    msgDiv.classList.add("message");

    const safeSender = escapeHTML(sender);

    const safeContent = escapeHTML(content);

    // ===== TEXT =====

    if (type === "text") {

        msgDiv.innerHTML = `
            <strong>${safeSender}:</strong> ${safeContent}
        `;
    }

    // ===== FILE =====

    else if (type === "file") {

        const ext =
            content.split(".").pop().toLowerCase();

        let fileHTML = "";

        // ===== IMAGE =====

        if (
            ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]
            .includes(ext)
        ) {

            fileHTML = `
                <div style="margin:5px 0;">

                    <img
                        src="${fileURL}"
                        alt="${safeContent}"

                        style="
                            max-width:250px;
                            max-height:200px;
                            border-radius:8px;
                            cursor:pointer;
                        "

                        onclick="window.open('${fileURL}','_blank')"
                    />

                    <div style="margin-top:5px;">

                        <small>${safeContent}</small><br>

                        <a
                            href="${fileURL}"
                            download="${safeContent}"

                            style="font-size:12px;"
                        >
                            📥 Download
                        </a>

                    </div>

                </div>
            `;
        }

        // ===== VIDEO =====

        else if (
            ["mp4", "webm", "mov", "avi", "mkv"]
            .includes(ext)
        ) {

            fileHTML = `
                <div style="margin:5px 0;">

                    <video
                        controls

                        style="
                            max-width:300px;
                            max-height:200px;
                            border-radius:8px;
                        "
                    >

                        <source
                            src="${fileURL}"
                            type="${mimeType || "video/" + ext}"
                        >

                        Your browser doesn't support video.

                    </video>

                    <div style="margin-top:5px;">

                        <small>${safeContent}</small><br>

                        <a
                            href="${fileURL}"
                            download="${safeContent}"

                            style="font-size:12px;"
                        >
                            📥 Download
                        </a>

                    </div>

                </div>
            `;
        }

        // ===== AUDIO =====

        else if (
            ["mp3", "wav", "ogg", "m4a"]
            .includes(ext)
        ) {

            fileHTML = `
                <div style="margin:5px 0;">

                    <audio controls style="width:250px;">

                        <source
                            src="${fileURL}"
                            type="${mimeType || "audio/" + ext}"
                        >

                        Your browser doesn't support audio.

                    </audio>

                    <div style="margin-top:5px;">

                        <small>${safeContent}</small><br>

                        <a
                            href="${fileURL}"
                            download="${safeContent}"

                            style="font-size:12px;"
                        >
                            📥 Download
                        </a>

                    </div>

                </div>
            `;
        }

        // ===== OTHER FILES =====

        else {

            fileHTML = `
                <div
                    style="
                        margin:5px 0;
                        padding:8px;
                        background:#f0f0f0;
                        border-radius:8px;
                    "
                >

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                        "
                    >

                        <span style="font-size:24px;">📄</span>

                        <div>

                            <div>
                                <strong>${safeContent}</strong>
                            </div>

                            <a
                                href="${fileURL}"
                                download="${safeContent}"

                                style="font-size:12px;"
                            >
                                📥 Download
                            </a>

                        </div>

                    </div>

                </div>
            `;
        }

        msgDiv.innerHTML = `
            <strong>${safeSender}:</strong><br>
            ${fileHTML}
        `;
    }

    chatContainer.appendChild(msgDiv);

    chatContainer.scrollTop =
        chatContainer.scrollHeight;
}

// ======= SEND MESSAGE =======

function sendMessage() {

    if (!msgInput) return;

    const text = msgInput.value.trim();

    if (text === "") return;

    const msgObj = {
        sender: username,
        content: text,
        type: "text"
    };

    messages.push(msgObj);

    displayMessage(msgObj);

    if (ws?.readyState === WebSocket.OPEN) {

        ws.send(
            JSON.stringify({
                clientId,
                username,
                room,
                content: text,
                type: "text"
            })
        );
    }

    msgInput.value = "";
}

// ======= FILE UPLOAD =======

function handleFileUpload(event) {

    const file = event.target.files[0];

    if (!file) return;

    // ===== 20MB LIMIT =====

    if (file.size > 20 * 1024 * 1024) {

        alert("File too large! Maximum size is 20MB.");

        fileInput.value = "";

        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {

        const base64Data = e.target.result;

        const msgObj = {
            sender: username,
            content: file.name,
            type: "file",
            fileURL: base64Data,
            mimeType: file.type
        };

        messages.push(msgObj);

        displayMessage(msgObj);

        if (ws?.readyState === WebSocket.OPEN) {

            ws.send(
                JSON.stringify({
                    clientId,
                    username,
                    room,
                    content: file.name,
                    type: "file",
                    fileURL: base64Data,
                    mimeType: file.type
                })
            );
        }
    };

    reader.readAsDataURL(file);

    fileInput.value = "";
}

// ======= OTHER FUNCTIONS =======

function triggerFileUpload() {

    fileInput.click();
}

function clearChat() {

    if (
        confirm(
            "Are you sure you want to clear the chat?"
        )
    ) {

        messages = [];

        chatContainer.innerHTML = "";
    }
}

// ======= INVITE LINK =======

function generateInviteLink() {

    const baseUrl = window.location.origin;

    const link =
        `${baseUrl}/index.html?room=${encodeURIComponent(room)}`;

    prompt(
        "Share this link to invite others:",
        link
    );
}

// ======= EVENT LISTENERS =======

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}

if (msgInput) {

    msgInput.addEventListener(
        "keypress",
        function (e) {

            if (e.key === "Enter") {

                e.preventDefault();

                sendMessage();
            }
        }
    );
}

if (uploadBtn) {

    uploadBtn.addEventListener(
        "click",
        triggerFileUpload
    );
}

fileInput.addEventListener(
    "change",
    handleFileUpload
);

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        clearChat
    );
}

if (inviteBtn) {

    inviteBtn.addEventListener(
        "click",
        generateInviteLink
    );
}
```
