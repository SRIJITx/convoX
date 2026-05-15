// ======= chat.js for ConvoX ======

// Get DOM elements
const chatContainer = document.querySelector(".chat");
const msgInput = document.querySelector(".msg input");
const sendBtn = document.querySelector(".msg .send");
const uploadBtn = document.querySelector(".msg .upload");
const clearBtn = document.querySelector(".top button:nth-child(1)");
const inviteBtn = document.querySelector(".top button:nth-child(2)");

// Create hidden file input
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.style.display = "none";
fileInput.accept = "image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
document.body.appendChild(fileInput);

// Get username & room from localStorage
const username = localStorage.getItem("convox_username");
const room = localStorage.getItem("convox_room");

// ======= FIX 1: No username/room = send back to login page =======
// This handles the case where someone opens chat.html directly without logging in
if (!username || !room) {
    window.location.href = "index.html";
}

// Session messages (in-memory)
let messages = [];

// ======= WEBSOCKET SETUP =======
const PIESOCKET_API_KEY = "RISge0Z62ctXhdrgVlmftrWvDZ2igqJpAw1m23Qn";
const PIESOCKET_CLUSTER = "free.blr2";

let ws = null;

function initWebSocket() {
    const wsUrl = `wss://${PIESOCKET_CLUSTER}.piesocket.com/v3/${encodeURIComponent(room)}?api_key=${PIESOCKET_API_KEY}&notify_self=1`;

    console.log("🔄 Connecting to room:", room);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("✅ Connected to room:", room);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Ignore PieSocket system messages (they have no username)
            if (!data.username) return;

            // Ignore own messages (we show them instantly on send)
            if (data.username === username) return;

            // Show message from other users
            displayMessage({
                sender: data.username,
                content: data.content,
                type: data.type || "text",
                fileURL: data.fileURL || "",
                mimeType: data.mimeType || ""
            });

        } catch (e) {
            // Ignore non-JSON system messages from PieSocket
        }
    };

    ws.onclose = () => {
        console.log("❌ Disconnected — reconnecting in 2s...");
        setTimeout(initWebSocket, 2000);
    };

    ws.onerror = (err) => console.error("❌ WebSocket error:", err);
}

// ======= START =======
console.log(`${username} joined room: ${room}`);
initWebSocket();

// ======= DISPLAY MESSAGE =======
function displayMessage({ sender, content, type = "text", fileURL = "", mimeType = "" }) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    if (type === "text") {
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${content}`;

    } else if (type === "file") {
        const ext = content.split(".").pop().toLowerCase();
        let fileHTML = "";

        if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
            // ✅ FIX 3: fileURL is now base64 so image previews & downloads work cross-device
            fileHTML = `
                <div style="margin: 5px 0;">
                    <img src="${fileURL}" alt="${content}" 
                         style="max-width: 250px; max-height: 200px; border-radius: 8px; cursor: pointer;" 
                         onclick="window.open('${fileURL}', '_blank')" />
                    <div style="margin-top: 5px;">
                        <small>${content}</small><br>
                        <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                    </div>
                </div>`;

        } else if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
            fileHTML = `
                <div style="margin: 5px 0;">
                    <video controls style="max-width: 300px; max-height: 200px; border-radius: 8px;">
                        <source src="${fileURL}" type="${mimeType || 'video/' + ext}">
                        Your browser doesn't support video.
                    </video>
                    <div style="margin-top: 5px;">
                        <small>${content}</small><br>
                        <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                    </div>
                </div>`;

        } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
            fileHTML = `
                <div style="margin: 5px 0;">
                    <audio controls style="width: 250px;">
                        <source src="${fileURL}" type="${mimeType || 'audio/' + ext}">
                        Your browser doesn't support audio.
                    </audio>
                    <div style="margin-top: 5px;">
                        <small>${content}</small><br>
                        <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                    </div>
                </div>`;

        } else {
            fileHTML = `
                <div style="margin: 5px 0; padding: 8px; background: #f0f0f0; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📄</span>
                        <div>
                            <div><strong>${content}</strong></div>
                            <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                        </div>
                    </div>
                </div>`;
        }

        msgDiv.innerHTML = `<strong>${sender}:</strong><br>${fileHTML}`;
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ======= SEND TEXT MESSAGE =======
function sendMessage() {
    const text = msgInput.value.trim();
    if (text === "") return;

    const msgObj = { sender: username, content: text, type: "text" };
    messages.push(msgObj);
    displayMessage(msgObj); // show instantly for sender

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            username,
            room,
            content: text,
            type: "text"
        }));
    }

    msgInput.value = "";
}

// ======= FILE UPLOAD — base64 so previews & downloads work on ALL devices =======
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 1MB limit — WebSocket can't handle huge files
    if (file.size > 1 * 1024 * 1024) {
        alert("File too large! Maximum size is 1MB.\nTip: compress your image before sending.");
        fileInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // base64 data URL — works on any device, no server needed
        const base64Data = e.target.result;

        const msgObj = {
            sender: username,
            content: file.name,
            type: "file",
            fileURL: base64Data,
            mimeType: file.type
        };

        messages.push(msgObj);
        displayMessage(msgObj); // show instantly for sender

        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                username,
                room,
                content: file.name,
                type: "file",
                fileURL: base64Data, // ✅ real data, not a blob URL
                mimeType: file.type
            }));
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
    if (confirm("Are you sure you want to clear the chat?")) {
        messages = [];
        chatContainer.innerHTML = "";
    }
}

// ======= FIX 2: Invite link → goes to index.html with room pre-filled =======
// login.js reads ?room= from URL and auto-fills the room code field
// So the invited user still enters their name before joining
function generateInviteLink() {
    const link = `${window.location.origin}/index.html?room=${encodeURIComponent(room)}`;
    prompt("Share this link to invite others:", link);
}

// ======= EVENT LISTENERS =======
sendBtn.addEventListener("click", sendMessage);

msgInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

uploadBtn.addEventListener("click", triggerFileUpload);
fileInput.addEventListener("change", handleFileUpload);
clearBtn.addEventListener("click", clearChat);
inviteBtn.addEventListener("click", generateInviteLink);
