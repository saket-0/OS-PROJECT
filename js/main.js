// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State Variables ---
    let processes = [];
    let processIdCounter = 1;
    let comparisonChart = null;
    let allAlgorithmResults = {};
    let isAnimating = false;

    // --- Colors (NEW UPDATED PALETTE) ---
    const colors = [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Amber
        '#A855F7', // Purple
        '#EF4444', // Red
        '#6366F1', // Indigo
        '#14B8A6', // Teal
        '#EC4899', // Pink
    ];
    const getColor = (pid) => {
        if (pid === 'IDLE') return 'var(--color-idle)';
        const numericId = parseInt(pid.substring(1));
        return colors[(numericId - 1) % colors.length];
    };

    // --- Element References ---
    const algorithmSelect = document.getElementById('algorithm');
    const quantumInput = document.getElementById('quantum-input');
    const addProcessBtn = document.getElementById('add-process-btn');
    const arrivalTimeInput = document.getElementById('arrival-time');
    const burstTimeInput = document.getElementById('burst-time');
    const processTableBody = document.querySelector('#process-table tbody');
    const runBtn = document.getElementById('run-btn');
    const resetBtn = document.getElementById('reset-btn');
    const speedSlider = document.getElementById('speed-slider');
    
    const ganttChartInner = document.getElementById('gantt-chart-inner');
    const resultsTableBody = document.querySelector('#results-table tbody');

    // Live Sim Boxes
    const currentTimeEl = document.getElementById('current-time');
    const cpuBox = document.getElementById('cpu-box');
    const readyQueueBox = document.getElementById('ready-queue-box');
    const completedBox = document.getElementById('completed-box');
    
    // Summary Stats
    const avgWaitingTimeEl = document.getElementById('avg-waiting-time');
    const avgTurnaroundTimeEl = document.getElementById('avg-turnaround-time');
    const cpuUtilizationEl = document.getElementById('cpu-utilization');
    const throughputEl = document.getElementById('throughput');

    // --- Package elements for UI functions ---
    const summaryStatElements = {
        avgWaitingTimeEl,
        avgTurnaroundTimeEl,
        cpuUtilizationEl,
        throughputEl
    };
    
    const animationElements = {
        ganttChartInner,
        currentTimeEl,
        cpuBox,
        readyQueueBox,
        completedBox
    };

    const resetElements = {
        ...summaryStatElements,
        ...animationElements,
        ganttChartInner,
        resultsTableBody,
    };

    // --- Event Listeners ---
    algorithmSelect.addEventListener('change', () => {
        quantumInput.style.display = (algorithmSelect.value === 'rr') ? 'block' : 'none';
    });

    addProcessBtn.addEventListener('click', () => {
        if (isAnimating) return;
        const arrival = parseInt(arrivalTimeInput.value);
        const burst = parseInt(burstTimeInput.value);

        if (isNaN(arrival) || isNaN(burst) || arrival < 0 || burst <= 0) {
            alert('Please enter valid Arrival Time (>= 0) and Burst Time (> 0).');
            return;
        }
        
        const process = {
            pid: `P${processIdCounter++}`,
            arrival: arrival,
            burst: burst,
        };
        processes.push(process);
        renderProcessTable(processTableBody, processes);
        
        arrivalTimeInput.value = '';
        burstTimeInput.value = '';
    });

    runBtn.addEventListener('click', async () => {
        if (processes.length === 0) {
            alert('Please add at least one process.');
            return;
        }
        if (isAnimating) return; // Don't run if already animating

        isAnimating = true;
        runBtn.disabled = true;
        resetBtn.disabled = true;

        const simProcesses = JSON.parse(JSON.stringify(processes));
        const algorithm = algorithmSelect.value;
        let results = {};

        switch (algorithm) {
            case 'fcfs':
                results = runFCFS(simProcesses);
                break;
            case 'sjf':
                results = runSJF(simProcesses);
                break;
            case 'rr':
                const quantum = parseInt(document.getElementById('quantum').value);
                if (isNaN(quantum) || quantum <= 0) {
                    alert('Please enter a valid Time Quantum (> 0).');
                    isAnimating = false;
                    runBtn.disabled = false;
                    resetBtn.disabled = false;
                    return;
                }
                results = runRR(simProcesses, quantum);
                break;
        }
        
        // Store results for comparison
        allAlgorithmResults[algorithm.toUpperCase()] = results.stats;
        
        // Update UI
        populateResultsTable(resultsTableBody, results.processStats);
        displaySummaryStats(results.stats, summaryStatElements);
        updateComparisonChart(comparisonChart, allAlgorithmResults);
        
        // Run animation
        await animateSimulation(results.gantt, results.processStats, animationElements, speedSlider.value, getColor);

        // Re-enable buttons
        isAnimating = false;
        runBtn.disabled = false;
        resetBtn.disabled = false;
    });
    
    resetBtn.addEventListener('click', () => {
        if (isAnimating) return;
        
        processes = [];
        processIdCounter = 1;
        allAlgorithmResults = {};
        
        renderProcessTable(processTableBody, processes);
        resetUI(resetElements);
        comparisonChart = destroyChart(comparisonChart);
        comparisonChart = initComparisonChart(); // Re-initialize
    });

    // --- Initial Setup ---
    function addDefaultProcesses() {
        const defaultData = [
            { arrival: 0, burst: 8 },
            { arrival: 1, burst: 4 },
            { arrival: 2, burst: 9 },
            { arrival: 3, burst: 5 },
        ];
        defaultData.forEach(p => {
            const process = {
                pid: `P${processIdCounter++}`,
                arrival: p.arrival,
                burst: p.burst,
            };
            processes.push(process);
        });
        renderProcessTable(processTableBody, processes);
    }

    comparisonChart = initComparisonChart();
    addDefaultProcesses();
});