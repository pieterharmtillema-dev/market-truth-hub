# Lovable AI Prompt: Alpaca Broker Integration UI

Use this prompt with Lovable (lovable.dev) to generate the frontend UI for the Alpaca broker integration.

---

## 📋 Prompt for Lovable

```
I need you to add Alpaca broker integration to my trading journal app. The backend is already complete - I just need the frontend UI.

CONTEXT:
- Backend: Supabase Edge Functions (already deployed)
- Existing stack: React + TypeScript + Supabase + Tailwind CSS
- I already have exchange connection functionality for crypto exchanges (Binance, Bitvavo, Coinbase)
- Need to add Alpaca (stock/crypto broker) to the connections UI

REQUIREMENTS:

1. ADD ALPACA TO EXCHANGE CONNECTIONS PAGE

Location: The page/component where users manage their exchange connections

Add Alpaca as a new exchange option with:
- Alpaca logo (use a placeholder or find alpaca logo SVG)
- "Connect Alpaca" button when not connected
- Connected status badge when connected
- Last sync time display
- "Sync Now" and "Disconnect" buttons when connected

2. CREATE ALPACA CONNECTION MODAL

When user clicks "Connect Alpaca", show a modal with:

FORM FIELDS:
- Environment selector (dropdown/toggle):
  * "Paper Trading (Simulated Money - Recommended)"
  * "Live Trading (Real Money)"
- API Key ID input (text field, placeholder: "PKXXXXXXXXXXXXXXXX")
- API Secret input (password field, placeholder: "Enter your API secret")
- Help text: "Your API secret is encrypted before being stored and never logged."

INSTRUCTIONS SECTION (collapsible):
Show instructions on how to get Alpaca API keys:
1. Go to Alpaca Dashboard (link to https://app.alpaca.markets/paper/dashboard)
2. Navigate to "API Keys" in the sidebar
3. Click "Generate New Key"
4. **Important:** Select "View Only" permissions (recommended for security)
5. Copy both the API Key ID and Secret Key
6. ⚠️ Store the Secret Key securely - you won't be able to retrieve it later!

WARNING (when Live is selected):
⚠️ Warning: Live trading uses real money. Make sure you intend to use your live account.

BUTTONS:
- Cancel button
- Connect button (disabled until both fields filled, shows loading spinner when connecting)

3. API INTEGRATION

Connect endpoint:
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
  // Success! Show toast and refresh connection list
  toast.success(`Alpaca ${environment} connected!`);
} else {
  // Error
  toast.error(data.error);
}
```

Sync endpoint:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-sync`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
  }
);

const data = await response.json();

if (data.success) {
  toast.success(`Imported ${data.imported} new trades!`);
} else {
  toast.error(data.error);
}
```

Disconnect endpoint:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-disconnect`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
  }
);

const data = await response.json();

if (data.success) {
  toast.success('Alpaca disconnected');
} else {
  toast.error(data.error);
}
```

4. CHECK CONNECTION STATUS

Query the database to show current connection status:
```typescript
const { data: connection } = await supabase
  .from('exchange_connections')
  .select('*')
  .eq('exchange', 'alpaca')
  .eq('status', 'connected')
  .single();

// If connection exists, show:
// - Environment (connection.environment)
// - Last sync time (connection.last_sync_at)
// - Trades synced count (connection.verified_trades_count)
```

5. DESIGN REQUIREMENTS

- Match the existing exchange connection cards style
- Use your existing color scheme
- Add a distinctive color for Alpaca (suggest: green/teal to match their brand)
- Responsive design (mobile-friendly)
- Loading states for all async operations
- Error handling with toast notifications
- Form validation (check API key length, required fields)
- Confirmation dialog before disconnect ("Are you sure? Your imported trades will remain but syncing will stop.")

6. UX CONSIDERATIONS

- Disable "Connect" button until both API Key ID and Secret are entered
- Show loading spinner during connection/sync
- Clear sensitive fields after successful connection
- Show success message with account info after connecting
- Auto-refresh connection list after connect/disconnect
- Show "No new trades to import" message if sync finds nothing
- Indicate sync in progress with spinner on sync button

TECHNICAL NOTES:
- Never log API keys to console
- Clear form fields after successful connection
- Handle all error cases gracefully
- Use environment variable for Supabase URL: import.meta.env.VITE_SUPABASE_URL
- Follow your existing patterns for modals, forms, and buttons

Please create:
1. AlpacaConnectionModal component
2. AlpacaConnectionCard component (for the connections page)
3. Update the connections page to include the Alpaca card
4. Add necessary state management and API calls

Style it to match my existing exchange connection UI perfectly.
```

---

## 🎨 Alternative: Simpler Prompt (If Lovable Has Context)

If Lovable already has context about your app structure:

```
Add Alpaca broker integration UI to the exchange connections page.

WHAT TO BUILD:
1. Alpaca connection card on connections page (like existing Binance/Bitvavo cards)
2. Modal with:
   - Environment dropdown (Paper/Live)
   - API Key ID input
   - API Secret password input
   - Collapsible instructions for getting API keys
   - Warning when Live is selected
