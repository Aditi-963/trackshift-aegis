# Aegis: The AI Race Strategist

**Elevator Pitch:**
> Aegis: The AI Race Strategist. While other sims model physics, we model *pressure*. Our 'human-flaw' AI simulates panic, selfishness, and heart rate spikes, letting teams test strategies against a chaotic, human race—not just robots.

**Note on Code:** This repository contains a visual prototype developed during the TrackShift 2025 hackathon. Due to time constraints and learning challenges, the backend AI logic is conceptual, but the frontend demo showcases the core visual elements and interactive ideas. Minor visual artifacts, such as animation flickering at the path loop point, exist despite efforts to resolve them.

---
## Inspiration

We've all watched a race. We've all seen a driver make *one bad decision*—pitting one lap too late in the rain—that costs them the entire championship. It's heartbreaking.

What if that team could have seen the future? What if they could have lived that race 10,000 times *before* it even started, against unpredictable, human-like opponents? That's why we built Aegis.

---
## What the Demo Does

This interactive web-based demo visualizes the core concepts of Aegis:

1.  **Las Vegas Circuit:** Displays the actual Las Vegas F1 track layout using SVG graphics. Agents start from an estimated position on the main straight; precise grid formation will be refined.
2.  **Animated Agents:** Shows four competitor agents (dots) moving along the track path at different, dynamically adjusted speeds (simulating basic tire wear).
3.  **Live Leaderboard:** A dynamically updating table showing the current rank and status of each agent based on their lap and position on track.
4.  **Live Lap Counter:** An integrated SVG display showing the current lap of the race leader, counting up to the total race distance (e.g., 50 laps).
5.  **Chaos Engine Controls (Conceptual):**
    * **Heavy Rain Button:** Triggers a visual rain effect, slows down active agents, and displays a "Safety Car" message.
    * **Crash Button:** Simulates a crash involving agents ranked between 'White' and 'Yellow', marking them as 'DNF' on the leaderboard and stopping their movement.
6.  **Simulated Telemetry:** The leaderboard displays dynamically changing (though currently simulated) heart rates for each driver based on race conditions (rank, rain).

---
## Why Las Vegas? 🎲🏎️

We specifically chose the **Las Vegas Strip Circuit** for this demo due to its **timely relevance**. The TrackShift 2025 hackathon finals (Nov 15-17) take place just before the actual **Formula 1 Las Vegas Grand Prix** (around Nov 23).

This deliberate choice grounds our simulation in an immediate, real-world context. It allows us to imagine how a tool like Aegis, focused on strategy under pressure and chaos, could potentially offer insights *right now* for one of the most anticipated races on the calendar. It transforms the demo from a generic concept into a "what-if" scenario directly applicable to the upcoming high-stakes event.

---
## How We Built It (The Hackathon Journey)

Given the deadline extension, we pivoted from simple backend placeholders (`.py`, `.json` files representing the *idea*) to building a functional **frontend visual prototype** to better demonstrate the Aegis concept.

* **Foundation:** Built using standard web technologies: **HTML**, **CSS**, and **JavaScript**.
* **Track Visualization:**
    * Sourced and integrated actual **SVG path data** for the Las Vegas F1 circuit.
    * Used the `<svg>` element in HTML to draw the track path.
    * Positioned the track correctly within the view using the `viewBox` attribute after significant trial-and-error.
* **Agent Animation:**
    * Implemented custom JavaScript animation using `requestAnimationFrame`.
    * Calculated agent positions along the complex SVG path using `path.getPointAtLength()`.
    * Developed custom logic (coordinate-based reset) to handle agents looping back to the start/finish line.
* **Interactivity & Dynamics:**
    * Used JavaScript to dynamically update agent speeds based on a simple 'wear factor' per lap.
    * Implemented JavaScript to sort agents based on lap and distance to update the leaderboard HTML table in real-time.
    * Created logic to track the leader's lap count and update the SVG lap counter text.
    * Added event listeners to the "Chaos Engine" buttons to trigger visual effects (rain animation via CSS), change agent speeds (`chaosFactor`), update agent statuses (`DNF`), and display messages.
    * Simulated dynamic heart rates based on rank and rain status.
