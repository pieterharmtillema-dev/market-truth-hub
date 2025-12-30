# How to Update Environment Variables in Lovable (Step-by-Step)

## The Problem
Lovable keeps reverting your environment variables back to the old Supabase key because the old values might be cached or set in multiple places.

## Solution: Properly Update Environment Variables

### Method 1: Through Lovable Dashboard (Recommended)

1. **Go to Lovable Dashboard**
   - Navigate to https://lovable.dev
   - Login if needed
   - Select your "market-truth-hub" project

2. **Find Environment Variables Section**
   - Look for one of these sections:
     - "Settings" → "Environment Variables"
     - "Deploy" → "Environment Variables"
     - "Project Settings" → "Environment"
     - A gear/settings icon

3. **DELETE the Old Variables First** (Important!)
   - Find `VITE_SUPABASE_URL`
   - Click "Delete" or the trash icon
   - Find `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Click "Delete" or the trash icon
   - **Save/Apply changes**

4. **Add the New Variables**
   - Click "Add Variable" or "New Variable"
   - Add first variable:
     ```
     Key: VITE_SUPABASE_URL
     Value: https://sdvbjhtgzhkphkkpwekd.supabase.co
     ```
   - Add second variable:
     ```
     Key: VITE_SUPABASE_PUBLISHABLE_KEY
     Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJqaHRnemhrcGhra3B3ZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTMsImV4cCI6MjA4MDc4NjgxM30.pZ_PcRMOqPjJJevMpgC5vto2iuKpwzwgWKxKXeS7dis
     ```

5. **Force a Redeploy**
   - After saving, trigger a manual redeploy:
   - Look for "Redeploy" or "Rebuild" button
   - OR make a small change to trigger rebuild (see Method 2)

### Method 2: Force Redeploy via Git Commit

If the dashboard method doesn't work, you can force Lovable to use the new variables by triggering a fresh deployment:

```bash
# Make a small change to force redeploy
echo "# Updated $(date)" >> DEPLOYMENT_CHECKLIST.md

# Commit and push
git add DEPLOYMENT_CHECKLIST.md
git commit -m "Force redeploy with new Supabase credentials"
git push origin main
```

This will trigger Lovable to pull the latest code AND use the new environment variables you set.

### Method 3: Use Lovable's .env.production (If Available)

Some versions of Lovable support a `.env.production` file:

1. Create the file in your project root (but **DO NOT COMMIT IT**)
2. Add it to `.gitignore`
3. Upload it through Lovable's file manager

However, this is usually not the recommended approach.

## How to Verify It Worked

After updating and redeploying, test your live site:

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Type this to check the environment variables:**
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```
4. **You should see:** `https://sdvbjhtgzhkphkkpwekd.supabase.co`
5. **If you see the old URL**, the environment variables weren't updated properly

## Common Issues

### Issue: "I updated the variables but it's still using the old ones"

**Solutions:**
- Clear your browser cache (Ctrl+Shift+Delete)
- Try in incognito/private mode
- Wait 5 minutes for DNS/CDN cache to clear
- Make sure you clicked "Save" in Lovable dashboard
- Try Method 2 (force redeploy via git)

### Issue: "I don't see an Environment Variables section in Lovable"

**Solutions:**
- Check under different menu names: Settings, Deploy, Project Settings
- Look for a "Secrets" section
- Contact Lovable support - they can help set it
- Use Lovable's code editor to check current values

### Issue: "Variables keep reverting after I change them"

**Solutions:**
- You may have environment variables set in MULTIPLE places
- Check for any `.env.production` or `.env.local` files
- Make sure you're editing the Production environment, not Development
- Delete old variables BEFORE adding new ones

## Quick Test Script

Run this in your browser console on the LIVE site to verify:

```javascript
// Test Supabase connection
fetch('https://sdvbjhtgzhkphkkpwekd.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJqaHRnemhrcGhra3B3ZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTMsImV4cCI6MjA4MDc4NjgxM30.pZ_PcRMOqPjJJevMpgC5vto2iuKpwzwgWKxKXeS7dis'
  }
})
.then(r => console.log('Connection:', r.status === 200 ? '✓ WORKING' : '✗ FAILED'))
.catch(e => console.error('Connection failed:', e));
```

If this shows "✓ WORKING", your database is reachable but the app might still be using old credentials.

## Need Help?

If you're still having issues, provide:
1. Screenshot of your Lovable environment variables section
2. The URL of your deployed site
3. Any error messages from browser console
4. Output from the test script above

---

**Current Credentials (New Database):**
- URL: `https://sdvbjhtgzhkphkkpwekd.supabase.co`
- Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJqaHRnemhrcGhra3B3ZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTMsImV4cCI6MjA4MDc4NjgxM30.pZ_PcRMOqPjJJevMpgC5vto2iuKpwzwgWKxKXeS7dis`
