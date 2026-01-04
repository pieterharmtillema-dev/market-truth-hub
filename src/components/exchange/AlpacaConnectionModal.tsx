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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Loader2, 
  Eye, 
  EyeOff,
  ChevronDown,
  ExternalLink,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import alpacaLogo from "@/assets/alpaca-logo.svg";

interface AlpacaConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AlpacaEnvironment = "paper" | "live";

export function AlpacaConnectionModal({ 
  open, 
  onOpenChange,
  onSuccess 
}: AlpacaConnectionModalProps) {
  const [environment, setEnvironment] = useState<AlpacaEnvironment>("paper");
  const [apiKeyId, setApiKeyId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyId.trim() || !apiSecret.trim()) {
      setFormError("Please fill in all fields");
      return;
    }

    if (apiKeyId.trim().length < 10) {
      setFormError("API Key ID seems too short");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setFormError("Not authenticated");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            environment,
            apiKeyId: apiKeyId.trim(),
            apiSecret: apiSecret.trim(),
          }),
        }
      );

      const data = await response.json();

      // Clear sensitive data immediately
      setApiKeyId("");
      setApiSecret("");

      if (data.connected) {
        toast({
          title: "Alpaca Connected",
          description: `Successfully connected to Alpaca ${environment === 'paper' ? 'Paper' : 'Live'} Trading`,
        });
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        setFormError(data.error || "Failed to connect to Alpaca");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEnvironment("paper");
    setApiKeyId("");
    setApiSecret("");
    setShowSecret(false);
    setFormError(null);
    setShowInstructions(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={alpacaLogo} alt="Alpaca" className="h-6 w-6 rounded" />
            Connect Alpaca
          </DialogTitle>
          <DialogDescription>
            Enter your Alpaca API credentials to sync your trading history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Environment Selector */}
          <div className="space-y-2">
            <Label htmlFor="environment">Trading Environment</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as AlpacaEnvironment)}>
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">
                  <div className="flex flex-col items-start">
                    <span>Paper Trading</span>
                    <span className="text-xs text-muted-foreground">Simulated money - Recommended</span>
                  </div>
                </SelectItem>
                <SelectItem value="live">
                  <div className="flex flex-col items-start">
                    <span>Live Trading</span>
                    <span className="text-xs text-muted-foreground">Real money</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Live Warning */}
          {environment === "live" && (
            <Alert className="border-warning/30 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                <strong>Warning:</strong> Live trading uses real money. Make sure you intend to use your live account.
              </AlertDescription>
            </Alert>
          )}

          {/* API Key ID */}
          <div className="space-y-2">
            <Label htmlFor="apiKeyId">API Key ID</Label>
            <Input
              id="apiKeyId"
              type="text"
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              placeholder="PKXXXXXXXXXXXXXXXX"
              autoComplete="off"
              required
            />
          </div>

          {/* API Secret */}
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
              Your API secret is encrypted before being stored and never logged.
            </p>
          </div>

          {/* Instructions Collapsible */}
          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between px-2 h-auto py-2">
                <span className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4" />
                  How to get Alpaca API keys
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 px-2 pt-2">
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  Go to{" "}
                  <a 
                    href={environment === "paper" 
                      ? "https://app.alpaca.markets/paper/dashboard" 
                      : "https://app.alpaca.markets/live/dashboard"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Alpaca Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Navigate to "API Keys" in the sidebar</li>
                <li>Click "Generate New Key"</li>
                <li><strong>Important:</strong> Select "View Only" permissions (recommended for security)</li>
                <li>Copy both the API Key ID and Secret Key</li>
              </ol>
              <Alert className="border-warning/30 bg-warning/5 mt-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs">
                  Store the Secret Key securely - you won't be able to retrieve it later!
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>

          {/* Error Display */}
          {formError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !apiKeyId.trim() || !apiSecret.trim()}
              className="flex-1 bg-[#3dd68c] hover:bg-[#32b877] text-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
