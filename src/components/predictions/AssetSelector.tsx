import { useState, useMemo } from "react";
import { Search, RefreshCw, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Asset {
  symbol: string;
  name: string;
  market: "stocks" | "crypto" | "forex";
  assetType: string;
  icon?: string;
}

// Available assets for prediction
export const availableAssets: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", market: "crypto", assetType: "crypto", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", market: "crypto", assetType: "crypto", icon: "Ξ" },
  { symbol: "SOL", name: "Solana", market: "crypto", assetType: "crypto", icon: "◎" },
  { symbol: "XRP", name: "Ripple", market: "crypto", assetType: "crypto", icon: "✕" },
  { symbol: "NVDA", name: "NVIDIA", market: "stocks", assetType: "stock", icon: "🟢" },
  { symbol: "AAPL", name: "Apple", market: "stocks", assetType: "stock", icon: "🍎" },
  { symbol: "SPY", name: "S&P 500 ETF", market: "stocks", assetType: "stock", icon: "📊" },
  { symbol: "TSLA", name: "Tesla", market: "stocks", assetType: "stock", icon: "⚡" },
  { symbol: "GOOGL", name: "Google", market: "stocks", assetType: "stock", icon: "🔍" },
  { symbol: "MSFT", name: "Microsoft", market: "stocks", assetType: "stock", icon: "🪟" },
  { symbol: "AMZN", name: "Amazon", market: "stocks", assetType: "stock", icon: "📦" },
  { symbol: "META", name: "Meta", market: "stocks", assetType: "stock", icon: "👤" },
  { symbol: "AMD", name: "AMD", market: "stocks", assetType: "stock", icon: "🔴" },
  { symbol: "EUR/USD", name: "Euro/US Dollar", market: "forex", assetType: "forex", icon: "€" },
  { symbol: "GBP/USD", name: "British Pound/USD", market: "forex", assetType: "forex", icon: "£" },
  { symbol: "GOLD", name: "Gold", market: "stocks", assetType: "commodity", icon: "🥇" },
];

interface AssetSelectorProps {
  selectedAsset: string | null;
  onSelect: (asset: Asset) => void;
  livePrice: number | null;
  priceChange: number | null;
  priceLoading: boolean;
  onRefreshPrice: () => void;
}

export function AssetSelector({
  selectedAsset,
  onSelect,
  livePrice,
  priceChange,
  priceLoading,
  onRefreshPrice,
}: AssetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return availableAssets;
    const query = searchQuery.toLowerCase();
    return availableAssets.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset);

  const handleSelectAsset = (asset: Asset) => {
    onSelect(asset);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      {/* Selected Asset Display */}
      {selectedAssetData ? (
        <div className="bg-gradient-to-r from-card to-card-elevated border border-border/50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                {selectedAssetData.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{selectedAssetData.symbol}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedAssetData.market.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">{selectedAssetData.name}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2">
                {priceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : livePrice ? (
                  <span className="font-mono font-bold text-xl">
                    ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onRefreshPrice}
                  disabled={priceLoading}
                  className="h-7 w-7"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", priceLoading && "animate-spin")} />
                </Button>
              </div>
              {priceChange !== null && (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium justify-end",
                  priceChange >= 0 ? "text-gain" : "text-loss"
                )}>
                  {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="mt-3 w-full text-muted-foreground hover:text-foreground"
          >
            Change asset
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-16 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
        >
          <Search className="w-5 h-5 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Search and select an asset...</span>
        </Button>
      )}

      {/* Asset Search & List */}
      {isOpen && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden animate-fade-in">
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search BTC, AAPL, EUR/USD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No assets found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSelectAsset(asset)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedAsset === asset.symbol
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                      {asset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">{asset.name}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {asset.market}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}