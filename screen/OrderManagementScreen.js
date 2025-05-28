import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../Firebase/Config';
import { useAuth } from '../context/AuthContext';

const OrderManagementScreen = ({ navigation, barId }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, paid, cancelled
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Charger les commandes depuis Firestore
  useEffect(() => {
    if (!barId) return;

    const fetchOrders = async () => {
      try {
        const ordersQuery = query(collection(db, 'orders'), where('barId', '==', barId));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        const loadedOrders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Formatage des dates si nécessaire
          date: doc.data().createdAt?.toDate().toLocaleDateString() || 'Date inconnue',
          time: doc.data().createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Heure inconnue'
        }));
        
        setOrders(loadedOrders);
      } catch (error) {
        console.error("Erreur de chargement des commandes:", error);
        Alert.alert('Erreur', 'Impossible de charger les commandes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [barId]);

  // Filtrer les commandes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (order.tableNumber?.toString().includes(searchQuery)) || 
      (order.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'pending' && order.status === 'pending') || 
      (filter === 'paid' && (order.status === 'paid-cash' || order.status === 'paid-mobile')) ||
      (filter === 'cancelled' && order.status === 'cancelled');
    
    return matchesSearch && matchesFilter;
  });

  // Calculer les totaux
  const totalPending = orders
    .filter(o => o.status === 'pending')
    .reduce((sum, o) => sum + o.total, 0);
  
  const totalPaidToday = orders
    .filter(o => 
      new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString() && 
      (o.status === 'paid-cash' || o.status === 'paid-mobile'))
    .reduce((sum, o) => sum + o.total, 0);

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId, newStatus) => {
    setIsUpdating(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'paid-cash' || newStatus === 'paid-mobile') && { paidAt: serverTimestamp() }
      });

      // Mettre à jour l'état local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      Alert.alert(
        'Succès', 
        newStatus === 'cancelled' 
          ? 'Commande annulée' 
          : `Commande marquée comme payée (${newStatus === 'paid-cash' ? 'espèces' : 'mobile'})`
      );
    } catch (error) {
      console.error("Erreur de mise à jour:", error);
      Alert.alert('Erreur', "Impossible de mettre à jour la commande");
    } finally {
      setIsUpdating(false);
      setIsModalVisible(false);
    }
  };

  // Afficher les détails d'une commande
  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.orderCard, { 
        borderLeftColor: 
          item.status === 'pending' ? '#FFA726' : 
          item.status === 'paid-cash' ? '#4CAF50' : 
          item.status === 'paid-mobile' ? '#2196F3' : '#F44336'
      }]}
      onPress={() => {
        setSelectedOrder(item);
        setIsModalVisible(true);
      }}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.customerName}>
          {item.customer?.name || `Table ${item.tableNumber}` || 'Client non enregistré'}
        </Text>
        <Text style={styles.orderTotal}>{item.total.toFixed(2)} €</Text>
      </View>
      <Text style={styles.orderSeller}>Vendeur: {item.seller?.name || 'Inconnu'}</Text>
      <Text style={styles.orderTime}>{item.time} - {item.date}</Text>
      <View style={styles.statusContainer}>
        <Text style={[
          styles.orderStatus,
          { 
            color: 
              item.status === 'pending' ? '#FFA726' : 
              item.status === 'paid-cash' ? '#4CAF50' : 
              item.status === 'paid-mobile' ? '#2196F3' : '#F44336'
          }
        ]}>
          {item.status === 'pending' ? 'En attente' : 
           item.status === 'paid-cash' ? 'Payé (espèces)' : 
           item.status === 'paid-mobile' ? 'Payé (mobile)' : 'Annulé'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b2d42" />
        <Text style={styles.loadingText}>Chargement des commandes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>En attente</Text>
          <Text style={styles.statValue}>{totalPending.toFixed(2)} €</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Payé aujourd'hui</Text>
          <Text style={styles.statValue}>{totalPaidToday.toFixed(2)} €</Text>
        </View>
      </View>

      {/* Barre de recherche et filtres */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client, table ou vendeur..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={filter === 'all' && styles.activeFilterText}>Toutes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
            onPress={() => setFilter('pending')}
          >
            <Text style={filter === 'pending' && styles.activeFilterText}>En attente</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'paid' && styles.activeFilter]}
            onPress={() => setFilter('paid')}
          >
            <Text style={filter === 'paid' && styles.activeFilterText}>Payées</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'cancelled' && styles.activeFilter]}
            onPress={() => setFilter('cancelled')}
          >
            <Text style={filter === 'cancelled' && styles.activeFilterText}>Annulées</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>Aucune commande trouvée</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal de détails de commande */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commande #{selectedOrder.id}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.orderInfo}>
                <Text style={styles.infoText}>
                  Client: {selectedOrder.customer?.name || `Table ${selectedOrder.tableNumber}` || 'Client non enregistré'}
                </Text>
                <Text style={styles.infoText}>
                  Vendeur: {selectedOrder.seller?.name || 'Inconnu'}
                </Text>
                <Text style={styles.infoText}>
                  Date: {selectedOrder.date} à {selectedOrder.time}
                </Text>
                <Text style={styles.infoText}>
                  Statut: 
                  <Text style={{ 
                    color: 
                      selectedOrder.status === 'pending' ? '#FFA726' : 
                      selectedOrder.status === 'paid-cash' ? '#4CAF50' : 
                      selectedOrder.status === 'paid-mobile' ? '#2196F3' : '#F44336',
                    fontWeight: 'bold'
                  }}>
                    {selectedOrder.status === 'pending' ? ' En attente' : 
                     selectedOrder.status === 'paid-cash' ? ' Payé (espèces)' : 
                     selectedOrder.status === 'paid-mobile' ? ' Payé (mobile)' : ' Annulé'}
                  </Text>
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Articles:</Text>
              <View style={styles.itemsList}>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.quantity} {item.unit} {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {(item.unitPrice * item.quantity).toFixed(2)} €
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>Total:</Text>
                <Text style={styles.totalAmount}>{selectedOrder.total.toFixed(2)} €</Text>
              </View>

              {selectedOrder.notes && (
                <>
                  <Text style={styles.sectionTitle}>Notes:</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.cashButton]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'paid-cash')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="cash" size={20} color="white" />
                          <Text style={styles.actionButtonText}>Paiement espèces</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.mobileButton]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'paid-mobile')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="phone-portrait" size={20} color="white" />
                          <Text style={styles.actionButtonText}>Paiement mobile</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedOrder.status === 'pending' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Annuler commande</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.actionButton, styles.closeButton]}
                  onPress={() => setIsModalVisible(false)}
                  disabled={isUpdating}
                >
                  <Text style={styles.actionButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2b2d42',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    width: '24%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeFilter: {
    backgroundColor: '#2b2d42',
  },
  activeFilterText: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderSeller: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusContainer: {
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  orderInfo: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  itemsList: {
    marginBottom: 15,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 16,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  actionsContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  cashButton: {
    backgroundColor: '#4CAF50',
  },
  mobileButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  closeButton: {
    backgroundColor: '#9E9E9E',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default OrderManagementScreen;