import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f6f3e',
        tabBarInactiveTintColor: '#7a857d',
        tabBarStyle: {
          borderTopColor: '#d5ddd2',
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Растения',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="leaf-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Задачи',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="calendar-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Справочник',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="book-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Журнал',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="time-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="settings-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
