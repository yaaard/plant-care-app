import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppTheme } from '@/constants/theme';

function TabLabel({ color, focused, children }: { color: string; focused: boolean; children: string }) {
  return (
    <Text
      adjustsFontSizeToFit
      ellipsizeMode="clip"
      minimumFontScale={0.8}
      numberOfLines={1}
      style={[styles.label, { color }, focused && styles.labelActive]}
    >
      {children}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppTheme.colors.primary,
        tabBarInactiveTintColor: AppTheme.colors.textSoft,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 2,
          paddingVertical: 4,
        },
        tabBarLabel: ({ color, focused, children }) => (
          <TabLabel color={color} focused={focused}>
            {String(children)}
          </TabLabel>
        ),
        tabBarIconStyle: {
          marginBottom: 1,
        },
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: '#f0f4ef',
          height: 88,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Мои',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="leaf-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'План',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="calendar-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Помощник',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="chatbubbles-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="book-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Журнал',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="time-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name="person-outline" size={focused ? size + 1 : size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
  },
});
