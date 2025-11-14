// js/ui.js

// --- Process Table ---
function renderProcessTable(tableBody, processes) {
    tableBody.innerHTML = '';
    processes.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.pid}</td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Results Table ---
function populateResultsTable(tableBody, stats) {
    tableBody.innerHTML = '';
    // Sort by PID number
    const sortedPIDs = Object.keys(stats).sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)));
    
    sortedPIDs.forEach(pid => {
        const p = stats[pid];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.pid}</td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
            <td>${p.completionTime}</td>
            <td>${p.turnaroundTime}</td>
            <td>${p.waitTime}</td>
            <td>${p.responseTime}</td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Summary Stats Cards ---
function displaySummaryStats(stats, elements) {
    elements.avgWaitingTimeEl.innerText = stats.avgWait.toFixed(2);
    elements.avgTurnaroundTimeEl.innerText = stats.avgTurnaround.toFixed(2);
    elements.cpuUtilizationEl.innerText = `${stats.cpuUtilization.toFixed(2)}%`;
    elements.throughputEl.innerText = stats.throughput.toFixed(3);
}

// --- Reset UI ---
function resetUI(elements) {
    elements.ganttChartInner.innerHTML = '';
    elements.ganttChartInner.style.width = '0%';
    elements.resultsTableBody.innerHTML = '';
    
    elements.currentTimeEl.innerText = '0';
    elements.cpuBox.innerText = 'IDLE';
    elements.cpuBox.style.backgroundColor = 'var(--color-idle)';
    elements.readyQueueBox.innerHTML = '';
    elements.completedBox.innerHTML = '';
    
    elements.avgWaitingTimeEl.innerText = '-';
    elements.avgTurnaroundTimeEl.innerText = '-';
    elements.cpuUtilizationEl.innerText = '-';
    elements.throughputEl.innerText = '-';
}

// --- Animation ---
async function animateSimulation(ganttData, processStats, elements, speed, getColor) {
    const totalDuration = ganttData[ganttData.length - 1].end;
    const { ganttChartInner, currentTimeEl, cpuBox, readyQueueBox, completedBox } = elements;
    
    ganttChartInner.innerHTML = ''; // Clear previous Gantt
    ganttChartInner.style.width = '100%'; // Set wrapper to 100%

    // 1. Draw static Gantt chart first for reference
    ganttData.forEach((block, index) => {
        const duration = block.end - block.start;
        const widthPercent = (duration / totalDuration) * 100;

        const blockEl = document.createElement('div');
        blockEl.classList.add('gantt-block');
        blockEl.style.width = `${widthPercent}%`;
        blockEl.style.backgroundColor = getColor(block.pid);
        blockEl.innerText = block.pid;
        
        const timeLabel = document.createElement('span');
        timeLabel.classList.add('time-label');
        timeLabel.innerText = block.end;
        blockEl.appendChild(timeLabel);

        if (index === 0) {
            const startLabel = document.createElement('span');
            startLabel.classList.add('time-label-start');
            startLabel.innerText = '0';
            blockEl.appendChild(startLabel);
        }
        ganttChartInner.appendChild(blockEl);
    });
    
    // 2. Animate the "live" dashboard
    let currentGanttBlock = 0;
    for (let t = 0; t <= totalDuration; t++) {
        const animationSpeed = 1010 - speed; // Invert slider value
        await new Promise(resolve => setTimeout(resolve, animationSpeed));

        // Update time
        currentTimeEl.innerText = t;

        // Find current Gantt block
        while (currentGanttBlock < ganttData.length && t >= ganttData[currentGanttBlock].end) {
            currentGanttBlock++;
        }
        
        let activePID = 'IDLE';
        if (currentGanttBlock < ganttData.length) {
             activePID = ganttData[currentGanttBlock].pid;
        }
        
        // Update CPU Box
        cpuBox.innerText = activePID;
        cpuBox.style.backgroundColor = getColor(activePID);

        // Update Ready & Completed Queues
        readyQueueBox.innerHTML = '';
        completedBox.innerHTML = '';
        
        Object.values(processStats).forEach(p => {
            const pidBoxEl = `<span class="pid-box" style="background-color: ${getColor(p.pid)}">${p.pid}</span>`;
            if (p.completionTime <= t) {
                completedBox.innerHTML += pidBoxEl;
            } else if (p.arrival <= t && p.pid !== activePID) {
                readyQueueBox.innerHTML += pidBoxEl;
            }
        });
    }
}