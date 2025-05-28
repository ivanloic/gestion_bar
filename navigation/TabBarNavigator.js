import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import StockEntryScreen from '../screen/StockEntryScreen';
import StockManagementScreen from '../screen/StockManagementScreen';
import OrderManagementScreen from '../screen/OrderManagementScreen';
import OrderTakingScreen from '../screen/OrderTakingScreen';
import SettingScreen from '../screen/SettingScreen';
import { useRoute } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function TabBarNavigator() {
  const route = useRoute();
  const barId = route.params?.barId;
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 10,
          height: 70,
          paddingBottom: 8,
          paddingTop: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Accueil" 
        children={() => <OrderTakingScreen barId={barId} />}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={32} color={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Commandes" 
        children={() => <OrderManagementScreen barId={barId} />}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="glass-cocktail" size={32} color={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Stock" 
        children={() => <StockManagementScreen barId={barId} />}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wine" size={32} color={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="paramettres" 
        children={() => <SettingScreen barId={barId} />}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={32} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
});