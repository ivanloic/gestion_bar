import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // ou une autre librairie d'icônes
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';

const CustomHeader = ({ title, navigation }) => {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#f8f8f8' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FeatherIcon color="#000" name="arrow-left" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        {/* <View style={{ width: 60 }} /> // Pour centrer le titre */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e7',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingLeft: 20,
  },
});

export default CustomHeader;

// Utilisation dans un écran :
const DetailsScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader title="Détails" navigation={navigation} />
      {/* Contenu de l'écran */}
    </View>
  );
};