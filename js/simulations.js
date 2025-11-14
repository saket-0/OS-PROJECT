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
 * @param {object} ui - The UI object for logging.
 * @param {string} logMessageText - The message to log while waiting.
 * @param {string} logType - The CSS class for the log message.
 */
async function smartWait(conditionCheck, ui, logMessageText, logType) {
    if (conditionCheck()) {
         // Condition is already met, no need to wait
         return;
    }
    
    ui.log(logMessageText, logType);
    while (!conditionCheck()) {
        await checkPause();
        // Check the condition periodically, adjusted for speed
        await new Promise(resolve => setTimeout(resolve, 50 / simState.speed));
    }
}

// ===================================================================
// === 1. PRODUCER-CONSUMER SIMULATION (Refactored) ==================
// ===================================================================
// The init function now takes the UI object as a parameter
function initProducerConsumer(ui) {
    const BUFFER_SIZE = 8;
    let empty = BUFFER_SIZE;
    let full = 0;
    let mutex = 1;
    let producers = [];
    let consumers = [];
    let producerId = 0;
    let consumerId = 0;
    let buffer = new Array(BUFFER_SIZE).fill(null);

    // --- Semaphore Operations (Refactored) ---
    async function wait(semName, actorId) {
        const logType = actorId.startsWith('P') ? 'log-producer' : 'log-consumer';
        const friendlyName = `${actorId} (${semName === 'mutex' ? 'on mutex' : ''})`;

        let currentSemValue;
        const conditionCheck = () => {
            switch (semName) {
                case 'empty': currentSemValue = empty; return empty > 0;
                case 'full': currentSemValue = full; return full > 0;
                case 'mutex': currentSemValue = mutex; return mutex > 0;
                default: return false;
            }
        };

        await smartWait(
            conditionCheck, 
            ui, // Use the UI object to log
            `${friendlyName}: Waiting for '${semName}' (Value: ${currentSemValue})`, 
            logType
        );
        
        switch (semName) {
            case 'empty': empty--; break;
            case 'full': full--; break;
            case 'mutex': mutex--; break;
        }
        ui.updateSemaphores(empty, full, mutex); // Update UI
    }
    
    function signal(semName) {
        switch (semName) {
            case 'empty': empty++; break;
            case 'full': full++; break;
            case 'mutex': mutex++; break;
        }
        ui.updateSemaphores(empty, full, mutex); // Update UI
    }

    // --- Actor Logic (Refactored) ---
    async function producerLogic(id, actorEl, actor) {
        while (actor.running) {
            try {
                ui.setActorWaiting(actorEl, false); // Update UI
                ui.log(`P${id}: Sleeping`, 'log-system');
                await sleep(2000 + Math.random() * 3000); // Sleep
                
                if (!actor.running) break;
                ui.setActorWaiting(actorEl, true); // Update UI
                
                await wait('empty', `P${id}`);
                if (!actor.running) break;
                await wait('mutex', `P${id}`);
                if (!actor.running) break;
                
                // --- Critical Section ---
                ui.log(`P${id}: Locking mutex & producing...`, 'log-producer');
                const index = buffer.indexOf(null);
                if (index !== -1) {
                    buffer[index] = `Item ${id}`;
                    ui.updateBuffer(buffer); // Update UI
                }
                await sleep(500);
                // --- End Critical Section ---
                
                ui.log(`P${id}: Releasing mutex`, 'log-producer');
                signal('mutex');
                signal('full');
            } catch (e) {
                if (!actor.running) break;
                console.error("Producer error:", e);
            }
        }
        ui.log(`P${id}: Removed.`, 'log-system');
    }

    async function consumerLogic(id, actorEl, actor) {
        while (actor.running) {
            try {
                ui.setActorWaiting(actorEl, false); // Update UI
                ui.log(`C${id}: Sleeping`, 'log-system');
                await sleep(2000 + Math.random() * 4000);
                
                if (!actor.running) break;
                ui.setActorWaiting(actorEl, true); // Update UI

                await wait('full', `C${id}`);
                if (!actor.running) break;
                await wait('mutex', `C${id}`);
                if (!actor.running) break;
                
                // --- Critical Section ---
                ui.log(`C${id}: Locking mutex & consuming...`, 'log-consumer');
                const index = buffer.map((item, i) => item ? i : -1).filter(i => i !== -1).pop();
                if (index !== -1) {
                    buffer[index] = null;
                    ui.updateBuffer(buffer); // Update UI
                } else {
                    ui.log(`C${id}: BUFFER ERROR! Full semaphore was > 0 but no item found.`, 'log-red');
                }
                await sleep(500);
                // --- End Critical Section ---
                
                ui.log(`C${id}: Releasing mutex`, 'log-consumer');
                signal('mutex');
                signal('empty');
            } catch (e) {
                if (!actor.running) break;
                console.error("Consumer error:", e);
            }
        }
        ui.log(`C${id}: Removed.`, 'log-system');
    }

    // --- Event Listeners (Refactored) ---
    document.getElementById('pc-add-producer').addEventListener('click', () => {
        producerId++;
        const actorEl = ui.addActor('producer', producerId, producers.length + 1); // Update UI
        const actor = { id: producerId, el: actorEl, running: true };
        actor.logic = producerLogic(producerId, actorEl, actor);
        producers.push(actor);
    });

    document.getElementById('pc-add-consumer').addEventListener('click', () => {
        consumerId++;
        const actorEl = ui.addActor('consumer', consumerId, consumers.length + 1); // Update UI
        const actor = { id: consumerId, el: actorEl, running: true };
        actor.logic = consumerLogic(consumerId, actorEl, actor);
        consumers.push(actor);
    });

    document.getElementById('pc-remove-producer').addEventListener('click', () => {
        const actor = producers.pop();
        if (actor) {
            actor.running = false;
            ui.removeActor(actor.el, 'producer', producers.length); // Update UI
        }
    });

    document.getElementById('pc-remove-consumer').addEventListener('click', () => {
        const actor = consumers.pop();
        if (actor) {
            actor.running = false;
            ui.removeActor(actor.el, 'consumer', consumers.length); // Update UI
        }
    });

    // Initial UI setup
    ui.updateSemaphores(empty, full, mutex);
}


