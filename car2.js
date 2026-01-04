const wsUrl = "ws://localhost:8080";
const valBox = document.getElementById('highlight-box');

/**
 * Updates the color of the primary metric card
 * Connected -> RED
 * Disconnected -> GREEN
 */
function setVisualState(state) {
    if (state === 'late') {
        valBox.classList.remove('green-theme');
        valBox.classList.add('red-theme');
    } else { // default: on_time
        valBox.classList.remove('red-theme');
        valBox.classList.add('green-theme');
    }
}

function initSocket() {
    setVisualState('on_time'); // Start as Green
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("WebSocket: Connected");
        
    };

    socket.onmessage = (msg) => {
    try {
        const data = JSON.parse(msg.data);

        // Vehicle
        if (data.name !== undefined) {
            document.getElementById('item-name').textContent = data.name;
        }

        // Early / Late counts (new)
        if (data.early !== undefined) {
            document.getElementById('punctual-count').textContent = data.early;
        }
        if (data.late !== undefined) {
            document.getElementById('delayed-count').textContent = data.late;
        }

        // Primary Metric two-state (new)
        // Accept either: data.status = "on_time" | "late"
        // OR: data.is_late = true/false
        let state = null;

        if (data.status !== undefined) {
            state = String(data.status).toLowerCase(); // "on_time" or "late"
        } else if (data.is_late !== undefined) {
            state = data.is_late ? "late" : "on_time";
        }

        if (state === "late") {
            document.getElementById('highlight-value').textContent = "You are late";
            setVisualState("late");
        } else if (state === "on_time") {
            document.getElementById('highlight-value').textContent = "You are on time";
            setVisualState("on_time");
        }
        // (If neither provided, we don't change the primary metric)

        // Image (supports uploaded base64 OR URL)
        if (data.image_data) {
            document.getElementById('item-image').src = data.image_data;
        } else if (data.image_url) {
            document.getElementById('item-image').src = data.image_url;
        }

        // Description
        if (data.description !== undefined) {
            document.getElementById('item-description').textContent = data.description;
        }

    } catch (e) {
        console.error("Error parsing message data:", e);
    }
};



    socket.onclose = () => {
        console.log("WebSocket: Connection lost. Reconnecting...");
        setVisualState('disconnected');
        setTimeout(initSocket, 5000); // Retry every 5 seconds
    };
}

// Initialize on load
window.onload = initSocket;