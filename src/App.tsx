import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeToken } from './lib/analyzer';
import { AlertCircle, Info, TrendingUp, Users, DollarSign, BarChart3, Clipboard, CheckCircle2, Settings, Eye, EyeOff, ExternalLink } from 'lucide-react';
import SmartPasteButton from './components/SmartPasteButton';

interface TokenInfo {
  symbol: string;
  name: string;
  image?: string;
  decimals?: number;
}

interface AnalysisResult {
  score: number;
  metrics: {
    timingCluster: number;
    walletSimilarity: number;
    sizePatterns: number;
    distribution: number;
  };
  details: {
    totalTransactions: number;
    uniqueWallets: number;
    analysisPeriod: string;
    suspiciousWallets: number;
  };
  insights: {
    riskLevel: string;
    primaryConcerns: string[];
    recommendations: string[];
    explanation: string;
  };
}

// Hook to get the current API key
function useHeliusApiKey() {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('helius_api_key') || '';
  });

  useEffect(() => {
    const handleKeyUpdate = (event: CustomEvent) => {
      setApiKey(event.detail);
    };

    window.addEventListener('helius-key-updated', handleKeyUpdate as EventListener);

    return () => {
      window.removeEventListener('helius-key-updated', handleKeyUpdate as EventListener);
    };
  }, []);

  return apiKey;
}

