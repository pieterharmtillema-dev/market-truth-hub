import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import binanceLogo from "@/assets/binance-logo.png";
import bitvavoLogo from "@/assets/bitvavo-logo.png";
import coinbaseLogo from "@/assets/coinbase-logo.webp";
import alpacaLogo from "@/assets/alpaca-logo.svg";

interface ExchangeStatusBadgeProps {
  exchange: string;
  status: "pending" | "connected" | "invalid" | "revoked";
  lastSyncAt?: string | null;
  verifiedTradesCount?: number;
  showDetails?: boolean;
  label?: string | null;
}

const EXCHANGE_NAMES: Record<string, string> = {
  binance: "Binance",
  bitvavo: "Bitvavo", 
  coinbase: "Coinbase",
  alpaca: "Alpaca",
};

const EXCHANGE_LOGOS: Record<string, string> = {
  binance: binanceLogo,
  bitvavo: bitvavoLogo,
  coinbase: coinbaseLogo,
  alpaca: alpacaLogo,
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
  label,
}: ExchangeStatusBadgeProps) {
  const exchangeName = EXCHANGE_NAMES[exchange] || exchange;
  const exchangeLogo = EXCHANGE_LOGOS[exchange];
  const alpacaEnvironment =
    exchange === "alpaca" && (label === "paper" || label === "live") ? label : null;

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
        {alpacaEnvironment && (
          <Badge
            variant="outline"
            className={
              alpacaEnvironment === "paper"
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs"
                : "bg-red-500/10 text-red-500 border-red-500/30 text-xs"
            }
          >
            {alpacaEnvironment === "paper" ? "Paper" : "Live"}
          </Badge>
        )}
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {lastSyncAt && <span>{formatLastSync(lastSyncAt)}</span>}
            {verifiedTradesCount !== undefined && verifiedTradesCount > 0 && (
              <span className="ml-1">• {verifiedTradesCount} trades</span>
            )}
          </div>
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
