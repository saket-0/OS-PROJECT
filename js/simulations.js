// --- Global Simulation State ---
// We define this globally so main.js can access it
const simState = {
    speed: 1.0, // 1.0 = normal, 0.5 = half speed, 2.0 = double speed
    isPaused: false,
    _pauseResolver: null, // Internal promise resolver
};

// --- Global Controls (to be called from main.js) ---
function setSimulationSpeed(speed) {
    simState.speed = parseFloat(speed);
}

function togglePauseSimulation() {
    simState.isPaused = !simState.isPaused;
    if (!simState.isPaused && simState._pauseResolver) {
        // Resume the simulation
        simState._pauseResolver();
        simState._pauseResolver = null;
    }
}

// --- Utility Functions (Enhanced) ---

// A new function that all async logic will check
async function checkPause() {
    if (simState.isPaused) {
        await new Promise(resolve => {
            simState._pauseResolver = resolve;
        });
    }
}

// Enhanced sleep function that respects pause and speed
async function sleep(ms) {
    await checkPause(); // Check if paused before sleeping
    const adjustedTime = ms / simState.speed;
    await new Promise(resolve => setTimeout(resolve, adjustedTime));
    await checkPause(); // Check if paused after sleeping
}

/**
 * A new "smart" wait function that replaces busy-waiting loops.
 * It respects pause/speed and logs the waiting action.
 * @param {function} conditionCheck - A function that returns true when waiting is done.
 * @param {HTMLElement} logBox - The log box to print messages to.
 * @param {string} logMessageText - The message to log while waiting.
 * @param {string} logType - The CSS class for the log message.
 */
async function smartWait(conditionCheck, logBox, logMessageText, logType) {
    if (conditionCheck()) {
         // Condition is already met, no need to wait
         return;
    }
    
    logMessage(logBox, logMessageText, logType);
    while (!conditionCheck()) {
        await checkPause();
        // Check the condition periodically, adjusted for speed
        await new Promise(resolve => setTimeout(resolve, 50 / simState.speed));
    }
}

// --- Utility Function (Original) ---
function logMessage(logBox, message, type = 'log-system') {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logEntry.classList.add(type);
    logBox.appendChild(logEntry);
    logBox.scrollTop = logBox.scrollHeight;
}


