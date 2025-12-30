const wsUrl = "ws://localhost:8080";
const valBox = document.getElementById('highlight-box');

/**
 * Updates the color of the primary metric card
 * Connected -> RED
 * Disconnected -> GREEN
 */
function setVisualState(state) {
    if (state === 'connected') {
        valBox.classList.remove('green-theme');
        valBox.classList.add('red-theme');
    } else {
        valBox.classList.remove('red-theme');
        valBox.classList.add('green-theme');
    }
}

function initSocket() {
    setVisualState('disconnected'); // Start as Green
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("WebSocket: Connected");
        setVisualState('connected');
    };

    socket.onmessage = (msg) => {
        try {
            const data = JSON.parse(msg.data);
            
            // Map 'name' to the Vehicle Number Plate field
            if (data.name) {
                document.getElementById('item-name').textContent = data.name;
            }
            
            // Map Punctual field
            if (data.punctual !== undefined) {
                document.getElementById('punctual-count').textContent = data.punctual;
            }
            
            // Map Delayed entries field
            if (data.delayed !== undefined) {
                document.getElementById('delayed-count').textContent = data.delayed;
            }
            
            // Map the big Primary Metric value
            if (data.value) {
                document.getElementById('highlight-value').textContent = data.value;
            }
            
            // Update Visualization Image
            if (data.image_url) {
                document.getElementById('item-image').src = data.image_url;
            }
            
            // Update Metadata Text
            if (data.description) {
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