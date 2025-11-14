document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global Simulation Controls ---

    const pauseButton = document.getElementById('global-pause-resume');
    const speedSlider = document.getElementById('global-speed-slider');
    const speedLabel = document.getElementById('speed-label');

    if (pauseButton && speedSlider && speedLabel) {
        pauseButton.addEventListener('click', () => {
            // These functions are defined in simulations.js
            togglePauseSimulation(); 
            
            if (simState.isPaused) {
                pauseButton.textContent = 'Resume';
                pauseButton.classList.add('paused');
            } else {
                pauseButton.textContent = 'Pause';
                pauseButton.classList.remove('paused');
            }
        });

        speedSlider.addEventListener('input', (e) => {
            const speed = e.target.value;
            // This function is defined in simulations.js
            setSimulationSpeed(speed); 
            speedLabel.textContent = parseFloat(speed).toFixed(1);
        });
    }

    // --- Page Navigation ---

    const navButtons = document.querySelectorAll('.nav-button');
    const pages = document.querySelectorAll('.simulation-page');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.dataset.page;

            // Update button active state
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show the correct page
            pages.forEach(page => {
                if (page.id === `${pageId}-page`) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });

    // --- Initialize All Simulations (Refactored) ---
    // Now, we create the UI object and pass it to the init function.
    
    if (document.getElementById('producer-consumer-page')) {
        const pcUI = new ProducerConsumerUI();
        initProducerConsumer(pcUI);
    }
    
    if (document.getElementById('reader-writer-page')) {
        const rwUI = new ReaderWriterUI();
        initReaderWriter(rwUI);
    }
    
    if (document.getElementById('dining-philosophers-page')) {
        const dpUI = new DiningPhilosophersUI();
        initDiningPhilosophers(dpUI);
    }

    if (document.getElementById('sleeping-barber-page')) {
        const sbUI = new SleepingBarberUI();
        initSleepingBarber(sbUI);
    }

});