// --- Setup ---
const trackPath = document.getElementById('track-path');
const lapCounterElement = document.getElementById('lap-count-text');
const leaderboardBody = document.getElementById('leaderboard-body');
const rainContainer = document.getElementById('rain-container');
const safetyCarMessageElement = document.getElementById('safety-car-message');

// Agent data structure with wear factors & tire life
let agentData = [
    // Red: Good overall pace, low wear
    { id: 1, element: document.getElementById('agent-1'), name: "You (Red)", distance: 0, speedFactor: 0.00063, lap: 0, status: 'Racing', hrVariation: 0, tire: 'Hard', lapsOnTire: 0 },
    // White: Decent pace, medium wear
    { id: 2, element: document.getElementById('agent-2'), name: "White", distance: 0, speedFactor: 0.00060, lap: 0, status: 'Racing', hrVariation: 0, tire: 'Medium', lapsOnTire: 0 },
    // Cyan: Starts Fastest, higher wear
    { id: 3, element: document.getElementById('agent-3'), name: "Cyan", distance: 0, speedFactor: 0.00064, lap: 0, status: 'Racing', hrVariation: 0, tire: 'Soft', lapsOnTire: 0 },
    // Yellow: Slowest, low wear
    { id: 4, element: document.getElementById('agent-4'), name: "Yellow", distance: 0, speedFactor: 0.00045, lap: 0, status: 'Racing', hrVariation: 0, tire: 'Hard', lapsOnTire: 0 }
];

// Define wear factors based on tire compound
const TIRE_WEAR_FACTORS = {
    'Soft': 0.0000020,
    'Medium': 0.0000015,
    'Hard': 0.0000010,
    'Inter': 0.0000012 // Wear factor for Inters (used in rain)
};

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
let isPaused = false; // Pause flag

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
    // Check for pause first
    if (isPaused) {
        requestAnimationFrame(moveAgents); // Keep the loop alive but skip logic
        return;
    }

    if (raceFinished || pathLength <= 0) return; // Exit if finished or path invalid

    agentData.forEach((agent) => {
        // Stop moving if DNF or Pitting
        if (!agent.element || agent.status === 'DNF' || agent.status === 'Pitting') return;

        // --- Calculate Dynamic Speed (AI Persona Logic) ---
        let currentSpeedFactor = agent.speedFactor;
        let wearFactor = TIRE_WEAR_FACTORS[agent.tire] || 0.0000015;
        // Apply wear based on laps *on this specific tire*
        currentSpeedFactor -= agent.lapsOnTire * wearFactor;
        // Ensure speed doesn't go below a minimum threshold
        currentSpeedFactor = Math.max(agent.speedFactor * 0.5, currentSpeedFactor);
        
        // Add autonomous 'Rookie Error' AI
        if (agent.id === 4 && Math.random() < 0.0002) { // 0.02% chance per frame for Yellow
             console.log("UNFORCED ERROR! Agent 4 (Yellow) has spun out!");
             agent.status = 'DNF';
             if(agent.element) agent.element.style.opacity = '0.5';
             return; // Stop processing this agent
        }

        // Calculate actual speed for this frame, applying global chaosFactor
        let currentSpeed = currentSpeedFactor * pathLength * chaosFactor;
        if (isNaN(currentSpeed)) currentSpeed = 0;

        let previousDistance = agent.distance;
        let potentialDistance = agent.distance + currentSpeed;

        // --- Calculate Current Point BEFORE updating distance ---
        let currentPoint = null;
        try {
             let distForCurrentPoint = Math.max(0, Math.min(agent.distance, pathLength - 0.1));
             currentPoint = trackPath.getPointAtLength(distForCurrentPoint);
        } catch(e) { console.error(`Error getting current point for Agent ${agent.id}`, e); return; }

        // --- Update distance for NEXT frame using Coordinate-Based Reset Logic ---
        let distanceToEndSquared = Infinity;
        if(currentPoint) {
            distanceToEndSquared = Math.pow(currentPoint.x - END_X, 2) + Math.pow(currentPoint.y - END_Y, 2);
        }

        // Check if near the end AND moving forward AND past the halfway point
        if (distanceToEndSquared < RESET_THRESHOLD_SQUARED && currentSpeed > 0 && agent.distance > pathLength / 2) {
            agent.distance = 0; // Reset distance
            agent.lap++;        // Increment lap
            agent.lapsOnTire++; // Increment laps on this tire
        } else {
             agent.distance = potentialDistance % pathLength;
             if (agent.distance < 0) { agent.distance += pathLength; }
        }
        
        // --- Get Point for THIS Frame's Position ---
        let distanceToDraw = Math.max(0, Math.min(potentialDistance, pathLength - 0.1));
         if(potentialDistance >= pathLength) { distanceToDraw = pathLength - 0.1; }

        let pointToDraw = null;
         try {
             pointToDraw = trackPath.getPointAtLength(distanceToDraw);
         } catch(e) { console.error(`Error getting point to draw for Agent ${agent.id}`, e); return; }

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
        if (a.status === 'DNF' && b.status !== 'DNF') return 1;
        if (b.status === 'DNF' && a.status !== 'DNF') return -1;
        if (a.status === 'DNF' && b.status === 'DNF') return 0;
        // Sort pitting cars below racing cars
        if (a.status === 'Pitting' && b.status === 'Racing') return 1;
        if (b.status === 'Pitting' && a.status === 'Racing') return -1;
        if (a.status === 'Pitting' && b.status === 'Pitting') return 0;
        // Sort by lap, then by distance
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.distance - a.distance;
    });

    // --- Lap Counter Logic (Based on Current Leader) ---
    if (!raceFinished && agentData.length > 0) {
        const leader = agentData[0];
        if (leader.status === 'Racing' && leader.lap >= TOTAL_LAPS) {
            if (lapCounterElement) { lapCounterElement.textContent = TOTAL_LAPS + "/" + TOTAL_LAPS; }
            raceFinished = true;
            console.log(`Race Finished! Leader (Agent ${leader.id}) reached ${TOTAL_LAPS} laps.`);
        } else {
            const displayLap = (leader.status === 'Racing') ? leader.lap : (agentData.find(a=>a.status==='Racing')?.lap || 0);
            if (lapCounterElement) {
                 lapCounterElement.textContent = Math.min(displayLap, TOTAL_LAPS) + "/" + TOTAL_LAPS;
            }
        }
    }
    
    // --- Update Leaderboard HTML ---
    updateLeaderboardHTML();

    // Request the next animation frame
    if (!raceFinished) {
        animationFrameId = requestAnimationFrame(moveAgents);
    } else {
         if (animationFrameId) {
             cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
         }
         displayRaceFinished();
    }
} // End of moveAgents function

