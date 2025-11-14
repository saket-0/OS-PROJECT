// js/scheduler.js

function runFCFS(processes) {
    processes.sort((a, b) => a.arrival - b.arrival);

    let gantt = [];
    let processStats = {};
    let currentTime = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalIdle = 0;

    processes.forEach(p => {
        // Handle idle time
        if (currentTime < p.arrival) {
            const idleStart = currentTime;
            currentTime = p.arrival;
            totalIdle += (currentTime - idleStart);
            gantt.push({ pid: 'IDLE', start: idleStart, end: currentTime });
        }

        const startTime = currentTime;
        const completionTime = startTime + p.burst;
        const turnaroundTime = completionTime - p.arrival;
        const waitTime = startTime - p.arrival;
        const responseTime = startTime - p.arrival; // For FCFS, same as wait time

        gantt.push({ pid: p.pid, start: startTime, end: completionTime });
        
        processStats[p.pid] = { ...p, completionTime, turnaroundTime, waitTime, responseTime };
        
        totalWait += waitTime;
        totalTurnaround += turnaroundTime;
        currentTime = completionTime;
    });
    
    const stats = calculateSummaryStats(processes.length, totalWait, totalTurnaround, currentTime, totalIdle);
    return { gantt, stats, processStats };
}

function runSJF(processes) {
    let gantt = [];
    let processStats = {};
    let currentTime = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalIdle = 0;
    let completed = 0;
    const n = processes.length;
    
    let isCompleted = {};
    let firstRun = {}; // For Response Time
    
    while (completed < n) {
        let readyQueue = processes.filter(p => !isCompleted[p.pid] && p.arrival <= currentTime);
        
        if (readyQueue.length === 0) {
            let nextArrivalTime = Math.min(...processes.filter(p => !isCompleted[p.pid]).map(p => p.arrival));
            if (nextArrivalTime > currentTime) {
                const idleStart = currentTime;
                currentTime = nextArrivalTime;
                totalIdle += (currentTime - idleStart);
                gantt.push({ pid: 'IDLE', start: idleStart, end: currentTime });
                continue;
            }
        }

        readyQueue.sort((a, b) => a.burst - b.burst);
        const p = readyQueue[0];
        
        const startTime = currentTime;
        
        // Calculate Response Time
        let responseTime = 0;
        if (!firstRun[p.pid]) {
            responseTime = startTime - p.arrival;
            firstRun[p.pid] = true;
        }
        
        const completionTime = startTime + p.burst;
        const turnaroundTime = completionTime - p.arrival;
        const waitTime = startTime - p.arrival;

        gantt.push({ pid: p.pid, start: startTime, end: completionTime });
        
        processStats[p.pid] = { ...p, completionTime, turnaroundTime, waitTime, responseTime };

        totalWait += waitTime;
        totalTurnaround += turnaroundTime;
        currentTime = completionTime;
        isCompleted[p.pid] = true;
        completed++;
    }

    const stats = calculateSummaryStats(n, totalWait, totalTurnaround, currentTime, totalIdle);
    return { gantt, stats, processStats };
}

function runRR(processes, quantum) {
    let gantt = [];
    let processStats = {};
    let currentTime = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalIdle = 0;
    const n = processes.length;

    let remainingBurst = {};
    processes.forEach(p => { remainingBurst[p.pid] = p.burst; });
    
    let firstRun = {}; // For Response Time
    
    let readyQueue = [];
    let processPointer = 0;
    processes.sort((a, b) => a.arrival - b.arrival);

    while (Object.values(remainingBurst).some(t => t > 0)) {
        // Add arriving processes to the ready queue
        while (processPointer < n && processes[processPointer].arrival <= currentTime) {
            readyQueue.push(processes[processPointer]);
            processPointer++;
        }

        if (readyQueue.length === 0) {
            // No process in queue
            if (processPointer < n) {
                // Find next arrival
                const idleStart = currentTime;
                currentTime = processes[processPointer].arrival;
                totalIdle += (currentTime - idleStart);
                gantt.push({ pid: 'IDLE', start: idleStart, end: currentTime });
                continue; // Loop again to add the process
            } else {
                break; // All processes done
            }
        }

        const p = readyQueue.shift();
        
        const startTime = currentTime;
        let runTime = Math.min(quantum, remainingBurst[p.pid]);
        
        // Calculate Response Time
        let responseTime = 0;
        if (!firstRun[p.pid]) {
            responseTime = startTime - p.arrival;
            firstRun[p.pid] = true;
        }

        remainingBurst[p.pid] -= runTime;
        currentTime += runTime;

        gantt.push({ pid: p.pid, start: startTime, end: currentTime });

        // Add processes that arrived *while* this one was running
        while (processPointer < n && processes[processPointer].arrival <= currentTime) {
            readyQueue.push(processes[processPointer]);
            processPointer++;
        }
        
        if (remainingBurst[p.pid] > 0) {
            // Process not finished, add back to queue
            readyQueue.push(p);
        } else {
            // Process finished
            const completionTime = currentTime;
            const turnaroundTime = completionTime - p.arrival;
            const waitTime = turnaroundTime - p.burst;
            
            processStats[p.pid] = { ...p, completionTime, turnaroundTime, waitTime, responseTime };
            totalWait += waitTime;
            totalTurnaround += turnaroundTime;
        }
    }
    
    const stats = calculateSummaryStats(n, totalWait, totalTurnaround, currentTime, totalIdle);
    return { gantt, stats, processStats };
}

function calculateSummaryStats(n, totalWait, totalTurnaround, totalTime, totalIdle) {
    if (totalTime === 0) { // Prevent divide by zero
        return {
            avgWait: 0,
            avgTurnaround: 0,
            cpuUtilization: 0,
            throughput: 0
        };
    }
    return {
        avgWait: totalWait / n,
        avgTurnaround: totalTurnaround / n,
        cpuUtilization: ((totalTime - totalIdle) / totalTime) * 100,
        throughput: n / totalTime
    };
}