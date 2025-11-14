// --- Utility UI Function ---
function logMessage(logBox, message, type = 'log-system') {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logEntry.classList.add(type);
    logBox.appendChild(logEntry);
    logBox.scrollTop = logBox.scrollHeight;
}

// ===================================================================
// === 1. PRODUCER-CONSUMER UI =======================================
// ===================================================================
class ProducerConsumerUI {
    constructor() {
        this.bufferSlots = document.querySelectorAll('#pc-buffer .buffer-slot');
        this.logBox = document.getElementById('pc-log');
        this.semEmptyEl = document.getElementById('sem-empty');
        this.semFullEl = document.getElementById('sem-full');
        this.semMutexEl = document.getElementById('sem-mutex');
        this.producerQueueEl = document.getElementById('pc-producer-queue');
        this.consumerQueueEl = document.getElementById('pc-consumer-queue');
        this.producerCountEl = document.getElementById('pc-producer-count');
        this.consumerCountEl = document.getElementById('pc-consumer-count');
    }

    log(message, type) {
        logMessage(this.logBox, message, type);
    }

    updateSemaphores(empty, full, mutex) {
        this.semEmptyEl.textContent = empty;
        this.semFullEl.textContent = full;
        this.semMutexEl.textContent = mutex;
        this.semMutexEl.style.color = mutex === 1 ? 'var(--color-green)' : 'var(--color-red)';
    }

    updateBuffer(buffer) {
        this.bufferSlots.forEach((slot, i) => {
            slot.classList.toggle('filled', buffer[i] !== null);
        });
    }

    addActor(type, id, count) {
        const queueEl = (type === 'producer') ? this.producerQueueEl : this.consumerQueueEl;
        const countEl = (type === 'producer') ? this.producerCountEl : this.consumerCountEl;
        
        const actorEl = document.createElement('div');
        actorEl.classList.add('actor', type);
        actorEl.textContent = `${type === 'producer' ? 'P' : 'C'}${id}`;
        actorEl.id = `${type}-${id}`;
        
        queueEl.appendChild(actorEl);
        countEl.textContent = count;
        return actorEl; // Return the element so the logic can toggle its 'waiting' class
    }

    removeActor(actorEl, type, count) {
        const countEl = (type === 'producer') ? this.producerCountEl : this.consumerCountEl;
        if (actorEl) {
            actorEl.remove();
        }
        countEl.textContent = count;
    }

    setActorWaiting(actorEl, isWaiting) {
        if (actorEl) {
            actorEl.classList.toggle('waiting', isWaiting);
        }
    }
}

// ===================================================================
// === 2. READER-WRITER UI ===========================================
// ===================================================================
class ReaderWriterUI {
    constructor() {
        this.logBox = document.getElementById('rw-log');
        this.queueEl = document.getElementById('rw-queue');
        this.resourceEl = document.getElementById('rw-resource');
        this.semWrtEl = document.getElementById('rw-sem-wrt');
        this.semRcEl = document.getElementById('rw-sem-rc');
    }

    log(message, type) {
        logMessage(this.logBox, message, type);
    }

    updateSemaphores(wrt, readCount) {
        this.semWrtEl.textContent = wrt;
        this.semRcEl.textContent = readCount;
        this.semWrtEl.style.color = wrt === 1 ? 'var(--color-green)' : 'var(--color-red)';
    }

    renderQueue(queue) {
        this.queueEl.innerHTML = '';
        queue.forEach(actor => {
            const actorEl = document.createElement('div');
            actorEl.classList.add('actor', actor.type);
            actorEl.textContent = `${actor.type === 'reader' ? 'Reader' : 'Writer'} ${actor.id}`;
            this.queueEl.appendChild(actorEl);
        });
    }

    addToResource(actor) {
        const actorEl = document.createElement('div');
        actorEl.classList.add('actor-in-resource', actor.type);
        actorEl.textContent = `${actor.type === 'reader' ? 'Reader' : 'Writer'} ${actor.id} (Inside)`;
        actorEl.id = `actor-${actor.id}`;
        
        const emptyEl = this.resourceEl.querySelector('span');
        if (emptyEl) emptyEl.remove();

        this.resourceEl.appendChild(actorEl);
    }

    removeFromResource(actor) {
        const actorEl = document.getElementById(`actor-${actor.id}`);
        if (actorEl) actorEl.remove();

        if (this.resourceEl.children.length === 0) {
            this.resourceEl.innerHTML = '<span>EMPTY</span>';
        }
    }
}

// ===================================================================
// === 3. DINING PHILOSOPHERS UI =====================================
// ===================================================================
class DiningPhilosophersUI {
    constructor() {
        this.logBox = document.getElementById('dp-log');
        this.philosophers = document.querySelectorAll('.philosopher');
        this.chopsticks = document.querySelectorAll('.chopstick');
    }

    log(message, type) {
        logMessage(this.logBox, message, type);
    }

    update(philosopherStates, chopstickStates) {
        const STATE = { THINKING: 0, HUNGRY: 1, EATING: 2 };
        this.philosophers.forEach((p, i) => {
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
        this.chopsticks.forEach((c, i) => {
            c.classList.toggle('taken', chopstickStates[i] === 1);
        });
    }
}

// ===================================================================
// === 4. SLEEPING BARBER UI =========================================
// ===================================================================
class SleepingBarberUI {
    constructor() {
        this.logBox = document.getElementById('sb-log');
        this.barberEl = document.getElementById('sb-barber');
        this.barberChairEl = document.getElementById('sb-barber-chair');
        this.waitingChairs = document.querySelectorAll('#sb-waiting-room .chair');
        this.queueEl = document.getElementById('sb-queue');
    }

    log(message, type) {
        logMessage(this.logBox, message, type);
    }

    update(barberState, barberChairCustomer, waitingRoom, customerQueue) {
        // Update Barber
        if (barberState === 'sleeping') {
            this.barberEl.textContent = 'Zzz...';
            this.barberEl.classList.add('sleeping');
            this.barberEl.classList.remove('working');
        } else {
            this.barberEl.textContent = 'Working';
            this.barberEl.classList.remove('sleeping');
            this.barberEl.classList.add('working');
        }
        
        // Update Barber Chair
        if (barberChairCustomer) {
            this.barberChairEl.textContent = `C${barberChairCustomer.id}`;
            this.barberChairEl.classList.add('filled');
        } else {
            this.barberChairEl.textContent = 'Empty';
            this.barberChairEl.classList.remove('filled');
        }
        
        // Update Waiting Room
        this.waitingChairs.forEach((chair, i) => {
            const customer = waitingRoom[i];
            chair.classList.toggle('filled', !!customer);
            chair.textContent = customer ? `C${customer.id}` : '';
        });
        
        // Update Outside Queue
        this.queueEl.innerHTML = '';
        customerQueue.forEach(cust => {
            const el = document.createElement('div');
            el.classList.add('customer');
            el.textContent = `Customer ${cust.id}`;
            this.queueEl.appendChild(el);
        });
    }
}