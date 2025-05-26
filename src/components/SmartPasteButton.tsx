// Enhanced paste button that only appears when a valid contract address is found
// and displays token info directly within the button

import { useState, useEffect } from 'react';
import { Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';

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

function SmartPasteButton({ onAddressFound, onTokenInfoFound, apiKey }: SmartPasteButtonProps) {
  const [status, setStatus] = useState<'hidden' | 'checking' | 'found' | 'pasted'>('hidden');
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [fetchingToken, setFetchingToken] = useState(false);

  // Check clipboard periodically for contract addresses
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard?.readText) return;

        const clipboardText = await navigator.clipboard.readText();
        const trimmedText = clipboardText.trim();

        // Solana address validation (base58, 32-44 chars)
        const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

        if (trimmedText && solanaAddressRegex.test(trimmedText)) {
          if (trimmedText !== detectedAddress) {
            setDetectedAddress(trimmedText);
            setStatus('found');

            // Fetch token info if we have an API key
            if (apiKey) {
              fetchTokenInfo(trimmedText);
            }
          }
        } else {
          // No valid address found, hide button
          if (status !== 'hidden') {
            setStatus('hidden');
            setDetectedAddress('');
            setTokenInfo(null);
          }
        }
      } catch (error) {
        // Clipboard access failed, keep current state
      }
    };

    // Check immediately
    checkClipboard();

    // Then check every 2 seconds
    intervalId = setInterval(checkClipboard, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [detectedAddress, status, apiKey]);

  const fetchTokenInfo = async (address: string) => {
    if (!apiKey) return;

    setFetchingToken(true);
    try {
      console.log('Fetching token info for:', address);

      // Use the getAsset RPC method instead of token-metadata
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-asset',
          method: 'getAsset',
          params: {
            id: address
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('getAsset response:', data);

        if (data.result) {
          const asset = data.result;
          console.log('Asset data:', asset);

          // Extract from the content.metadata structure
          const symbol = asset.content?.metadata?.symbol || 'UNKNOWN';
          const name = asset.content?.metadata?.name || 'Unknown Token';
          const image = asset.content?.links?.image ||
            asset.content?.files?.[0]?.uri ||
            asset.content?.files?.[0]?.cdn_uri;

          const info = {
            symbol,
            name,
            image,
            decimals: asset.token_info?.decimals
          };

          console.log('Processed token info:', info);
          setTokenInfo(info);
          onTokenInfoFound(info);
        } else {
          console.log('No asset data found in response');
          await fetchTokenInfoFallback(address);
        }
      } else {
        console.error('getAsset API failed:', response.status, response.statusText);
        await fetchTokenInfoFallback(address);
      }
    } catch (error) {
      console.warn('Failed to fetch token info:', error);
      await fetchTokenInfoFallback(address);
    } finally {
      setFetchingToken(false);
    }
  };

  // Fallback method using RPC call
  const fetchTokenInfoFallback = async (address: string) => {
    try {
      console.log('Trying fallback method for token info');
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'token-info',
          method: 'getAccountInfo',
          params: [
            address,
            {
              encoding: 'jsonParsed'
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fallback token info response:', data);

        if (data.result?.value?.data?.parsed?.info) {
          const parsed = data.result.value.data.parsed.info;
          const info = {
            symbol: parsed.symbol || 'UNKNOWN',
            name: parsed.name || 'Unknown Token',
            image: undefined,
            decimals: parsed.decimals
          };
          console.log('Fallback processed token info:', info);
          setTokenInfo(info);
          onTokenInfoFound(info);
        }
      }
    } catch (error) {
      console.warn('Fallback token info fetch failed:', error);
      // Set basic info so button still shows
      const info = {
        symbol: 'TOKEN',
        name: 'Unknown Token',
        image: undefined,
        decimals: undefined
      };
      setTokenInfo(info);
      onTokenInfoFound(info);
    }
  };

  const handlePaste = () => {
    if (detectedAddress) {
      onAddressFound(detectedAddress);
      setStatus('pasted');

      // Reset to found state after showing pasted confirmation
      setTimeout(() => {
        setStatus('found');
      }, 1500);
    }
  };

  // Don't render if no address detected
  if (status === 'hidden') {
    return null;
  }

  const getButtonContent = () => {
    if (status === 'checking') {
      return (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Checking...</span>
        </>
      );
    }

    if (status === 'pasted') {
      return (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Pasted!</span>
        </>
      );
    }

    // Status is 'found' - show token info or generic paste option
    if (tokenInfo && !fetchingToken) {
      return (
        <>
          {tokenInfo.image ? (
            <img
              src={tokenInfo.image}
              alt={tokenInfo.symbol}
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Clipboard className="w-4 h-4" />
          )}
          <div className="flex flex-col items-start">
            <span className="font-bold text-yellow-300">${tokenInfo.symbol}</span>
            <span className="text-xs opacity-80 truncate max-w-24">{tokenInfo.name}</span>
          </div>
        </>
      );
    }

    // Loading token info or no token info available
    return (
      <>
        <Clipboard className="w-4 h-4" />
        {fetchingToken && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
        <div className="flex flex-col items-start">
          <span className="font-medium">Contract Found</span>
          <span className="text-xs opacity-80">Ready to paste</span>
        </div>
      </>
    );
  };

  return (
    <button
      onClick={handlePaste}
      disabled={status === 'checking' || status === 'pasted'}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl min-w-fit"
    >
      {getButtonContent()}
    </button>
  );
}

export default SmartPasteButton;
