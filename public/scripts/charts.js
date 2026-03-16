// Chart.js initialization for statistics
// This script is loaded after Chart.js is available

(function () {
  'use strict'

  function initCharts() {
    const { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } = window

    if (!Chart) {
      console.warn('Chart.js not loaded')
      return
    }

    // Register Chart.js components
    Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

    // Format Pie Chart
    const formatCanvas = document.getElementById('format-chart')
    if (formatCanvas) {
      const formatData = JSON.parse(formatCanvas.getAttribute('data-chart') || '{}')
      if (formatData && formatData.data && formatData.data.some((count) => count > 0)) {
        new Chart(formatCanvas, {
          type: 'pie',
          data: {
            labels: formatData.labels || [],
            datasets: [
              {
                data: formatData.data || [],
                backgroundColor: formatData.colors || [],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: getComputedStyle(document.documentElement).getPropertyValue('--color-neutral') || '#fff',
                  padding: 15,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
              },
            },
          },
        })
      }
    }

    // Genre Bar Chart
    const genreCanvas = document.getElementById('genre-chart')
    if (genreCanvas) {
      const genreData = JSON.parse(genreCanvas.getAttribute('data-chart') || '{}')
      if (genreData && genreData.labels && genreData.labels.length > 0) {
        new Chart(genreCanvas, {
          type: 'bar',
          data: {
            labels: genreData.labels || [],
            datasets: [
              {
                label: 'Albums',
                data: genreData.data || [],
                backgroundColor: 'rgba(234, 88, 12, 0.6)',
                borderColor: 'rgb(234, 88, 12)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: getComputedStyle(document.documentElement).getPropertyValue('--color-muted') || '#999',
                  stepSize: 1,
                },
                grid: {
                  color: 'rgba(255, 255, 255, 0.05)',
                },
              },
              x: {
                ticks: {
                  color: getComputedStyle(document.documentElement).getPropertyValue('--color-muted') || '#999',
                  maxRotation: 45,
                  minRotation: 45,
                },
                grid: {
                  display: false,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
              },
            },
          },
        })
      }
    }

    // Decades Bar Chart
    const decadesCanvas = document.getElementById('decades-chart')
    if (decadesCanvas) {
      const decadesData = JSON.parse(decadesCanvas.getAttribute('data-chart') || '{}')
      if (decadesData && decadesData.labels && decadesData.labels.length > 0) {
        new Chart(decadesCanvas, {
          type: 'bar',
          data: {
            labels: decadesData.labels || [],
            datasets: [
              {
                label: 'Albums',
                data: decadesData.data || [],
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: getComputedStyle(document.documentElement).getPropertyValue('--color-muted') || '#999',
                  stepSize: 1,
                },
                grid: {
                  color: 'rgba(255, 255, 255, 0.05)',
                },
              },
              x: {
                ticks: {
                  color: getComputedStyle(document.documentElement).getPropertyValue('--color-muted') || '#999',
                },
                grid: {
                  display: false,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
              },
            },
          },
        })
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts)
  } else {
    initCharts()
  }

  // Also initialize when tab becomes visible (for Astro client-side navigation)
  document.addEventListener('astro:page-load', initCharts)
})()