// ===================================================================
// === 1. PRODUCER-CONSUMER SIMULATION (Refactored) ==================
// ===================================================================
function initProducerConsumer() {
    const bufferSlots = document.querySelectorAll('#pc-buffer .buffer-slot');
    const logBox = document.getElementById('pc-log');
    const semEmptyEl = document.getElementById('sem-empty');
    const semFullEl = document.getElementById('sem-full');
    const semMutexEl = document.getElementById('sem-mutex');
    const producerQueueEl = document.getElementById('pc-producer-queue');
    const consumerQueueEl = document.getElementById('pc-consumer-queue');
    const producerCountEl = document.getElementById('pc-producer-count');
    const consumerCountEl = document.getElementById('pc-consumer-count');

    let empty = bufferSlots.length;
    let full = 0;
    let mutex = 1;
    let producers = [];
    let consumers = [];
    let producerId = 0;
    let consumerId = 0;
    let buffer = new Array(bufferSlots.length).fill(null);

    // --- UI Update Functions ---
    function updateSemaphores() {
        semEmptyEl.textContent = empty;
        semFullEl.textContent = full;
        semMutexEl.textContent = mutex;
        semMutexEl.style.color = mutex === 1 ? 'var(--color-green)' : 'var(--color-red)';
    }

    function updateBuffer() {
        bufferSlots.forEach((slot, i) => {
            slot.classList.toggle('filled', buffer[i] !== null);
        });
    }
    
    function addActorToQueue(type, id, el) {
        const actorEl = document.createElement('div');
        actorEl.classList.add('actor', type);
        actorEl.textContent = `${type === 'producer' ? 'P' : 'C'}${id}`;
        actorEl.id = `${type}-${id}`;
        el.appendChild(actorEl);
        return actorEl;
    }

    // --- Semaphore Operations (Refactored) ---
    async function wait(sem, actorId, semName) {
        const logType = (semName === 'empty' || semName === 'mutex') ? 'log-producer' : 'log-consumer';
        const friendlyName = `${actorId} (${semName === 'mutex' ? 'on mutex' : ''})`;
        
        await smartWait(() => window[sem] > 0, 
            logBox, 
            `${friendlyName}: Waiting for '${semName}' (Value: ${window[sem]})`, 
            logType
        );
        window[sem]--;
        updateSemaphores();
    }
    
    function signal(sem) {
        window[sem]++;
        updateSemaphores();
    }

    // --- Actor Logic (Refactored) ---
    async function producerLogic(id, actorEl) {
        while (true) {
            try {
                actorEl.classList.remove('waiting');
                logMessage(logBox, `P${id}: Sleeping`, 'log-system');
                await sleep(2000 + Math.random() * 3000); // Sleep
                
                actorEl.classList.add('waiting');
                // Use new wait function
                await wait('empty', `P${id}`, 'empty');
                await wait('mutex', `P${id}`, 'mutex');
                
                // --- Critical Section ---
                logMessage(logBox, `P${id}: Locking mutex & producing...`, 'log-producer');
                const index = buffer.indexOf(null);
                if (index !== -1) {
                    buffer[index] = `Item ${id}`;
                    updateBuffer();
                }
                await sleep(500); // Use enhanced sleep
                // --- End Critical Section ---
                
                logMessage(logBox, `P${id}: Releasing mutex`, 'log-producer');
                signal('mutex'); // Unlock mutex
                signal('full'); // Signal that a slot is full
            } catch (e) { break; } // Actor removed
        }
    }

    async function consumerLogic(id, actorEl) {
        while (true) {
            try {
                actorEl.classList.remove('waiting');
                logMessage(logBox, `C${id}: Sleeping`, 'log-system');
                await sleep(2000 + Math.random() * 4000); // Sleep
                
                actorEl.classList.add('waiting');
                // Use new wait function
                await wait('full', `C${id}`, 'full');
                await wait('mutex', `C${id}`, 'mutex');
                
                // --- Critical Section ---
                logMessage(logBox, `C${id}: Locking mutex & consuming...`, 'log-consumer');
                const index = buffer.lastIndexOf('Item'); // Find last filled slot
                if (index !== -1) {
                    buffer[index] = null;
                    updateBuffer();
                }
                await sleep(500); // Use enhanced sleep
                // --- End Critical Section ---
                
                logMessage(logBox, `C${id}: Releasing mutex`, 'log-consumer');
                signal('mutex'); // Unlock mutex
                signal('empty'); // Signal that a slot is empty
            } catch (e) { break; } // Actor removed
        }
    }

    // --- Event Listeners (Unchanged) ---
    document.getElementById('pc-add-producer').addEventListener('click', () => {
        producerId++;
        const actorEl = addActorToQueue('producer', producerId, producerQueueEl);
        const logic = producerLogic(producerId, actorEl);
        producers.push({ id: producerId, el: actorEl, logic: logic });
        producerCountEl.textContent = producers.length;
    });

    document.getElementById('pc-add-consumer').addEventListener('click', () => {
        consumerId++;
        const actorEl = addActorToQueue('consumer', consumerId, consumerQueueEl);
        const logic = consumerLogic(consumerId, actorEl);
        consumers.push({ id: consumerId, el: actorEl, logic: logic });
        consumerCountEl.textContent = consumers.length;
    });

    document.getElementById('pc-remove-producer').addEventListener('click', () => {
        const actor = producers.pop();
        if (actor) {
            actor.el.remove();
            // This is a simple way to stop the loop
            actor.logic.break(); 
            producerCountEl.textContent = producers.length;
        }
    });

    document.getElementById('pc-remove-consumer').addEventListener('click', () => {
        const actor = consumers.pop();
        if (actor) {
            actor.el.remove();
            actor.logic.break();
            consumerCountEl.textContent = consumers.length;
        }
    });
}


