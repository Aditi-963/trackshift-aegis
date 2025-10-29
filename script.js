// --- Setup ---
const trackPath = document.getElementById('track-path');
const lapCounterElement = document.getElementById('lap-count-text'); // Get the SVG text element
const leaderboardBody = document.querySelector('.leaderboard table tbody'); // Get the leaderboard body
const rainContainer = document.getElementById('rain-container'); // Get rain container
const safetyCarMessageElement = document.getElementById('safety-car-message'); // Get safety car message element

// Agent data structure with wear factors
let agentData = [
    // Red: Good overall pace, low wear
    { id: 1, element: document.getElementById('agent-1'), name: "You (Red)", distance: 0, speedFactor: 0.00063, lap: 0, status: 'Racing', hrVariation: 0, wearFactor: 0.0000010 },
    // White: Decent pace, medium wear
    { id: 2, element: document.getElementById('agent-2'), name: "White", distance: 0, speedFactor: 0.00060, lap: 0, status: 'Racing', hrVariation: 0, wearFactor: 0.0000015 },
    // Cyan: Starts Fastest, higher wear
    { id: 3, element: document.getElementById('agent-3'), name: "Cyan", distance: 0, speedFactor: 0.00064, lap: 0, status: 'Racing', hrVariation: 0, wearFactor: 0.0000020 },
    // Yellow: Slowest, low wear
    { id: 4, element: document.getElementById('agent-4'), name: "Yellow", distance: 0, speedFactor: 0.00045, lap: 0, status: 'Racing', hrVariation: 0, wearFactor: 0.0000012 }
];

let pathLength = 0;
if (trackPath) {
    try {
        pathLength = trackPath.getTotalLength();
    } catch (e) {
        console.error("Error getting path length:", e);
    }
}

const TOTAL_LAPS = 50; // Set race length
let raceFinished = false; // Track race state
let animationFrameId = null; // To store the request ID for stopping

// Coordinates near the end of the path for reset logic
const END_X = 1069.338623046875;
const END_Y = -98.19002532958984;
const RESET_THRESHOLD_SQUARED = 25; // How close agents need to be (squared distance)

// Global flags/variables for effects
let isRaining = false;
let chaosFactor = 1.0; // Speed multiplier for effects like rain
let rainInterval = null; // To hold the interval ID for creating drops