// Function to update the leaderboard table in the HTML
function updateLeaderboardHTML() {
    if (!leaderboardBody) return;
    leaderboardBody.innerHTML = '';
    agentData.forEach((agent, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');
        
        let tireDisplay = "-";
        let strategyDisplay = "-";
        let heartRateDisplay = "-";
        
        row.style.animation = 'none'; // Clear flashing

        if (agent.status === 'DNF') {
            strategyDisplay = "DNF";
            row.style.opacity = '0.6';
        } else if (agent.status === 'Pitting') {
            strategyDisplay = "PITTING";
            tireDisplay = "Inters"; // Changing to Inters
            heartRateDisplay = "160 bpm"; // Pit stop stress
            row.style.animation = 'flash 1s infinite'; // Flash row
        } else {
            // --- Calculate Heart Rate (AI Persona Logic) ---
            let baseHeartRate = 140;
            if (rank === 1) baseHeartRate = isRaining ? 135 : 130;
            else if (rank <= 3) baseHeartRate = isRaining ? 150 : 145;
            else baseHeartRate = isRaining ? 155 : 150;
            if (Math.random() < 0.1) { agent.hrVariation = Math.floor(Math.random() * 8) - 4; }
             let variation = agent.hrVariation || 0;
             let currentHeartRate = baseHeartRate + variation;
             heartRateDisplay = `${currentHeartRate} bpm`;
            
            // Set strategy and tire
            strategyDisplay = (agent.tire === 'Hard') ? "1-Stop" : "2-Stop";
            tireDisplay = `${agent.tire} (${agent.lapsOnTire} Laps)`;
        }

        row.innerHTML = `
            <td>${rank}</td>
            <td>Agent ${agent.id} (${agent.name})</td>
            <td>${tireDisplay}</td>
            <td>${strategyDisplay}</td>
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
            finishMessage.style.color = '#FFFF00';
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
    setTimeout(() => { if (drop && drop.parentNode === rainContainer) drop.remove(); }, 2000);
}

// Function to stop generating rain and reset effects
function stopRainEffect() {
    if (rainInterval) {
        clearInterval(rainInterval);
        rainInterval = null;
    }
    if (rainContainer) {
        // rainContainer.innerHTML = '';
    }
    document.body.classList.remove('raining');
    if (rainButton) rainButton.classList.remove('active');
    isRaining = false;
    chaosFactor = 1.0; // Restore normal speed
    if (safetyCarMessageElement) safetyCarMessageElement.style.display = 'none';

    // Also, if cars were pitting, put them back to racing on Inters
    agentData.forEach(agent => {
        if (agent.status === 'Pitting') {
            agent.status = 'Racing';
            agent.tire = 'Inter'; // Assume they got Inters
            agent.lapsOnTire = 0;
        }
    });
}

// --- Initialization and Error Checks ---
if (!trackPath || !leaderboardBody || !rainContainer || !safetyCarMessageElement || agentData.some(agent => !agent.element)) {
    console.error("Initialization Error: Couldn't find one or more required elements.");
} else if (pathLength <= 0) {
    console.error("Error: Track path has zero or invalid length.");
} else {
    // Initialize displays
    if (lapCounterElement) {
        lapCounterElement.textContent = agentData[0].lap + "/" + TOTAL_LAPS;
    }
    updateLeaderboardHTML(); // Initial leaderboard draw
    animationFrameId = requestAnimationFrame(moveAgents);
    console.log("Aegis SVG demo started (Client-Side + Tires + Pit Stops). Track length:", pathLength);
}

// --- Button Interactivity ---
const rainButton = document.querySelector('.controls button:nth-of-type(1)');
const crashButton = document.querySelector('.controls button:nth-of-type(2)');
const pauseButton = document.getElementById('pause-button'); // Get pause button

if (rainButton && crashButton && pauseButton) {
    
    // --- RAIN TOGGLE LOGIC ---
    rainButton.addEventListener('click', () => {
        if (raceFinished) return;

        if (isRaining) {
            // If it's raining, stop the rain
            console.log("Stopping rain...");
            stopRainEffect();
        } else {
            // If it's not raining, start the rain & force pits
            console.log("Heavy Rain Triggered! Forcing pit stops.");
            rainButton.classList.add('active');
            document.body.classList.add('raining');
            isRaining = true;
            chaosFactor = 0.3; // Slow down agents (Safety Car pace)
            if (safetyCarMessageElement) safetyCarMessageElement.style.display = 'block';
            if (!rainInterval) { rainInterval = setInterval(createRaindrop, 50); }

            // --- Pit Stop Logic ---
            agentData.forEach(agent => {
                if (agent.status === 'Racing') {
                    agent.status = 'Pitting'; // Set status
                    
                    // Simulate pit stop time (e.g., 3-5 seconds)
                    const pitStopTime = 3000 + (Math.random() * 2000); // 3-5 sec pit stop

                    setTimeout(() => {
                        // After pit stop is "done"
                        agent.status = 'Racing'; // Back to racing
                        agent.tire = 'Inter'; // New tires
                        agent.lapsOnTire = 0; // Reset tire age
                        console.log(`Agent ${agent.id} exits the pits on Inters.`);
                    }, pitStopTime);
                }
            });
        }
    });

    // --- CRASH BUTTON LOGIC ---
    crashButton.addEventListener('click', () => {
         if (raceFinished) return;
        console.log("Crash Triggered - targeting between White(2) and Yellow(4)");
        stopRainEffect(); // Stop rain, reset chaosFactor

        let currentRanking = [...agentData].sort((a, b) => {
             if (a.status === 'DNF' && b.status !== 'DNF') return 1;
             if (b.status === 'DNF' && a.status !== 'DNF') return -1;
             if (a.status === 'DNF' && b.status === 'DNF') return 0;
             if (b.lap !== a.lap) return b.lap - a.lap;
             return b.distance - a.distance;
         });
        let whiteRank = currentRanking.findIndex(agent => agent.id === 2);
        let yellowRank = currentRanking.findIndex(agent => agent.id === 4);
        if (whiteRank === -1) whiteRank = Infinity;
        if (yellowRank === -1) yellowRank = Infinity;
        const lowerIndex = Math.min(whiteRank, yellowRank);
        const upperIndex = Math.max(whiteRank, yellowRank);
        let crashedAgentsList = [];

        currentRanking.forEach((rankedAgent, index) => {
             let originalAgent = agentData.find(a => a.id === rankedAgent.id);
             if (originalAgent && originalAgent.status === 'Racing') {
                 if (index > lowerIndex && index < upperIndex) {
                     console.log(`Agent ${originalAgent.id} (${originalAgent.name}) caught in crash!`);
                     originalAgent.status = 'DNF';
                     crashedAgentsList.push(originalAgent.id);
                     if(originalAgent.element) originalAgent.element.style.opacity = '0.5';
                 }
             }
         });

         if (crashedAgentsList.length === 0 && whiteRank !== Infinity && yellowRank !== Infinity) {
             console.log("Fallback: Crashing White and Yellow");
             agentData.forEach(agent => {
                 if ((agent.id === 2 || agent.id === 4) && agent.status === 'Racing') {
                     agent.status = 'DNF';
                     if(agent.element) agent.element.style.opacity = '0.5';
                 }
             });
         }
    });

    // --- PAUSE BUTTON LOGIC ---
    pauseButton.addEventListener('click', () => {
        isPaused = !isPaused; // Toggle the pause state
        if (isPaused) {
            pauseButton.textContent = 'PLAY';
            pauseButton.classList.add('paused');
            console.log("Simulation Paused");
        } else {
            pauseButton.textContent = 'PAUSE';
            pauseButton.classList.remove('paused');
            console.log("Simulation Resumed");
            // Call moveAgents again *once* to restart the animation loop
            requestAnimationFrame(moveAgents);
        }
    });

} else {
    console.warn("One or more control buttons not found.");
}