// ===================================================================
// === 2. READER-WRITER SIMULATION (Refactored) ======================
// ===================================================================
function initReaderWriter(ui) {
    let wrt = 1;
    let readCount = 0;
    let mutex = 1; // Internal mutex for readCount
    let actorId = 0;
    let queue = [];
    
    // --- Simulation Logic (Refactored) ---
    async function processQueue() {
        if (queue.length === 0) return;

        while (queue.length > 0 && queue[0].type === 'reader') {
            if (wrt === 1) { 
                const actor = queue.shift();
                ui.renderQueue(queue); // Update UI
                readerLogic(actor);
            } else {
                break; 
            }
        }
        
        if (queue.length > 0 && queue[0].type === 'writer') {
            if (wrt === 1 && readCount === 0) {
                const actor = queue.shift();
                ui.renderQueue(queue); // Update UI
                writerLogic(actor);
            }
        }
    }
    
    async function readerLogic(actor) {
        ui.log(`Reader ${actor.id}: Trying to enter...`, 'log-reader');
        
        await smartWait(() => mutex > 0, ui, `Reader ${actor.id}: Waiting for mutex (to increment rc)`, 'log-reader');
        mutex--;
        
        readCount++;
        if (readCount === 1) {
            ui.log(`Reader ${actor.id}: First reader, locking 'wrt' for writers.`, 'log-reader');
            await smartWait(() => wrt > 0, ui, `Reader ${actor.id}: Waiting for 'wrt'`, 'log-reader');
            wrt--;
        }
        ui.updateSemaphores(wrt, readCount); // Update UI
        
        mutex++;
        
        // --- Critical Section (Reading) ---
        ui.log(`Reader ${actor.id}: ENTERED resource.`, 'log-reader');
        ui.addToResource(actor); // Update UI
        await sleep(2000 + Math.random() * 2000);
        ui.removeFromResource(actor); // Update UI
        ui.log(`Reader ${actor.id}: LEFT resource.`, 'log-reader');
        // --- End Critical Section ---

        await smartWait(() => mutex > 0, ui, `Reader ${actor.id}: Waiting for mutex (to decrement rc)`, 'log-reader');
        mutex--;
        
        readCount--;
        if (readCount === 0) {
            ui.log(`Reader ${actor.id}: Last reader, signaling 'wrt' for writers.`, 'log-reader');
            wrt++;
        }
        ui.updateSemaphores(wrt, readCount); // Update UI
        
        mutex++;
        
        processQueue();
    }

    async function writerLogic(actor) {
        ui.log(`Writer ${actor.id}: Trying to enter...`, 'log-writer');

        await smartWait(() => wrt > 0, ui, `Writer ${actor.id}: Waiting for 'wrt'`, 'log-writer');
        wrt--;
        ui.updateSemaphores(wrt, readCount); // Update UI
        
        // --- Critical Section (Writing) ---
        ui.log(`Writer ${actor.id}: ENTERED resource.`, 'log-writer');
        ui.addToResource(actor); // Update UI
        await sleep(3000 + Math.random() * 2000);
        ui.removeFromResource(actor); // Update UI
        ui.log(`Writer ${actor.id}: LEFT resource.`, 'log-writer');
        // --- End Critical Section ---
        
        wrt++;
        ui.updateSemaphores(wrt, readCount); // Update UI
        
        processQueue();
    }

    // --- Event Listeners (Unchanged) ---
    document.getElementById('rw-add-reader').addEventListener('click', () => {
        actorId++;
        queue.push({ id: actorId, type: 'reader' });
        ui.renderQueue(queue); // Update UI
        processQueue();
    });

    document.getElementById('rw-add-writer').addEventListener('click', () => {
        actorId++;
        queue.push({ id: actorId, type: 'writer' });
        ui.renderQueue(queue); // Update UI
        processQueue();
    });

    // Initial UI setup
    ui.updateSemaphores(wrt, readCount);
}


