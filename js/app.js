// MoneyTalks Ultimate - Main Application

const App = {
    currentStock: null,
    watchlist: [],
    portfolio: [],

    /**
     * Initialize the application
     */
    init() {
        console.log('MoneyTalks Ultimate initialized');
        this.loadWatchlist();
        this.loadPortfolio();
        this.setupEventListeners();
        this.loadHotStocks();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('stockSearch');

        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Live search suggestions
        searchInput.addEventListener('input', (e) => {
            this.handleSearchSuggestions(e.target.value);
        });

        // Tab navigation
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Financial statement selector
        const finBtns = document.querySelectorAll('.fin-btn');
        finBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchFinancialStatement(e.target.dataset.statement);
            });
        });

        // DCF slider updates
        this.setupDCFSliders();

        // Add to watchlist
        const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
        if (addToWatchlistBtn) {
            addToWatchlistBtn.addEventListener('click', () => this.addToWatchlist());
        }
    },

    /**
     * Handle stock search
     */
    async handleSearch() {
        const searchInput = document.getElementById('stockSearch');
        const symbol = searchInput.value.trim().toUpperCase();

        if (!symbol) {
            this.showError('Please enter a stock symbol');
            return;
        }

        this.showLoading(true);
        await this.loadStock(symbol);
        this.showLoading(false);
    },

    /**
     * Handle search suggestions
     */
    async handleSearchSuggestions(query) {
        if (query.length < 1) {
            document.getElementById('searchSuggestions').style.display = 'none';
            return;
        }

        const results = await APIService.searchStocks(query);
        this.displaySearchSuggestions(results);
    },

    /**
     * Display search suggestions
     */
    displaySearchSuggestions(results) {
        const suggestionsDiv = document.getElementById('searchSuggestions');

        if (results.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = results.map(r => `
            <div class="suggestion-item" onclick="App.selectSuggestion('${r.symbol}')">
                <strong>${r.symbol}</strong> - ${r.name} (${r.exchangeShortName})
            </div>
        `).join('');

        suggestionsDiv.style.display = 'block';
    },

    /**
     * Select a suggestion
     */
    selectSuggestion(symbol) {
        document.getElementById('stockSearch').value = symbol;
        document.getElementById('searchSuggestions').style.display = 'none';
        this.handleSearch();
    },

    /**
     * Load stock data
     */
    async loadStock(symbol) {
        try {
            // Fetch all data in parallel
            const [quote, incomeStmt, balanceSheet, cashFlow, profile] = await Promise.all([
                APIService.fetchStockQuote(symbol),
                APIService.fetchIncomeStatement(symbol),
                APIService.fetchBalanceSheet(symbol),
                APIService.fetchCashFlow(symbol),
                APIService.fetchCompanyProfile(symbol)
            ]);

            this.currentStock = {
                symbol,
                quote,
                incomeStmt,
                balanceSheet,
                cashFlow,
                profile
            };

            // Calculate metrics
            this.calculateMetrics();

            // Display all sections
            this.displayStockHeader();
            this.displayOverview();
            this.displayFinancials();
            this.displayROIC();
            this.displayDCF();
            this.displayCompetitors();
            this.displayMoat();
            this.displayRedFlags();
            this.displayMedia();

            // Show UI elements
            document.getElementById('stockHeader').classList.remove('hidden');
            document.getElementById('tabNav').classList.remove('hidden');
            document.getElementById('tabContent').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading stock:', error);
            this.showError('Failed to load stock data. Please try again.');
        }
    },

    /**
     * Calculate all financial metrics
     */
    calculateMetrics() {
        const { incomeStmt, balanceSheet, cashFlow, quote } = this.currentStock;

        if (!incomeStmt || incomeStmt.length === 0) return;

        const latest = incomeStmt[0];
        const latestBS = balanceSheet[0];
        const latestCF = cashFlow[0];

        // Calculate ROIC for each year
        this.currentStock.roicData = incomeStmt.map((stmt, i) => {
            const bs = balanceSheet[i];
            const roic = FinancialCalculations.calculateROIC(
                stmt.operatingIncome,
                21, // Assuming 21% tax rate
                bs.totalEquity,
                bs.totalDebt,
                bs.cashAndEquivalents
            );
            return {
                year: stmt.date.substring(0, 4),
                roic: roic
            };
        });

        // Average ROIC
        const avgROIC = this.currentStock.roicData.reduce((sum, d) => sum + d.roic, 0) / this.currentStock.roicData.length;

        // Revenue growth
        const revenueGrowth = incomeStmt.length > 1 ?
            FinancialCalculations.calculateGrowthRate(incomeStmt[1].revenue, incomeStmt[0].revenue) : 0;

        // Inventory growth
        const inventoryGrowth = balanceSheet.length > 1 ?
            FinancialCalculations.calculateGrowthRate(balanceSheet[1].inventory, balanceSheet[0].inventory) : 0;

        // Margin change
        const marginChange = incomeStmt.length > 1 ?
            incomeStmt[0].operatingIncomeRatio - incomeStmt[1].operatingIncomeRatio : 0;

        // DCF Valuation
        const dcfResult = FinancialCalculations.calculateDCF({
            currentRevenue: latest.revenue,
            revenueGrowth: Math.min(revenueGrowth, 15), // Conservative
            operatingMargin: latest.operatingIncomeRatio,
            taxRate: 21,
            capexPercent: (Math.abs(latestCF.capex) / latest.revenue) * 100,
            terminalGrowth: 2.5,
            discountRate: 10,
            sharesOutstanding: latestBS.totalEquity / (quote.price / quote.pe),
            cash: latestBS.cashAndEquivalents,
            debt: latestBS.totalDebt
        });

        // Margin of Safety
        const mos = FinancialCalculations.calculateMOS(dcfResult.intrinsicValue, quote.price);

        // Red Flags
        const redFlags = FinancialCalculations.detectRedFlags({
            inventoryGrowth,
            revenueGrowth,
            sbc: latestCF.stockBasedCompensation,
            revenue: latest.revenue,
            marginChange
        });

        // MoneyTalks Score
        const score = FinancialCalculations.calculateMoneyTalksScore({
            currentRatio: latestBS.currentRatio,
            debtToEquity: latestBS.totalDebt / latestBS.totalEquity,
            interestCoverage: 10, // Simplified
            operatingMargin: latest.operatingIncomeRatio,
            roic: avgROIC,
            mos,
            redFlags,
            moatStrength: 'Moderate', // Would be analyzed separately
            managementQuality: 'A' // Would be analyzed separately
        });

        // Store calculated metrics
        this.currentStock.metrics = {
            avgROIC,
            revenueGrowth,
            inventoryGrowth,
            marginChange,
            dcfResult,
            mos,
            redFlags,
            score,
            debtToEquity: latestBS.totalDebt / latestBS.totalEquity,
            currentRatio: latestBS.currentRatio,
            fcf: latestCF.freeCashFlow
        };
    },

    /**
     * Display stock header
     */
    displayStockHeader() {
        const { quote, metrics } = this.currentStock;

        document.getElementById('stockName').textContent = `${quote.symbol} - ${quote.name}`;
        document.getElementById('stockPrice').textContent = `$${quote.price.toFixed(2)}`;

        const changeEl = document.getElementById('priceChange');
        const changePctEl = document.getElementById('priceChangePercent');

        changeEl.textContent = `$${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}`;
        changePctEl.textContent = `(${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`;

        changeEl.className = quote.change >= 0 ? 'change positive' : 'change negative';
        changePctEl.className = quote.changePercent >= 0 ? 'change-percent positive' : 'change-percent negative';

        document.getElementById('volume').textContent = `Vol: ${FinancialCalculations.formatNumber(quote.volume)}`;
        document.getElementById('marketCap').textContent = `MCap: $${FinancialCalculations.formatNumber(quote.marketCap)}`;
        document.getElementById('marketStatus').textContent = 'Market: Open';

        document.getElementById('dayRange').textContent = `Day: $${quote.dayLow.toFixed(2)} - $${quote.dayHigh.toFixed(2)}`;
        document.getElementById('yearRange').textContent = `52W: $${quote.yearLow.toFixed(2)} - $${quote.yearHigh.toFixed(2)}`;

        // Display MoneyTalks Score
        document.getElementById('totalScore').textContent = metrics.score.totalScore;
        document.getElementById('scoreVerdict').textContent = metrics.score.verdict;

        let verdictClass = 'text-success';
        if (metrics.score.totalScore < 40) verdictClass = 'text-danger';
        else if (metrics.score.totalScore < 60) verdictClass = 'text-warning';

        document.getElementById('scoreVerdict').className = `score-verdict ${verdictClass}`;

        // Score breakdown
        const breakdown = metrics.score.breakdown;
        document.getElementById('scoreBreakdown').innerHTML = `
            <div><span>Financial Health:</span> <span>${breakdown.financialHealth}/25</span></div>
            <div><span>ROIC Quality:</span> <span>${breakdown.roicQuality}/25</span></div>
            <div><span>Margin of Safety:</span> <span>${breakdown.marginOfSafety}/30</span></div>
            <div><span>Qualitative:</span> <span>${breakdown.qualitative}/20</span></div>
            ${breakdown.redFlagPenalty < 0 ? `<div><span>Red Flag Penalty:</span> <span>${breakdown.redFlagPenalty}</span></div>` : ''}
        `;
    },

    /**
     * Display overview tab
     */
    displayOverview() {
        const { quote, metrics, incomeStmt } = this.currentStock;

        document.getElementById('peRatio').textContent = quote.pe.toFixed(1) + 'x';
        document.getElementById('roicValue').textContent = FinancialCalculations.formatPercent(metrics.avgROIC);
        document.getElementById('mosValue').textContent = FinancialCalculations.formatPercent(metrics.mos);
        document.getElementById('opMargin').textContent = FinancialCalculations.formatPercent(incomeStmt[0].operatingIncomeRatio);
        document.getElementById('debtEquity').textContent = metrics.debtToEquity.toFixed(2);
        document.getElementById('fcf').textContent = '$' + FinancialCalculations.formatNumber(metrics.fcf);

        // Color code MOS
        const mosEl = document.getElementById('mosValue');
        if (metrics.mos >= 30) mosEl.className = 'metric-value text-success';
        else if (metrics.mos >= 15) mosEl.className = 'metric-value text-warning';
        else mosEl.className = 'metric-value text-danger';

        // Create revenue chart
        ChartManager.createRevenueChart('revenueChart', incomeStmt);

        // Investment verdict
        let verdict = '';
        if (metrics.score.totalScore >= 80 && metrics.mos >= 30) {
            verdict = `<p class="text-success"><strong>STRONG BUY</strong>: Excellent quality business with significant margin of safety.</p>`;
        } else if (metrics.score.totalScore >= 60 && metrics.mos >= 15) {
            verdict = `<p class="text-success"><strong>BUY</strong>: Good business at reasonable price. Consider adding to portfolio.</p>`;
        } else if (metrics.score.totalScore >= 40 || metrics.mos >= 0) {
            verdict = `<p class="text-warning"><strong>HOLD</strong>: Fair value. Wait for better entry point.</p>`;
        } else {
            verdict = `<p class="text-danger"><strong>SELL/AVOID</strong>: Overvalued or quality concerns. Look for better opportunities.</p>`;
        }

        verdict += `<p><strong>Rationale:</strong> ${this.getInvestmentRationale()}</p>`;

        document.getElementById('verdictContent').innerHTML = verdict;
    },

    /**
     * Get investment rationale
     */
    getInvestmentRationale() {
        const { metrics } = this.currentStock;
        const parts = [];

        if (metrics.avgROIC > 20) {
            parts.push('High ROIC indicates strong competitive advantage');
        } else if (metrics.avgROIC > 15) {
            parts.push('Solid capital efficiency');
        }

        if (metrics.mos >= 30) {
            parts.push('significant margin of safety protects downside');
        } else if (metrics.mos < 0) {
            parts.push('currently overvalued based on DCF');
        }

        if (metrics.debtToEquity < 0.3) {
            parts.push('minimal debt provides financial flexibility');
        }

        const failedFlags = metrics.redFlags.filter(f => f.status === 'fail');
        if (failedFlags.length > 0) {
            parts.push(`${failedFlags.length} red flag(s) detected requiring investigation`);
        }

        return parts.join('; ') + '.';
    },

    /**
     * Display financials tab
     */
    displayFinancials() {
        // Default to income statement
        this.switchFinancialStatement('income');
    },

    /**
     * Switch financial statement
     */
    switchFinancialStatement(type) {
        const { incomeStmt, balanceSheet, cashFlow } = this.currentStock;

        // Update active button
        document.querySelectorAll('.fin-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.statement === type) {
                btn.classList.add('active');
            }
        });

        let tableHTML = '';

        if (type === 'income') {
            tableHTML = this.createIncomeStatementTable(incomeStmt);
            ChartManager.createMarginChart('marginChart', incomeStmt);
        } else if (type === 'balance') {
            tableHTML = this.createBalanceSheetTable(balanceSheet);
        } else if (type === 'cashflow') {
            tableHTML = this.createCashFlowTable(cashFlow);
        }

        document.getElementById('financialTables').innerHTML = tableHTML;
    },

    /**
     * Create income statement table
     */
    createIncomeStatementTable(data) {
        const years = data.map(d => d.date.substring(0, 4));

        return `
            <table>
                <thead>
                    <tr>
                        <th>Income Statement (Annual)</th>
                        ${years.map(y => `<th>${y}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Revenue</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.revenue)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Gross Profit</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.grossProfit)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Gross Margin %</td>
                        ${data.map(d => `<td>${d.grossProfitRatio.toFixed(1)}%</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Operating Income</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.operatingIncome)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Operating Margin %</td>
                        ${data.map(d => `<td>${d.operatingIncomeRatio.toFixed(1)}%</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Net Income</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.netIncome)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>EPS</td>
                        ${data.map(d => `<td>$${d.eps.toFixed(2)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    },

    /**
     * Create balance sheet table
     */
    createBalanceSheetTable(data) {
        const years = data.map(d => d.date.substring(0, 4));

        return `
            <table>
                <thead>
                    <tr>
                        <th>Balance Sheet (Annual)</th>
                        ${years.map(y => `<th>${y}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Cash & Equivalents</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.cashAndEquivalents)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Inventory</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.inventory)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Current Assets</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.currentAssets)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Total Assets</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.totalAssets)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Current Liabilities</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.currentLiabilities)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Debt</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.totalDebt)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Equity</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.totalEquity)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Current Ratio</td>
                        ${data.map(d => `<td>${d.currentRatio.toFixed(2)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    },

    /**
     * Create cash flow table
     */
    createCashFlowTable(data) {
        const years = data.map(d => d.date.substring(0, 4));

        return `
            <table>
                <thead>
                    <tr>
                        <th>Cash Flow (Annual)</th>
                        ${years.map(y => `<th>${y}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Operating Cash Flow</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.operatingCashFlow)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>CapEx</td>
                        ${data.map(d => `<td>($${FinancialCalculations.formatNumber(Math.abs(d.capex))})</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Stock-Based Compensation</td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.stockBasedCompensation)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Free Cash Flow</strong></td>
                        ${data.map(d => `<td>$${FinancialCalculations.formatNumber(d.freeCashFlow)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    },

    /**
     * Display ROIC analysis
     */
    displayROIC() {
        const { roicData, metrics } = this.currentStock;

        const avgROIC = metrics.avgROIC;
        let interpretation = '';

        if (avgROIC > 25) {
            interpretation = `<p class="text-success">⭐ <strong>EXCEPTIONAL</strong>: Company generates $${avgROIC.toFixed(0)} for every $100 of capital invested. This far exceeds typical cost of capital (9-10%) and indicates a very strong competitive moat. Few companies sustain this level consistently.</p>`;
        } else if (avgROIC > 20) {
            interpretation = `<p class="text-success"><strong>EXCELLENT</strong>: Returns of ${avgROIC.toFixed(1)}% demonstrate efficient capital allocation and competitive advantages. This is a hallmark of quality businesses.</p>`;
        } else if (avgROIC > 15) {
            interpretation = `<p class="text-success"><strong>GOOD</strong>: ROIC of ${avgROIC.toFixed(1)}% exceeds cost of capital, indicating value creation. Solid foundation for long-term compounding.</p>`;
        } else if (avgROIC > 10) {
            interpretation = `<p class="text-warning"><strong>ACCEPTABLE</strong>: ROIC barely above cost of capital. Business creates modest value but lacks strong moat.</p>`;
        } else {
            interpretation = `<p class="text-danger"><strong>POOR</strong>: ROIC below 10% suggests value destruction. Capital would be better deployed elsewhere.</p>`;
        }

        interpretation += `<p><strong>Consistency:</strong> ${this.getROICConsistency(roicData)}</p>`;

        document.getElementById('roicInterpretation').innerHTML = interpretation;

        // Display trend data
        const trendHTML = roicData.map(d => `
            <div style="padding: 10px; margin: 5px 0; background: #ecf0f1; border-radius: 5px;">
                <strong>${d.year}:</strong> ${d.roic.toFixed(1)}%
            </div>
        `).join('');

        document.getElementById('roicTrend').innerHTML = `<h4>5-Year ROIC Trend</h4>${trendHTML}
            <div style="margin-top: 15px; padding: 15px; background: #d4edda; border-radius: 5px; border-left: 4px solid #27ae60;">
                <strong>Average:</strong> ${avgROIC.toFixed(1)}%
            </div>`;

        // Create chart
        ChartManager.createROICChart('roicChart', roicData);
    },

    /**
     * Get ROIC consistency rating
     */
    getROICConsistency(roicData) {
        const values = roicData.map(d => d.roic);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / avg) * 100; // Coefficient of variation

        if (cv < 15) return 'Very consistent (excellent)';
        if (cv < 25) return 'Moderately consistent (good)';
        return 'Inconsistent (concerning)';
    },

    /**
     * Display DCF valuation
     */
    displayDCF() {
        this.updateDCF();
    },

    /**
     * Setup DCF sliders
     */
    setupDCFSliders() {
        const sliders = [
            'revenueGrowth', 'terminalGrowth', 'operatingMargin',
            'discountRate', 'taxRate', 'capexPercent'
        ];

        sliders.forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    document.getElementById(`${id}Value`).textContent = e.target.value + '%';
                    this.updateDCF();
                });
            }
        });
    },

    /**
     * Update DCF calculation
     */
    updateDCF() {
        if (!this.currentStock) return;

        const { incomeStmt, balanceSheet, cashFlow, quote } = this.currentStock;
        const latest = incomeStmt[0];
        const latestBS = balanceSheet[0];
        const latestCF = cashFlow[0];

        // Get slider values
        const revenueGrowth = parseFloat(document.getElementById('revenueGrowth').value);
        const terminalGrowth = parseFloat(document.getElementById('terminalGrowth').value);
        const operatingMargin = parseFloat(document.getElementById('operatingMargin').value);
        const discountRate = parseFloat(document.getElementById('discountRate').value);
        const taxRate = parseFloat(document.getElementById('taxRate').value);
        const capexPercent = parseFloat(document.getElementById('capexPercent').value);

        // Calculate DCF
        const sharesOutstanding = latestBS.totalEquity / (quote.price / (quote.pe || 20));
        const dcfResult = FinancialCalculations.calculateDCF({
            currentRevenue: latest.revenue,
            revenueGrowth,
            operatingMargin,
            taxRate,
            capexPercent,
            terminalGrowth,
            discountRate,
            sharesOutstanding,
            cash: latestBS.cashAndEquivalents,
            debt: latestBS.totalDebt
        });

        const mos = FinancialCalculations.calculateMOS(dcfResult.intrinsicValue, quote.price);
        const buyPrice = dcfResult.intrinsicValue * 0.7; // 30% discount
        const strongBuyPrice = dcfResult.intrinsicValue * 0.5; // 50% discount

        let mosClass = 'text-danger';
        let mosWarning = '⚠️ OVERVALUED';
        if (mos >= 30) {
            mosClass = 'text-success';
            mosWarning = '✓ BUY ZONE';
        } else if (mos >= 15) {
            mosClass = 'text-warning';
            mosWarning = '⚠️ FAIR VALUE';
        }

        const resultHTML = `
            <div style="padding: 20px; background: #ecf0f1; border-radius: 10px;">
                <div style="margin-bottom: 10px;"><strong>Enterprise Value:</strong> $${FinancialCalculations.formatNumber(dcfResult.enterpriseValue)}</div>
                <div style="margin-bottom: 10px;"><strong>Plus Cash:</strong> $${FinancialCalculations.formatNumber(latestBS.cashAndEquivalents)}</div>
                <div style="margin-bottom: 10px;"><strong>Less Debt:</strong> $${FinancialCalculations.formatNumber(latestBS.totalDebt)}</div>
                <div style="margin-bottom: 10px;"><strong>Equity Value:</strong> $${FinancialCalculations.formatNumber(dcfResult.equityValue)}</div>
                <div style="margin-bottom: 10px;"><strong>Shares Outstanding:</strong> ${FinancialCalculations.formatNumber(sharesOutstanding)}</div>
                <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 5px solid #3498db;">
                    <strong style="font-size: 1.1rem;">Intrinsic Value per Share:</strong>
                    <span style="font-size: 1.5rem; color: #2c3e50; font-weight: bold;">$${dcfResult.intrinsicValue.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 10px;"><strong>Current Price:</strong> $${quote.price.toFixed(2)}</div>
                <div style="margin: 15px 0; padding: 15px; background: ${mos >= 0 ? '#d4edda' : '#f8d7da'}; border-radius: 8px; border-left: 5px solid ${mos >= 0 ? '#27ae60' : '#e74c3c'};">
                    <strong>Margin of Safety:</strong> <span class="${mosClass}" style="font-size: 1.3rem; font-weight: bold;">${mos.toFixed(1)}% ${mosWarning}</span>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 5px solid #f39c12;">
                    <div><strong>Buy Price (30% MOS):</strong> $${buyPrice.toFixed(2)}</div>
                    <div><strong>Strong Buy Price (50% MOS):</strong> $${strongBuyPrice.toFixed(2)}</div>
                </div>
            </div>
        `;

        document.getElementById('dcfCalculation').innerHTML = resultHTML;

        // Sensitivity analysis
        this.displaySensitivityAnalysis({
            currentRevenue: latest.revenue,
            operatingMargin,
            taxRate,
            capexPercent,
            terminalGrowth,
            sharesOutstanding,
            cash: latestBS.cashAndEquivalents,
            debt: latestBS.totalDebt
        }, quote.price);
    },

    /**
     * Display sensitivity analysis
     */
    displaySensitivityAnalysis(baseParams, currentPrice) {
        const discountRates = [8, 9, 10, 11, 12];
        const growthRates = [6, 8, 10, 12, 14];

        let tableHTML = `
            <table style="width: 100%; text-align: center;">
                <thead>
                    <tr>
                        <th>Growth ↓ / Discount →</th>
                        ${discountRates.map(d => `<th>${d}%</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        growthRates.forEach(growth => {
            tableHTML += `<tr><td><strong>${growth}%</strong></td>`;
            discountRates.forEach(discount => {
                const params = { ...baseParams, revenueGrowth: growth, discountRate: discount };
                const result = FinancialCalculations.calculateDCF(params);
                const value = result.intrinsicValue;

                let cellColor = '#ecf0f1';
                if (value > currentPrice * 1.3) cellColor = '#d4edda'; // Green (good value)
                else if (value > currentPrice) cellColor = '#fff3cd'; // Yellow (fair)
                else cellColor = '#f8d7da'; // Red (overvalued)

                tableHTML += `<td style="background: ${cellColor}; padding: 10px;">$${value.toFixed(0)}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += `</tbody></table>`;

        document.getElementById('sensitivityTable').innerHTML = tableHTML;
    },

    /**
     * Display competitors
     */
    async displayCompetitors() {
        const competitors = APIService.getCompetitors(this.currentStock.symbol);

        if (competitors.length === 0) {
            document.getElementById('competitorTable').innerHTML = '<p>No competitor data available</p>';
            return;
        }

        // Fetch competitor data
        const competitorData = await Promise.all(
            competitors.map(async symbol => {
                const quote = await APIService.fetchStockQuote(symbol);
                return {
                    symbol,
                    price: quote.price,
                    pe: quote.pe,
                    marketCap: quote.marketCap,
                    roic: 15 + Math.random() * 15, // Mock ROIC for demo
                };
            })
        );

        // Add current stock to comparison
        competitorData.unshift({
            symbol: this.currentStock.symbol,
            price: this.currentStock.quote.price,
            pe: this.currentStock.quote.pe,
            marketCap: this.currentStock.quote.marketCap,
            roic: this.currentStock.metrics.avgROIC
        });

        // Create comparison table
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>P/E</th>
                        <th>Market Cap</th>
                        <th>ROIC</th>
                    </tr>
                </thead>
                <tbody>
                    ${competitorData.map(c => `
                        <tr style="${c.symbol === this.currentStock.symbol ? 'background: #d4edda; font-weight: bold;' : ''}">
                            <td>${c.symbol}</td>
                            <td>$${c.price.toFixed(2)}</td>
                            <td>${c.pe.toFixed(1)}x</td>
                            <td>$${FinancialCalculations.formatNumber(c.marketCap)}</td>
                            <td>${c.roic.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('competitorTable').innerHTML = tableHTML;

        // Create charts
        ChartManager.createCompetitorChart('competitorChart', competitorData);
        ChartManager.createValuationMatrix('valuationMatrix', competitorData);
    },

    /**
     * Display moat analysis
     */
    displayMoat() {
        // This would be more sophisticated in production
        const moatAnalysis = {
            networkEffect: 'Moderate - Limited network effects in consumer GPS market',
            switchingCosts: 'Moderate - Users invested in ecosystem but can switch',
            costAdvantage: 'Moderate - Scale advantages in manufacturing',
            brandPower: 'Strong - Well-established brand in fitness/outdoor segments',
            efficientScale: 'Weak - Market large enough for multiple competitors'
        };

        document.getElementById('networkEffect').textContent = moatAnalysis.networkEffect;
        document.getElementById('switchingCosts').textContent = moatAnalysis.switchingCosts;
        document.getElementById('costAdvantage').textContent = moatAnalysis.costAdvantage;
        document.getElementById('brandPower').textContent = moatAnalysis.brandPower;
        document.getElementById('efficientScale').textContent = moatAnalysis.efficientScale;

        document.getElementById('moatScore').innerHTML = `
            <div style="padding: 20px; background: #fff3cd; border-radius: 10px; text-align: center;">
                <h3 style="color: #f39c12; margin-bottom: 10px;">MODERATE MOAT</h3>
                <p>Company has defensible competitive position but not impregnable. Monitor for erosion.</p>
            </div>
        `;
    },

    /**
     * Display red flags
     */
    displayRedFlags() {
        const { redFlags } = this.currentStock.metrics;

        const flagsHTML = redFlags.map(flag => {
            const statusClass = flag.status === 'pass' ? 'pass' : flag.status === 'fail' ? 'fail' : 'warning';
            const icon = flag.status === 'pass' ? '✓' : flag.status === 'fail' ? '✗' : '⚠️';

            return `
                <div class="red-flag-item ${statusClass}">
                    <h4>${icon} ${flag.type}</h4>
                    <p>${flag.message}</p>
                </div>
            `;
        }).join('');

        const passedCount = redFlags.filter(f => f.status === 'pass').length;
        const totalCount = redFlags.length;

        const summaryHTML = `
            <div style="padding: 20px; background: ${passedCount === totalCount ? '#d4edda' : '#fff3cd'};
                        border-radius: 10px; margin-bottom: 20px; text-align: center;">
                <h3>Overall: ${passedCount === totalCount ? '✓ HEALTHY' : '⚠️ CAUTION'}
                    (${passedCount}/${totalCount} checks passed)</h3>
            </div>
        `;

        document.getElementById('redFlagReport').innerHTML = summaryHTML + flagsHTML;
    },

    /**
     * Display media and sentiment
     */
    async displayMedia() {
        const news = await APIService.fetchNews(this.currentStock.symbol);

        const newsHTML = news.length > 0 ? news.slice(0, 5).map(article => `
            <div style="padding: 15px; background: #ecf0f1; border-radius: 8px; margin-bottom: 10px;">
                <h4><a href="${article.url}" target="_blank">${article.title}</a></h4>
                <p style="font-size: 0.9rem; color: #7f8c8d;">${article.site} - ${new Date(article.publishedDate).toLocaleDateString()}</p>
                <p>${article.text.substring(0, 200)}...</p>
            </div>
        `).join('') : '<p>No recent news available</p>';

        document.getElementById('newsFeeds').innerHTML = `<h4>📰 Latest News</h4>${newsHTML}`;

        // Mock sentiment (would use real API in production)
        const sentiment = 65 + Math.random() * 20;
        const sentimentEmoji = sentiment > 60 ? '😊 BULLISH' : sentiment > 40 ? '😐 NEUTRAL' : '😟 BEARISH';

        document.getElementById('overallSentiment').innerHTML = `<span style="font-size: 1.3rem;">${sentimentEmoji} (${sentiment.toFixed(0)}/100)</span>`;

        document.getElementById('socialSentiment').innerHTML = `
            <h4>🐦 Social Media Sentiment</h4>
            <div style="padding: 15px; background: #ecf0f1; border-radius: 8px;">
                <p>Bullish: ${(sentiment).toFixed(0)}% ${'█'.repeat(Math.floor(sentiment/5))}</p>
                <p>Neutral: ${(100-sentiment-10).toFixed(0)}% ${'█'.repeat(Math.floor((100-sentiment-10)/5))}</p>
                <p>Bearish: ${(10).toFixed(0)}% ${'█'.repeat(2)}</p>
            </div>
        `;

        document.getElementById('analystRatings').innerHTML = `
            <h4>📊 Analyst Consensus</h4>
            <div style="padding: 15px; background: #ecf0f1; border-radius: 8px;">
                <p><strong>12 BUY | 8 HOLD | 2 SELL</strong></p>
                <p>Average Price Target: $${(this.currentStock.quote.price * 1.08).toFixed(2)} (+8%)</p>
            </div>
        `;
    },

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        // Special handling for certain tabs
        if (tabName === 'watchlist') {
            this.displayWatchlist();
        } else if (tabName === 'portfolio') {
            this.displayPortfolio();
        } else if (tabName === 'hot') {
            this.displayHotStocks();
        }
    },

    /**
     * Add to watchlist
     */
    addToWatchlist() {
        if (!this.currentStock) return;

        const { symbol, quote, metrics } = this.currentStock;

        // Check if already in watchlist
        if (this.watchlist.find(w => w.symbol === symbol)) {
            alert(`${symbol} is already in your watchlist`);
            return;
        }

        this.watchlist.push({
            symbol,
            name: quote.name,
            price: quote.price,
            targetPrice: metrics.dcfResult.intrinsicValue * 0.7, // 30% discount
            mos: metrics.mos,
            score: metrics.score.totalScore,
            addedDate: new Date().toISOString()
        });

        this.saveWatchlist();
        alert(`${symbol} added to watchlist!`);
    },

    /**
     * Display watchlist
     */
    displayWatchlist() {
        if (this.watchlist.length === 0) {
            document.getElementById('watchlistTable').innerHTML = '<p>Your watchlist is empty. Search for stocks and add them to your watchlist.</p>';
            return;
        }

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>Target</th>
                        <th>MOS</th>
                        <th>Score</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.watchlist.map(stock => {
                        const mosClass = stock.mos >= 30 ? 'text-success' : stock.mos >= 15 ? 'text-warning' : 'text-danger';
                        return `
                            <tr>
                                <td><strong>${stock.symbol}</strong></td>
                                <td>$${stock.price.toFixed(2)}</td>
                                <td>$${stock.targetPrice.toFixed(2)}</td>
                                <td class="${mosClass}">${stock.mos.toFixed(1)}%</td>
                                <td>${stock.score}</td>
                                <td>
                                    <button onclick="App.removeFromWatchlist('${stock.symbol}')" class="btn-secondary" style="padding: 5px 10px; background: #e74c3c;">Remove</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('watchlistTable').innerHTML = tableHTML;

        // Calculate aggregate metrics
        const avgMOS = this.watchlist.reduce((sum, s) => sum + s.mos, 0) / this.watchlist.length;
        const avgScore = this.watchlist.reduce((sum, s) => sum + s.score, 0) / this.watchlist.length;

        document.getElementById('watchlistMetrics').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div style="padding: 20px; background: #ecf0f1; border-radius: 8px; text-align: center;">
                    <h4>Stocks Tracked</h4>
                    <p style="font-size: 2rem; font-weight: bold;">${this.watchlist.length}</p>
                </div>
                <div style="padding: 20px; background: #ecf0f1; border-radius: 8px; text-align: center;">
                    <h4>Avg MOS</h4>
                    <p style="font-size: 2rem; font-weight: bold;">${avgMOS.toFixed(1)}%</p>
                </div>
                <div style="padding: 20px; background: #ecf0f1; border-radius: 8px; text-align: center;">
                    <h4>Avg Score</h4>
                    <p style="font-size: 2rem; font-weight: bold;">${avgScore.toFixed(0)}</p>
                </div>
            </div>
        `;
    },

    /**
     * Remove from watchlist
     */
    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(w => w.symbol !== symbol);
        this.saveWatchlist();
        this.displayWatchlist();
    },

    /**
     * Display portfolio
     */
    displayPortfolio() {
        document.getElementById('portfolioValue').innerHTML = `
            <p>Portfolio tracking feature coming soon! You can manually track your holdings.</p>
            <p>For now, use the watchlist to monitor stocks you're interested in.</p>
        `;
    },

    /**
     * Load and display hot stocks
     */
    async loadHotStocks() {
        // Would use real trending data in production
        this.hotStocks = CONFIG.HOT_STOCKS.slice(0, 5);
    },

    /**
     * Display hot stocks
     */
    async displayHotStocks() {
        const hotStocksHTML = await Promise.all(
            this.hotStocks.map(async (symbol, index) => {
                const quote = await APIService.fetchStockQuote(symbol);
                return `
                    <div class="hot-stock-card">
                        <div class="hot-stock-rank">${index + 1}</div>
                        <div class="hot-stock-info">
                            <h4>${symbol} - ${quote.name}</h4>
                            <div class="hot-stock-stats">
                                Price: $${quote.price.toFixed(2)} | Change: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%
                            </div>
                        </div>
                        <div class="hot-stock-actions">
                            <button onclick="App.selectSuggestion('${symbol}')" class="btn-primary" style="padding: 8px 16px;">View Analysis</button>
                            <button onclick="App.quickAddToWatchlist('${symbol}', '${quote.name}', ${quote.price})" class="btn-secondary" style="padding: 8px 16px;">+ Watchlist</button>
                        </div>
                    </div>
                `;
            })
        );

        document.getElementById('hotStocksList').innerHTML = hotStocksHTML.join('');
    },

    /**
     * Quick add to watchlist
     */
    quickAddToWatchlist(symbol, name, price) {
        if (this.watchlist.find(w => w.symbol === symbol)) {
            alert(`${symbol} is already in your watchlist`);
            return;
        }

        this.watchlist.push({
            symbol,
            name,
            price,
            targetPrice: price * 0.85,
            mos: 0,
            score: 0,
            addedDate: new Date().toISOString()
        });

        this.saveWatchlist();
        alert(`${symbol} added to watchlist!`);
    },

    /**
     * Show loading spinner
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    },

    /**
     * Load watchlist from localStorage
     */
    loadWatchlist() {
        const saved = localStorage.getItem('moneytalks_watchlist');
        if (saved) {
            this.watchlist = JSON.parse(saved);
        }
    },

    /**
     * Save watchlist to localStorage
     */
    saveWatchlist() {
        localStorage.setItem('moneytalks_watchlist', JSON.stringify(this.watchlist));
    },

    /**
     * Load portfolio from localStorage
     */
    loadPortfolio() {
        const saved = localStorage.getItem('moneytalks_portfolio');
        if (saved) {
            this.portfolio = JSON.parse(saved);
        }
    },

    /**
     * Save portfolio to localStorage
     */
    savePortfolio() {
        localStorage.setItem('moneytalks_portfolio', JSON.stringify(this.portfolio));
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
