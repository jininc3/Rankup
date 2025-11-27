# Authentication Setup Guide

This guide will help you set up Discord and Instagram OAuth authentication for your RankUp app.

## Overview

The authentication system includes:
- Login and Signup pages with email/password support
- Discord OAuth integration
- Instagram OAuth integration
- Persistent authentication state using AsyncStorage
- Protected routes that require authentication

## File Structure

```
app/
├── (auth)/
│   ├── _layout.tsx          # Auth routes layout
│   ├── login.tsx            # Login page
│   └── signup.tsx           # Signup page
contexts/
└── AuthContext.tsx          # Authentication state management
hooks/
├── useDiscordAuth.ts        # Discord OAuth hook
└── useInstagramAuth.ts      # Instagram OAuth hook
utils/
└── oauth.ts                 # OAuth configuration
```

## Setup Instructions

### 1. Install Dependencies

All required packages are already installed:
- `expo-auth-session` - OAuth authentication
- `expo-crypto` - Cryptographic functions for OAuth
- `@react-native-async-storage/async-storage` - Persistent storage

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your OAuth credentials in the `.env` file

### 3. Set Up Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "OAuth2" settings
4. Add the following redirect URI:
   ```
   rankup://auth/callback
   ```
5. Copy your **Client ID** and **Client Secret** to your `.env` file:
   ```
   EXPO_PUBLIC_DISCORD_CLIENT_ID=your_client_id_here
   EXPO_PUBLIC_DISCORD_CLIENT_SECRET=your_client_secret_here
   ```

### 4. Set Up Instagram OAuth

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app and select "Instagram Basic Display"
3. Configure Instagram Basic Display:
   - Add an Instagram Test User
   - Add OAuth Redirect URI:
     ```
     rankup://auth/callback
     ```
4. Copy your **App ID** (Client ID) and **App Secret** to your `.env` file:
   ```
   EXPO_PUBLIC_INSTAGRAM_CLIENT_ID=your_app_id_here
   EXPO_PUBLIC_INSTAGRAM_CLIENT_SECRET=your_app_secret_here
   ```

### 5. Update app.json (if needed)

The `app.json` already has the scheme configured:
```json
{
  "expo": {
    "scheme": "rankup"
  }
}
```

This allows deep linking for OAuth callbacks.

## How It Works

### Authentication Flow

1. **Initial Load**: The app checks if a user is authenticated using AsyncStorage
2. **Unauthenticated**: Users are redirected to the login page
3. **Login/Signup**: Users can either:
   - Sign in with email/password (basic authentication)
   - Use Discord OAuth
   - Use Instagram OAuth
4. **OAuth Process**:
   - User clicks OAuth button
   - Opens browser for authorization
   - Redirects back to app with auth code
   - Exchanges code for access token
   - Fetches user info
   - Stores user data in AsyncStorage
5. **Authenticated**: Users can access the app and see their profile
6. **Sign Out**: Users can sign out from Settings page

### Protected Routes

The root layout (`app/_layout.tsx`) automatically handles authentication:
- Checks authentication state on app load
- Redirects unauthenticated users to login
- Redirects authenticated users to main app

### Authentication Context

The `AuthContext` provides:
- `user`: Current user object or null
- `isLoading`: Loading state
- `signIn(user)`: Function to sign in
- `signOut()`: Function to sign out
- `isAuthenticated`: Boolean authentication status

Use it in any component:
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, signOut, isAuthenticated } = useAuth();

  // Your component logic
}
```

## Testing

### Testing Email Authentication

1. Start the app: `npm start`
2. Navigate to the login page
3. Enter any email and password
4. Click "Sign In"
5. You should be redirected to the main app

### Testing OAuth

For OAuth to work properly in development:
1. Use the Expo Go app or a development build
2. Make sure your redirect URIs are correctly configured
3. Test on a physical device for best results

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Client Secrets**: In production, OAuth exchanges should happen on a backend server, not in the app
3. **Current Implementation**: This is a simplified version for demonstration. For production:
   - Implement a backend API for OAuth token exchange
   - Store access tokens securely
   - Implement token refresh logic
   - Add proper session management
   - Use secure backend endpoints for authentication

## Troubleshooting

### OAuth Not Working

1. Check that your redirect URI exactly matches: `rankup://auth/callback`
2. Verify your Client IDs and Secrets are correct in `.env`
3. Make sure you're using a development build if testing on a device
4. Check console logs for error messages

### Authentication State Not Persisting

1. Check that AsyncStorage is properly installed
2. Clear app data and try again
3. Check for console errors related to AsyncStorage

### Redirect Issues

1. Verify the `scheme` in `app.json` is set to `rankup`
2. Make sure deep linking is configured correctly
3. Test on a physical device rather than simulator

## Next Steps

For production deployment, you should:

1. **Implement Backend API**:
   - Create endpoints for OAuth token exchange
   - Implement secure session management
   - Add JWT or similar authentication tokens

2. **Add More Features**:
   - Password reset functionality
   - Email verification
   - Two-factor authentication
   - Social account linking

3. **Improve Security**:
   - Implement proper token storage
   - Add token refresh logic
   - Use HTTPS for all requests
   - Implement rate limiting

4. **Testing**:
   - Add unit tests for auth flows
   - Test OAuth on multiple devices
   - Test edge cases and error scenarios

## Additional Resources

- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Discord OAuth Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [React Navigation Authentication Flow](https://reactnavigation.org/docs/auth-flow/)
