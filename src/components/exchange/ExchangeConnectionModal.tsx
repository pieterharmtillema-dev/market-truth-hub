import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useExchangeConnections, ExchangeConnection } from "@/hooks/useExchangeConnections";
import { toast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Eye,
  EyeOff,
  XCircle,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import binanceLogo from "@/assets/binance-logo.png";
import bitvavoLogo from "@/assets/bitvavo-logo.png";
import coinbaseLogo from "@/assets/coinbase-logo.webp";

interface ExchangeConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Exchange = "binance" | "bitvavo" | "coinbase";

interface ExchangeInfo {
  id: Exchange;
  name: string;
  logo: string;
  color: string;
}

const EXCHANGES: ExchangeInfo[] = [
  { id: "binance", name: "Binance", logo: binanceLogo, color: "bg-yellow-500/10 border-yellow-500/30" },
  { id: "bitvavo", name: "Bitvavo", logo: bitvavoLogo, color: "bg-blue-500/10 border-blue-500/30" },
  { id: "coinbase", name: "Coinbase", logo: coinbaseLogo, color: "bg-blue-600/10 border-blue-600/30" },
];

export function ExchangeConnectionModal({ open, onOpenChange }: ExchangeConnectionModalProps) {
  const { connections, connectExchange, disconnectExchange, loading } = useExchangeConnections();
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSelectExchange = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setApiKey("");
    setApiSecret("");
    setFormError(null);
    setShowSecret(false);
  };

  const handleBack = () => {
    setSelectedExchange(null);
    setApiKey("");
    setApiSecret("");
    setFormError(null);
    setShowSecret(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExchange || !apiKey.trim() || !apiSecret.trim()) {
      setFormError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await connectExchange(selectedExchange, apiKey.trim(), apiSecret.trim());

    // Clear sensitive data immediately after submission
    setApiKey("");
    setApiSecret("");
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Exchange Connected",
        description: `Successfully connected to ${EXCHANGES.find(e => e.id === selectedExchange)?.name}`,
      });
      setSelectedExchange(null);
    } else {
      setFormError(result.error || "Failed to connect exchange");
    }
  };

  const handleDisconnect = async (exchange: string) => {
    const result = await disconnectExchange(exchange);
    
    if (result.success) {
      toast({
        title: "Exchange Disconnected",
        description: `Successfully disconnected from ${EXCHANGES.find(e => e.id === exchange)?.name}`,
      });
    } else {
      toast({
        title: "Disconnection Failed",
        description: result.error || "Failed to disconnect exchange",
        variant: "destructive",
      });
    }
  };

  const getConnectionForExchange = (exchange: Exchange): ExchangeConnection | undefined => {
    return connections.find(c => c.exchange === exchange);
  };

  const renderExchangeList = () => (
    <div className="space-y-4">
      <div className="grid gap-3">
        {EXCHANGES.map((exchange) => {
          const connection = getConnectionForExchange(exchange.id);
          const isConnected = connection?.status === "connected";
          const hasIssue = connection?.status === "invalid" || connection?.status === "revoked";

          return (
            <div
              key={exchange.id}
              className={`p-4 rounded-lg border ${exchange.color} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={exchange.logo} alt={exchange.name} className="h-8 w-8 rounded-md object-contain" />
                  <div>
                    <div className="font-medium">{exchange.name}</div>
                    {connection && (
                      <div className="text-xs text-muted-foreground">
                        {connection.last_sync_at && (
                          <>Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <>
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(exchange.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                  {hasIssue && (
                    <>
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {connection.status === "revoked" ? "Revoked" : "Invalid"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectExchange(exchange.id)}
                        className="gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reconnect
                      </Button>
                    </>
                  )}
                  {!connection && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectExchange(exchange.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
              {hasIssue && connection.error_message && (
                <p className="text-xs text-destructive mt-2">{connection.error_message}</p>
              )}
            </div>
          );
        })}
      </div>

      <Alert className="border-warning/30 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-sm text-muted-foreground">
          Only read-only API access is required. Never enable withdrawal permissions.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderConnectionForm = () => {
    const exchange = EXCHANGES.find(e => e.id === selectedExchange);
    if (!exchange) return null;

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className={`p-4 rounded-lg border ${exchange.color} flex items-center gap-3`}>
          <img src={exchange.logo} alt={exchange.name} className="h-8 w-8 rounded-md object-contain" />
          <span className="font-medium">{exchange.name}</span>
        </div>

        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>Security Warning:</strong> Never enable withdrawals. Only read-only permissions are required.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <div className="relative">
              <Input
                id="apiSecret"
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter your API secret"
                autoComplete="off"
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Read-only API access required (no withdrawals)
            </p>
          </div>
        </div>

        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !apiKey.trim() || !apiSecret.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Exchange"
            )}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Exchange</DialogTitle>
          <DialogDescription>
            {selectedExchange
              ? "Enter your API credentials to connect your exchange account."
              : "Select an exchange to connect and sync your trading history."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedExchange ? (
          renderConnectionForm()
        ) : (
          renderExchangeList()
        )}
      </DialogContent>
    </Dialog>
  );
}
