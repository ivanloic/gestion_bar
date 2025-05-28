// src/screens/StockManagementScreen.js
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
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  arrayUnion,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../Firebase/Config';
const StockManagementScreen = ({ barId }) => {
  const { currentUser } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [currentItem, setCurrentItem] = useState({
    id: '',
    name: '',
    category: 'boisson',
    quantity: '',
    unit: 'bouteille',
    minThreshold: '',
    supplier: '',
    costPrice: '',
    sellingPrice: '',
    lastRestockDate: new Date()
  });
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Catégories et unités disponibles
  const categories = [
    { label: 'Boisson', value: 'boisson' },
    { label: 'Alcool', value: 'alcool' },
    { label: 'Soft', value: 'soft' },
    { label: 'Snack', value: 'snack' },
    { label: 'Matériel', value: 'materiel' },
    { label: 'Autre', value: 'autre' }
  ];

  const units = [
    { label: 'Bouteille', value: 'bouteille' },
    { label: 'Caisse', value: 'caisse' },
    { label: 'Litre', value: 'litre' },
    { label: 'Kg', value: 'kg' },
    { label: 'Pièce', value: 'piece' },
    { label: 'Pack', value: 'pack' }
  ];

  // Charger les articles depuis Firestore
  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        const q = query(collection(db, 'stock'), where('barId', '==', barId));
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastRestockDate: doc.data().lastRestockDate?.toDate() || new Date()
        }));
        setStockItems(items);
      } catch (error) {
        console.error("Erreur de chargement du stock:", error);
        Alert.alert('Erreur', 'Impossible de charger le stock');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockItems();
  }, [barId]);

  const handleInputChange = (name, value) => {
    setCurrentItem(prev => ({
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
      handleInputChange('lastRestockDate', selectedDate);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentItem.name.trim()) newErrors.name = 'Nom requis';
    if (!currentItem.quantity) newErrors.quantity = 'Quantité requise';
    else if (isNaN(currentItem.quantity)) newErrors.quantity = 'Doit être un nombre';
    if (!currentItem.minThreshold) newErrors.minThreshold = 'Seuil minimum requis';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) return;

    try {
      const stockData = {
        ...currentItem,
        barId,
        lastRestockDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (currentItem.id) {
        // Mise à jour de l'article
        await updateDoc(doc(db, 'stock', currentItem.id), stockData);
        Alert.alert('Succès', 'Article modifié avec succès!');
      } else {
        // Création d'un nouvel article
        const docRef = await addDoc(collection(db, 'stock'), {
          ...stockData,
          createdAt: serverTimestamp(),
          history: []
        });
        await updateDoc(docRef, { id: docRef.id });
        Alert.alert('Succès', 'Article ajouté avec succès!');
      }
      
      // Recharger les données
      const q = query(collection(db, 'stock'), where('barId', '==', barId));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastRestockDate: doc.data().lastRestockDate?.toDate() || new Date()
      }));
      setStockItems(items);
      
      resetForm();
      setIsModalVisible(false);
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert('Erreur', "Une erreur s'est produite");
    }
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet article ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'stock', itemId));
              setStockItems(prev => prev.filter(item => item.id !== itemId));
              Alert.alert('Succès', 'Article supprimé avec succès!');
            } catch (error) {
              console.error("Erreur:", error);
              Alert.alert('Erreur', "Échec de la suppression");
            }
          }
        }
      ]
    );
  };

  const handleShowHistory = (item) => {
    setSelectedItemHistory(item);
    setIsHistoryModalVisible(true);
  };

  const handleAddStockMovement = async (action) => {
    if (!movementQuantity || isNaN(movementQuantity)) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    try {
      const quantity = action === 'entrée' 
        ? Math.abs(Number(movementQuantity)) 
        : -Math.abs(Number(movementQuantity));

      const newMovement = {
        date: new Date(),
        quantity,
        action,
        employee: currentUser.uid,
        employeeName: currentUser.displayName || 'Utilisateur',
        notes: movementNotes || (action === 'entrée' ? 'Réapprovisionnement' : 'Vente/Utilisation')
      };

      // Mise à jour dans Firestore
      const itemRef = doc(db, 'stock', selectedItemHistory.id);
      await updateDoc(itemRef, {
        quantity: increment(quantity),
        lastRestockDate: action === 'entrée' ? serverTimestamp() : null,
        history: arrayUnion(newMovement)
      });

      // Mise à jour locale
      setStockItems(prev => 
        prev.map(item => 
          item.id === selectedItemHistory.id 
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                history: [newMovement, ...item.history],
                lastRestockDate: action === 'entrée' ? new Date() : item.lastRestockDate
              } 
            : item
        )
      );

      setSelectedItemHistory(prev => ({
        ...prev,
        quantity: prev.quantity + quantity,
        history: [newMovement, ...prev.history]
      }));

      Alert.alert('Succès', `Mouvement de ${action} enregistré!`);
      setMovementQuantity('');
      setMovementNotes('');
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'enregistrement");
    }
  };

  const resetForm = () => {
    setCurrentItem({
      id: '',
      name: '',
      category: 'boisson',
      quantity: '',
      unit: 'bouteille',
      minThreshold: '',
      supplier: '',
      costPrice: '',
      sellingPrice: '',
      lastRestockDate: new Date()
    });
    setErrors({});
  };

  const filteredItems = stockItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
  };

  const renderStockItem = ({ item }) => (
    <View style={[
      styles.itemCard,
      item.quantity <= item.minThreshold && styles.lowStockCard
    ]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemQuantity}>
            Stock: {item.quantity} {units.find(u => u.value === item.unit)?.label}s
          </Text>
          {item.quantity <= item.minThreshold && (
            <Text style={styles.lowStockText}>Stock faible!</Text>
          )}
        </View>
        <Text style={styles.itemCategory}>
          Catégorie: {categories.find(c => c.value === item.category)?.label}
        </Text>
        <Text style={styles.itemSupplier}>Fournisseur: {item.supplier}</Text>
        <Text style={styles.itemDate}>
          Dernier réappro: {new Date(item.lastRestockDate).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            setCurrentItem(item);
            setIsModalVisible(true);
          }}
        >
          <Icon name="edit" size={20} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleShowHistory(item)}
        >
          <Icon name="history" size={20} color="#9b59b6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteItem(item.id)}
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
        <Text style={styles.loadingText}>Chargement du stock...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestion du Stock</Text>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stockItems.length}</Text>
          <Text style={styles.statLabel}>Articles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stockItems.filter(item => item.quantity <= item.minThreshold).length}
          </Text>
          <Text style={styles.statLabel}>Stock faible</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stockItems.filter(item => item.category === 'alcool').length}
          </Text>
          <Text style={styles.statLabel}>Alcools</Text>
        </View>
      </View>

      {/* Liste des articles */}
      {filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          renderItem={renderStockItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          <Image
            // source={require('../assets/empty-stock.png')}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Aucun résultat trouvé' : 'Aucun article en stock'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez votre premier article'}
          </Text>
        </View>
      )}

      {/* Bouton d'ajout */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setIsModalVisible(true);
        }}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter un article</Text>
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
                {currentItem.id ? 'Modifier article' : 'Nouvel article'}
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
              <Text style={styles.sectionTitle}>Informations de base</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Vin rouge"
                  value={currentItem.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={currentItem.category}
                    style={styles.picker}
                    onValueChange={(itemValue) => handleInputChange('category', itemValue)}
                  >
                    {categories.map((cat) => (
                      <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Quantité *</Text>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  placeholder="24"
                  value={currentItem.quantity.toString()}
                  onChangeText={(text) => handleInputChange('quantity', text)}
                  keyboardType="numeric"
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unité</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={currentItem.unit}
                    style={styles.picker}
                    onValueChange={(itemValue) => handleInputChange('unit', itemValue)}
                  >
                    {units.map((unit) => (
                      <Picker.Item key={unit.value} label={unit.label} value={unit.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Seuil minimum *</Text>
                <TextInput
                  style={[styles.input, errors.minThreshold && styles.inputError]}
                  placeholder="5"
                  value={currentItem.minThreshold.toString()}
                  onChangeText={(text) => handleInputChange('minThreshold', text)}
                  keyboardType="numeric"
                />
                {errors.minThreshold && <Text style={styles.errorText}>{errors.minThreshold}</Text>}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informations fournisseur</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Fournisseur</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Fournisseur A"
                  value={currentItem.supplier}
                  onChangeText={(text) => handleInputChange('supplier', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prix d'achat (€)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8.50"
                  value={currentItem.costPrice?.toString()}
                  onChangeText={(text) => handleInputChange('costPrice', text)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prix de vente (€)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25.00"
                  value={currentItem.sellingPrice?.toString()}
                  onChangeText={(text) => handleInputChange('sellingPrice', text)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date dernier réappro</Text>
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{currentItem.lastRestockDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={currentItem.lastRestockDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSaveItem}
            >
              <Text style={styles.submitButtonText}>
                {currentItem.id ? 'Enregistrer les modifications' : 'Ajouter l\'article'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal d'historique */}
      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Historique: {selectedItemHistory?.name}
            </Text>
            <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
              <Icon name="close" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>

            <View style={styles.historyActions}>
              <Text style={styles.currentStock}>
                Stock actuel: {selectedItemHistory?.quantity} {units.find(u => u.value === selectedItemHistory?.unit)?.label}s
              </Text>
              
              <View style={styles.movementForm}>
                <Text style={styles.movementLabel}>Ajouter un mouvement:</Text>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.movementButton, styles.inButton]}
                    onPress={() => handleAddStockMovement('entrée')}
                  >
                    <Icon name="add" size={20} color="#fff" />
                    <Text style={styles.movementButtonText}>Entrée</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.movementButton, styles.outButton]}
                    onPress={() => handleAddStockMovement('sortie')}
                  >
                    <Icon name="remove" size={20} color="#fff" />
                    <Text style={styles.movementButtonText}>Sortie</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    value={movementQuantity}
                    onChangeText={setMovementQuantity}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (optionnel)</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Détails du mouvement..."
                    value={movementNotes}
                    onChangeText={setMovementNotes}
                    multiline
                  />
                </View>

                <Text style={styles.responsibleText}>
                  Responsable: {currentUser?.displayName || 'Système'}
                </Text>
              </View>
            </View>

          <FlatList
            data={selectedItemHistory?.history || []}
            renderItem={({ item }) => (
              <View style={[
                styles.historyItem,
                item.action === 'entrée' ? styles.historyIn : styles.historyOut
              ]}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.historyAction}>
                    {item.action === 'entrée' ? '+' : ''}{item.quantity} {units.find(u => u.value === selectedItemHistory?.unit)?.label}s
                  </Text>
                  <Text style={styles.historyEmployee}>
                    Par: {getEmployeeName(item.employee)}
                  </Text>
                  {item.notes && (
                    <Text style={styles.historyNotes}>Notes: {item.notes}</Text>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={
              <Text style={styles.noHistoryText}>Aucun mouvement enregistré</Text>
            }
          />
        </View>
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
  itemCard: {
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
  lowStockCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#e74c3c',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 5,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#495057',
    marginRight: 10,
  },
  lowStockText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 3,
  },
  itemSupplier: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 3,
  },
  itemDate: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  itemActions: {
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
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
  movementForm: {
  marginTop: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  responsibleText: {
    marginTop: 10,
    fontStyle: 'italic',
    color: '#6c757d',
    textAlign: 'center',
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
  historyActions: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  currentStock: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 15,
  },
  movementButtons: {
    marginBottom: 15,
  },
  movementLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  movementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: '48%',
  },
  inButton: {
    backgroundColor: '#27ae60',
  },
  outButton: {
    backgroundColor: '#e74c3c',
  },
  movementButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  employeeSelection: {
    marginTop: 10,
  },
  historyList: {
    padding: 15,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  historyIn: {
    borderLeftWidth: 5,
    borderLeftColor: '#27ae60',
  },
  historyOut: {
    borderLeftWidth: 5,
    borderLeftColor: '#e74c3c',
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 3,
  },
  historyAction: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  historyEmployee: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 3,
  },
  historyNotes: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 5,
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 20,
  },
});

export default StockManagementScreen;