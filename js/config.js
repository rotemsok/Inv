// MoneyTalks Ultimate - Configuration

const CONFIG = {
    // API Configuration
    // Get free API keys from these sources:
    // - Financial Modeling Prep: https://financialmodelingprep.com/developer/docs/
    // - Alpha Vantage: https://www.alphavantage.co/support/#api-key
    // - Finnhub: https://finnhub.io/dashboard

    API_KEYS: {
        FMP: 'demo', // Replace with your Financial Modeling Prep API key
        ALPHA_VANTAGE: 'demo', // Replace with your Alpha Vantage API key
        FINNHUB: 'demo' // Replace with your Finnhub API key
    },

    API_ENDPOINTS: {
        FMP_BASE: 'https://financialmodelingprep.com/api/v3',
        ALPHA_VANTAGE_BASE: 'https://www.alphavantage.co/query',
        FINNHUB_BASE: 'https://finnhub.io/api/v1'
    },

    // Investment Scoring Thresholds
    SCORING: {
        ROIC: {
            EXCEPTIONAL: 25,
            EXCELLENT: 20,
            GOOD: 15,
            ACCEPTABLE: 10
        },
        MOS: {
            STRONG_BUY: 40,
            BUY: 30,
            HOLD: 15,
            SELL: 0
        },
        DEBT_EQUITY: {
            EXCELLENT: 0.3,
            GOOD: 0.5,
            ACCEPTABLE: 1.0
        },
        SBC_THRESHOLD: 10, // % of revenue
        CURRENT_RATIO_MIN: 1.5,
        INTEREST_COVERAGE_MIN: 5
    },

    // DCF Default Assumptions
    DCF_DEFAULTS: {
        REVENUE_GROWTH: 8,
        TERMINAL_GROWTH: 2.5,
        DISCOUNT_RATE: 10,
        TAX_RATE: 21,
        CAPEX_PERCENT: 3
    },

    // Hot stocks to track (can be customized)
    HOT_STOCKS: [
        'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN',
        'META', 'TSLA', 'BRK.B', 'V', 'JPM',
        'JNJ', 'WMT', 'PG', 'MA', 'HD',
        'COST', 'AVGO', 'ORCL', 'ADBE', 'CRM'
    ],

    // Popular competitors by sector
    COMPETITOR_MAP: {
        'GRMN': ['AAPL', 'GOOGL', 'FTNT'],
        'AAPL': ['MSFT', 'GOOGL', 'META'],
        'COST': ['WMT', 'TGT', 'AMZN'],
        'MSFT': ['AAPL', 'GOOGL', 'ORCL'],
        'NVDA': ['AMD', 'INTC', 'AVGO'],
        'TSLA': ['F', 'GM', 'RIVN']
    },

    // Cache duration (in milliseconds)
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    // Update intervals
    UPDATE_INTERVALS: {
        PRICE: 5000, // 5 seconds
        NEWS: 60000, // 1 minute
        SENTIMENT: 300000 // 5 minutes
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