* **Styling:** Used CSS extensively to create the dark, F1-inspired theme matching the Aegis logo, style the SVG track/agents, format the leaderboard, and create the rain animation.

---
## Challenges We Ran Into

Building this visual demo, especially while learning, presented several hurdles:

* **Finding & Using SVG Data:** Locating accurate and usable SVG path data for the specific F1 track was difficult.
* **SVG `viewBox` Positioning:** Precisely positioning and scaling the complex SVG track within the desired viewport required numerous attempts and calculations.
* **Path Animation Glitches:** Making the agents follow the SVG path smoothly and loop correctly proved challenging. Despite trying multiple JavaScript methods (`modulo`, subtraction, coordinate reset), a **minor visual flicker** persists when agents loop back to the start/finish line. We invested significant time trying to resolve this but acknowledge it needs further refinement.
* **Lap Counting Accuracy:** Reliably detecting the exact moment an agent crossed the start/finish line on a complex path required refining the JavaScript logic multiple times.
* **JavaScript Complexity:** Implementing dynamic speed changes, live sorting, DOM manipulation (leaderboard updates, SVG text), and event handling required learning and debugging significant amounts of JavaScript code within the limited timeframe.
* **Starting Grid Approximation:** The current starting positions are estimated based on path length percentage; accurately mapping them to the official Las Vegas grid formation requires further calibration.

---
## Accomplishments We're Proud Of

* Successfully creating a **working, interactive visual prototype** that demonstrates the core Aegis concept.
* Integrating and displaying the **actual Las Vegas F1 track layout**.
* Implementing **dynamic agent movement** along the complex SVG path with mostly smooth looping.
* Building a **live-updating leaderboard** and **lap counter based on the leader**.
* Adding **interactive Chaos Engine buttons** with visual feedback (rain) and state changes (DNF).
* Overcoming the numerous technical challenges through **perseverance and rapid learning**.

---
## What We Learned

This hackathon was an intense learning experience:

* **SVG is Powerful but Finicky:** Learned the basics of SVG paths, `viewBox`, and the challenges of precise coordinate mapping and animation seams.
* **JavaScript Animation:** Gained hands-on experience with `requestAnimationFrame`, DOM manipulation, and path-following animation.
* **Debugging is Key:** Spent significant time using browser developer tools (Console) to diagnose issues.
* **Prototyping Value:** Understood the power of building a visual prototype to communicate a complex idea.
* **Iterative Development:** Realized finding the right solution often involves trying different approaches and sometimes accepting minor imperfections under deadlines.

---
## What's Next for Aegis (Offline Hackathon & Beyond)

This visual demo serves as a strong foundation. Our primary goal for the Top 50 offline hackathon is to build a **fully functional, win-worthy prototype** by tackling the backend and refining the simulation:

1.  **Build the Backend:** Implement the Python/FastAPI backend to run the core simulation logic. This was intentionally deferred to allow for more research and preparation time needed to do it right.
2.  **Develop 'Human-Flaw' AI (MVP):** Implement the basic rule sets for different agent 'Personas' in the backend simulation.
3.  **Refine Frontend:**
    * Address the animation flicker at the loop point.
    * Accurately map starting positions to the official grid.
    * Connect the frontend to the live backend API instead of using placeholders.
4.  **Connect Chaos Engine:** Make the buttons trigger actual changes in the backend simulation state (affecting AI decisions, speeds, etc.).
5.  **Basic Win Probability:** Implement a rudimentary calculation based on lap, position, and potentially agent status.

Beyond the hackathon, the vision remains: Train the AI on real driver data, integrate live data feeds, and partner with a race team.

---
## Built With

* HTML5
* CSS3 (including animations)
* JavaScript (ES6+)
* SVG (Scalable Vector Graphics for track and integrated UI elements)
* *(Conceptual Backend: Python, FastAPI)*
