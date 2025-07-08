# Deployment Guide for Financial Schedule Optimizer

## Vercel Deployment

### Quick Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/financial-schedule-optimizer)

### Manual Deployment Steps

1. **First Deployment**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Get Required Secrets for GitHub Actions**
   After your first deployment, get these values:
   
   ```bash
   # Get your Vercel token
   vercel login
   # Go to https://vercel.com/account/tokens to create a token
   
   # Get org and project IDs
   cat .vercel/project.json
   ```

3. **Add GitHub Secrets**
   In your GitHub repository settings → Secrets → Actions, add:
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: From .vercel/project.json
   - `VERCEL_PROJECT_ID`: From .vercel/project.json

### Environment Variables

Optional logging configuration (set in Vercel dashboard):
- `REACT_APP_ENABLE_LOGGING`: Enable logging in production (default: false)
- `REACT_APP_DISABLE_LOGGING`: Disable all logging (default: false)
- `REACT_APP_LOG_STATE_DIFF`: Enable state diff logging (default: false)

### Domain Configuration

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain or use the provided `.vercel.app` domain

### Performance Optimizations

The app is configured with:
- Client-side routing support
- Static asset caching (1 year for /static/)
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Automatic HTTPS

### Build Configuration

- **Framework**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Node Version**: 20.x (recommended)

### Deployment Triggers

- **Production**: Pushes to `main` branch
- **Preview**: Pull requests automatically get preview deployments

### Troubleshooting

1. **Build Failures**
   - Check Node version compatibility (use Node 20.x)
   - Ensure all dependencies are in package.json
   - Check for TypeScript errors: `npm run build` locally

2. **404 Errors**
   - The vercel.json includes SPA routing configuration
   - All routes redirect to index.html

3. **Environment Variables**
   - Prefix with `REACT_APP_` for client-side access
   - Redeploy after changing environment variables

### Local Testing

Test the production build locally:
```bash
npm run build
npm run server:start:prod
# Visit http://localhost:5000
```