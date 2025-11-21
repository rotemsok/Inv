// MoneyTalks Ultimate - API Service Layer

const APIService = {
    cache: new Map(),

    /**
     * Get from cache or fetch new data
     */
    async getCached(key, fetchFunction, duration = CONFIG.CACHE_DURATION) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < duration) {
            return cached.data;
        }

        const data = await fetchFunction();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    },

    /**
     * Fetch stock quote (real-time price)
     */
    async fetchStockQuote(symbol) {
        try {
            // Try Financial Modeling Prep first
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/quote/${symbol}?apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                const quote = data[0];
                return {
                    symbol: quote.symbol,
                    name: quote.name,
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changesPercentage,
                    dayHigh: quote.dayHigh,
                    dayLow: quote.dayLow,
                    yearHigh: quote.yearHigh,
                    yearLow: quote.yearLow,
                    marketCap: quote.marketCap,
                    volume: quote.volume,
                    avgVolume: quote.avgVolume,
                    pe: quote.pe,
                    eps: quote.eps
                };
            }

            // Fallback to mock data for demo
            return this.getMockQuote(symbol);
        } catch (error) {
            console.error('Error fetching quote:', error);
            return this.getMockQuote(symbol);
        }
    },

    /**
     * Fetch income statement (annual)
     */
    async fetchIncomeStatement(symbol, limit = 5) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/income-statement/${symbol}?limit=${limit}&apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(stmt => ({
                    date: stmt.date,
                    revenue: stmt.revenue,
                    costOfRevenue: stmt.costOfRevenue,
                    grossProfit: stmt.grossProfit,
                    grossProfitRatio: stmt.grossProfitRatio * 100,
                    operatingExpenses: stmt.operatingExpenses,
                    operatingIncome: stmt.operatingIncome,
                    operatingIncomeRatio: stmt.operatingIncomeRatio * 100,
                    ebitda: stmt.ebitda,
                    ebitdaRatio: stmt.ebitdaratio * 100,
                    netIncome: stmt.netIncome,
                    eps: stmt.eps
                }));
            }

            return this.getMockIncomeStatement(symbol);
        } catch (error) {
            console.error('Error fetching income statement:', error);
            return this.getMockIncomeStatement(symbol);
        }
    },

    /**
     * Fetch balance sheet (annual)
     */
    async fetchBalanceSheet(symbol, limit = 5) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/balance-sheet-statement/${symbol}?limit=${limit}&apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(stmt => ({
                    date: stmt.date,
                    cashAndEquivalents: stmt.cashAndCashEquivalents,
                    inventory: stmt.inventory,
                    currentAssets: stmt.totalCurrentAssets,
                    totalAssets: stmt.totalAssets,
                    currentLiabilities: stmt.totalCurrentLiabilities,
                    totalDebt: stmt.totalDebt,
                    totalEquity: stmt.totalStockholdersEquity,
                    currentRatio: stmt.totalCurrentAssets / stmt.totalCurrentLiabilities
                }));
            }

            return this.getMockBalanceSheet(symbol);
        } catch (error) {
            console.error('Error fetching balance sheet:', error);
            return this.getMockBalanceSheet(symbol);
        }
    },

    /**
     * Fetch cash flow statement (annual)
     */
    async fetchCashFlow(symbol, limit = 5) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/cash-flow-statement/${symbol}?limit=${limit}&apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(stmt => ({
                    date: stmt.date,
                    operatingCashFlow: stmt.operatingCashFlow,
                    capex: stmt.capitalExpenditure,
                    freeCashFlow: stmt.freeCashFlow,
                    stockBasedCompensation: stmt.stockBasedCompensation || 0
                }));
            }

            return this.getMockCashFlow(symbol);
        } catch (error) {
            console.error('Error fetching cash flow:', error);
            return this.getMockCashFlow(symbol);
        }
    },

    /**
     * Fetch company profile
     */
    async fetchCompanyProfile(symbol) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/profile/${symbol}?apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                const profile = data[0];
                return {
                    symbol: profile.symbol,
                    companyName: profile.companyName,
                    industry: profile.industry,
                    sector: profile.sector,
                    description: profile.description,
                    ceo: profile.ceo,
                    website: profile.website,
                    image: profile.image
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    /**
     * Fetch news for a stock
     */
    async fetchNews(symbol, limit = 10) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/stock_news?tickers=${symbol}&limit=${limit}&apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(article => ({
                    title: article.title,
                    publishedDate: article.publishedDate,
                    site: article.site,
                    text: article.text,
                    url: article.url
                }));
            }

            return [];
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    },

    /**
     * Search for stocks
     */
    async searchStocks(query) {
        try {
            const url = `${CONFIG.API_ENDPOINTS.FMP_BASE}/search?query=${query}&limit=10&apikey=${CONFIG.API_KEYS.FMP}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(result => ({
                    symbol: result.symbol,
                    name: result.name,
                    currency: result.currency,
                    exchangeShortName: result.exchangeShortName
                }));
            }

            return [];
        } catch (error) {
            console.error('Error searching stocks:', error);
            return [];
        }
    },

    /**
     * Get competitors for a stock
     */
    getCompetitors(symbol) {
        // Return from predefined map or empty array
        return CONFIG.COMPETITOR_MAP[symbol] || [];
    },

    /**
     * Mock data generators for demo purposes
     */
    getMockQuote(symbol) {
        const mockPrices = {
            'GRMN': { price: 195.50, name: 'Garmin Ltd.', pe: 22.5, marketCap: 37.5e9 },
            'AAPL': { price: 189.50, name: 'Apple Inc.', pe: 28.5, marketCap: 2.9e12 },
            'COST': { price: 899.50, name: 'Costco Wholesale', pe: 45.2, marketCap: 398e9 },
            'MSFT': { price: 378.00, name: 'Microsoft Corporation', pe: 35.1, marketCap: 2.8e12 },
            'NVDA': { price: 560.00, name: 'NVIDIA Corporation', pe: 45.0, marketCap: 1.4e12 }
        };

        const mock = mockPrices[symbol] || { price: 100, name: symbol, pe: 20, marketCap: 10e9 };

        return {
            symbol,
            name: mock.name,
            price: mock.price,
            change: mock.price * 0.012,
            changePercent: 1.2,
            dayHigh: mock.price * 1.015,
            dayLow: mock.price * 0.995,
            yearHigh: mock.price * 1.25,
            yearLow: mock.price * 0.68,
            marketCap: mock.marketCap,
            volume: 850000,
            avgVolume: 980000,
            pe: mock.pe,
            eps: mock.price / mock.pe
        };
    },

    getMockIncomeStatement(symbol) {
        const baseRevenue = 6.3e9; // $6.3B
        const years = ['2023', '2022', '2021', '2020', '2019'];

        return years.map((year, i) => {
            const revenue = baseRevenue * Math.pow(1.15, -i); // 15% growth
            return {
                date: `${year}-12-31`,
                revenue,
                costOfRevenue: revenue * 0.38,
                grossProfit: revenue * 0.62,
                grossProfitRatio: 62,
                operatingExpenses: revenue * 0.37,
                operatingIncome: revenue * 0.25,
                operatingIncomeRatio: 25,
                ebitda: revenue * 0.28,
                ebitdaRatio: 28,
                netIncome: revenue * 0.20,
                eps: (revenue * 0.20) / 192.5e6
            };
        });
    },

    getMockBalanceSheet(symbol) {
        const years = ['2023', '2022', '2021', '2020', '2019'];

        return years.map((year, i) => {
            const assets = 8e9 * Math.pow(1.1, -i);
            return {
                date: `${year}-12-31`,
                cashAndEquivalents: assets * 0.44,
                inventory: assets * 0.13,
                currentAssets: assets * 0.75,
                totalAssets: assets,
                currentLiabilities: assets * 0.25,
                totalDebt: 0,
                totalEquity: assets * 0.75,
                currentRatio: 3.0
            };
        });
    },

    getMockCashFlow(symbol) {
        const years = ['2023', '2022', '2021', '2020', '2019'];

        return years.map((year, i) => {
            const ocf = 1.5e9 * Math.pow(1.12, -i);
            return {
                date: `${year}-12-31`,
                operatingCashFlow: ocf,
                capex: ocf * 0.15,
                freeCashFlow: ocf * 0.85,
                stockBasedCompensation: ocf * 0.02
            };
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