// ===================================================================
// === 2. READER-WRITER SIMULATION (Refactored) ======================
// ===================================================================
function initReaderWriter() {
    const logBox = document.getElementById('rw-log');
    const queueEl = document.getElementById('rw-queue');
    const resourceEl = document.getElementById('rw-resource');
    const semWrtEl = document.getElementById('rw-sem-wrt');
    const semRcEl = document.getElementById('rw-sem-rc');
    
    let wrt = 1;
    let readCount = 0;
    let mutex = 1; // Internal mutex for readCount
    let actorId = 0;
    let queue = [];

    // --- UI Update Functions (Unchanged) ---
    function updateSemaphores() {
        semWrtEl.textContent = wrt;
        semRcEl.textContent = readCount;
        semWrtEl.style.color = wrt === 1 ? 'var(--color-green)' : 'var(--color-red)';
    }

    function renderQueue() {
        queueEl.innerHTML = '';
        queue.forEach(actor => {
            const actorEl = document.createElement('div');
            actorEl.classList.add('actor', actor.type);
            actorEl.textContent = `${actor.type === 'reader' ? 'Reader' : 'Writer'} ${actor.id}`;
            queueEl.appendChild(actorEl);
        });
    }

    function addToResource(actor) {
        const actorEl = document.createElement('div');
        actorEl.classList.add('actor-in-resource', actor.type);
        actorEl.textContent = `${actor.type === 'reader' ? 'Reader' : 'Writer'} ${actor.id} (Inside)`;
        actorEl.id = `actor-${actor.id}`;
        
        const emptyEl = resourceEl.querySelector('span');
        if (emptyEl) emptyEl.remove();

        resourceEl.appendChild(actorEl);
    }

    function removeFromResource(actor) {
        const actorEl = document.getElementById(`actor-${actor.id}`);
        if (actorEl) actorEl.remove();

        if (resourceEl.children.length === 0) {
            resourceEl.innerHTML = '<span>EMPTY</span>';
        }
    }
    
    // --- Simulation Logic (Refactored) ---
    async function processQueue() {
        if (queue.length === 0) return;

        while (queue.length > 0 && queue[0].type === 'reader') {
            if (wrt === 1) { 
                const actor = queue.shift();
                renderQueue();
                readerLogic(actor);
            } else {
                break; 
            }
        }
        
        if (queue.length > 0 && queue[0].type === 'writer') {
            if (wrt === 1 && readCount === 0) {
                const actor = queue.shift();
                renderQueue();
                writerLogic(actor);
            }
        }
    }
    
    async function readerLogic(actor) {
        logMessage(logBox, `Reader ${actor.id}: Trying to enter...`, 'log-reader');
        
        // Use smartWait instead of busy-wait loop
        await smartWait(() => mutex > 0, logBox, `Reader ${actor.id}: Waiting for mutex (to increment rc)`, 'log-reader');
        mutex--;
        
        readCount++;
        if (readCount === 1) {
            logMessage(logBox, `Reader ${actor.id}: First reader, locking 'wrt' for writers.`, 'log-reader');
            await smartWait(() => wrt > 0, logBox, `Reader ${actor.id}: Waiting for 'wrt'`, 'log-reader');
            wrt--;
        }
        updateSemaphores();
        
        mutex++;
        
        // --- Critical Section (Reading) ---
        logMessage(logBox, `Reader ${actor.id}: ENTERED resource.`, 'log-reader');
        addToResource(actor);
        await sleep(2000 + Math.random() * 2000); // Use enhanced sleep
        removeFromResource(actor);
        logMessage(logBox, `Reader ${actor.id}: LEFT resource.`, 'log-reader');
        // --- End Critical Section ---

        await smartWait(() => mutex > 0, logBox, `Reader ${actor.id}: Waiting for mutex (to decrement rc)`, 'log-reader');
        mutex--;
        
        readCount--;
        if (readCount === 0) {
            logMessage(logBox, `Reader ${actor.id}: Last reader, signaling 'wrt' for writers.`, 'log-reader');
            wrt++; // signal(wrt)
        }
        updateSemaphores();
        
        mutex++;
        
        processQueue(); // Check queue again
    }

    async function writerLogic(actor) {
        logMessage(logBox, `Writer ${actor.id}: Trying to enter...`, 'log-writer');

        await smartWait(() => wrt > 0, logBox, `Writer ${actor.id}: Waiting for 'wrt'`, 'log-writer');
        wrt--;
        updateSemaphores();
        
        // --- Critical Section (Writing) ---
        logMessage(logBox, `Writer ${actor.id}: ENTERED resource.`, 'log-writer');
        addToResource(actor);
        await sleep(3000 + Math.random() * 2000); // Use enhanced sleep
        removeFromResource(actor);
        logMessage(logBox, `Writer ${actor.id}: LEFT resource.`, 'log-writer');
        // --- End Critical Section ---
        
        wrt++;
        updateSemaphores();
        
        processQueue(); // Check queue again
    }

    // --- Event Listeners (Unchanged) ---
    document.getElementById('rw-add-reader').addEventListener('click', () => {
        actorId++;
        queue.push({ id: actorId, type: 'reader' });
        renderQueue();
        processQueue();
    });

    document.getElementById('rw-add-writer').addEventListener('click', () => {
        actorId++;
        queue.push({ id: actorId, type: 'writer' });
        renderQueue();
        processQueue();
    });
}