// --- Animation Loop ---
function moveAgents() {
    if (raceFinished || pathLength <= 0) return; // Exit if finished or path invalid

    agentData.forEach((agent) => {
        if (!agent.element || agent.status === 'DNF') return; // Skip if agent missing or DNF

        // --- Calculate Dynamic Speed ---
        let currentSpeedFactor = agent.speedFactor;
        // Apply wear based on laps completed (simple linear reduction)
        currentSpeedFactor -= agent.lap * agent.wearFactor;
        // Ensure speed doesn't go below a minimum threshold (e.g., 50% of original)
        currentSpeedFactor = Math.max(agent.speedFactor * 0.5, currentSpeedFactor);

        // Calculate actual speed for this frame, applying global chaosFactor
        let currentSpeed = currentSpeedFactor * pathLength * chaosFactor;
        if (isNaN(currentSpeed)) currentSpeed = 0;


        // Store distance from previous frame (useful potentially, though not directly used for counter now)
        let previousDistance = agent.distance;

        // Calculate potential new distance for *next* frame's start
        let potentialDistance = agent.distance + currentSpeed;

        // --- Calculate Current Point BEFORE updating distance ---
        let currentPoint = null;
        try {
             let distForCurrentPoint = Math.max(0, Math.min(agent.distance, pathLength - 0.1));
             currentPoint = trackPath.getPointAtLength(distForCurrentPoint);
        } catch(e) {
             console.error(`Error getting current point for Agent ${agent.id}`, e);
             return; // Skip this agent this frame
        }

        // --- Update distance for NEXT frame using Coordinate-Based Reset Logic ---
        let distanceToEndSquared = Infinity;
        if(currentPoint) {
            distanceToEndSquared = Math.pow(currentPoint.x - END_X, 2) + Math.pow(currentPoint.y - END_Y, 2);
        }

        let completedLapThisFrame = false;

        // Check if near the end AND moving forward AND past the halfway point
        if (distanceToEndSquared < RESET_THRESHOLD_SQUARED && currentSpeed > 0 && agent.distance > pathLength / 2) {
            agent.distance = 0; // Reset distance for the NEXT frame calculation
            agent.lap++;        // Increment this agent's lap count
            completedLapThisFrame = true; // Flag that a lap was completed
        } else {
            // Update distance normally, using modulo for safety wrap
             agent.distance = potentialDistance % pathLength;
             if (agent.distance < 0) {
                 agent.distance += pathLength;
             }
        }
        // agent.distance now holds the correct starting distance for the NEXT frame

        // --- Get Point for THIS Frame's Position ---
        // Use the distance calculated *before* the reset check (potentialDistance), clamped.
        let distanceToDraw = Math.max(0, Math.min(potentialDistance, pathLength - 0.1));
         if(potentialDistance >= pathLength) { // If crossing the line this frame, draw slightly before end
             distanceToDraw = pathLength - 0.1;
         }

        let pointToDraw = null;
         try {
             pointToDraw = trackPath.getPointAtLength(distanceToDraw);
         } catch(e) {
             console.error(`Error getting point to draw for Agent ${agent.id}`, e);
             return; // Skip drawing this agent this frame
         }

        // --- Position the agent ---
        if (pointToDraw && typeof pointToDraw.x === 'number' && typeof pointToDraw.y === 'number') {
            agent.element.setAttribute('cx', pointToDraw.x);
            agent.element.setAttribute('cy', pointToDraw.y);
        } else {
            console.error(`Agent ${agent.id}: Invalid point object received.`);
        }
    }); // End of agentData.forEach loop

    // --- Sort agents for leaderboard ---
    agentData.sort((a, b) => {
        // DNFs always go last
        if (a.status === 'DNF' && b.status !== 'DNF') return 1;
        if (b.status === 'DNF' && a.status !== 'DNF') return -1;
        if (a.status === 'DNF' && b.status === 'DNF') return 0;

        // Sort by lap (descending), then by distance (descending)
        if (b.lap !== a.lap) {
            return b.lap - a.lap;
        }
        return b.distance - a.distance;
    });

    // --- Lap Counter Logic (Based on Current Leader) ---
    if (!raceFinished && agentData.length > 0) {
        const leader = agentData[0]; // Get the agent currently in P1

        // Check if the leader's lap count is enough to finish the race
        // Check only if the leader is actually racing
        if (leader.status === 'Racing' && leader.lap >= TOTAL_LAPS) {
            if (lapCounterElement) {
                lapCounterElement.textContent = TOTAL_LAPS + "/" + TOTAL_LAPS; // Show final lap
            }
            raceFinished = true; // Set flag to stop animation
            console.log(`Race Finished! Leader (Agent ${leader.id}) reached ${TOTAL_LAPS} laps.`);
        } else {
            // Update the display with the leader's current lap count (or 0 if leader DNF'd somehow)
            const displayLap = (leader.status === 'Racing') ? leader.lap : (agentData.find(a=>a.status==='Racing')?.lap || 0); // Show 0 if leader DNFd
            if (lapCounterElement) {
                // Ensure lap counter doesn't exceed TOTAL_LAPS visually before finish flag is set
                 lapCounterElement.textContent = Math.min(displayLap, TOTAL_LAPS) + "/" + TOTAL_LAPS;
            }
        }
    }
    // --- END Lap Counter Logic ---


    // --- Update Leaderboard HTML ---
    updateLeaderboardHTML();

    // Request the next animation frame ONLY if the race is not finished
    if (!raceFinished) {
        animationFrameId = requestAnimationFrame(moveAgents); // Store the ID
    } else {
         if (animationFrameId) {
             cancelAnimationFrame(animationFrameId); // Explicitly stop the loop
             animationFrameId = null;
         }
         displayRaceFinished(); // Call function to show race end message
    }
} // End of moveAgents function

