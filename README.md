# Solana Bundler Detector

An analytics tool for detecting coordinated buying patterns and bundled transactions on Solana tokens. Built with React, TypeScript, and powered by Helius API for real-time blockchain analysis.

## What It Does

The Solana Bundler Detector analyzes token transaction patterns to identify potential market manipulation, bot activity, and coordinated buying schemes. It provides a comprehensive risk score along with detailed metrics and actionable insights.

## Core Metrics Explained

### 1. Timing Cluster Score (40% weight)

**What it measures:** Detects if multiple transactions occurred within suspiciously short time windows.

**How it's calculated:**

- Analyzes transaction timestamps across three time windows: 30 seconds, 1 minute, and 5 minutes
- Groups consecutive transactions that fall within these windows
- Scores based on the largest cluster size relative to total transactions
- Formula: `Math.min(100, (maxClusterSize / totalTransactions) * 200)`

**Red flags:**

- Score >70: High coordination detected (likely bot/bundler activity)
- Multiple transactions within seconds of each other
- Unnatural timing patterns that deviate from organic trading

### 2. Wallet Similarity Score (30% weight)

**What it measures:** Analyzes behavioral patterns across different wallets to identify potential coordination.

**How it's calculated:**

- Maps transaction frequency per wallet
- Calculates coefficient of variation in transaction counts
- Lower variation = higher suspicion (similar behavior patterns)
- Formula: `Math.max(0, 100 - (coefficient * 50))`

**Red flags:**

- Score >60: Wallets show similar transaction patterns
- Multiple wallets with identical transaction counts
- Coordinated behavior suggesting single entity control

### 3. Transaction Size Patterns Score (20% weight)

**What it measures:** Detects suspiciously similar transaction amounts that suggest automated buying.

**How it's calculated:**

- Analyzes variance in transaction amounts
- Calculates coefficient of variation for all amounts
- Lower variation = higher suspicion (preset amounts)
- Formula: `Math.max(0, 100 - (coefficient * 100))`

**Red flags:**

- Score >60: Automated transaction sizing detected
- Many transactions with identical or very similar amounts
- Round numbers or specific patterns suggesting bot activity

### 4. Distribution Score (10% weight)

**What it measures:** Evaluates how concentrated token holdings are among buyers.

**How it's calculated:**

- Uses Gini coefficient to measure wealth concentration
- Analyzes total token amounts per unique buyer
- Higher concentration = higher risk
- Formula: `Gini coefficient * 100`

**Red flags:**

- Score >70: High concentration among few holders
- Few wallets accumulating most of the supply
- Potential coordinated accumulation strategy

## Key Functions & Methods

### Core Analysis Functions

#### `analyzeToken(contractAddress, period, apiKey)`

Main entry point that orchestrates the entire analysis process.

- Fetches transaction data via Helius API
- Processes token transfers
- Runs all metric calculations
- Returns comprehensive analysis results

#### `getTokenTransfers(contractAddress, period, apiKey)`

Retrieves and processes transaction data from Solana blockchain.

- Uses Helius Enhanced Transactions API for clean, parsed data
- Implements batch processing for API efficiency
- Includes fallback mechanisms for long-term storage issues
- Filters for specific token transfers only

#### `analyzeBundlingPatterns(transfers)`

Core analytics engine that calculates all risk metrics.

- Orchestrates individual metric calculations
- Applies weighted scoring algorithm
- Generates insights and recommendations
- Returns structured analysis results

### Individual Metric Calculators

#### `analyzeTimeClustering(transfers)`

Implements sophisticated time-based pattern detection.

- Multi-window analysis (30s, 1min, 5min)
- Cluster identification algorithm
- Statistical scoring based on cluster density

#### `analyzeWalletPatterns(transfers)`

Detects coordinated wallet behavior patterns.

- Transaction frequency analysis per wallet
- Statistical variance calculations
- Behavioral similarity scoring

#### `analyzeTransactionSizes(transfers)`

Identifies automated transaction patterns.

- Amount variance analysis
- Coefficient of variation calculations
- Preset amount detection algorithms

#### `analyzeDistribution(transfers)`

Measures token concentration and distribution patterns.

- Gini coefficient implementation
- Wealth concentration analysis
- Supply accumulation pattern detection

### Utility Functions

#### `countSuspiciousWallets(transfers)`

Counts wallets exhibiting suspicious rapid-fire transaction patterns.

#### `generateInsights(score, metrics)`

Converts numerical scores into human-readable insights and recommendations.

#### `getPeriodString(transfers)`

Calculates analysis time period for reporting.

