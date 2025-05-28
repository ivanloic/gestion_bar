// src/screens/EmployeeManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFirestore, doc, getDoc ,collection , query ,where , onSnapshot , deleteDoc } from 'firebase/firestore';
import CustomHeader from '../Components/CustomHeader';
import { useRoute } from '@react-navigation/native';

const EmployeeManagementScreen = ({ navigation }) => {
  const route = useRoute();
  const { barId } = route.params;

  const { currentUser, createEmployee, getBarEmployees, updateEmployee, deleteEmployee } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState({
    id: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    position: 'serveur',
    address: '',
    city: '',
    postalCode: '',
    hireDate: new Date(),
    salary: '',
    contractType: 'CDI',
    permissions: [],
    status: 'active',
    password: '', // <-- Ajoutez ceci
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  // Options disponibles
  const positions = [
    { label: 'Serveur', value: 'serveur' },
    { label: 'Barman', value: 'barman' },
    { label: 'Cuisinier', value: 'cuisinier' },
    { label: 'Gérant', value: 'gerant' },
    { label: 'Comptable', value: 'comptable' },
    { label: 'Autre', value: 'autre' }
  ];

  const contractTypes = [
    { label: 'CDI', value: 'CDI' },
    { label: 'CDD', value: 'CDD' },
    { label: 'Interim', value: 'interim' },
    { label: 'Saisonnier', value: 'saisonnier' }
  ];

  const statusOptions = [
    { label: 'Actif', value: 'active' },
    { label: 'Inactif', value: 'inactive' },
    { label: 'En congé', value: 'on_leave' }
  ];

  const permissions = [
    { label: 'Gestion stock', value: 'stock_management' },
    { label: 'Gestion caisse', value: 'cash_management' },
    { label: 'Modifier menu', value: 'menu_edit' },
    { label: 'Voir statistiques', value: 'view_stats' }
  ];

  // Charger les employés quand barId est disponible
  useEffect(() => {
    const loadEmployees = async () => {
      if (!barId) return;
      
      setIsLoading(true);
      try {
        const employees = await getBarEmployees(barId);
        setEmployees(employees);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger les employés');
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, [barId]);

   // Récupération en temps réel
  useEffect(() => {
    if (!barId) return;

    const db = getFirestore();
    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, where('barId', '==', barId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Conversion des dates si nécessaire
        hireDate: doc.data().hireDate?.toDate() || new Date()
      }));
      setEmployees(employeesData);
    });

    return unsubscribe;
  }, [barId]);


  const handleInputChange = (name, value) => {
    setCurrentEmployee(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('hireDate', selectedDate);
    }
  };

  const togglePermission = (permission) => {
    setCurrentEmployee(prev => {
      const newPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions: newPermissions };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentEmployee.firstName.trim()) newErrors.firstName = 'Prénom requis';
    if (!currentEmployee.lastName.trim()) newErrors.lastName = 'Nom requis';
    if (!currentEmployee.phone.trim()) newErrors.phone = 'Téléphone requis';
    else if (!/^[0-9]{10}$/.test(currentEmployee.phone)) newErrors.phone = 'Numéro invalide';
    if (!currentEmployee.position) newErrors.position = 'Poste requis';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gérer la création d'un employé
  const handleSaveEmployee = async () => {
    if (!validateForm()) return;

    try {
      if (isEditMode) {
        // Mise à jour de l'employé
        await updateEmployee(currentEmployee.id, {
          firstName: currentEmployee.firstName,
          lastName: currentEmployee.lastName,
          phone: currentEmployee.phone,
          email: currentEmployee.email,
          position: currentEmployee.position,
          address: currentEmployee.address,
          city: currentEmployee.city,
          salary: currentEmployee.salary,
          permissions: currentEmployee.permissions,
          status: currentEmployee.status
        });
        
        Alert.alert('Succès', 'Employé modifié avec succès!');
      } else {
        // Création d'un nouvel employé
        await createEmployee(barId, {
          firstName: currentEmployee.firstName,
          lastName: currentEmployee.lastName,
          phone: currentEmployee.phone,
          email: currentEmployee.email,
          position: currentEmployee.position,
          address: currentEmployee.address,
          city: currentEmployee.city,
          hireDate: currentEmployee.hireDate,
          salary: currentEmployee.salary,
          permissions : currentEmployee.permissions,
          password: currentEmployee.password,
        });
        
        Alert.alert('Succès', 'Employé créé avec succès!');
      }
          
      resetForm();
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', error.message || "Une erreur s'est produite");
    }
  };

  const handleEditEmployee = (employee) => {
    setCurrentEmployee({
      ...employee,
      hireDate: new Date(employee.hireDate)
    });
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  // Gérer la suppression d'un employé
  const handleDeleteEmployee = (employeeId) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet employé ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirestore();
              await deleteDoc(doc(db, 'employees', employeeId));
              Alert.alert('Succès', 'Employé supprimé avec succès!');
              // Pas besoin de rafraîchir la liste, le onSnapshot s'en charge
            } catch (error) {
              Alert.alert('Erreur', error.message || "Erreur lors de la suppression");
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setCurrentEmployee({
      id: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      position: 'serveur',
      address: '',
      city: '',
      postalCode: '',
      hireDate: new Date(),
      salary: '',
      contractType: 'CDI',
      permissions: [],
      status: 'active'
    });
    setIsEditMode(false);
    setErrors({});
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone.includes(searchQuery) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const renderEmployeeItem = ({ item }) => (
    <View style={[
      styles.employeeCard,
      item.status !== 'active' && styles.inactiveEmployeeCard
    ]}>
      <View style={styles.employeeAvatar}>
        <Text style={styles.avatarText}>
          {item.firstName.charAt(0)}{item.lastName.charAt(0)}
        </Text>
        {item.status !== 'active' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {statusOptions.find(s => s.value === item.status)?.label}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeePosition}>
            {positions.find(p => p.value === item.position)?.label}
          </Text>
          <Text style={styles.employeeSalary}>{item.salary} €/mois</Text>
        </View>
        <Text style={styles.employeeContact}>
          <Icon name="phone" size={14} color="#6c757d" /> {item.phone}
        </Text>
        {item.email && (
          <Text style={styles.employeeContact}>
            <Icon name="email" size={14} color="#6c757d" /> {item.email}
          </Text>
        )}
        <Text style={styles.employeeHireDate}>
          Employé depuis: {new Date(item.hireDate).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.employeeActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditEmployee(item)}
        >
          <Icon name="edit" size={20} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteEmployee(item.id)}
        >
          <Icon name="delete" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b2d42" />
        <Text style={styles.loadingText}>Chargement des employés...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <CustomHeader title="Gestion des Employés" navigation={navigation} />
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un employé..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Employés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {employees.filter(e => e.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {employees.filter(e => e.position === 'serveur').length}
          </Text>
          <Text style={styles.statLabel}>Serveurs</Text>
        </View>
      </View>

      {/* Liste des employés */}
      {filteredEmployees.length > 0 ? (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          {/* <Image
            source={require('../assets/empty-employees.png')}
            style={styles.emptyImage}
          /> */}
          <Text style={styles.emptyText}>
            {searchQuery ? 'Aucun résultat trouvé' : 'Aucun employé enregistré'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez votre premier employé'}
          </Text>
        </View>
      )}

      {/* Bouton d'ajout */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setCurrentEmployee(prev => ({
            ...prev,
            password: generateTempPassword(), // Génère un mot de passe temporaire
          }));
          setIsModalVisible(true);
        }}
      >
        <Icon name="person-add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter un employé</Text>
      </TouchableOpacity>

      {/* Modal de création/édition */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Modifier employé' : 'Nouvel employé'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setIsModalVisible(false);
                  resetForm();
                }}
              >
                <Icon name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            {/* Formulaire */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Prénom *</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Jean"
                  value={currentEmployee.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                />
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Dupont"
                  value={currentEmployee.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone *</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="0612345678"
                  value={currentEmployee.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jean@example.com"
                  value={currentEmployee.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informations professionnelles</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Poste *</Text>
                <View style={[styles.pickerContainer, errors.position && styles.inputError]}>
                  <Picker
                    selectedValue={currentEmployee.position}
                    style={styles.picker}
                    onValueChange={(itemValue) => handleInputChange('position', itemValue)}
                  >
                    {positions.map((pos) => (
                      <Picker.Item key={pos.value} label={pos.label} value={pos.value} />
                    ))}
                  </Picker>
                </View>
                {errors.position && <Text style={styles.errorText}>{errors.position}</Text>}
              </View>


              <View style={styles.formGroup}>
                <Text style={styles.label}>Salaire (frcfa/mois)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1800"
                  value={currentEmployee.salary}
                  onChangeText={(text) => handleInputChange('salary', text)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date d'embauche</Text>
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{currentEmployee.hireDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={currentEmployee.hireDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>

             
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <View style={styles.permissionsContainer}>
                {permissions.map((perm) => (
                  <TouchableOpacity
                    key={perm.value}
                    style={[
                      styles.permissionButton,
                      currentEmployee.permissions.includes(perm.value) && styles.permissionButtonActive
                    ]}
                    onPress={() => togglePermission(perm.value)}
                  >
                    <Text style={[
                      styles.permissionText,
                      currentEmployee.permissions.includes(perm.value) && styles.permissionTextActive
                    ]}>
                      {perm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Adresse</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Adresse</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12 Rue des Fleurs"
                  value={currentEmployee.address}
                  onChangeText={(text) => handleInputChange('address', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paris"
                  value={currentEmployee.city}
                  onChangeText={(text) => handleInputChange('city', text)}
                />
              </View>
            </View>

            {!isEditMode && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Accès</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Mot de passe temporaire</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={currentEmployee.password}
                      onChangeText={(text) => handleInputChange('password', text)}
                      editable={!isEditMode}
                    />
                    <TouchableOpacity style={styles.copyButton}>
                      <Icon name="content-copy" size={20} color="#2b2d42" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hintText}>
                    Ce mot de passe sera envoyé à l'employé. Il pourra le modifier après sa première connexion.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSaveEmployee}
            >
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Enregistrer les modifications' : 'Créer l\'employé'}
              </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#2b2d42',
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
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#212529',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    width: '30%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b2d42',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  inactiveEmployeeCard: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  employeeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#495057',
    fontWeight: '600',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 3,
  },
  employeeDetails: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  employeePosition: {
    fontSize: 14,
    color: '#495057',
    marginRight: 10,
  },
  employeeSalary: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
  },
  employeeContact: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeHireDate: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
    marginTop: 3,
  },
  employeeActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
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
  formSection: {
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  permissionButton: {
    padding: 10,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  permissionButtonActive: {
    backgroundColor: '#2b2d42',
    borderColor: '#2b2d42',
  },
  permissionText: {
    color: '#495057',
    fontSize: 14,
  },
  permissionTextActive: {
    color: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
  },
  copyButton: {
    padding: 10,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
  },
  hintText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
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

export default EmployeeManagementScreen;