// Function to update the leaderboard table in the HTML
function updateLeaderboardHTML() {
    if (!leaderboardBody) return;
    leaderboardBody.innerHTML = ''; // Clear existing rows
    agentData.forEach((agent, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');
        let displayStatus = "";
        let heartRateDisplay = "-"; // Default for DNF
        if (agent.status === 'DNF') {
            displayStatus = "DNF";
            row.style.opacity = '0.6';
        } else {
            // --- Calculate Heart Rate ---
            let baseHeartRate = 140; // Higher baseline
            if (rank === 1) baseHeartRate = isRaining ? 135 : 130;
            else if (rank <= 3) baseHeartRate = isRaining ? 150 : 145;
            else baseHeartRate = isRaining ? 155 : 150;
            // Add smaller, less frequent random variation
            if (Math.random() < 0.1) { agent.hrVariation = Math.floor(Math.random() * 8) - 4; }
             let variation = agent.hrVariation || 0;
             let currentHeartRate = baseHeartRate + variation;
             heartRateDisplay = `${currentHeartRate} bpm`; // Format display string
            displayStatus = (agent.id === 1 || agent.id === 4) ? "2-Stop" : (agent.id === 2 ? "1-Stop Risk" : "1-Stop Safe");
        }
        // Cells for Rank, Driver, Status/Strategy, Win Prob (Static), Heart Rate (Dynamic)
        row.innerHTML = `
            <td>${rank}</td>
            <td>Agent ${agent.id} (${agent.name})</td>
            <td>${displayStatus}</td>
            <td>${agent.status === 'DNF' ? '-' : (rank === 1 ? "80%" : (rank === 2 ? "15%" : (rank === 3 ? "4%" : "1%")))}</td>
            <td>${heartRateDisplay}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

// Function to display something when the race finishes
function displayRaceFinished() {
    const leaderboardDiv = document.querySelector('.leaderboard');
    if (leaderboardDiv) {
        let finishMessage = document.getElementById('finish-message');
        if (!finishMessage) {
            finishMessage = document.createElement('p');
            finishMessage.id = 'finish-message';
            finishMessage.style.color = '#FFFF00'; // Yellow text
            finishMessage.style.textAlign = 'center';
            finishMessage.style.marginTop = '20px';
            finishMessage.style.fontWeight = 'bold';
            leaderboardDiv.appendChild(finishMessage);
        }
         const winner = agentData[0];
         if (winner && winner.status === 'Racing') {
             finishMessage.textContent = `RACE FINISHED! Winner: Agent ${winner.id} (${winner.name})`;
         } else {
             const firstFinisher = agentData.find(agent => agent.status === 'Racing');
             if (firstFinisher) {
                 finishMessage.textContent = `RACE FINISHED! Winner: Agent ${firstFinisher.id} (${firstFinisher.name})`;
             } else {
                 finishMessage.textContent = `RACE FINISHED! (All DNF)`;
             }
         }
    }
}

// Function to create a single raindrop
function createRaindrop() {
    if (!rainContainer) return;
    const drop = document.createElement('div');
    drop.classList.add('raindrop');
    drop.style.left = Math.random() * 100 + 'vw';
    drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
    drop.style.animationDelay = Math.random() * 1 + 's';
    rainContainer.appendChild(drop);
    // Remove drop after it falls to prevent buildup
    setTimeout(() => { if (drop && drop.parentNode === rainContainer) drop.remove(); }, 2000); // Added parentNode check
}

// Function to stop generating rain and reset effects
function stopRainEffect() {
    if (rainInterval) {
        clearInterval(rainInterval);
        rainInterval = null;
    }
    if (rainContainer) {
        // rainContainer.innerHTML = ''; // Optional: clear existing drops instantly
    }
    document.body.classList.remove('raining'); // Remove class from body
    if (rainButton) rainButton.classList.remove('active'); // Remove active class from button
    isRaining = false;
    chaosFactor = 1.0; // Restore normal speed for non-DNF cars
    if (safetyCarMessageElement) safetyCarMessageElement.style.display = 'none'; // Hide safety car message
}

// --- Initialization and Error Checks ---
if (!trackPath || !leaderboardBody || !rainContainer || !safetyCarMessageElement || agentData.some(agent => !agent.element)) {
    console.error("Initialization Error: Couldn't find one or more required elements.");
    // animationRunning = false; // Allow buttons to potentially still work?
} else if (pathLength <= 0) {
    console.error("Error: Track path has zero or invalid length.");
    animationRunning = false;
} else {
    // Initialize displays
    if (lapCounterElement) {
        // Initialize based on leader's lap (which is 0 initially)
        lapCounterElement.textContent = agentData[0].lap + "/" + TOTAL_LAPS;
    }
    updateLeaderboardHTML(); // Initial leaderboard draw

    // Start animation loop
    animationFrameId = requestAnimationFrame(moveAgents);
    console.log("Aegis SVG demo started (Final Version). Track length:", pathLength);
}

// --- Button Interactivity ---
const rainButton = document.querySelector('.controls button:nth-of-type(1)');
const crashButton = document.querySelector('.controls button:nth-of-type(2)');

if (rainButton && crashButton) {
    rainButton.addEventListener('click', () => {
        if (isRaining || raceFinished) return;

        console.log("Heavy Rain Triggered");
        rainButton.classList.add('active'); // Add active class to button
        document.body.classList.add('raining'); // Add class to body for rain effect
        isRaining = true;
        chaosFactor = 0.3; // Significantly slow down agents
        if (safetyCarMessageElement) safetyCarMessageElement.style.display = 'block'; // Show safety car message

        if (!rainInterval) {
            rainInterval = setInterval(createRaindrop, 50); // Start creating drops
        }
        // Ensure crashed cars stay stopped (speedFactor is already 0)
    });

    crashButton.addEventListener('click', () => {
         if (raceFinished) return;

        console.log("Crash Triggered - targeting between White(2) and Yellow(4)");
        stopRainEffect(); // Stop rain, reset chaosFactor for non-DNF cars

        // --- Crash Logic ---
        // Sort a temporary copy to find current ranks reliably
        let currentRanking = [...agentData].sort((a, b) => {
             if (a.status === 'DNF' && b.status !== 'DNF') return 1;
             if (b.status === 'DNF' && a.status !== 'DNF') return -1;
             if (a.status === 'DNF' && b.status === 'DNF') return 0;
             if (b.lap !== a.lap) return b.lap - a.lap;
             return b.distance - a.distance;
         });

        let whiteRank = currentRanking.findIndex(agent => agent.id === 2); // Get index (0-based)
        let yellowRank = currentRanking.findIndex(agent => agent.id === 4); // Get index (0-based)

        // Adjust if one already DNF'd or not found
        if (whiteRank === -1) whiteRank = Infinity;
        if (yellowRank === -1) yellowRank = Infinity;

        const lowerIndex = Math.min(whiteRank, yellowRank);
        const upperIndex = Math.max(whiteRank, yellowRank);
        let crashedAgentsList = [];

        // Apply DNF based on rank in the current sorted order
        currentRanking.forEach((rankedAgent, index) => {
             // Find the original agent in agentData to modify status and speedFactor
             let originalAgent = agentData.find(a => a.id === rankedAgent.id);

             if (originalAgent && originalAgent.status === 'Racing') { // Only affect racing cars
                 // Crash if strictly between White and Yellow index in the current ranking
                 if (index > lowerIndex && index < upperIndex) {
                     console.log(`Agent ${originalAgent.id} (${originalAgent.name}) caught in crash! Rank ${index + 1}`);
                     originalAgent.speedFactor = 0; // Stop the agent permanently
                     originalAgent.status = 'DNF';
                     crashedAgentsList.push(originalAgent.id);
                     if(originalAgent.element) originalAgent.element.style.opacity = '0.5'; // Visual cue
                 }
             }
         });


         if (crashedAgentsList.length === 0 && whiteRank !== Infinity && yellowRank !== Infinity) { // Only do fallback if W&Y were racing
             console.log("No agents were between White and Yellow to crash.");
             // Fallback: Crash White and Yellow if they are still racing
             agentData.forEach(agent => {
                 if ((agent.id === 2 || agent.id === 4) && agent.status === 'Racing') {
                     console.log(`Fallback: Crashing Agent ${agent.id} (${agent.name})`);
                     agent.speedFactor = 0;
                     agent.status = 'DNF';
                     crashedAgentsList.push(agent.id);
                     if(agent.element) agent.element.style.opacity = '0.5';
                 }
             });
         }
        // Speed reset handled by stopRainEffect

        updateLeaderboardHTML(); // Update leaderboard immediately
    });
} else {
    console.warn("Control buttons not found.");
}