## Extending the Platform

### Suggested Analytics Modules

#### 1. **Liquidity Pool Analysis Module**

```typescript
interface LiquidityAnalysis {
  poolCreationTiming: number
  initialLiquidityPattern: number
  lpTokenDistribution: number
  rugPullRisk: number
}

// Functions to implement:
;-analyzeLiquidityInjection() - detectPoolManipulation() - assessRugPullRisk()
```

#### 2. **Holder Analysis Module**

```typescript
interface HolderAnalysis {
  holderConcentration: number
  whaleActivity: number
  holderRetention: number
  papersHandsRisk: number
}

// Functions to implement:
;-analyzeHolderConcentration() -
  detectWhaleActivity() -
  calculateHolderRetention()
```

#### 3. **Price Impact Analysis Module**

```typescript
interface PriceImpactAnalysis {
  marketCapManipulation: number
  volumeArtificialInflation: number
  priceSupport: number
  dumpRisk: number
}

// Functions to implement:
;-analyzePriceImpact() - detectVolumeInflation() - assessDumpRisk()
```

#### 4. **Social Sentiment Integration**

```typescript
interface SocialAnalysis {
  twitterBotActivity: number;
  telegramShilling: number;
  discordCoordination: number;
  influencerInvolvement: number;
}

// APIs to integrate:
- Twitter API for bot detection
- Telegram group analysis
- Discord activity monitoring
```

#### 5. **Cross-DEX Analysis Module**

```typescript
interface CrossDexAnalysis {
  arbitragePatterns: number
  liquidityFragmentation: number
  crossDexCoordination: number
  priceDiscrepancies: number
}

// Functions to implement:
;-analyzeCrossDexActivity() -
  detectArbitragePatterns() -
  measureLiquidityFragmentation()
```

### Platform Architecture for Extensions

#### 1. **Plugin System**

```typescript
interface AnalyticsPlugin {
  name: string
  version: string
  analyze(data: TokenData): PluginResult
  getMetrics(): MetricDefinition[]
}

abstract class BaseAnalyzer {
  abstract analyze(transfers: TokenTransfer[]): number
  abstract getDescription(): string
  abstract getWeight(): number
}
```

#### 2. **Configurable Scoring System**

```typescript
interface ScoringConfig {
  weights: {
    [metricName: string]: number
  }
  thresholds: {
    high: number
    medium: number
    low: number
  }
  customMetrics: CustomMetric[]
}
```

#### 3. **Data Pipeline Architecture**

```typescript
interface DataPipeline {
  sources: DataSource[]
  processors: DataProcessor[]
  analyzers: Analyzer[]
  outputs: OutputFormatter[]
}

// Extensible data sources
abstract class DataSource {
  abstract fetchData(query: DataQuery): Promise<RawData>
}

// Custom processors
abstract class DataProcessor {
  abstract process(data: RawData): ProcessedData
}
```

#### 4. **Custom Alert System**

```typescript
interface AlertSystem {
  rules: AlertRule[]
  channels: NotificationChannel[]
  triggers: AlertTrigger[]
}

interface AlertRule {
  condition: (analysis: AnalysisResult) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  actions: AlertAction[]
}
```

### Advanced Features Implementation Ideas

#### 1. **Real-time Monitoring**

- WebSocket connections for live transaction streaming
- Real-time alert system for suspicious activity
- Continuous monitoring dashboard

#### 2. **Historical Pattern Matching**

- Database of known manipulation patterns
- Pattern recognition ML models
- Historical comparison analysis

#### 3. **Multi-token Correlation Analysis**

- Cross-token pattern detection
- Portfolio-level risk assessment
- Ecosystem-wide manipulation detection

#### 4. **Advanced Visualization**

- Interactive network graphs showing wallet relationships
- Time-series analysis charts
- Heat maps for risk distribution

## Technical Implementation Notes

### Performance Optimizations

- Implement caching for frequently analyzed tokens
- Use worker threads for heavy computational tasks
- Batch API requests to respect rate limits
- Implement progressive analysis for large datasets

### Scalability Considerations

- Database integration for historical data storage
- Redis caching for real-time data
- Queue system for processing high-volume requests
- Microservices architecture for independent scaling

### Security & Privacy

- API key encryption and secure storage
- Rate limiting and abuse prevention
- Data anonymization for privacy protection
- Audit logging for compliance

## Contributing

The modular architecture makes it easy to contribute new analyzers and features. Each metric is isolated and can be enhanced independently, making the platform highly extensible for different analytical needs.

---

_Built with ❤️ for the Solana ecosystem security and transparency._
