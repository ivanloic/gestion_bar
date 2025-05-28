import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Données d'exemple avec vendeurs
const sampleOrders = [
  {
    id: '1',
    seller: 'Jean Dupont',
    date: '2023-05-15T14:30:00',
    total: 42.50,
    status: 'payée',
    items: [
      { product: "Whisky Jack Daniel's", quantity: 2, price: 8 },
      { product: "Coca-Cola", quantity: 3, price: 3 },
      { product: "Cacahuètes", quantity: 1, price: 2.50 }
    ]
  },
  {
    id: '2',
    seller: 'Marie Martin',
    date: '2023-05-15T15:45:00',
    total: 28.00,
    status: 'payée',
    items: [
      { product: "Vin rouge Château Margaux", quantity: 1, price: 12 },
      { product: "Jus d'orange", quantity: 2, price: 4 }
    ]
  },
  {
    id: '3',
    seller: 'Pierre Lambert',
    date: '2023-05-15T18:20:00',
    total: 15.00,
    status: 'annulée',
    items: [
      { product: "Bière Heineken", quantity: 3, price: 5 }
    ]
  }
];

const OrderHistoryScreen = () => {
  const [orders, setOrders] = useState(sampleOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState('toutes');
  const [searchDate, setSearchDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Filtrer les commandes
  const filteredOrders = orders.filter(order => {
    // Filtre par statut
    if (filter !== 'toutes' && order.status !== filter) return false;
    
    // Filtre par date si recherche active
    if (searchDate) {
      const orderDate = new Date(order.date).toLocaleDateString('fr-FR');
      const searchDateFormatted = new Date(searchDate).toLocaleDateString('fr-FR');
      return orderDate === searchDateFormatted;
    }
    
    return true;
  });

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Gestion du sélecteur de date
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      setSearchDate(selectedDate.toISOString());
    }
  };

  // Effacer la recherche par date
  const clearDateSearch = () => {
    setSearchDate('');
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Historique des Commandes</Text>
        
        {/* Barre de recherche par date */}
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={searchDate ? styles.dateText : styles.placeholderText}>
              {searchDate ? new Date(searchDate).toLocaleDateString('fr-FR') : 'Rechercher par date...'}
            </Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
          
          {searchDate && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearDateSearch}
            >
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'toutes' && styles.activeFilter]}
            onPress={() => setFilter('toutes')}
          >
            <Text style={[styles.filterText, filter === 'toutes' && styles.activeFilterText]}>Toutes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'payée' && styles.activeFilter]}
            onPress={() => setFilter('payée')}
          >
            <Text style={[styles.filterText, filter === 'payée' && styles.activeFilterText]}>Payées</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'annulée' && styles.activeFilter]}
            onPress={() => setFilter('annulée')}
          >
            <Text style={[styles.filterText, filter === 'annulée' && styles.activeFilterText]}>Annulées</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des commandes */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.orderCard}
            onPress={() => {
              setSelectedOrder(item);
              setShowDetails(true);
            }}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderSeller}>Vendeur: {item.seller}</Text>
              <Text style={[styles.orderStatus, 
                item.status === 'payée' ? styles.statusPaid : styles.statusCancelled
              ]}>
                {item.status}
              </Text>
            </View>
            
            <Text style={styles.orderDate}>{formatDate(item.date)}</Text>
            
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>{item.total.toFixed(2)} €</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune commande trouvée</Text>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Modal des détails de commande */}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails de la commande</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowDetails(false)}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vendeur:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.seller}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.date)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut:</Text>
                  <Text style={[
                    styles.detailValue, 
                    selectedOrder.status === 'payée' ? styles.statusPaid : styles.statusCancelled
                  ]}>
                    {selectedOrder.status}
                  </Text>
                </View>
                
                <Text style={styles.itemsTitle}>Articles:</Text>
                
                <ScrollView style={styles.itemsContainer}>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.product}</Text>
                      <Text style={styles.itemQuantity}>{item.quantity} x {item.price.toFixed(2)} €</Text>
                      <Text style={styles.itemTotal}>{(item.quantity * item.price).toFixed(2)} €</Text>
                    </View>
                  ))}
                </ScrollView>
                
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>{selectedOrder.total.toFixed(2)} €</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sélecteur de date */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 30,
  },
  header: {
    padding: 15,
    backgroundColor: '#2D2D2D',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  dateText: {
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  clearButton: {
    marginLeft: 5,
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#444',
  },
  activeFilter: {
    backgroundColor: '#FF6B6B',
  },
  filterText: {
    color: 'white',
    fontWeight: '500',
  },
  activeFilterText: {
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  orderSeller: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPaid: {
    backgroundColor: '#e0f7fa',
    color: '#00796b',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  detailValue: {
    fontSize: 16,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  itemsContainer: {
    maxHeight: 200,
    marginBottom: 15,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    flex: 2,
    fontSize: 16,
  },
  itemQuantity: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
    marginRight: 10,
  },
  itemTotal: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});

export default OrderHistoryScreen;