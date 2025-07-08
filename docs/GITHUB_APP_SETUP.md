# GitHub App Setup Guide

This guide walks you through setting up GitHub App authentication for GitHub Actions workflows in this repository.

## Prerequisites

1. A GitHub App (create one at GitHub Settings → Developer settings → GitHub Apps)
2. The App must be installed on your repository
3. Repository admin access to add secrets and variables

## Step 1: Create a GitHub App

1. Go to your GitHub Settings
2. Navigate to **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**
4. Configure your app:
   - **Name**: Choose a unique name
   - **Homepage URL**: Your repository URL
   - **Webhook**: Uncheck "Active" (not needed for Actions)
   - **Permissions**: Set based on your needs:
     - Repository permissions:
       - Contents: Read (minimum)
       - Pull requests: Write
       - Issues: Write
       - Checks: Write (if creating check runs)
     - Account permissions: None needed
   - **Where can this GitHub App be installed?**: Your choice
5. Click **Create GitHub App**

## Step 2: Get Your App Credentials

1. After creating the app, you'll see the **App ID** at the top of the page
   - Copy this number (e.g., `123456`)
2. Scroll down to **Private keys**
3. Click **Generate a private key**
   - This downloads a `.pem` file
   - Open the file and copy ALL contents (including headers)

## Step 3: Install the App on Your Repository

1. In your GitHub App settings, click **Install App**
2. Choose your account/organization
3. Select the repository where you want to use the app
4. Click **Install**

## Step 4: Add Credentials to Repository

### Add APP_ID as a Variable:
1. Go to your repository → **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click on the **Variables** tab
4. Click **New repository variable**
5. Name: `APP_ID`
6. Value: Your App ID (e.g., `123456`)
7. Click **Add variable**

### Add APP_PRIVATE_KEY as a Secret:
1. Stay in **Secrets and variables** → **Actions**
2. Click on the **Secrets** tab
3. Click **New repository secret**
4. Name: `APP_PRIVATE_KEY`
5. Value: Paste the entire contents of your `.pem` file:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   [Your key content here]
   -----END RSA PRIVATE KEY-----
   ```
6. Click **Add secret**

## Step 5: Test Your Setup

1. Go to the **Actions** tab in your repository
2. Find **Test GitHub App Setup** workflow
3. Click **Run workflow**
4. Check the results - it will tell you if everything is configured correctly

## Using the GitHub App in Workflows

### Basic Token Generation:
```yaml
- name: Generate GitHub App Token
  id: app-token
  uses: actions/create-github-app-token@v1
  with:
    app-id: ${{ vars.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}

- name: Use the token
  uses: actions/github-script@v7
  with:
    github-token: ${{ steps.app-token.outputs.token }}
    script: |
      // Your GitHub API calls here
```

### With Custom Permissions:
```yaml
- name: Generate token with specific permissions
  id: app-token
  uses: actions/create-github-app-token@v1
  with:
    app-id: ${{ vars.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}
    permissions: >
      {
        "contents": "write",
        "pull_requests": "write"
      }
```

## Security Best Practices

1. **Never commit credentials**: Always use secrets/variables
2. **Rotate keys regularly**: Generate new private keys periodically
3. **Limit permissions**: Only grant necessary permissions
4. **Token expiration**: Tokens expire after 1 hour by default
5. **Audit logs**: Review your App's activity in GitHub settings

## Troubleshooting

### "Input required and not supplied: app-id"
- Make sure `APP_ID` is added as a **variable** (not secret)
- Use `${{ vars.APP_ID }}` not `${{ secrets.APP_ID }}`

### "Error: Invalid private key"
- Ensure you copied the entire `.pem` file content
- Include the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines
- Check for extra spaces or line breaks

### "GitHub App installation not found"
- Verify the app is installed on your repository
- Check that the App ID matches your private key
- Ensure the app has necessary permissions

### Token permission errors
- Review your GitHub App's permissions in its settings
- Add specific permissions in the workflow if needed
- Remember that app permissions are the maximum; you can request less but not more

## Example Workflows

### PR Automation
See `.github/workflows/github-app-pr.yml` for a complete example that:
- Comments on PRs
- Adds labels
- Creates check runs
- Demonstrates security features

### Testing Setup
See `.github/workflows/test-github-app.yml` for a workflow that:
- Verifies credentials are configured
- Tests token generation
- Validates API access
- Provides helpful error messages

## Google Gemini Integration

For integrating with Google Gemini to create PRs:

1. Store your Gemini API key as a secret: `GEMINI_API_KEY`
2. Use the GitHub App token for PR creation
3. Example structure:

```yaml
- name: Call Gemini API
  run: |
    # Call Gemini with your prompt
    response=$(curl -X POST \
      -H "Authorization: Bearer ${{ secrets.GEMINI_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"prompt": "Your prompt here"}' \
      https://api.gemini.com/v1/generate)
    echo "GEMINI_RESPONSE=$response" >> $GITHUB_OUTPUT

- name: Create PR with Gemini content
  uses: actions/github-script@v7
  with:
    github-token: ${{ steps.app-token.outputs.token }}
    script: |
      // Use Gemini response to create PR
```

## Additional Resources

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [create-github-app-token Action](https://github.com/actions/create-github-app-token)
- [GitHub Script Action](https://github.com/actions/github-script)
- [GitHub REST API Reference](https://docs.github.com/en/rest)