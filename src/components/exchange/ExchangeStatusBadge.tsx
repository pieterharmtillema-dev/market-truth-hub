import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import binanceLogo from "@/assets/binance-logo.png";
import bitvavoLogo from "@/assets/bitvavo-logo.png";
import coinbaseLogo from "@/assets/coinbase-logo.webp";

interface ExchangeStatusBadgeProps {
  exchange: string;
  status: "pending" | "connected" | "invalid" | "revoked";
  lastSyncAt?: string | null;
  verifiedTradesCount?: number;
  showDetails?: boolean;
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

export function ExchangeStatusBadge({
  exchange,
  status,
  lastSyncAt,
  verifiedTradesCount,
  showDetails = false,
}: ExchangeStatusBadgeProps) {
  const exchangeName = EXCHANGE_NAMES[exchange] || exchange;
  const exchangeLogo = EXCHANGE_LOGOS[exchange];

  const LogoImage = exchangeLogo ? (
    <img src={exchangeLogo} alt={exchangeName} className="h-4 w-4 rounded object-contain" />
  ) : null;

  if (status === "connected") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success" className="gap-1.5">
          {LogoImage}
          {exchangeName}
          <CheckCircle2 className="h-3 w-3" />
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {lastSyncAt && (
              <span>Synced {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}</span>
            )}
            {verifiedTradesCount !== undefined && verifiedTradesCount > 0 && (
              <span className="ml-2">• {verifiedTradesCount} verified trades</span>
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
