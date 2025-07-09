# Vercel BotID Setup Guide

## Current Status
BotID protection is currently **disabled** due to configuration issues.

## Implementation Details

### 1. Client-Side Configuration (Implemented)
BotID client protection is added in `src/App.tsx`:

```typescript
import { BotIdClient } from 'botid/client';

function App() {
  return (
    <>
      {BotIdClient && (
        <BotIdClient 
          protect={[
            {
              path: '/api/optimize',
              method: 'POST',
            }
          ]} 
        />
      )}
      {/* App components */}
    </>
  );
}
```

### 2. Server-Side Configuration (Implemented)
BotID server check is active in `api/optimize.js`:

```javascript
const { checkBotId } = require('botid/server');

// In the handler
const { isBot } = await checkBotId();
if (isBot) {
  return res.status(403).json({ 
    error: 'Access denied',
    message: 'Bot activity detected.'
  });
}
```

### 3. How It Works
1. The `BotIdClient` component automatically adds protection headers to API requests
2. The server-side `checkBotId()` validates these headers
3. Bot traffic is blocked with a 403 response
4. Legitimate users experience no interruption

## Key Points
- No environment variables required for basic setup
- BotID runs invisibly with no CAPTCHAs
- Protection only works with JavaScript-based requests
- Free tier included, advanced features require Pro/Enterprise

## References
- [Vercel BotID Documentation](https://vercel.com/docs/botid)
- [Client-Side Protection Guide](https://vercel.com/docs/botid#add-client-side-protection)

## Testing
1. Deploy to Vercel (BotID only works in Vercel environment)
2. Test normal user flow - should work seamlessly
3. Use automated tools to verify bot protection