// ===================================================================
// === 3. DINING PHILOSOPHERS SIMULATION (Refactored) ================
// ===================================================================
function initDiningPhilosophers(ui) {
    const STATE = { THINKING: 0, HUNGRY: 1, EATING: 2 };
    let philosopherStates = [STATE.THINKING, STATE.THINKING, STATE.THINKING, STATE.THINKING, STATE.THINKING];
    let chopstickStates = [0, 0, 0, 0, 0]; // 0 = free, 1 = taken
    
    let isDpRunning = false;
    const solutionToggle = document.getElementById('dp-solution-toggle');

    // --- Logic (Refactored to be async) ---
    async function philosopherLogic(p) {
        // P changes from Thinking to Hungry
        if (philosopherStates[p] === STATE.THINKING) {
            philosopherStates[p] = STATE.HUNGRY;
            ui.log(`P${p}: is now Hungry`, 'log-hungry');
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
                ui.log(`P${p}: picked up C${firstStick}`, 'log-system');
                
                await sleep(500);

                if (chopstickStates[secondStick] === 0) {
                    chopstickStates[secondStick] = 1;
                    ui.log(`P${p}: picked up C${secondStick}`, 'log-system');
                    
                    philosopherStates[p] = STATE.EATING;
                    ui.log(`P${p}: is now EATING`, 'log-eating');
                } else {
                    if (!useSolution) {
                        ui.log(`P${p}: couldn't get C${secondStick}, holding C${firstStick}`, 'log-system');
                    } else {
                        chopstickStates[firstStick] = 0;
                        ui.log(`P${p}: couldn't get C${secondStick}, put down C${firstStick}`, 'log-system');
                    }
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
            ui.log(`P${p}: is now Thinking (put down C${left}, C${right})`, 'log-thinking');
            return;
        }
    }
    
    function checkDeadlock() {
        const allHungry = philosopherStates.every(s => s === STATE.HUNGRY);
        const allSticksTaken = chopstickStates.filter(s => s === 1).length === 5; 
        
        if (allHungry && allSticksTaken) {
            ui.log('SYS: DEADLOCK DETECTED! All philosophers are hungry and hold one chopstick.', 'log-deadlock');
            stopSim();
        }
    }
    
    function stopSim() {
        isDpRunning = false;
        ui.log('Simulation Stopping...', 'log-system');
    }
    
    document.getElementById('dp-start').addEventListener('click', async () => {
        if (isDpRunning) return;
        isDpRunning = true;
        ui.log('Simulation Started', 'log-system');

        philosopherStates.fill(STATE.THINKING);
        chopstickStates.fill(0);
        ui.update(philosopherStates, chopstickStates); // Update UI

        while (isDpRunning) {
            const p = Math.floor(Math.random() * 5); 
            await philosopherLogic(p);
            ui.update(philosopherStates, chopstickStates); // Update UI
            
            await sleep(50);
            checkDeadlock();
            
            await sleep(1000); 
        }
        ui.log('Simulation Stopped', 'log-system');
        isDpRunning = false;
    });
    
    document.getElementById('dp-stop').addEventListener('click', stopSim);
    
    solutionToggle.addEventListener('change', () => {
        ui.log(`Solution ${solutionToggle.checked ? 'ENABLED' : 'DISABLED'}.`, 'log-system');
        stopSim();
        philosopherStates.fill(STATE.THINKING);
        chopstickStates.fill(0);
        ui.update(philosopherStates, chopstickStates); // Update UI
    });

    // Initial UI setup
    ui.update(philosopherStates, chopstickStates);
}


// ===================================================================
// === 4. SLEEPING BARBER SIMULATION (Refactored) ====================
// ===================================================================
function initSleepingBarber(ui) {
    const MAX_CHAIRS = 5;
    let customers = 0; // Customers waiting (waiting room + barber chair)
    let barberReady = 0; // 0 = sleeping, 1 = ready
    let mutex = 1;
    
    let customerQueue = [];
    let customerId = 0;
    let waitingRoom = [];
    let barberState = 'sleeping'; // 'sleeping' or 'working'
    let barberChairCustomer = null;

    function updateFullUI() {
        ui.update(barberState, barberChairCustomer, waitingRoom, customerQueue);
    }
    
    // --- Logic (Refactored) ---
    async function barberLogic() {
        while (true) {
            if (customers === 0) {
                barberState = 'sleeping';
                updateFullUI();
            }
            await smartWait(() => customers > 0, ui, 'Barber: No customers, going to sleep...', 'log-barber');
            
            barberState = 'working';
            updateFullUI();

            await smartWait(() => mutex > 0, ui, 'Barber: Waiting for mutex', 'log-barber');
            mutex--;
            
            customers--;
            
            barberReady = 1;
            mutex++;
            
            // --- Cut Hair ---
            barberChairCustomer = waitingRoom.shift();
            ui.log(`Barber: Cutting hair for C${barberChairCustomer.id}`, 'log-barber');
            updateFullUI();
            
            await sleep(3000 + Math.random() * 2000);
            
            ui.log(`Barber: Finished with C${barberChairCustomer.id}`, 'log-barber');
            barberChairCustomer = null;
            barberReady = 0;
            updateFullUI();
            
            // Move customer from outside queue to waiting room
            if (customerQueue.length > 0) {
                await smartWait(() => mutex > 0, ui, 'Barber: Checking for next customer', 'log-barber');
                mutex--;

                if (waitingRoom.length < MAX_CHAIRS) {
                    const nextCustomer = customerQueue.shift();
                    if (nextCustomer) {
                        waitingRoom.push(nextCustomer);
                        ui.log(`C${nextCustomer.id}: Takes a seat in waiting room.`, 'log-customer');
                    }
                }
                mutex++;
                updateFullUI();
            }
        }
    }
    
    async function customerLogic(customer) {
        ui.log(`C${customer.id}: Arrives at shop.`, 'log-customer');
        customerQueue.push(customer);
        updateFullUI();
        
        // --- START OF MODIFIED CODE ---
        // Force the customer to wait outside so we can see them in the queue
        ui.log(`C${customer.id}: Is waiting outside.`, 'log-customer');
        await sleep(2000); // Wait 2 seconds (will be adjusted by speed slider)
        // --- END OF MODIFIED CODE ---
        
        await smartWait(() => mutex > 0, ui, `C${customer.id}: Checking waiting room...`, 'log-customer');
        mutex--;
        
        if (waitingRoom.length < MAX_CHAIRS) {
            customers++;
            
            const qIdx = customerQueue.findIndex(c => c.id === customer.id);
            if(qIdx > -1) {
                waitingRoom.push(customerQueue.splice(qIdx, 1)[0]);
            }
            
            ui.log(`C${customer.id}: Enters waiting room.`, 'log-customer');
            mutex++;
        } else {
            mutex++;
            ui.log(`C${customer.id}: Waiting room full, leaving!`, 'log-customer');
            const qIdx = customerQueue.findIndex(c => c.id === customer.id);
            if(qIdx > -1) {
                customerQueue.splice(qIdx, 1);
            }
        }
        updateFullUI();
    }
    
    // --- Event Listeners ---
    document.getElementById('sb-add-customer').addEventListener('click', () => {
        customerId++;
        customerLogic({ id: customerId });
    });
    
    // Start the barber
    barberLogic();
    // Initial UI setup
    updateFullUI();
}