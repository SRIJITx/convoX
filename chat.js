// ======= chat.js for ConvoX =======

// Get DOM elements
const chatContainer = document.querySelector(".chat");
const msgInput = document.querySelector(".msg input");
const sendBtn = document.querySelector(".msg .send");
const uploadBtn = document.querySelector(".msg .upload");
const clearBtn = document.querySelector(".top button:nth-child(1)"); // Clear
const inviteBtn = document.querySelector(".top button:nth-child(2)"); // Invite

// Create hidden file input for uploads (since upload is a button, not file input)
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.style.display = "none";
fileInput.accept = "image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
document.body.appendChild(fileInput);

// Get username & room from localStorage
const username = localStorage.getItem("convox_username") || "Guest";
const room = localStorage.getItem("convox_room") || "NoRoom";

// Session messages (in-memory, no DB)
let messages = [];

// ====== Initialization ======
alert(`${username} joined the room: ${room}`);

// ====== Functions ======

// Display message in chat
function displayMessage({sender, content, type = "text", fileURL = ""}) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    if(type === "text") {
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${content}`;
    } else if(type === "file") {
        const ext = content.split(".").pop().toLowerCase();
        let fileHTML = "";
        
        // Check file type and create appropriate preview
        if(["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext)) {
            // Image files
            fileHTML = `
                <div style="margin: 5px 0;">
                    <img src="${fileURL}" alt="${content}" 
                         style="max-width: 250px; max-height: 200px; border-radius: 8px; cursor: pointer;" 
                         onclick="window.open('${fileURL}', '_blank')" />
                    <div style="margin-top: 5px;">
                        <small>${content}</small><br>
                        <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                    </div>
                </div>
            `;
        } else if(["mp4","webm","mov","avi","mkv"].includes(ext)) {
            // Video files
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
                </div>
            `;
        } else if(["mp3","wav","ogg","m4a"].includes(ext)) {
            // Audio files
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
                </div>
            `;
        } else {
            // Other file types (PDF, DOC, TXT, etc.)
            fileHTML = `
                <div style="margin: 5px 0; padding: 8px; background: #f0f0f0; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📄</span>
                        <div>
                            <div><strong>${content}</strong></div>
                            <a href="${fileURL}" download="${content}" style="font-size: 12px;">📥 Download</a>
                        </div>
                    </div>
                </div>
            `;
        }
        msgDiv.innerHTML = `<strong>${sender}:</strong><br>${fileHTML}`;
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Auto scroll
}

// Send message
function sendMessage() {
    const text = msgInput.value.trim();
    if(text === "") return;

    const msgObj = {sender: username, content: text, type: "text"};
    messages.push(msgObj);
    displayMessage(msgObj);

    msgInput.value = "";
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if(!file) return;

    // Check file size (limit to 10MB)
    if(file.size > 10 * 1024 * 1024) {
        alert("File too large! Maximum size is 10MB.");
        fileInput.value = "";
        return;
    }

    // Create object URL for preview
    const fileURL = URL.createObjectURL(file);
    
    const msgObj = {
        sender: username, 
        content: file.name, 
        type: "file", 
        fileURL: fileURL
    };
    
    messages.push(msgObj);
    displayMessage(msgObj);

    // Reset file input so same file can be uploaded again
    fileInput.value = "";
}

// Trigger file selection when upload button is clicked
function triggerFileUpload() {
    fileInput.click();
}

// Clear chat
function clearChat() {
    if(confirm("Are you sure you want to clear the chat?")) {
        // Clean up object URLs to prevent memory leaks
        messages.forEach(msg => {
            if(msg.type === "file" && msg.fileURL) {
                URL.revokeObjectURL(msg.fileURL);
            }
        });
        messages = [];
        chatContainer.innerHTML = "";
    }
}

// Generate invite link
function generateInviteLink() {
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?room=${encodeURIComponent(room)}`;
    prompt("Share this link to invite others:", link);
}

// ====== Event Listeners ======
sendBtn.addEventListener("click", sendMessage);

// Allow pressing Enter key to send
msgInput.addEventListener("keypress", function(e){
    if(e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

// Click upload button to trigger file selection
uploadBtn.addEventListener("click", triggerFileUpload);

// Handle file selection from the hidden input
fileInput.addEventListener("change", handleFileUpload);

clearBtn.addEventListener("click", clearChat);
inviteBtn.addEventListener("click", generateInviteLink);