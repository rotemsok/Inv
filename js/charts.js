// MoneyTalks Ultimate - Chart Visualizations

const ChartManager = {
    charts: {},

    /**
     * Create or update revenue chart
     */
    createRevenueChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const years = data.map(d => d.date.substring(0, 4));
        const revenues = data.map(d => d.revenue / 1e9);
        const netIncomes = data.map(d => d.netIncome / 1e9);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years.reverse(),
                datasets: [
                    {
                        label: 'Revenue ($B)',
                        data: revenues.reverse(),
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'Net Income ($B)',
                        data: netIncomes.reverse(),
                        backgroundColor: 'rgba(39, 174, 96, 0.7)',
                        borderColor: 'rgba(39, 174, 96, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Billions ($)'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create margin trends chart
     */
    createMarginChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const years = data.map(d => d.date.substring(0, 4));
        const grossMargins = data.map(d => d.grossProfitRatio);
        const opMargins = data.map(d => d.operatingIncomeRatio);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years.reverse(),
                datasets: [
                    {
                        label: 'Gross Margin %',
                        data: grossMargins.reverse(),
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Operating Margin %',
                        data: opMargins.reverse(),
                        borderColor: 'rgba(39, 174, 96, 1)',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Margin %'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create ROIC trend chart
     */
    createROICChart(canvasId, roicData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const years = roicData.map(d => d.year);
        const roicValues = roicData.map(d => d.roic);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'ROIC %',
                    data: roicValues,
                    backgroundColor: roicValues.map(v => {
                        if (v > 25) return 'rgba(39, 174, 96, 0.8)';
                        if (v > 15) return 'rgba(52, 152, 219, 0.8)';
                        return 'rgba(243, 156, 18, 0.8)';
                    }),
                    borderColor: roicValues.map(v => {
                        if (v > 25) return 'rgba(39, 174, 96, 1)';
                        if (v > 15) return 'rgba(52, 152, 219, 1)';
                        return 'rgba(243, 156, 18, 1)';
                    }),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'ROIC %'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create competitor comparison chart
     */
    createCompetitorChart(canvasId, competitors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const symbols = competitors.map(c => c.symbol);
        const roics = competitors.map(c => c.roic);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: symbols,
                datasets: [{
                    label: 'ROIC %',
                    data: roics,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'ROIC %'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create valuation vs quality scatter plot
     */
    createValuationMatrix(canvasId, competitors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const data = competitors.map(c => ({
            x: c.roic,
            y: c.pe,
            label: c.symbol
        }));

        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Companies',
                    data: data,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    pointRadius: 8,
                    pointHoverRadius: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.label}: ROIC ${point.x.toFixed(1)}%, P/E ${point.y.toFixed(1)}x`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'ROIC % (Quality)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'P/E Ratio (Valuation)'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create portfolio allocation pie chart
     */
    createPortfolioChart(canvasId, holdings) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = holdings.map(h => h.symbol);
        const values = holdings.map(h => h.value);
        const colors = [
            'rgba(52, 152, 219, 0.8)',
            'rgba(39, 174, 96, 0.8)',
            'rgba(243, 156, 18, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(26, 188, 156, 0.8)'
        ];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: $${FinancialCalculations.formatNumber(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}
