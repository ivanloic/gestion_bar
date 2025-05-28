import React from 'react';
import { StatusBar } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screen/LoginScreen';
import RegisterScreen from '../screen/RegisterScreen';
import BarManagementScreen from '../screen/BarManagementScreen';
import EmployeeManagementScreen from '../screen/EmployeeManagementScreen';
import TabBarNavigator from './TabBarNavigator';
import SettingScreen from '../screen/SettingScreen';
import StockEntryScreen from '../screen/StockEntryScreen';

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (
    <>
      <StatusBar hidden />
      <Stack.Navigator 
        initialRouteName="LoginScreen" // Définir l'écran initial
        screenOptions={{ 
          headerShown: false, 
          gestureEnabled: false 
        }}
      >
        {/* L'ordre des écrans n'a plus d'importance sauf pour l'animation */}
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="BarManagementScreen" component={BarManagementScreen} />
        <Stack.Screen name="EmployeeManagementScreen" component={EmployeeManagementScreen} />
        <Stack.Screen name="TabBarNavigator" component={TabBarNavigator} />
        <Stack.Screen name="SettingScreen" component={SettingScreen} />
        <Stack.Screen name="StockEntryScreen" component={StockEntryScreen} />
      </Stack.Navigator>
    </>
  );
};

export default MainNavigator;