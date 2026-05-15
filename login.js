// ======= login.js for ConvoX =======

const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("password");

// ======= FIX: Auto-fill room code from invite link =======
// When someone opens index.html?room=XXXX, pre-fill the room code field
const urlParams = new URLSearchParams(window.location.search);
const roomFromURL = urlParams.get("room");
if (roomFromURL) {
    roomInput.value = roomFromURL.toUpperCase();
}

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const roomCode = roomInput.value.trim().toUpperCase(); // normalize to uppercase

    // Username validation
    if (username === "") {
        alert("Please enter a username");
        return;
    }

    // Room code validation
    if (roomCode === "") {
        alert("Please enter a room code");
        return;
    }

    if (roomCode.length < 4 || roomCode.length > 8) {
        alert("Room code must be between 4 and 8 characters");
        return;
    }

    // Store user info
    localStorage.setItem("convox_username", username);
    localStorage.setItem("convox_room", roomCode);

    // Go to disclaimer then chat
    window.location.href = "disclaimer.html";
});
