// js/chart.js

function initComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    // Define text/grid colors for dark mode
    const textColor = '#9AA5B8';
    const gridColor = 'rgba(154, 165, 184, 0.1)';
    const legendColor = '#F0F4F8';

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // e.g., ['FCFS', 'SJF', 'RR']
            datasets: [
                {
                    label: 'Average Waiting Time',
                    data: [],
                    backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Average Turnaround Time',
                    data: [],
                    backgroundColor: 'rgba(245, 158, 11, 0.6)', // Amber
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor, // Dark mode text color
                    },
                    grid: {
                        color: gridColor, // Dark mode grid color
                    }
                },
                x: {
                    ticks: {
                        color: textColor, // Dark mode text color
                    },
                    grid: {
                        color: gridColor, // Dark mode grid color
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: legendColor // Dark mode legend color
                    }
                }
            }
        }
    });
}

function updateComparisonChart(chart, allAlgorithmResults) {
    if (!chart) return;

    const labels = Object.keys(allAlgorithmResults);
    const avgWaitData = labels.map(label => allAlgorithmResults[label].avgWait);
    const avgTurnaroundData = labels.map(label => allAlgorithmResults[label].avgTurnaround);

    chart.data.labels = labels;
    chart.data.datasets[0].data = avgWaitData;
    chart.data.datasets[1].data = avgTurnaroundData;
    chart.update();
}

function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
    return null;
}