import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Settings, Eye, EyeOff, ExternalLink, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
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
        headers: { 'Content-Type': 'application/json' },
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