3. Sync and Disconnect buttons when connected

API ENDPOINTS (already working):
- POST /functions/v1/alpaca-connect (body: environment, apiKeyId, apiSecret)
- POST /functions/v1/alpaca-sync
- POST /functions/v1/alpaca-disconnect

DATABASE:
Check connection: supabase.from('exchange_connections').select('*').eq('exchange', 'alpaca')

DESIGN:
- Match existing exchange connection cards
- Use green/teal accent for Alpaca
- Show environment badge (Paper/Live)
- Display last sync time and trade count
- Mobile responsive

Make it look and work exactly like the existing crypto exchange connections.
```

---

## 📝 What to Include When Sending to Lovable

1. **Context about your app**:
   - "This is a trading journal app"
   - "I already have exchange connections for Binance, Bitvavo, Coinbase"
   - "I use Supabase for backend and auth"

2. **Point to existing patterns**:
   - "Match the style of my existing exchange connection cards"
   - "Use the same modal pattern I have for other exchanges"
   - "Follow my existing button and form styles"

3. **Specific file locations** (if Lovable needs them):
   - Connection page component path
   - Where to add the new modal component
   - Where exchange connection cards are displayed

4. **Dependencies** (if not already installed):
   ```json
   {
     "@supabase/supabase-js": "^2.x",
     "@supabase/auth-helpers-react": "^0.x"
   }
   ```

---

## 🎯 Expected Output from Lovable

Lovable should generate:

1. **AlpacaConnectionModal.tsx** - Full modal component with form
2. **AlpacaConnectionCard.tsx** - Connection status card
3. **Updated connections page** - Includes Alpaca card
4. **API integration hooks** - Connect/sync/disconnect logic
5. **Styling** - Matching your existing design system

---

## 🔍 Verification After Lovable Implementation

Check that Lovable implemented:

- ✅ Environment selector (Paper/Live)
- ✅ API Key ID and Secret inputs
- ✅ Collapsible instructions
- ✅ Warning for Live environment
- ✅ Connect/Sync/Disconnect buttons
- ✅ Loading states
- ✅ Error handling with toasts
- ✅ Connection status display
- ✅ Last sync time
- ✅ Trade count display
- ✅ Responsive design
- ✅ Form validation
- ✅ Confirmation before disconnect

---

## 🐛 Common Issues & Fixes

If Lovable generates code with issues:

### Issue: Wrong Supabase URL
```typescript
// ❌ Wrong
const url = 'https://hbmebifvlghmhuthofnq.supabase.co';

// ✅ Correct
const url = import.meta.env.VITE_SUPABASE_URL;
```

### Issue: Missing Authorization Header
```typescript
// ❌ Wrong
headers: { 'Content-Type': 'application/json' }

// ✅ Correct
const { data: { session } } = await supabase.auth.getSession();
headers: {
  'Authorization': `Bearer ${session?.access_token}`,
  'Content-Type': 'application/json'
}
```

### Issue: Not Handling Errors
```typescript
// ✅ Add error handling
if (!response.ok) {
  const error = await response.json();
  toast.error(error.error || 'Connection failed');
  return;
}
```

### Issue: Logging Secrets
```typescript
// ❌ Never do this
console.log('API Secret:', apiSecret);

// ✅ Safe logging
console.log('Connecting Alpaca...');
```

---

## 🎨 Design Assets

If Lovable needs a logo, you can:

1. Use this SVG placeholder:
```svg
<svg viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" fill="#3dd68c"/>
  <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">A</text>
</svg>
```

2. Or download official logo from: https://alpaca.markets/press
   - Brand color: `#3dd68c` (teal/green)

---

## 📱 Mobile Considerations

Tell Lovable to ensure:
- Modal is scrollable on mobile
- Form inputs are touch-friendly (min 44px height)
- Environment selector works on mobile
- Instructions are readable on small screens
- Buttons are properly sized for mobile taps

---

## ✅ Testing Checklist After Implementation

After Lovable generates the code, test:

1. **Connection Flow**:
   - [ ] Open modal
   - [ ] Switch environment (paper/live)
   - [ ] See warning when selecting live
   - [ ] Enter API credentials
   - [ ] Submit form
   - [ ] See success message
   - [ ] Connection appears as connected

2. **Sync Flow**:
   - [ ] Click "Sync Now"
   - [ ] See loading spinner
   - [ ] See success message with import count
   - [ ] Last sync time updates

3. **Disconnect Flow**:
   - [ ] Click disconnect
   - [ ] See confirmation dialog
   - [ ] Confirm disconnect
   - [ ] Connection removed from UI

4. **Error Handling**:
   - [ ] Try invalid API keys → See error message
   - [ ] Try empty form → Button disabled
   - [ ] Network error → See error toast

---

## 🚀 Ready to Use!

Copy the main prompt above and paste it into Lovable. The AI should generate all the necessary UI components matching your existing design patterns.

If you need to iterate, provide Lovable with:
- Screenshots of your existing exchange cards for style reference
- Your color palette/design tokens
- Specific component structure preferences

Good luck! 🎉