// ===================================================================
// === 3. DINING PHILOSOPHERS SIMULATION (Refactored) ================
// ===================================================================
function initDiningPhilosophers() {
    const logBox = document.getElementById('dp-log');
    const philosophers = document.querySelectorAll('.philosopher');
    const chopsticks = document.querySelectorAll('.chopstick');
    const solutionToggle = document.getElementById('dp-solution-toggle');
    
    const STATE = { THINKING: 0, HUNGRY: 1, EATING: 2 };
    let philosopherStates = [STATE.THINKING, STATE.THINKING, STATE.THINKING, STATE.THINKING, STATE.THINKING];
    let chopstickStates = [0, 0, 0, 0, 0]; // 0 = free, 1 = taken
    
    // Replace interval with a running flag
    let isDpRunning = false;

    // --- UI Update Functions (Unchanged) ---
    function updateUI() {
        philosophers.forEach((p, i) => {
            p.classList.remove('thinking', 'hungry', 'eating');
            const statusEl = p.querySelector('.status');
            switch (philosopherStates[i]) {
                case STATE.THINKING:
                    p.classList.add('thinking');
                    statusEl.textContent = 'Thinking';
                    break;
                case STATE.HUNGRY:
                    p.classList.add('hungry');
                    statusEl.textContent = 'Hungry';
                    break;
                case STATE.EATING:
                    p.classList.add('eating');
                    statusEl.textContent = 'Eating';
                    break;
            }
        });
        chopsticks.forEach((c, i) => {
            c.classList.toggle('taken', chopstickStates[i] === 1);
        });
    }
    
    function logState(p, message, type) {
        logMessage(logBox, `P${p}: ${message}`, type);
    }

    // --- Logic (Refactored to be async) ---
    async function philosopherLogic(p) {
        // P changes from Thinking to Hungry
        if (philosopherStates[p] === STATE.THINKING) {
            philosopherStates[p] = STATE.HUNGRY;
            logState(p, 'is now Hungry', 'log-hungry');
            return;
        }

        // P tries to Eat
        if (philosopherStates[p] === STATE.HUNGRY) {
            const left = p;
            const right = (p + 1) % 5;
            const useSolution = solutionToggle.checked;

            let firstStick = left;
            let secondStick = right;
            
            if (useSolution && p === 4) {
                firstStick = right;
                secondStick = left;
            }

            if (chopstickStates[firstStick] === 0) {
                chopstickStates[firstStick] = 1;
                logState(p, `picked up C${firstStick}`, 'log-system');
                
                await sleep(500); // Use enhanced sleep

                if (chopstickStates[secondStick] === 0) {
                    chopstickStates[secondStick] = 1;
                    logState(p, `picked up C${secondStick}`, 'log-system');
                    
                    philosopherStates[p] = STATE.EATING;
                    logState(p, 'is now EATING', 'log-eating');
                } else {
                    chopstickStates[firstStick] = 0;
                    logState(p, `couldn't get C${secondStick}, put down C${firstStick}`, 'log-system');
                }
            }
            return;
        }

        // P changes from Eating to Thinking
        if (philosopherStates[p] === STATE.EATING) {
            const left = p;
            const right = (p + 1) % 5;
            
            chopstickStates[left] = 0;
            chopstickStates[right] = 0;
            
            philosopherStates[p] = STATE.THINKING;
            logState(p, `is now Thinking (put down C${left}, C${right})`, 'log-thinking');
            return;
        }
    }
    
    function checkDeadlock() {
        const allHungry = philosopherStates.every(s => s === STATE.HUNGRY);
        const allSticksTaken = chopstickStates.every(s => s === 1);
        if (allHungry && allSticksTaken) {
            logState('SYS', 'DEADLOCK DETECTED! All philosophers are hungry and hold one chopstick.', 'log-deadlock');
        }
    }
    
    // --- Event Listeners (Refactored) ---
    function stopSim() {
        isDpRunning = false; // Just set the flag
        logMessage(logBox, 'Simulation Stopping...', 'log-system');
    }
    
    document.getElementById('dp-start').addEventListener('click', async () => {
        if (isDpRunning) return; // Already running
        isDpRunning = true;
        logMessage(logBox, 'Simulation Started', 'log-system');

        // Main simulation loop
        while (isDpRunning) {
            // Pick a random philosopher to attempt an action
            const p = Math.floor(Math.random() * 5); 
            await philosopherLogic(p); // Run their logic
            updateUI();
            
            // Check for deadlock slightly after
            await sleep(50); // Small delay
            checkDeadlock();
            
            // Wait for the next "tick"
            // This enhanced sleep respects pause/speed controls
            await sleep(1000); 
        }
        logMessage(logBox, 'Simulation Stopped', 'log-system');
        isDpRunning = false; // Ensure it's marked as stopped
    });
    
    document.getElementById('dp-stop').addEventListener('click', stopSim);
    
    solutionToggle.addEventListener('change', () => {
        logMessage(logBox, `Solution ${solutionToggle.checked ? 'ENABLED' : 'DISABLED'}.`, 'log-system');
        // Reset state
        stopSim();
        philosopherStates.fill(STATE.THINKING);
        chopstickStates.fill(0);
        updateUI();
    });
}


