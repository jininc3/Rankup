import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://api.instagram.com/oauth/authorize',
  tokenEndpoint: 'https://api.instagram.com/oauth/access_token',
};

export function useInstagramAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'rankup',
    path: 'auth/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
      scopes: ['user_profile'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  const getUserInfo = async (accessToken: string) => {
    try {
      const userResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
      );
      return await userResponse.json();
    } catch (error) {
      console.error('Error fetching Instagram user info:', error);
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
