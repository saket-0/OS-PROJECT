document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation ---
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

    // --- Initialize All Simulations ---
    // We call the `init` function for each simulation from simulations.js
    // This sets up their specific event listeners.
    
    if (document.getElementById('producer-consumer-page')) {
        initProducerConsumer();
    }
    
    if (document.getElementById('reader-writer-page')) {
        initReaderWriter();
    }
    
    if (document.getElementById('dining-philosophers-page')) {
        initDiningPhilosophers();
    }

    if (document.getElementById('sleeping-barber-page')) {
        initSleepingBarber();
    }

});