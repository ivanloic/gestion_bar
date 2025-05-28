// src/screens/BarManagementScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const BarManagementScreen = () => {
  const [bars, setBars] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigation = useNavigation();
  const [newBar, setNewBar] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const { currentUser, createBar, getUserBars } = useAuth();

  // Charger les bars existants
  useEffect(() => {
    const loadBars = async () => {
      if (currentUser) {
        const userBars = await getUserBars();
        setBars(userBars);
      }
    };
    
    loadBars();
  }, [currentUser]);

  const handleInputChange = (name, value) => {
    setNewBar(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!newBar.name.trim()) newErrors.name = 'Nom du bar requis';
    if (!newBar.address.trim()) newErrors.address = 'Adresse requise';
    if (!newBar.city.trim()) newErrors.city = 'Ville requise';
    if (!newBar.phone.trim()) newErrors.phone = 'Téléphone requis';
    else if (!/^[0-9]{10}$/.test(newBar.phone)) newErrors.phone = 'Numéro invalide';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBar = async () => {
    if (!validateForm()) return;

    try {
      await createBar(newBar);
      
      // Recharger la liste des bars
      const userBars = await getUserBars();
      setBars(userBars);
      
      setNewBar({
        name: '',
        address: '',
        city: '',
        postalCode: '',
        phone: '',
        description: ''
      });
      
      setIsModalVisible(false);
      Alert.alert('Succès', 'Le bar a été créé avec succès!');
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du bar');
      console.error(error);
    }
  };

  const renderBarItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.barCard}
     onPress={() => navigation.navigate('TabBarNavigator', { barId: item.id })} // Navigation vers l'écran de gestion du bar
    >
      <View style={styles.barInfo}>
        <Text style={styles.barName}>{item.name}</Text>
        <Text style={styles.barAddress}>{item.address}, {item.city}</Text>
        <Text style={styles.barPhone}>{item.phone}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#6c757d" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes Bars</Text>
        <Text style={styles.subtitle}>Gérez vos établissements</Text>
      </View>

      {/* Liste des bars */}
      {bars.length > 0 ? (
        <FlatList
          data={bars}
          renderItem={renderBarItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          {/* <Image
            source={require('../assets/empty-bar.png')}
            style={styles.emptyImage}
          /> */}
          <Text style={styles.emptyText}>Vous n'avez pas encore de bar</Text>
          <Text style={styles.emptySubtext}>Commencez par ajouter votre premier établissement</Text>
        </View>
      )}

      {/* Bouton d'ajout */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter un bar</Text>
      </TouchableOpacity>

      {/* Modal de création */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Bar</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Icon name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            {/* Formulaire de création */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom du bar *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Le Nom de Votre Bar"
                value={newBar.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Adresse *</Text>
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                placeholder="123 Rue Principale"
                value={newBar.address}
                onChangeText={(text) => handleInputChange('address', text)}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder="Paris"
                value={newBar.city}
                onChangeText={(text) => handleInputChange('city', text)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Code Postal</Text>
              <TextInput
                style={styles.input}
                placeholder="75000"
                value={newBar.postalCode}
                onChangeText={(text) => handleInputChange('postalCode', text)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="0123456789"
                value={newBar.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="contact@monbar.com"
                value={newBar.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Décrivez votre établissement..."
                value={newBar.description}
                onChangeText={(text) => handleInputChange('description', text)}
                multiline
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateBar}
            >
              <Text style={styles.submitButtonText}>Enregistrer le bar</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2b2d42',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  barCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barInfo: {
    flex: 1,
  },
  barName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 5,
  },
  barAddress: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 3,
  },
  barPhone: {
    fontSize: 14,
    color: '#495057',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b2d42',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2b2d42',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#2b2d42',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarManagementScreen;