import { useState, useEffect } from 'react';
import { Clipboard, CheckCircle2 } from 'lucide-react';

interface TokenInfo {
  symbol: string;
  name: string;
  image?: string;
  decimals?: number;
}

interface SmartPasteButtonProps {
  onAddressFound: (address: string) => void;
  onTokenInfoFound: (tokenInfo: TokenInfo) => void;
  apiKey: string;
}

export default function SmartPasteButton({
  onAddressFound,
  onTokenInfoFound,
  apiKey
}: SmartPasteButtonProps) {
  const [status, setStatus] = useState<'hidden' | 'checking' | 'found' | 'pasted'>('hidden');
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [fetchingToken, setFetchingToken] = useState(false);

  useEffect(() => {
    const fetchTokenInfo = async (address: string) => {
      if (!apiKey) return;

      setFetchingToken(true);
      try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'get-asset',
            method: 'getAsset',
            params: { id: address }
          })
        });

        if (response.ok) {
          const data = await response.json();

          if (data.result) {
            const asset = data.result;
            const info = {
              symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
              name: asset.content?.metadata?.name || 'Unknown Token',
              image: asset.content?.links?.image ||
                asset.content?.files?.[0]?.uri ||
                asset.content?.files?.[0]?.cdn_uri,
              decimals: asset.token_info?.decimals
            };

            setTokenInfo(info);
            onTokenInfoFound(info);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch token info:', error);
      } finally {
        setFetchingToken(false);
      }
    };

    const intervalId = setInterval(async () => {
      try {
        if (!navigator.clipboard?.readText) return;

        const clipboardText = await navigator.clipboard.readText();
        const trimmedText = clipboardText.trim();
        const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

        if (trimmedText && solanaAddressRegex.test(trimmedText)) {
          if (trimmedText !== detectedAddress) {
            setDetectedAddress(trimmedText);
            setStatus('found');

            if (apiKey) {
              fetchTokenInfo(trimmedText);
            }
          }
        } else {
          if (status !== 'hidden') {
            setStatus('hidden');
            setDetectedAddress('');
            setTokenInfo(null);
          }
        }
      } catch {
        // Clipboard access failed, keep current state
      }
    }, 2000);

    // Check immediately on mount
    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard?.readText) return;

        const clipboardText = await navigator.clipboard.readText();
        const trimmedText = clipboardText.trim();
        const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

        if (trimmedText && solanaAddressRegex.test(trimmedText)) {
          if (trimmedText !== detectedAddress) {
            setDetectedAddress(trimmedText);
            setStatus('found');

            if (apiKey) {
              fetchTokenInfo(trimmedText);
            }
          }
        }
      } catch {
        // Clipboard access failed
      }
    };

    checkClipboard();

    return () => {
      clearInterval(intervalId);
    };
  }, [detectedAddress, status, apiKey, onTokenInfoFound]);

  const handlePaste = () => {
    if (detectedAddress) {
      onAddressFound(detectedAddress);
      setStatus('pasted');
      setTimeout(() => setStatus('found'), 1500);
    }
  };

  if (status === 'hidden') {
    return null;
  }

  const getButtonContent = () => {
    if (status === 'pasted') {
      return (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Pasted!</span>
        </>
      );
    }

    if (tokenInfo && !fetchingToken) {
      return (
        <>
          {tokenInfo.image ? (
            <img
              src={tokenInfo.image}
              alt={tokenInfo.symbol}
              className="w-3 h-3 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Clipboard className="w-3 h-3" />
          )}
          <span className="font-bold text-yellow-300 text-xs">${tokenInfo.symbol}</span>
        </>
      );
    }

    return (
      <>
        <Clipboard className="w-3 h-3" />
        {fetchingToken && <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />}
        <span className="text-xs">Paste</span>
      </>
    );
  };

  return (
    <button
      onClick={handlePaste}
      disabled={status === 'checking' || status === 'pasted'}
      className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
    >
      {getButtonContent()}
    </button>
  );
}
