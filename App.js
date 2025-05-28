import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import OrderHistoryScreen from './screen/OrderHistoryScreen';
import SalesStatisticsScreen from './screen/SalesStatisticsScreen';
import OrderManagementScreen from './screen/OrderManagementScreen';
import OrderTakingScreen from './screen/OrderTakingScreen';
import MainNavigator from './navigation/MainNavigator';
import { AuthProvider } from './context/AuthContext';
import './Firebase/Config';



export default function App() {
  return (
    <View style={styles.container}>
    <AuthProvider>
    <NavigationContainer>
       <MainNavigator/>
    </NavigationContainer>
    </AuthProvider>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 0,

  },
});
