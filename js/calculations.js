// MoneyTalks Ultimate - Financial Calculations

const FinancialCalculations = {

    /**
     * Calculate Return on Invested Capital (ROIC)
     * Formula: ROIC = NOPAT / Invested Capital
     */
    calculateROIC(operatingIncome, taxRate, equity, debt, cash) {
        const nopat = operatingIncome * (1 - taxRate / 100);
        const netDebt = debt - cash;
        const investedCapital = equity + netDebt;

        if (investedCapital <= 0) return 0;

        return (nopat / investedCapital) * 100;
    },

    /**
     * Calculate Free Cash Flow
     * Formula: FCF = Operating Cash Flow - CapEx - Stock-Based Compensation
     */
    calculateFCF(operatingCashFlow, capex, sbc = 0) {
        return operatingCashFlow - capex - sbc;
    },

    /**
     * Discounted Cash Flow (DCF) Valuation
     */
    calculateDCF(params) {
        const {
            currentRevenue,
            revenueGrowth,
            operatingMargin,
            taxRate,
            capexPercent,
            terminalGrowth,
            discountRate,
            sharesOutstanding,
            cash,
            debt
        } = params;

        let totalPV = 0;
        let revenue = currentRevenue;

        // Project 5 years of cash flows
        for (let year = 1; year <= 5; year++) {
            revenue = revenue * (1 + revenueGrowth / 100);
            const operatingIncome = revenue * (operatingMargin / 100);
            const nopat = operatingIncome * (1 - taxRate / 100);
            const capex = revenue * (capexPercent / 100);
            const fcf = nopat - capex;

            const discountFactor = Math.pow(1 + discountRate / 100, year);
            const pv = fcf / discountFactor;
            totalPV += pv;
        }

        // Terminal value
        const terminalFCF = revenue * (1 + terminalGrowth / 100) * (operatingMargin / 100) * (1 - taxRate / 100);
        const terminalValue = terminalFCF / ((discountRate - terminalGrowth) / 100);
        const pvTerminal = terminalValue / Math.pow(1 + discountRate / 100, 5);

        // Enterprise value
        const enterpriseValue = totalPV + pvTerminal;

        // Equity value
        const equityValue = enterpriseValue + cash - debt;

        // Price per share
        const intrinsicValue = equityValue / sharesOutstanding;

        return {
            intrinsicValue,
            enterpriseValue,
            equityValue,
            pvFutureCF: totalPV,
            pvTerminal
        };
    },

    /**
     * Calculate Margin of Safety
     */
    calculateMOS(intrinsicValue, currentPrice) {
        if (intrinsicValue <= 0) return -100;
        return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
    },

    /**
     * Red Flag Detection
     */
    detectRedFlags(data) {
        const flags = [];

        // Flag 1: Inventory Bloat
        if (data.inventoryGrowth > data.revenueGrowth + 5) {
            flags.push({
                type: 'Inventory Bloat',
                status: 'fail',
                message: `Inventory growing ${data.inventoryGrowth.toFixed(1)}% vs revenue ${data.revenueGrowth.toFixed(1)}%`,
                severity: 'high'
            });
        } else {
            flags.push({
                type: 'Inventory Bloat',
                status: 'pass',
                message: 'Inventory growth healthy relative to revenue',
                severity: 'none'
            });
        }

        // Flag 2: Stock-Based Compensation
        const sbcPercent = (data.sbc / data.revenue) * 100;
        if (sbcPercent > CONFIG.SCORING.SBC_THRESHOLD) {
            flags.push({
                type: 'SBC Dilution',
                status: 'fail',
                message: `SBC is ${sbcPercent.toFixed(1)}% of revenue (threshold: ${CONFIG.SCORING.SBC_THRESHOLD}%)`,
                severity: 'medium'
            });
        } else {
            flags.push({
                type: 'SBC Dilution',
                status: 'pass',
                message: `SBC is ${sbcPercent.toFixed(1)}% of revenue (healthy)`,
                severity: 'none'
            });
        }

        // Flag 3: Margin Compression
        if (data.revenueGrowth > 10 && data.marginChange < -2) {
            flags.push({
                type: 'Margin Compression',
                status: 'fail',
                message: `Revenue up ${data.revenueGrowth.toFixed(1)}% but margins down ${Math.abs(data.marginChange).toFixed(1)}%`,
                severity: 'high'
            });
        } else if (data.marginChange < 0) {
            flags.push({
                type: 'Margin Compression',
                status: 'warning',
                message: `Margins declining ${Math.abs(data.marginChange).toFixed(1)}% (monitor)`,
                severity: 'low'
            });
        } else {
            flags.push({
                type: 'Margin Compression',
                status: 'pass',
                message: `Margins ${data.marginChange > 0 ? 'expanding' : 'stable'}`,
                severity: 'none'
            });
        }

        return flags;
    },

    /**
     * Calculate MoneyTalks Investment Score (0-100)
     */
    calculateMoneyTalksScore(metrics) {
        let score = 0;
        const breakdown = {};

        // Financial Health (25 points)
        let healthScore = 0;
        if (metrics.currentRatio > 1.5) healthScore += 5;
        if (metrics.debtToEquity < 0.5) healthScore += 10;
        else if (metrics.debtToEquity < 1.0) healthScore += 5;
        if (metrics.interestCoverage > 5) healthScore += 5;
        if (metrics.operatingMargin > 20) healthScore += 5;
        breakdown.financialHealth = healthScore;
        score += healthScore;

        // ROIC Quality (25 points)
        let roicScore = 0;
        if (metrics.roic > CONFIG.SCORING.ROIC.EXCEPTIONAL) roicScore = 25;
        else if (metrics.roic > CONFIG.SCORING.ROIC.EXCELLENT) roicScore = 20;
        else if (metrics.roic > CONFIG.SCORING.ROIC.GOOD) roicScore = 15;
        else if (metrics.roic > CONFIG.SCORING.ROIC.ACCEPTABLE) roicScore = 10;
        breakdown.roicQuality = roicScore;
        score += roicScore;

        // Margin of Safety (30 points)
        let mosScore = 0;
        if (metrics.mos >= 40) mosScore = 30;
        else if (metrics.mos >= 30) mosScore = 25;
        else if (metrics.mos >= 15) mosScore = 15;
        else if (metrics.mos >= 0) mosScore = 5;
        breakdown.marginOfSafety = mosScore;
        score += mosScore;

        // Red Flags (-5 each)
        let redFlagPenalty = 0;
        if (metrics.redFlags) {
            metrics.redFlags.forEach(flag => {
                if (flag.status === 'fail') redFlagPenalty += 5;
            });
        }
        breakdown.redFlagPenalty = -redFlagPenalty;
        score -= redFlagPenalty;

        // Qualitative (20 points)
        let qualitativeScore = 0;
        if (metrics.moatStrength === 'Wide') qualitativeScore += 15;
        else if (metrics.moatStrength === 'Moderate') qualitativeScore += 10;
        else if (metrics.moatStrength === 'Narrow') qualitativeScore += 5;

        if (metrics.managementQuality === 'A+') qualitativeScore += 5;
        else if (metrics.managementQuality === 'A') qualitativeScore += 4;
        else if (metrics.managementQuality === 'B') qualitativeScore += 3;

        breakdown.qualitative = qualitativeScore;
        score += qualitativeScore;

        // Determine verdict
        let verdict = '';
        if (score >= 80) verdict = 'STRONG BUY';
        else if (score >= 60) verdict = 'BUY';
        else if (score >= 40) verdict = 'HOLD';
        else if (score >= 20) verdict = 'SELL';
        else verdict = 'STRONG SELL';

        return {
            totalScore: Math.max(0, Math.min(100, score)),
            breakdown,
            verdict
        };
    },

    /**
     * Calculate growth rate
     */
    calculateGrowthRate(oldValue, newValue) {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    },

    /**
     * Calculate CAGR (Compound Annual Growth Rate)
     */
    calculateCAGR(beginValue, endValue, years) {
        if (beginValue <= 0 || years <= 0) return 0;
        return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
    },

    /**
     * Format large numbers
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return 'N/A';

        const absNum = Math.abs(num);
        let formatted = '';

        if (absNum >= 1e12) {
            formatted = (num / 1e12).toFixed(decimals) + 'T';
        } else if (absNum >= 1e9) {
            formatted = (num / 1e9).toFixed(decimals) + 'B';
        } else if (absNum >= 1e6) {
            formatted = (num / 1e6).toFixed(decimals) + 'M';
        } else if (absNum >= 1e3) {
            formatted = (num / 1e3).toFixed(decimals) + 'K';
        } else {
            formatted = num.toFixed(decimals);
        }

        return formatted;
    },

    /**
     * Format percentage
     */
    formatPercent(num, decimals = 1) {
        if (num === null || num === undefined) return 'N/A';
        return num.toFixed(decimals) + '%';
    },

    /**
     * Calculate sensitivity table for DCF
     */
    calculateSensitivity(baseParams, currentPrice) {
        const discountRates = [8, 9, 10, 11, 12];
        const growthRates = [6, 8, 10, 12, 14];
        const table = [];

        growthRates.forEach(growth => {
            const row = { growth };
            discountRates.forEach(discount => {
                const params = { ...baseParams, revenueGrowth: growth, discountRate: discount };
                const result = this.calculateDCF(params);
                row[`discount_${discount}`] = result.intrinsicValue;
            });
            table.push(row);
        });

        return table;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialCalculations;
}
