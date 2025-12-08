import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Eye, EyeOff, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApiKeySectionProps {
  apiKey: string | null;
  userId: string;
  onKeyRegenerated: (newKey: string) => void;
}

export function ApiKeySection({ apiKey, userId, onKeyRegenerated }: ApiKeySectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!apiKey) return;
    
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy API key');
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? Your Chrome extension will need to be updated with the new key.')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_user_api_key', {
        target_user_id: userId
      });

      if (error) throw error;

      onKeyRegenerated(data as string);
      toast.success('API key regenerated successfully');
    } catch (error) {
      console.error('Error regenerating API key:', error);
      toast.error('Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const maskedKey = apiKey ? `${apiKey.substring(0, 7)}${'•'.repeat(20)}${apiKey.substring(apiKey.length - 4)}` : '';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Chrome Extension API Key</CardTitle>
        <CardDescription>
          Use this key to authenticate your Chrome extension for real-time trade capture.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={showKey ? (apiKey || '') : maskedKey}
              readOnly
              className="pr-10 font-mono text-sm bg-muted"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!apiKey}
            title="Copy API key"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Set this as the <code className="bg-muted px-1 rounded">x-api-key</code> header in your extension.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="text-destructive hover:text-destructive"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
