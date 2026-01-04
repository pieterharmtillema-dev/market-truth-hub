/**
 * Frontend Integration Example for Alpaca Connector
 *
 * This file provides example React/TypeScript components for integrating
 * the Alpaca broker connection into your trading journal app.
 *
 * Copy and adapt these components to your frontend codebase.
 */

import { useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

// ============================================================================
// TYPES
// ============================================================================

type AlpacaEnvironment = 'paper' | 'live';

interface AlpacaConnectionResponse {
  connected: boolean;
  environment: AlpacaEnvironment;
  account: {
    id: string;
    account_number: string;
    status: string;
    currency: string;
    buying_power: string;
    portfolio_value: string;
    pattern_day_trader: boolean;
  };
  connection: {
    id: string;
    exchange: string;
    status: string;
    last_sync_at: string;
  };
}

interface AlpacaSyncResponse {
  success: boolean;
  imported: number;
  skipped_duplicates: number;
  total_fetched: number;
  newest_cursor: string;
}

// ============================================================================
// ALPACA CONNECTION MODAL COMPONENT
// ============================================================================

export function AlpacaConnectionModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [environment, setEnvironment] = useState<AlpacaEnvironment>('paper');
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleConnect = async () => {
    if (!user) {
      setError('You must be logged in to connect Alpaca');
      return;
    }

    // Validation
    if (!apiKeyId || !apiSecret) {
      setError('Please enter both API Key ID and Secret');
      return;
    }

    if (apiKeyId.length < 10 || apiSecret.length < 10) {
      setError('API keys appear too short. Please check your credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/alpaca-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            environment,
            apiKeyId,
            apiSecret,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.connected) {
        throw new Error(data.error || 'Failed to connect Alpaca');
      }

      // Success!
      console.log('Alpaca connected:', data);

      // Clear form
      setApiKeyId('');
      setApiSecret('');

      // Call success callback
      onSuccess?.();

      // Show success message (use your toast library)
      alert(`Successfully connected Alpaca ${environment} account!\nAccount: ${data.account.account_number}\nBuying Power: $${data.account.buying_power}`);

      onClose();
    } catch (err) {
      console.error('Alpaca connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Connect Alpaca Trading Account</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          {/* Instructions Toggle */}
          <div className="instructions-toggle">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-link"
            >
              {showInstructions ? '▼' : '▶'} How to get Alpaca API keys
            </button>
          </div>

          {/* Instructions (collapsible) */}
          {showInstructions && (
            <div className="instructions-box">
              <ol>
                <li>Go to <a href="https://app.alpaca.markets/paper/dashboard" target="_blank">Alpaca Dashboard</a></li>
                <li>Navigate to "API Keys" in the sidebar</li>
                <li>Click "Generate New Key"</li>
                <li><strong>Important:</strong> Select <strong>"View Only"</strong> permissions (recommended for security)</li>
                <li>Copy both the API Key ID and Secret Key</li>
                <li>⚠️ Store the Secret Key securely - you won't be able to retrieve it later!</li>
              </ol>
              <p className="note">
                <strong>Paper vs Live:</strong> Paper trading uses simulated money (free, no risk).
                Live trading uses real money. Start with paper to test!
              </p>
            </div>
          )}

          {/* Environment Selection */}
          <div className="form-group">
            <label htmlFor="environment">Environment</label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as AlpacaEnvironment)}
              className="form-select"
              disabled={isLoading}
            >
              <option value="paper">Paper Trading (Simulated Money - Recommended)</option>
              <option value="live">Live Trading (Real Money)</option>
            </select>
            {environment === 'live' && (
              <p className="warning-text">
                ⚠️ Warning: Live trading uses real money. Make sure you intend to use your live account.
              </p>
            )}
          </div>

          {/* API Key ID */}
          <div className="form-group">
            <label htmlFor="apiKeyId">
              API Key ID
              <span className="required">*</span>
            </label>
            <input
              id="apiKeyId"
              type="text"
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value.trim())}
              placeholder="PKXXXXXXXXXXXXXXXX"
              className="form-input"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* API Secret */}
          <div className="form-group">
            <label htmlFor="apiSecret">
              API Secret
              <span className="required">*</span>
            </label>
            <input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value.trim())}
              placeholder="Enter your API secret"
              className="form-input"
              disabled={isLoading}
              autoComplete="off"
            />
            <p className="help-text">
              Your API secret is encrypted before being stored and never logged.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            className="btn btn-primary"
            disabled={isLoading || !apiKeyId || !apiSecret}
          >
            {isLoading ? 'Connecting...' : 'Connect Alpaca'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ALPACA SYNC BUTTON COMPONENT
// ============================================================================

export function AlpacaSyncButton({
  onSyncComplete
}: {
  onSyncComplete?: (result: AlpacaSyncResponse) => void;
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/alpaca-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data: AlpacaSyncResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      console.log('Sync result:', data);

      // Call callback
      onSyncComplete?.(data);

      // Show success message
      if (data.imported > 0) {
        alert(`Successfully imported ${data.imported} new trades!`);
      } else {
        alert('No new trades to import. You\'re up to date!');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
      alert(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="sync-button-container">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="btn btn-sync"
      >
        {isSyncing ? (
          <>
            <span className="spinner"></span>
            Syncing...
          </>
        ) : (
          <>
            <span className="icon">🔄</span>
            Sync Alpaca Trades
          </>
        )}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

// ============================================================================
// ALPACA DISCONNECT BUTTON COMPONENT
// ============================================================================

export function AlpacaDisconnectButton({
  onDisconnect
}: {
  onDisconnect?: () => void;
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [isLoading, setIsLoading] = useState(false);

  const handleDisconnect = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Alpaca account? ' +
      'Your imported trades will remain, but automatic syncing will stop.'
    );

    if (!confirmed) return;

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/alpaca-disconnect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Disconnect failed');
      }

      // Success
      onDisconnect?.();
      alert('Alpaca account disconnected successfully');
    } catch (err) {
      console.error('Disconnect error:', err);
      alert(`Failed to disconnect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDisconnect}
      disabled={isLoading}
      className="btn btn-danger"
    >
      {isLoading ? 'Disconnecting...' : 'Disconnect Alpaca'}
    </button>
  );
}

// ============================================================================
// FULL ALPACA CONNECTION CARD COMPONENT
// ============================================================================

export function AlpacaConnectionCard() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check connection status on mount
  const checkConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('exchange', 'alpaca')
        .eq('status', 'connected')
        .single();

      if (!error && data) {
        setIsConnected(true);
        setConnectionInfo(data);
      } else {
        setIsConnected(false);
        setConnectionInfo(null);
      }
    } catch (err) {
      console.error('Error checking Alpaca connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check on mount and when user changes
  useState(() => {
    checkConnection();
  }, [user]);

  if (isLoading) {
    return <div className="loading">Loading Alpaca connection...</div>;
  }

  return (
    <div className="exchange-card alpaca-card">
      <div className="card-header">
        <img
          src="/alpaca-logo.svg"
          alt="Alpaca"
          className="exchange-logo"
        />
        <h3>Alpaca</h3>
        {isConnected && (
          <span className="status-badge connected">Connected</span>
        )}
      </div>

      <div className="card-body">
        {isConnected ? (
          <>
            <p className="connection-info">
              Environment: <strong>{connectionInfo?.environment}</strong>
              <br />
              Last Sync: {connectionInfo?.last_sync_at
                ? new Date(connectionInfo.last_sync_at).toLocaleString()
                : 'Never'}
              <br />
              Trades Synced: <strong>{connectionInfo?.verified_trades_count || 0}</strong>
            </p>

            <div className="button-group">
              <AlpacaSyncButton onSyncComplete={checkConnection} />
              <AlpacaDisconnectButton onDisconnect={checkConnection} />
            </div>
          </>
        ) : (
          <>
            <p className="description">
              Connect your Alpaca trading account to automatically import your stock and crypto trades.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
            >
              Connect Alpaca
            </button>
          </>
        )}
      </div>

      {/* Connection Modal */}
      <AlpacaConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={checkConnection}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE USAGE IN YOUR APP
// ============================================================================

/*
// In your Connections page or Exchange Settings page:

import { AlpacaConnectionCard } from '@/components/AlpacaConnectionCard';

export default function ConnectionsPage() {
  return (
    <div className="connections-page">
      <h1>Connected Exchanges</h1>

      <div className="exchange-grid">
        <AlpacaConnectionCard />
        {/* Other exchange cards *\/}
      </div>
    </div>
  );
}

// Or add to existing exchange connection modal:

import { AlpacaConnectionModal } from '@/components/AlpacaConnectionModal';

const [selectedExchange, setSelectedExchange] = useState<string | null>(null);

// In your exchange selection UI
<button onClick={() => setSelectedExchange('alpaca')}>
  Connect Alpaca
</button>

{selectedExchange === 'alpaca' && (
  <AlpacaConnectionModal
    isOpen={true}
    onClose={() => setSelectedExchange(null)}
    onSuccess={() => {
      // Refresh connection list
      fetchConnections();
    }}
  />
)}
*/

// ============================================================================
// EXAMPLE CSS (Tailwind or regular CSS)
// ============================================================================

/*
// Tailwind classes you can use:

.modal-overlay: fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50
.modal-content: bg-white rounded-lg shadow-xl max-w-md w-full p-6
.form-group: mb-4
.form-label: block text-sm font-medium mb-2
.form-input: w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500
.btn-primary: bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50
.error-box: bg-red-50 border border-red-200 text-red-700 p-3 rounded-md
.warning-text: text-orange-600 text-sm mt-1

// Or regular CSS:

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-box {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
*/
