import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c42743',
        tabBarInactiveTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#1e2124',
          height: 72,
          paddingBottom: 12,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: '#2c2f33',
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Homepage',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/home.png')}
              style={{ width: 55, height: 55, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/search.png')}
              style={{ width: 42, height: 42, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/leaderboard.png')}
              style={{ width: 48, height: 48, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="duoFinder"
        options={{
          title: 'Duo Finder',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/duofinder.png')}
              style={{ width: 48, height: 48, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/profile.png')}
              style={{ width: 42, height: 42, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