// ===================================================================
// === 4. SLEEPING BARBER SIMULATION (Refactored) ====================
// ===================================================================
function initSleepingBarber() {
    const logBox = document.getElementById('sb-log');
    const barberEl = document.getElementById('sb-barber');
    const barberChairEl = document.getElementById('sb-barber-chair');
    const waitingChairs = document.querySelectorAll('#sb-waiting-room .chair');
    const queueEl = document.getElementById('sb-queue');
    
    const MAX_CHAIRS = waitingChairs.length;
    let customers = 0; // Customers waiting (waiting room + barber chair)
    let barberReady = 0; // 0 = sleeping, 1 = ready
    let mutex = 1; // Protects `customers` variable
    
    let customerQueue = [];
    let customerId = 0;
    let waitingRoom = [];
    
    // --- UI Update Functions (Unchanged) ---
    function updateUI() {
        if (barberReady === 0 && customers === 0) {
            barberEl.textContent = 'Zzz...';
            barberEl.classList.add('sleeping');
            barberEl.classList.remove('working');
        } else {
            barberEl.textContent = 'Working';
            barberEl.classList.remove('sleeping');
            barberEl.classList.add('working');
        }
        
        waitingChairs.forEach((chair, i) => {
            const customer = waitingRoom[i];
            chair.classList.toggle('filled', !!customer);
            chair.textContent = customer ? `C${customer.id}` : '';
        });
        
        queueEl.innerHTML = '';
        customerQueue.forEach(cust => {
            const el = document.createElement('div');
            el.classList.add('customer');
            el.textContent = `Customer ${cust.id}`;
            queueEl.appendChild(el);
        });
    }
    
    // --- Logic (Refactored) ---
    async function barberLogic() {
        while (true) {
            // Use smartWait instead of busy-wait
            await smartWait(() => customers > 0, logBox, 'Barber: No customers, going to sleep...', 'log-barber');
            
            // Woken up
            await smartWait(() => mutex > 0, logBox, 'Barber: Waiting for mutex', 'log-barber');
            mutex--;
            
            // --- Critical Section ---
            customers--;
            // --- End Critical Section ---
            
            barberReady = 1; // signal(barberReady)
            mutex++; // signal(mutex)
            
            // --- Cut Hair ---
            const customer = waitingRoom.shift();
            barberChairEl.textContent = `C${customer.id}`;
            barberChairEl.classList.add('filled');
            logMessage(logBox, `Barber: Cutting hair for C${customer.id}`, 'log-barber');
            updateUI();
            
            await sleep(3000 + Math.random() * 2000); // Use enhanced sleep
            
            barberChairEl.textContent = 'Empty';
            barberChairEl.classList.remove('filled');
            logMessage(logBox, `Barber: Finished with C${customer.id}`, 'log-barber');
            barberReady = 0; // Barber is ready for next customer (or to sleep)
            updateUI();
            
            // Move customer from outside queue to waiting room
            if (customerQueue.length > 0) {
                const nextCustomer = customerQueue.shift();
                waitingRoom.push(nextCustomer);
                logMessage(logBox, `C${nextCustomer.id}: Takes a seat in waiting room.`, 'log-customer');
            }
        }
    }
    
    async function customerLogic(customer) {
        logMessage(logBox, `C${customer.id}: Arrives at shop.`, 'log-customer');
        customerQueue.push(customer);
        updateUI();
        
        await smartWait(() => mutex > 0, logBox, `C${customer.id}: Waiting for mutex`, 'log-customer');
        mutex--;
        
        if (customers < MAX_CHAIRS) {
            customers++;
            
            waitingRoom.push(customerQueue.shift());
            logMessage(logBox, `C${customer.id}: Enters waiting room.`, 'log-customer');
            
            // signal(customers) -> (Wakes barber)
            
            mutex++; // signal(mutex)
            
            await smartWait(() => barberReady > 0, logBox, `C${customer.id}: Waiting for barber to be ready`, 'log-customer');
            
            // (customer is now served by barber)
            
        } else {
            // Shop full
            mutex++; // signal(mutex)
            logMessage(logBox, `C${customer.id}: Waiting room full, leaving!`, 'log-customer');
            customerQueue.shift();
        }
        updateUI();
    }
    
    // --- Event Listeners ---
    document.getElementById('sb-add-customer').addEventListener('click', () => {
        customerId++;
        customerLogic({ id: customerId });
    });
    
    // Start the barber
    barberLogic();
}