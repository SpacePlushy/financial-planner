# Vercel BotID Setup Guide

## Current Status
BotID server-side protection is currently **disabled** because it requires client-side configuration to work properly.

## Issue
When only server-side BotID protection is enabled, it blocks all requests (including legitimate ones) because the client-side token is missing.

## Required Steps to Enable BotID

### 1. Client-Side Configuration
Add BotID client protection to your React app:

```typescript
// In src/App.tsx or a global component
import { BotIdProvider } from 'botid/react';

function App() {
  return (
    <BotIdProvider
      publicKey={process.env.REACT_APP_BOTID_PUBLIC_KEY}
      protectedPaths={[
        {
          path: '/api/optimize',
          method: 'POST',
        }
      ]}
    >
      {/* Your app components */}
    </BotIdProvider>
  );
}
```

### 2. Environment Variables
Add to your Vercel project settings:
- `REACT_APP_BOTID_PUBLIC_KEY` - Your BotID public key
- `BOTID_SECRET_KEY` - Your BotID secret key (server-side)

### 3. Update API Endpoint
After client-side is configured, uncomment the BotID code in `api/optimize.js`:
- Lines 11: Uncomment the import
- Lines 723-738: Uncomment the bot check

## References
- [Vercel BotID Documentation](https://vercel.com/docs/botid)
- [Client-Side Protection Guide](https://vercel.com/docs/botid#add-client-side-protection)

## Testing
1. Test locally with `vercel dev`
2. Ensure legitimate requests pass through
3. Test with bot detection tools to verify protection