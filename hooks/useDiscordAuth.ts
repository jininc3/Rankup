import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
};

export function useDiscordAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'rankup',
    path: 'auth/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID',
      scopes: ['identify', 'email'],
      redirectUri,
    },
    discovery
  );

  const getUserInfo = async (accessToken: string) => {
    try {
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await userResponse.json();
    } catch (error) {
      console.error('Error fetching Discord user info:', error);
      return null;
    }
  };

  return {
    request,
    response,
    promptAsync,
    getUserInfo,
  };
}
