import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * OAuth Callback Page
 *
 * Handles the OAuth 2.0 redirect from TradeStation.
 * Validates state, exchanges code for tokens, and notifies the parent window.
 */
export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting your exchange...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for user denial or OAuth error
      if (error) {
        setStatus('error');
        setMessage(
          errorDescription
            ? `Authorization cancelled: ${errorDescription}`
            : `Authorization error: ${error}`
        );

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'oauth-error',
                error: errorDescription || error,
              },
              window.location.origin
            );
            window.close();
          } else {
            navigate('/settings');
          }
        }, 2000);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code or state parameter');
        return;
      }

      // Validate state matches what we stored
      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        setStatus('error');
        setMessage(
          'Invalid state parameter. This may be a security issue. Please try again.'
        );

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'oauth-error',
                error: 'Invalid state parameter',
              },
              window.location.origin
            );
            window.close();
          } else {
            navigate('/settings');
          }
        }, 2000);
        return;
      }

      try {
        // Exchange code for tokens via edge function
        const { data, error: callbackError } = await supabase.functions.invoke(
          'tradestation-oauth-callback',
          {
            body: { code, state },
          }
        );

        if (callbackError || data?.error) {
          throw new Error(data?.error || callbackError?.message || 'OAuth callback failed');
        }

        setStatus('success');
        setMessage('TradeStation connected successfully!');

        // Clean up session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_exchange');

        // Notify opener window and close popup
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'oauth-success',
                connection: data.connection,
              },
              window.location.origin
            );
            window.close();
          } else {
            // If not in popup, redirect to settings
            navigate('/settings');
          }
        }, 1500);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Failed to connect exchange. Please try again.'
        );

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'oauth-error',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              window.location.origin
            );
          }
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
            <p className="text-lg text-foreground">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <p className="text-lg text-green-600 font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <p className="text-lg text-destructive font-medium">Connection Failed</p>
            <p className="text-sm text-muted-foreground max-w-md">{message}</p>
            {!window.opener && (
              <button
                onClick={() => navigate('/settings')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Settings
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
