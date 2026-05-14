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
const username = localStorage.getItem("convox_username") || "Guest";
const room = localStorage.getItem("convox_room") || "NoRoom";

// Session messages (in-memory)
let messages = [];

// ======= WEBSOCKET SETUP (PieSocket - free, no backend needed) =======
// Sign up free at https://piesocket.com to get your own API key
// Free plan: 1000 connections/day — enough for testing & small projects
const PIESOCKET_API_KEY = "RISge0Z62ctXhdrgVlmftrWvDZ2igqJpAw1m23Qn";
const PIESOCKET_CLUSTER = "free.blr2";

let ws = null;

function initWebSocket() {
    // Each room code becomes its own PieSocket channel
    const wsUrl = `wss://${PIESOCKET_CLUSTER}.piesocket.com/v3/${encodeURIComponent(room)}?api_key=${PIESOCKET_API_KEY}&notify_self=1`;

    console.log("🔄 Connecting to room:", room);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("✅ Connected to room:", room);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Only show messages that have our app's marker
            // and are NOT sent by the current user (avoid echo)
            if (data._convox && data.username !== username) {
                displayMessage({
                    sender: data.username,
                    content: data.content,
                    type: data.type || "text",
                    fileURL: data.fileURL || ""
                });
            }
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
alert(`${username} joined the room: ${room}`);
initWebSocket();

// ======= DISPLAY MESSAGE =======
function displayMessage({ sender, content, type = "text", fileURL = "" }) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    if (type === "text") {
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${content}`;
    } else if (type === "file") {
        const ext = content.split(".").pop().toLowerCase();
        let fileHTML = "";

        if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
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
                        <source src="${fileURL}" type="video/${ext}">
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
                        <source src="${fileURL}" type="audio/${ext}">
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
    displayMessage(msgObj); // Show immediately for sender

    // Send to all others in the same room
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            _convox: true,       // marker so we ignore PieSocket system msgs
            username,
            room,
            content: text,
            type: "text"
        }));
    }

    msgInput.value = "";
}

// ======= FILE UPLOAD =======
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        alert("File too large! Maximum size is 10MB.");
        fileInput.value = "";
        return;
    }

    const fileURL = URL.createObjectURL(file);
    const msgObj = { sender: username, content: file.name, type: "file", fileURL };

    messages.push(msgObj);
    displayMessage(msgObj); // Show immediately for sender

    // NOTE: fileURL is a local blob — other users won't be able to see the file preview
    // but they will see the filename. For full file sharing you'd need a file host (e.g. Firebase Storage).
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            _convox: true,
            username,
            room,
            content: file.name,
            type: "file",
            fileURL: "" // blob URLs don't work cross-device
        }));
    }

    fileInput.value = "";
}

// ======= OTHER FUNCTIONS (UNCHANGED) =======
function triggerFileUpload() {
    fileInput.click();
}

function clearChat() {
    if (confirm("Are you sure you want to clear the chat?")) {
        messages.forEach(msg => {
            if (msg.type === "file" && msg.fileURL) {
                URL.revokeObjectURL(msg.fileURL);
            }
        });
        messages = [];
        chatContainer.innerHTML = "";
    }
}

function generateInviteLink() {
    const baseUrl = window.location.href.split("?")[0];
    const link = `${baseUrl}?room=${encodeURIComponent(room)}`;
    prompt("Share this link to invite others:", link);
}

// ======= EVENT LISTENERS (UNCHANGED) =======
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
