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

// If no username/room, redirect to login
if (!username || !room) {
    window.location.href = "index.html";
}

// Session messages (in-memory)
let messages = [];

// ======= CHUNK SETTINGS =======
// PieSocket free plan has ~64KB per message limit
// We split files into 32KB chunks to be safe
const CHUNK_SIZE = 32 * 1024; // 32KB per chunk

// Store incoming file chunks: { [transferId]: { chunks: [], total, name, mimeType } }
const incomingFiles = {};

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

            // Ignore PieSocket system messages (no username)
            if (!data.username) return;

            // Ignore own messages
            if (data.username === username) return;

            if (data.type === "text") {
                // Normal text message
                displayMessage({
                    sender: data.username,
                    content: data.content,
                    type: "text"
                });

            } else if (data.type === "file-chunk") {
                // ======= RECEIVE FILE CHUNK =======
                const { transferId, chunkIndex, totalChunks, chunk, fileName, mimeType } = data;

                // Initialize storage for this transfer
                if (!incomingFiles[transferId]) {
                    incomingFiles[transferId] = {
                        chunks: new Array(totalChunks),
                        received: 0,
                        total: totalChunks,
                        name: fileName,
                        mimeType: mimeType,
                        sender: data.username
                    };
                }

                // Store this chunk
                incomingFiles[transferId].chunks[chunkIndex] = chunk;
                incomingFiles[transferId].received++;

                // Show progress
                console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} received for ${fileName}`);

                // All chunks received — reassemble the file
                if (incomingFiles[transferId].received === totalChunks) {
                    const fullBase64 = incomingFiles[transferId].chunks.join("");
                    const fileURL = `data:${mimeType};base64,${fullBase64}`;

                    displayMessage({
                        sender: incomingFiles[transferId].sender,
                        content: fileName,
                        type: "file",
                        fileURL: fileURL,
                        mimeType: mimeType
                    });

                    // Clean up
                    delete incomingFiles[transferId];
                    console.log(`✅ File ${fileName} fully received!`);
                }
            }

        } catch (e) {
            console.error("Message parse error:", e);
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
    displayMessage(msgObj);

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

// ======= FILE UPLOAD — chunked sending so large files work =======
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 5MB max
    if (file.size > 5 * 1024 * 1024) {
        alert("File too large! Maximum size is 5MB.");
        fileInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // e.target.result = "data:image/png;base64,XXXX..."
        const dataURL = e.target.result;

        // Strip the "data:mime/type;base64," prefix — only send raw base64
        const base64 = dataURL.split(",")[1];

        // Show immediately for sender using full dataURL
        const msgObj = {
            sender: username,
            content: file.name,
            type: "file",
            fileURL: dataURL,
            mimeType: file.type
        };
        messages.push(msgObj);
        displayMessage(msgObj);

        // ======= SEND IN CHUNKS =======
        // Unique ID for this file transfer so receiver knows which chunks belong together
        const transferId = `${username}-${Date.now()}`;
        const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

        console.log(`📤 Sending ${file.name} in ${totalChunks} chunks...`);

        // Send each chunk with a small delay so we don't flood the WebSocket
        for (let i = 0; i < totalChunks; i++) {
            const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

            setTimeout(() => {
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        username,
                        room,
                        type: "file-chunk",
                        transferId,
                        chunkIndex: i,
                        totalChunks,
                        chunk,
                        fileName: file.name,
                        mimeType: file.type
                    }));
                    console.log(`📤 Sent chunk ${i + 1}/${totalChunks}`);
                }
            }, i * 50); // 50ms delay between chunks
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
