# Lovable Prompt: Add Alpaca Broker Connection UI

Copy and paste this prompt into Lovable.dev:

---

Add Alpaca broker integration to the exchange connections page.

**CONTEXT:**
- Backend is already deployed (Supabase Edge Functions)
- I have existing exchange connection cards for Binance, Bitvavo, Coinbase
- Need to add Alpaca (stock/crypto broker) following the same pattern

**REQUIREMENTS:**

**1. Add Alpaca Connection Card**
Add a new card on the connections page (where Binance/Bitvavo/Coinbase cards are shown):
- Alpaca logo/icon (use teal/green color #3dd68c or placeholder "A")
- Title: "Alpaca"
- When NOT connected: "Connect Alpaca" button
- When connected show:
  * Green "Connected" badge
  * Environment badge: "Paper Trading" or "Live Trading"
  * Last sync time
  * Trade count (from verified_trades_count)
  * "Sync Now" button
  * "Disconnect" button

**2. Alpaca Connection Modal**
When user clicks "Connect Alpaca", open modal with:

**Form Fields:**
- Environment selector (dropdown or toggle):
  * Option 1: "Paper Trading (Simulated Money - Recommended)"
  * Option 2: "Live Trading (Real Money)"
- API Key ID input:
  * Label: "API Key ID"
  * Type: text
  * Placeholder: "PKXXXXXXXXXXXXXXXX"
  * Required
- API Secret input:
  * Label: "API Secret"
  * Type: password
  * Placeholder: "Enter your API secret"
  * Required
  * Help text below: "Your API secret is encrypted before being stored and never logged."

**Warning when Live selected:**
Show orange/yellow warning box: "⚠️ Warning: Live trading uses real money. Make sure you intend to use your live account."

**Collapsible Instructions:**
Add a "▶ How to get Alpaca API keys" toggle that expands to show:
1. Go to Alpaca Dashboard (https://app.alpaca.markets/paper/dashboard for paper)
2. Navigate to "API Keys" in the sidebar
3. Click "Generate New Key"
4. **Important:** Select "View Only" permissions (recommended for security)
5. Copy both the API Key ID and Secret Key
6. ⚠️ Store the Secret Key securely - you won't be able to retrieve it later!

**Buttons:**
- Cancel (secondary button)
- Connect (primary button, disabled until both fields filled, shows loading spinner when connecting)

**3. API Integration**

Check connection status:
```typescript
const { data: connection } = await supabase
  .from('exchange_connections')
  .select('*')
  .eq('exchange', 'alpaca')
  .eq('status', 'connected')
  .single();
```

Connect:
```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-connect`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      environment, // "paper" or "live"
      apiKeyId,
      apiSecret,
    }),
  }
);

const data = await response.json();
if (data.connected) {
  toast.success(`Alpaca ${environment} connected!`);
  // Refresh connection list
} else {
  toast.error(data.error);
}
```

Sync:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-sync`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session?.access_token}` },
  }
);

const data = await response.json();
if (data.success) {
  if (data.imported > 0) {
    toast.success(`Imported ${data.imported} new trades!`);
  } else {
    toast.success('No new trades to import. You\'re up to date!');
  }
} else {
  toast.error(data.error);
}
```

Disconnect:
```typescript
const confirmed = window.confirm(
  'Are you sure you want to disconnect your Alpaca account? ' +
  'Your imported trades will remain, but automatic syncing will stop.'
);
if (!confirmed) return;

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-disconnect`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session?.access_token}` },
  }
);

const data = await response.json();
if (data.success) {
  toast.success('Alpaca disconnected');
  // Refresh connection list
} else {
  toast.error(data.error);
}
```

**4. UX Requirements**
- Match the exact style of existing Binance/Bitvavo/Coinbase cards
- Show loading spinners during API calls
- Disable buttons during loading
- Clear form after successful connection
- Auto-refresh connection list after connect/disconnect/sync
- Validate: API Key ID and Secret must be at least 10 characters
- Mobile responsive

**5. Important:**
- Never console.log the apiSecret
- Use import.meta.env.VITE_SUPABASE_URL for the base URL
- Handle all error cases with toast messages
- Show success feedback after each action

Match my existing exchange connection UI style perfectly. Create the modal component and add the Alpaca card to my connections page.
