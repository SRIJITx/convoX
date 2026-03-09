const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("password");

form.addEventListener("submit", function(e){

    e.preventDefault();

    const username = usernameInput.value.trim();
    const roomCode = roomInput.value.trim();

    // username validation
    if(username === ""){
        alert("Please enter a username");
        return;
    }

    // room code validation
    if(roomCode === ""){
        alert("Please enter a room code");
        return;
    }

    if(roomCode.length < 4 || roomCode.length > 8){
        alert("Room code must be between 4 and 8 characters");
        return;
    }

    // store user info
    localStorage.setItem("convox_username", username);
    localStorage.setItem("convox_room", roomCode);

    // go to next page
    window.location.href = "disclaimer.html";

});