import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, addDoc, updateDoc, query, where, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase/Config';
import { useAuth } from '../context/AuthContext';

const OrderTakingScreen = ({ navigation, barId }) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [clientData, setClientData] = useState({ name: '', phone: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);

  // Charger les articles et les vendeurs depuis Firestore
  useEffect(() => {
     if (!barId) return;
     
    const fetchData = async () => {
      try {
        // Charger les articles du bar
        const itemsQuery = query(collection(db, 'stock'), where('barId', '==', barId));
        const itemsSnapshot = await getDocs(itemsQuery);
        const loadedItems = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          stock: doc.data().quantity // Utiliser la quantité comme stock disponible
        }));
        setItems(loadedItems);

        // Charger les vendeurs (employés du bar)
        const sellersQuery = query(collection(db, 'users'), where('barId', '==', barId));
        const sellersSnapshot = await getDocs(sellersQuery);
        const loadedSellers = sellersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSellers(loadedSellers);
        if (loadedSellers.length > 0) {
          setSelectedSeller(loadedSellers[0]);
        }
      } catch (error) {
        console.error("Erreur de chargement des données:", error);
        Alert.alert('Erreur', 'Impossible de charger les données');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [barId]);

  // Catégories disponibles
  const categories = ['Tous', ...new Set(items.map(item => item.category))];

  // Filtrer les articles
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Ajouter un article à la commande
  const addItemToOrder = (item) => {
    if (item.stock <= 0) {
      Alert.alert('Stock épuisé', `Désolé, ${item.name} n'est plus disponible`);
      return;
    }

    setSelectedItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      if (existingItem) {
        if (existingItem.quantity >= item.stock) {
          Alert.alert('Stock insuffisant', `Il ne reste que ${item.stock} ${item.name} en stock`);
          return prev;
        }
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });

    // Mise à jour locale du stock affiché
    setItems(prevItems => 
      prevItems.map(i => 
        i.id === item.id ? { ...i, stock: i.stock - 1 } : i
      )
    );
  };

  // Modifier la quantité d'un article
  const updateQuantity = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId);
    const currentQuantity = selectedItems.find(i => i.id === itemId)?.quantity || 0;
    const stockDifference = newQuantity - currentQuantity;

    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    if (newQuantity > item.stock + currentQuantity) {
      Alert.alert('Stock insuffisant', `Il ne reste que ${item.stock} ${item.name} en stock`);
      return;
    }

    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );

    // Mise à jour locale du stock
    setItems(prevItems => 
      prevItems.map(i => 
        i.id === itemId ? { ...i, stock: i.stock - stockDifference } : i
      )
    );
  };

  // Supprimer un article
  const removeItem = (itemId) => {
    const removedItem = selectedItems.find(item => item.id === itemId);
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));

    // Rétablir le stock local
    setItems(prevItems => 
      prevItems.map(i => 
        i.id === itemId ? { ...i, stock: i.stock + removedItem.quantity } : i
      )
    );
  };

  // Calculer le total
  const total = selectedItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

  // Préparer la validation
  const prepareSubmit = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un article');
      return;
    }

    setIsClientModalVisible(true);
  };

  // Enregistrer la commande dans Firestore
  const submitOrder = async () => {
    try {
      const orderData = {
        barId,
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          category: item.category,
          unit: item.unit
        })),

          seller: selectedSeller
      ? {
          id: selectedSeller.id,
          name: selectedSeller.displayName || selectedSeller.email || 'Vendeur inconnu'
        }
      : {
          id: 'unknown',
          name: 'Proprietaire'
        },
        customer: clientData.name ? clientData : null,
        tableNumber: tableNumber || null,
        notes,
        total,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Ajouter la commande à Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Mettre à jour les stocks dans Firestore
      const batchUpdates = selectedItems.map(async item => {
        const itemRef = doc(db, 'stock', item.id);
        await updateDoc(itemRef, {
          quantity: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(batchUpdates);

      Alert.alert(
        'Commande enregistrée',
        `Commande #${docRef.id} pour ${orderData.customer?.name || 'client non enregistré'} - Total: ${orderData.total}€`,
        [
          { 
            text: 'Nouvelle commande', 
            onPress: () => resetForm() 
          },
          { 
            text: 'Voir les commandes', 
            onPress: () => {
              resetForm();
              navigation.navigate('OrderManagement');
            } 
          }
        ]
      );

      setIsClientModalVisible(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'enregistrement");
      
      // En cas d'erreur, rétablir les stocks locaux
      setItems(prevItems => 
        prevItems.map(item => {
          const orderedItem = selectedItems.find(i => i.id === item.id);
          return orderedItem ? { ...item, stock: item.stock + orderedItem.quantity } : item;
        })
      );
    }
  };

  // Valider sans enregistrer le client
  const submitWithoutClient = () => {
    setClientData({ name: '', phone: '' });
    submitOrder();
  };

  // Enregistrer le client puis valider
  const registerClient = () => {
    if (!clientData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le client');
      return;
    }
    submitOrder();
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setSelectedItems([]);
    setTableNumber('');
    setNotes('');
    setClientData({ name: '', phone: '' });
    
    // Recharger les articles pour avoir les stocks à jour
    const fetchItems = async () => {
      const itemsQuery = query(collection(db, 'stock'), where('barId', '==', barId));
      const itemsSnapshot = await getDocs(itemsQuery);
      const loadedItems = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        stock: doc.data().quantity
      }));
      setItems(loadedItems);
    };
    
    fetchItems();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b2d42" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  if (!selectedSeller && sellers.length > 0) {
    setSelectedSeller(sellers[0]);
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Nouvelle Commande</Text>
        <View style={styles.sellerSelector}>
          <Text style={styles.sellerLabel}>Vendeur:</Text>
          <Text style={styles.sellerName}>
            {currentUser?.displayName || currentUser?.email || 'Vendeur inconnu'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Numéro de table */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>Numéro de Table</Text>
          <TextInput
            style={styles.input}
            placeholder="Numéro de table (optionnel)"
            value={tableNumber}
            onChangeText={setTableNumber}
            keyboardType="number-pad"
          />
        </View>

        {/* Recherche et filtres */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  activeCategory === category && styles.activeCategory
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  activeCategory === category && styles.activeCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Liste des articles disponibles */}
        <Text style={styles.sectionTitle}>Articles Disponibles</Text>
        <View style={styles.itemsGrid}>
          {filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                item.stock <= 0 && styles.outOfStockItem
              ]}
              onPress={() => addItemToOrder(item)}
              disabled={item.stock <= 0}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.sellingPrice} €</Text>
              <Text style={[
                styles.itemStock,
                item.stock <= 0 && styles.outOfStockText
              ]}>
                {item.stock <= 0 ? 'Épuisé' : `Stock: ${item.stock} ${item.unit}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Commande en cours */}
        <Text style={styles.sectionTitle}>Commande en Cours</Text>
        
        {selectedItems.length === 0 ? (
          <Text style={styles.emptyOrder}>Aucun article sélectionné</Text>
        ) : (
          <View style={styles.orderItemsContainer}>
            {selectedItems.map(item => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemPrice}>
                    {item.sellingPrice} € x {item.quantity} = {(item.sellingPrice * item.quantity).toFixed(2)} €
                  </Text>
                </View>
                
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= items.find(i => i.id === item.id).stock}
                  >
                    <Ionicons name="add" size={16} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => removeItem(item.id)}
                  >
                    <Ionicons name="trash" size={16} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Ajouter des instructions spéciales..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </ScrollView>

      {/* Pied de page avec total et validation */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.submitButton,
            selectedItems.length === 0 && styles.disabledButton
          ]}
          onPress={prepareSubmit}
          disabled={selectedItems.length === 0}
        >
          <Text style={styles.submitButtonText}>Valider la Commande</Text>
        </TouchableOpacity>
      </View>

      {/* Modal pour enregistrer le client */}
      <Modal
        visible={isClientModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsClientModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enregistrer le client</Text>
            <TouchableOpacity onPress={() => setIsClientModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>
              Souhaitez-vous enregistrer les informations du client pour cette commande ?
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nom du client"
              value={clientData.name}
              onChangeText={(text) => setClientData({...clientData, name: text})}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Téléphone"
              value={clientData.phone}
              onChangeText={(text) => setClientData({...clientData, phone: text})}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={registerClient}
              >
                <Text style={styles.modalButtonText}>Enregistrer et Valider</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.skipButton]}
                onPress={submitWithoutClient}
              >
                <Text style={styles.modalButtonText}>Valider sans enregistrer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 15,
    backgroundColor: '#2b2d42',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  sellerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerLabel: {
    color: 'white',
    marginRight: 5,
  },
  sellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3f5a',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  sellerName: {
    color: 'white',
    marginRight: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  tableSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2b2d42',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 10,
  },
  activeCategory: {
    backgroundColor: '#2b2d42',
  },
  categoryText: {
    color: '#495057',
  },
  activeCategoryText: {
    color: 'white',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  itemCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  outOfStockItem: {
    opacity: 0.6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2b2d42',
  },
  itemPrice: {
    fontSize: 16,
    color: '#28a745',
    marginBottom: 5,
  },
  itemStock: {
    fontSize: 14,
    color: '#6c757d',
  },
  outOfStockText: {
    color: '#dc3545',
  },
  orderItemsContainer: {
    marginBottom: 20,
  },
  orderItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  orderItemInfo: {
    marginBottom: 10,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2b2d42',
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#6c757d',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    backgroundColor: '#e9ecef',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  deleteButton: {
    marginLeft: 'auto',
  },
  emptyOrder: {
    textAlign: 'center',
    color: '#6c757d',
    marginVertical: 20,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  footer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b2d42',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  submitButton: {
    backgroundColor: '#2b2d42',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2b2d42',
  },
  modalContent: {
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#6c757d',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  modalButtons: {
    marginTop: 20,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#2b2d42',
  },
  skipButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderTakingScreen;