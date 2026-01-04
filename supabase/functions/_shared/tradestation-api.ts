/**
 * TradeStation API Client
 *
 * Wrapper for TradeStation OAuth 2.0 and Brokerage API endpoints.
 * Handles token exchange, refresh, and trade execution fetching.
 *
 * API Documentation: https://api.tradestation.com/docs/
 */

// TypeScript interfaces for TradeStation API responses

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // Seconds until expiration (typically 1200 = 20 minutes)
  token_type: string; // "Bearer"
  scope?: string;
}

export interface TokenErrorResponse {
  error: string; // e.g., "invalid_grant", "invalid_client"
  error_description?: string;
}

export interface TradestationAccount {
  AccountID: string;
  AccountType: string; // e.g., "Cash", "Margin", "Futures"
  DisplayName: string;
  Status: string; // e.g., "Active"
  Currency: string; // e.g., "USD"
}

export interface TradestationExecution {
  ExecutionID: string; // Unique execution identifier
  AccountID: string;
  OrderID: string; // Groups partial fills
  Symbol: string; // e.g., "AAPL", "@ES", "TSLA 220617C00150000"
  Quantity: number;
  Price: number;
  TradeDate: string; // ISO8601 timestamp
  ExecutionType: 'Buy' | 'Sell' | 'Sell Short' | 'Buy to Cover';
  CommissionFee: number;
  AssetType?: string; // e.g., "Stock", "Future", "Option"
}

export interface ExecutionsResponse {
  Executions: TradestationExecution[];
  NextToken?: string; // For pagination
}

/**
 * TradeStation API configuration
 */
const TRADESTATION_AUTH_BASE = 'https://signin.tradestation.com';
const TRADESTATION_API_BASE = 'https://api.tradestation.com/v3';

/**
 * Exchanges authorization code for access and refresh tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param clientId - TradeStation OAuth client ID
 * @param clientSecret - TradeStation OAuth client secret
 * @param redirectUri - OAuth redirect URI (must match registered URI)
 * @returns Token response with access_token, refresh_token, and expires_in
 * @throws Error if token exchange fails
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch(`${TRADESTATION_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error: TokenErrorResponse = await response.json();
    throw new Error(
      `Token exchange failed: ${error.error} - ${error.error_description || 'Unknown error'}`
    );
  }

  return await response.json();
}

/**
 * Refreshes an expired access token using refresh token
 *
 * @param refreshToken - The refresh token from previous token response
 * @param clientId - TradeStation OAuth client ID
 * @param clientSecret - TradeStation OAuth client secret
 * @returns New token response with fresh access_token and possibly new refresh_token
 * @throws Error if refresh fails (e.g., refresh token revoked)
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  const response = await fetch(`${TRADESTATION_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error: TokenErrorResponse = await response.json();

    // Special handling for revoked tokens
    if (error.error === 'invalid_grant') {
      throw new Error('REFRESH_TOKEN_REVOKED');
    }

    throw new Error(
      `Token refresh failed: ${error.error} - ${error.error_description || 'Unknown error'}`
    );
  }

  return await response.json();
}

/**
 * Fetches user's brokerage accounts
 *
 * @param accessToken - Valid OAuth access token
 * @returns Array of brokerage accounts
 * @throws Error if API request fails
 */
export async function getAccounts(
  accessToken: string
): Promise<TradestationAccount[]> {
  const response = await fetch(`${TRADESTATION_API_BASE}/brokerage/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch accounts (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  return data.Accounts || [];
}

/**
 * Fetches trade executions for a specific account
 *
 * @param accessToken - Valid OAuth access token
 * @param accountId - The brokerage account ID
 * @param since - Optional ISO8601 timestamp to fetch executions since (for incremental sync)
 * @param pageSize - Number of executions per page (max 100)
 * @returns Executions response with array of executions and optional pagination token
 * @throws Error if API request fails
 */
export async function getExecutions(
  accessToken: string,
  accountId: string,
  since?: string,
  pageSize: number = 100
): Promise<ExecutionsResponse> {
  const params = new URLSearchParams({
    pageSize: Math.min(pageSize, 100).toString(),
  });

  if (since) {
    params.append('since', since);
  }

  const url = `${TRADESTATION_API_BASE}/brokerage/accounts/${accountId}/executions?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch executions for account ${accountId} (${response.status}): ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Builds the OAuth authorization URL for user redirect
 *
 * @param clientId - TradeStation OAuth client ID
 * @param redirectUri - OAuth redirect URI
 * @param state - CSRF protection state parameter
 * @param scopes - Array of OAuth scopes (default: read-only scopes)
 * @returns Full authorization URL
 */
export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[] = [
    'openid',
    'profile',
    'offline_access',
    'ReadAccount',
    'MarketData',
  ]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  return `${TRADESTATION_AUTH_BASE}/authorize?${params}`;
}

/**
 * Determines asset class from TradeStation symbol format
 *
 * @param symbol - TradeStation symbol (e.g., "AAPL", "@ES", "TSLA 220617C00150000")
 * @returns Asset class: "equity", "futures", "options", or "other"
 */
export function determineAssetClass(symbol: string): string {
  // Futures: Start with @ or single/double letter codes (ES, NQ, etc.)
  if (symbol.startsWith('@') || /^[A-Z]{1,2}$/.test(symbol)) {
    return 'futures';
  }

  // Options: Contain spaces or are very long (OCC format)
  if (symbol.includes(' ') || symbol.length > 6) {
    return 'options';
  }

  // Default to equity (stocks)
  return 'equity';
}

/**
 * Normalizes TradeStation ExecutionType to trading side
 *
 * @param executionType - TradeStation execution type
 * @returns 'long' or 'short'
 */
export function normalizeSide(
  executionType: TradestationExecution['ExecutionType']
): 'long' | 'short' {
  switch (executionType) {
    case 'Buy':
    case 'Buy to Cover':
      return 'long';
    case 'Sell':
    case 'Sell Short':
      return 'short';
    default:
      return 'long'; // Default fallback
  }
}
