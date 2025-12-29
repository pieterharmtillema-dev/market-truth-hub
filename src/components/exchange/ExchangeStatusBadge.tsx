import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import binanceLogo from "@/assets/binance-logo.png";
import bitvavoLogo from "@/assets/bitvavo-logo.png";
import coinbaseLogo from "@/assets/coinbase-logo.webp";

interface ExchangeStatusBadgeProps {
  exchange: string;
  status: "pending" | "connected" | "invalid" | "revoked";
  lastSyncAt?: string | null;
  verifiedTradesCount?: number;
  showDetails?: boolean;
  onSync?: () => void;
  syncing?: boolean;
}

const EXCHANGE_NAMES: Record<string, string> = {
  binance: "Binance",
  bitvavo: "Bitvavo", 
  coinbase: "Coinbase",
};

const EXCHANGE_LOGOS: Record<string, string> = {
  binance: binanceLogo,
  bitvavo: bitvavoLogo,
  coinbase: coinbaseLogo,
};

function formatLastSync(lastSyncAt: string): string {
  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const daysDiff = differenceInDays(now, syncDate);
  const hoursDiff = differenceInHours(now, syncDate);
  
  if (hoursDiff < 1) {
    return "Synced just now";
  } else if (hoursDiff < 24) {
    return `Synced ${hoursDiff}h ago`;
  } else if (daysDiff === 1) {
    return "Synced 1 day ago";
  } else if (daysDiff < 7) {
    return `Synced ${daysDiff} days ago`;
  } else {
    return `Synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`;
  }
}

export function ExchangeStatusBadge({
  exchange,
  status,
  lastSyncAt,
  verifiedTradesCount,
  showDetails = false,
  onSync,
  syncing = false,
}: ExchangeStatusBadgeProps) {
  const exchangeName = EXCHANGE_NAMES[exchange] || exchange;
  const exchangeLogo = EXCHANGE_LOGOS[exchange];

  const LogoImage = exchangeLogo ? (
    <img src={exchangeLogo} alt={exchangeName} className="h-4 w-4 rounded object-contain" />
  ) : null;

  if (status === "connected") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="success" className="gap-1.5">
          {LogoImage}
          {exchangeName}
          <CheckCircle2 className="h-3 w-3" />
        </Badge>
        {showDetails && (
          <>
            <div className="text-xs text-muted-foreground">
              {lastSyncAt && <span>{formatLastSync(lastSyncAt)}</span>}
              {verifiedTradesCount !== undefined && verifiedTradesCount > 0 && (
                <span className="ml-1">• {verifiedTradesCount} trades</span>
              )}
            </div>
            {onSync && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSync}
                disabled={syncing}
                className="h-6 px-2 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  if (status === "invalid" || status === "revoked") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        {LogoImage}
        {exchangeName}
        <XCircle className="h-3 w-3" />
        {status === "revoked" ? "Revoked" : "Invalid"}
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="warning" className="gap-1.5">
        {LogoImage}
        {exchangeName}
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      {LogoImage}
      {exchangeName}
      <AlertCircle className="h-3 w-3" />
    </Badge>
  );
}
