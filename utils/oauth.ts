import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Discord OAuth Configuration
export const discordConfig = {
  clientId: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID',
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'rankup',
    path: 'auth/callback',
  }),
  scopes: ['identify', 'email'],
  authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
  userInfoEndpoint: 'https://discord.com/api/users/@me',
};

// Instagram OAuth Configuration
export const instagramConfig = {
  clientId: process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'rankup',
    path: 'auth/callback',
  }),
  scopes: ['user_profile'],
  authorizationEndpoint: 'https://api.instagram.com/oauth/authorize',
  tokenEndpoint: 'https://api.instagram.com/oauth/access_token',
  userInfoEndpoint: 'https://graph.instagram.com/me',
};

export interface OAuthUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  provider: 'discord' | 'instagram';
}

export async function authenticateWithDiscord(): Promise<OAuthUser | null> {
  try {
    const discovery = {
      authorizationEndpoint: discordConfig.authorizationEndpoint,
      tokenEndpoint: discordConfig.tokenEndpoint,
    };

    const [request, , promptAsync] = AuthSession.useAuthRequest(
      {
        clientId: discordConfig.clientId,
        scopes: discordConfig.scopes,
        redirectUri: discordConfig.redirectUri,
      },
      discovery
    );

    if (!request) {
      throw new Error('Failed to create auth request');
    }

    const result = await promptAsync();

    if (result.type === 'success') {
      const { code } = result.params;

      const tokenResponse = await fetch(discordConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: discordConfig.clientId,
          client_secret: process.env.EXPO_PUBLIC_DISCORD_CLIENT_SECRET || '',
          grant_type: 'authorization_code',
          code,
          redirect_uri: discordConfig.redirectUri,
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      const userResponse = await fetch(discordConfig.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();

      return {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : undefined,
        provider: 'discord',
      };
    }

    return null;
  } catch (error) {
    console.error('Discord authentication error:', error);
    return null;
  }
}

export async function authenticateWithInstagram(): Promise<OAuthUser | null> {
  try {
    const discovery = {
      authorizationEndpoint: instagramConfig.authorizationEndpoint,
      tokenEndpoint: instagramConfig.tokenEndpoint,
    };

    const [request, , promptAsync] = AuthSession.useAuthRequest(
      {
        clientId: instagramConfig.clientId,
        scopes: instagramConfig.scopes,
        redirectUri: instagramConfig.redirectUri,
        responseType: AuthSession.ResponseType.Code,
      },
      discovery
    );

    if (!request) {
      throw new Error('Failed to create auth request');
    }

    const result = await promptAsync();

    if (result.type === 'success') {
      const { code } = result.params;

      const formData = new FormData();
      formData.append('client_id', instagramConfig.clientId);
      formData.append('client_secret', process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_SECRET || '');
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', instagramConfig.redirectUri);
      formData.append('code', code);

      const tokenResponse = await fetch(instagramConfig.tokenEndpoint, {
        method: 'POST',
        body: formData,
      });

      const tokenData = await tokenResponse.json();

      const userResponse = await fetch(
        `${instagramConfig.userInfoEndpoint}?fields=id,username&access_token=${tokenData.access_token}`
      );

      const userData = await userResponse.json();

      return {
        id: userData.id,
        username: userData.username,
        provider: 'instagram',
      };
    }

    return null;
  } catch (error) {
    console.error('Instagram authentication error:', error);
    return null;
  }
}