// Settings Modal Component
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('helius_api_key') || '';
      setApiKey(stored);
      setSavedKey(stored);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('helius_api_key', apiKey);
    setSavedKey(apiKey);
    window.dispatchEvent(new CustomEvent('helius-key-updated', { detail: apiKey }));
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;

    setTestStatus('testing');

    try {
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test',
          method: 'getHealth'
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setTimeout(() => setTestStatus('idle'), 3000);
      }
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('helius_api_key');
    setSavedKey('');
    window.dispatchEvent(new CustomEvent('helius-key-updated', { detail: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Settings</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <CardDescription>
            Configure your Helius API key for analyzing Solana transactions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Helius API Key</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your Helius API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {savedKey && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>API key saved locally</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={!apiKey.trim() || testStatus === 'testing'}
              variant="outline"
              className="flex-1"
            >
              {testStatus === 'testing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Testing...
                </>
              ) : testStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  Valid!
                </>
              ) : testStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                  Failed
                </>
              ) : (
                'Test Key'
              )}
            </Button>

            <Button onClick={handleSave} disabled={!apiKey.trim()}>
              Save
            </Button>
          </div>

          {apiKey && (
            <Button
              onClick={handleClear}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Clear Key
            </Button>
          )}

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Need a Helius API key?</span>
              <Badge variant="secondary">Free</Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Get a free API key from Helius to analyze Solana transactions.
              The free tier includes 100,000 requests per month.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open('https://dashboard.helius.dev/api-keys', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get Free API Key
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [period, setPeriod] = useState<'launch' | 'recent' | 'custom'>('launch');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  // const [clipboardStatus, setClipboardStatus] = useState<'idle' | 'checking' | 'found' | 'notfound'>('idle');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [fetchingTokenInfo, setFetchingTokenInfo] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const apiKey = useHeliusApiKey();

  const fetchTokenInfo = async (address: string) => {
    if (!apiKey) {
      setError('Please configure your Helius API key in Settings');
      return;
    }

    setFetchingTokenInfo(true);
    try {
      const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintAccounts: [address]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const token = data[0];
          setTokenInfo({
            symbol: token.onChainMetadata?.metadata?.symbol || token.offChainMetadata?.metadata?.symbol || 'UNKNOWN',
            name: token.onChainMetadata?.metadata?.name || token.offChainMetadata?.metadata?.name || 'Unknown Token',
            image: token.offChainMetadata?.metadata?.image || token.onChainMetadata?.metadata?.image,
            decimals: token.onChainMetadata?.mint?.decimals
          });
        } else {
          setTokenInfo({ symbol: 'UNKNOWN', name: 'Unknown Token' });
        }
      } else {
        setTokenInfo({ symbol: 'UNKNOWN', name: 'Unknown Token' });
      }
    } catch {
      setTokenInfo({ symbol: 'UNKNOWN', name: 'Unknown Token' });
    } finally {
      setFetchingTokenInfo(false);
    }
  };

  const handleAnalyze = async () => {
    if (!contractAddress.trim()) {
      setError('Please enter a contract address');
      return;
    }

    if (!apiKey) {
      setError('Please configure your Helius API key in Settings');
      setSettingsOpen(true);
      return;
    }

    if (!tokenInfo && contractAddress) {
      fetchTokenInfo(contractAddress);
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const analysis = await analyzeToken(contractAddress, period, apiKey);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Risk';
    if (score >= 60) return 'Medium Risk';
    if (score >= 40) return 'Low Risk';
    return 'Organic';
  };

  const getMetricExplanation = (metric: string, score: number) => {
    const explanations = {
      timingCluster: {
        high: "Multiple transactions occurred within seconds of each other, suggesting coordinated buying from a bot or bundler.",
        medium: "Some clustering of transaction timing detected, but could be natural market activity.",
        low: "Transaction timing appears natural and distributed over time."
      },
      walletSimilarity: {
        high: "Wallets show very similar behavior patterns (transaction counts, timing), indicating possible coordination.",
        medium: "Some wallets have similar patterns, but this could be coincidental.",
        low: "Wallet behaviors appear diverse and independent."
      },
      sizePatterns: {
        high: "Many transactions have suspiciously similar amounts, suggesting automated buying with preset values.",
        medium: "Some transaction amounts are similar, but within normal variation range.",
        low: "Transaction amounts show natural variation typical of organic buying."
      },
      distribution: {
        high: "Token holdings are highly concentrated among a few wallets, indicating possible accumulation strategy.",
        medium: "Moderate concentration of holdings, some large buyers present.",
        low: "Token distribution appears relatively balanced across many holders."
      }
    };

    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    return explanations[metric as keyof typeof explanations][level];
  };

  const getMetricIcon = (metric: string) => {
    const icons = {
      timingCluster: TrendingUp,
      walletSimilarity: Users,
      sizePatterns: DollarSign,
      distribution: BarChart3
    };
    return icons[metric as keyof typeof icons] || Info;
  };

  const getActionableInsights = (result: AnalysisResult) => {
    const insights = [];

    if (result.metrics.timingCluster > 70) {
      insights.push("⚠️ High coordination detected - consider checking if this is a legitimate project launch or potential manipulation");
    }

    if (result.metrics.walletSimilarity > 60) {
      insights.push("👥 Similar wallet patterns found - investigate if these wallets are controlled by the same entity");
    }

    if (result.metrics.sizePatterns > 60) {
      insights.push("💰 Automated buying patterns detected - typical of bots or bundled transactions");
    }

    if (result.metrics.distribution > 70) {
      insights.push("📊 High concentration risk - few wallets hold most tokens, creating potential dump risk");
    }

    if (result.score < 30) {
      insights.push("✅ Token appears to have organic trading patterns with low bundling risk");
    }

    return insights;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center relative">
          <h1 className="text-4xl font-bold">Solana Bundler Detective</h1>
          <p className="text-muted-foreground mt-2">
            Analyze token transactions for coordinated buying patterns
          </p>

          <div className="absolute top-0 right-0 flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Settings className="w-3 h-3" />
              <span>Settings</span>
              {!apiKey && <div className="w-2 h-2 bg-red-500 rounded-full" />}
            </button>

            <SmartPasteButton
              onAddressFound={(address) => {
                setContractAddress(address);
              }}
              onTokenInfoFound={(info) => {
                setTokenInfo(info);
              }}
              apiKey={apiKey}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Analysis</CardTitle>
            <CardDescription>
              Enter a Solana token contract address to analyze for bundled transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Token contract address..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                className="flex-1"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'launch' | 'recent' | 'custom')}
                className="px-3 py-2 border rounded-md"
              >
                <option value="launch">Launch Period</option>
                <option value="recent">Recent (7 days)</option>
              </select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Analyze Token'}
            </Button>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyzing transactions...</span>
                  <span>Processing</span>
                </div>
                <Progress value={65} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Analysis Results</span>
                  <Badge variant="secondary" className={getScoreColor(result.score)}>
                    {getScoreLabel(result.score)} ({result.score}/100)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Bundling Risk Score</span>
                      <span>{result.score}/100</span>
                    </div>
                    <Progress value={result.score} className="w-full" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.details.totalTransactions}</div>
                      <div className="text-sm text-muted-foreground">Total Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.details.uniqueWallets}</div>
                      <div className="text-sm text-muted-foreground">Unique Wallets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.details.suspiciousWallets}</div>
                      <div className="text-sm text-muted-foreground">Suspicious Wallets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.details.analysisPeriod}</div>
                      <div className="text-sm text-muted-foreground">Period Analyzed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Detailed Metrics
                </CardTitle>
                <CardDescription>
                  Each metric analyzes different aspects of potential coordination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries({
                    'Timing Cluster Score': {
                      value: result.metrics.timingCluster,
                      key: 'timingCluster',
                      description: 'Detects if multiple transactions happened within suspicious time windows'
                    },
                    'Wallet Similarity': {
                      value: result.metrics.walletSimilarity,
                      key: 'walletSimilarity',
                      description: 'Analyzes if wallets show similar behavioral patterns'
                    },
                    'Size Patterns': {
                      value: result.metrics.sizePatterns,
                      key: 'sizePatterns',
                      description: 'Checks for suspiciously similar transaction amounts'
                    },
                    'Distribution Score': {
                      value: result.metrics.distribution,
                      key: 'distribution',
                      description: 'Measures how concentrated token holdings are'
                    }
                  }).map(([label, data]) => {
                    const IconComponent = getMetricIcon(data.key);
                    return (
                      <div key={label} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{label}</span>
                          </div>
                          <span className="text-sm font-mono">{data.value}/100</span>
                        </div>
                        <Progress value={data.value} className="w-full" />
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-1">{data.description}</p>
                          <p className="text-xs">{getMetricExplanation(data.key, data.value)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Key Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getActionableInsights(result).map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
