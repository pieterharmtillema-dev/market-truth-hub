import { useState, useEffect } from "react";
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
  XCircle
} from "lucide-react";
import binanceLogo from "@/assets/binance-logo.png";
import bitvavoLogo from "@/assets/bitvavo-logo.png";
import coinbaseLogo from "@/assets/coinbase-logo.webp";
import tradestationLogo from "@/assets/tradestation-logo.svg";
import alpacaLogo from "@/assets/alpaca-logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { AlpacaConnectionModal } from "./AlpacaConnectionModal";

interface ExchangeConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Exchange = "binance" | "bitvavo" | "coinbase" | "tradestation" | "alpaca";

interface ExchangeInfo {
  id: Exchange;
  name: string;
  logo: string;
  color: string;
  authType?: "api_key" | "oauth" | "alpaca";
}

const EXCHANGES: ExchangeInfo[] = [
  { id: "alpaca", name: "Alpaca", logo: alpacaLogo, color: "bg-emerald-500/10 border-emerald-500/30", authType: "alpaca" },
  { id: "binance", name: "Binance", logo: binanceLogo, color: "bg-yellow-500/10 border-yellow-500/30" },
  { id: "bitvavo", name: "Bitvavo", logo: bitvavoLogo, color: "bg-blue-500/10 border-blue-500/30" },
  { id: "coinbase", name: "Coinbase", logo: coinbaseLogo, color: "bg-blue-600/10 border-blue-600/30" },
  { id: "tradestation", name: "TradeStation", logo: tradestationLogo, color: "bg-green-600/10 border-green-600/30", authType: "oauth" },
];

export function ExchangeConnectionModal({ open, onOpenChange }: ExchangeConnectionModalProps) {
  const { connections, connectExchange, disconnectExchange, loading, refetch } = useExchangeConnections();
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);

  // Refetch connections when modal opens to ensure fresh data
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleSelectExchange = async (exchange: Exchange) => {
    const exchangeInfo = EXCHANGES.find(e => e.id === exchange);

    // If Alpaca, open dedicated modal
    if (exchangeInfo?.authType === "alpaca") {
      setShowAlpacaModal(true);
      return;
    }

    // If OAuth exchange, start OAuth flow
    if (exchangeInfo?.authType === "oauth") {
      await handleOAuthConnect(exchange);
      return;
    }

    // Otherwise, show API key form
    setSelectedExchange(exchange);
    setApiKey("");
    setApiSecret("");
    setFormError(null);
    setShowSecret(false);
  };

  const handleOAuthConnect = async (exchange: Exchange) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Call init function to get authorization URL
      const { data, error } = await supabase.functions.invoke('tradestation-oauth-init', {
        method: 'POST',
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to initialize OAuth');
      }

      const { authUrl, state } = data;

      // Store state in sessionStorage for callback validation
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_exchange', exchange);

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'tradestation-oauth',
        'width=600,height=700,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }

      // Listen for callback message
      const handleMessage = (event: MessageEvent) => {
        // Security: Verify origin
        if (event.origin !== window.location.origin) return;

        window.removeEventListener('message', handleMessage);
        setIsSubmitting(false);

        if (event.data.type === 'oauth-success') {
          toast({
            title: "Exchange Connected",
            description: "Successfully connected to TradeStation",
          });
          // Modal will update via useExchangeConnections hook
        } else if (event.data.type === 'oauth-error') {
          setFormError(event.data.error || 'OAuth connection failed');
          toast({
            title: "Connection Failed",
            description: event.data.error,
            variant: "destructive",
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup is closed without completing auth
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setIsSubmitting(false);
        }
      }, 500);

    } catch (error) {
      console.error('OAuth init error:', error);
      setFormError(error instanceof Error ? error.message : 'OAuth initialization failed');
      setIsSubmitting(false);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to start OAuth flow',
        variant: "destructive",
      });
    }
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
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to disconnect your ${EXCHANGES.find(e => e.id === exchange)?.name} account? ` +
      'Your imported trades will remain, but automatic syncing will stop.'
    );
    if (!confirmed) return;

    // Use Alpaca-specific endpoint
    if (exchange === "alpaca") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-disconnect`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }
        );

        const data = await response.json();
        if (data.success) {
          toast({
            title: "Alpaca Disconnected",
            description: "Successfully disconnected from Alpaca",
          });
          refetch();
        } else {
          toast({
            title: "Disconnection Failed",
            description: data.error || "Failed to disconnect",
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Disconnection Failed",
          description: "Failed to disconnect from Alpaca",
          variant: "destructive",
        });
      }
      return;
    }

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
    <div className="space-y-3">
      <div className="grid gap-2">
        {EXCHANGES.map((exchange) => {
          const connection = getConnectionForExchange(exchange.id);
          const isConnected = connection?.status === "connected";
          const hasIssue = connection?.status === "invalid" || connection?.status === "revoked";

          return (
            <div
              key={exchange.id}
              className={`p-3 rounded-lg border ${exchange.color} transition-colors`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={exchange.logo} alt={exchange.name} className="h-8 w-8 rounded-md object-contain" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{exchange.name}</span>
                      {isConnected && (
                        <Badge variant="success" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                      {hasIssue && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <XCircle className="h-3 w-3" />
                          {connection?.status === "revoked" ? "Revoked" : "Invalid"}
                        </Badge>
                      )}
                      {exchange.id === "alpaca" && isConnected && connection?.label && (
                        <Badge
                          variant="outline"
                          className={connection.label === "paper"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs"
                            : "bg-red-500/10 text-red-500 border-red-500/30 text-xs"
                          }
                        >
                          {connection.label === "paper" ? "Paper" : "Live"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isConnected ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(exchange.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectExchange(exchange.id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
              {hasIssue && connection?.error_message && (
                <p className="text-xs text-destructive mt-2">{connection.error_message}</p>
              )}
            </div>
          );
        })}
      </div>
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Connect Your Exchange</DialogTitle>
            <DialogDescription>
              {selectedExchange
                ? "Enter your API credentials to connect your exchange account."
                : "Select an exchange to connect your account."}
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

      <AlpacaConnectionModal
        open={showAlpacaModal}
        onOpenChange={setShowAlpacaModal}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
}
