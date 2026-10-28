
function simulate() {
    const pageText = document.getElementById("pages").value.trim();
    const frameCount = Number(document.getElementById("frames").value);
    const algorithm = document.getElementById("algorithm").value;

    if (
        !pageText ||
        !Number.isInteger(frameCount) ||
        frameCount < 1
    ) {
        alert("Enter a page reference string and a valid frame count.");
        return;
    }

    const pages = pageText.split(/[,\s]+/).map(Number);

    if (pages.some(page => !Number.isFinite(page))) {
        alert("Enter only numeric page references.");
        return;
    }

    let memory = [];
    let fifoPointer = 0;
    let lastUsed = new Map();
    let evictedPages = new Set();

    let hits = 0;
    let faults = 0;
    let rows = [];

    // LPR demonstration starts with LRU.
    let activePolicy = "LRU";
    let learningOccurred = false;

    pages.forEach((page, index) => {
        let result;
        let note = "-";

        // Detect a previously evicted page being requested again.
        if (
            algorithm === "LPR" &&
            activePolicy === "LRU" &&
            evictedPages.has(page)
        ) {
            activePolicy = "MRU";
            learningOccurred = true;

            note = `Learning event: page ${page} was evicted earlier. Switch to MRU.`;
        }

        if (memory.includes(page)) {
            hits++;

            result = "Hit";

            if (algorithm === "LPR" && note === "-") {
                note = `Active policy: ${activePolicy}`;
            }
        } else {
            faults++;

            result = "Fault";

            if (memory.length < frameCount) {
                memory.push(page);

                if (algorithm === "LPR" && note === "-") {
                    note = "Loading page into an empty frame";
                }
            } else {
                let victim;

                if (algorithm === "FIFO") {
                    victim = memory[fifoPointer];

                    memory[fifoPointer] = page;
                    fifoPointer = (fifoPointer + 1) % frameCount;

                    note = `FIFO replaces page ${victim}`;
                } else {
                    // Select the policy used for this replacement.
                    let policy = algorithm === "LPR"
                        ? activePolicy
                        : algorithm;

                    let selectedPage = memory[0];
                    let selectedTime = lastUsed.get(selectedPage);

                    memory.forEach(item => {
                        const time = lastUsed.get(item);

                        if (
                            (policy === "LRU" && time < selectedTime) ||
                            (policy === "MRU" && time > selectedTime)
                        ) {
                            selectedPage = item;
                            selectedTime = time;
                        }
                    });

                    victim = selectedPage;

                    memory[memory.indexOf(victim)] = page;

                    if (algorithm === "LPR") {
                        evictedPages.add(victim);

                        if (note === "-") {
                            note = `${activePolicy} replaces page ${victim}`;
                        } else {
                            note += ` Page ${victim} replaced.`;
                        }
                    }
                }
            }

            // FIFO/LRU keep their original behavior.
            if (algorithm === "LRU") {
                note = "-";
            }
        }

        // Record the latest use of the requested page.
        lastUsed.set(page, index);

        const frameCells = Array.from(
            { length: frameCount },
            (_, i) => memory[i] === undefined ? "-" : memory[i]
        );

        rows.push({
            page,
            frameCells,
            result,
            note
        });
    });

    // Build the simulation table.
    let table = "<table><tr><th>Page</th>";

    for (let i = 1; i <= frameCount; i++) {
        table += `<th>Frame ${i}</th>`;
    }

    table += "<th>Result</th>";

    if (algorithm === "LPR") {
        table += "<th>Policy / Learning Event</th>";
    }

    table += "</tr>";

    rows.forEach(row => {
        table += `<tr><td>${row.page}</td>`;

        row.frameCells.forEach(frame => {
            table += `<td>${frame}</td>`;
        });

        table += `<td class="${row.result.toLowerCase()}">${row.result}</td>`;

        if (algorithm === "LPR") {
            table += `<td class="note">${row.note}</td>`;
        }

        table += "</tr>";
    });

    table += "</table>";

    document.getElementById("tableArea").innerHTML = table;

    // Display final statistics.
    const total = pages.length;
    const hitRatio = (hits / total * 100).toFixed(2);
    const faultRatio = (faults / total * 100).toFixed(2);

    let policyMessage = "";

    if (algorithm === "LPR") {
        policyMessage = learningOccurred
            ? "Learning demonstration: switched from LRU to MRU."
            : "Learning demonstration: started with LRU; no policy switch occurred.";
    }

    document.getElementById("results").innerHTML = `
        <h3>Final Results</h3>
        <p>Algorithm: ${
            algorithm === "LPR" ? "Research-Inspired LPR" : algorithm
        }</p>
        <p>Page Hits: ${hits}</p>
        <p>Page Faults: ${faults}</p>
        <p>Hit Ratio: ${hitRatio}%</p>
        <p>Fault Ratio: ${faultRatio}%</p>
        ${algorithm === "LPR" ? `<p>${policyMessage}</p>` : ""}
        ${algorithm === "LPR"
            ? `<p class="hint">Educational demonstration only; this is not the paper's full reinforcement-learning implementation.</p>`
            : ""}
    `;
}

function resetPage() {
    document.getElementById("pages").value = "";
    document.getElementById("frames").value = "3";
    document.getElementById("algorithm").value = "FIFO";

    document.getElementById("tableArea").innerHTML =
        "Simulation results will appear here.";

    document.getElementById("results").innerHTML = "";
}
