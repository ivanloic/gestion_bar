import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity,  KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Modal, FlatList } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import CustomHeader from '../Components/CustomHeader';
import { useAuth } from '../context/AuthContext';
import { useRoute } from '@react-navigation/native';

// Données simulées de produits existants
const existingProducts = [
  { id: 1, name: "Whisky Jack Daniel's", category: "alcool", unit: "bouteilles" },
  { id: 2, name: "Vin rouge Château Margaux", category: "alcool", unit: "bouteilles" },
  { id: 3, name: "Bière Heineken", category: "alcool", unit: "caisses" },
  { id: 4, name: "Coca-Cola", category: "soft", unit: "litres" },
  { id: 5, name: "Jus d'orange", category: "soft", unit: "litres" },
  { id: 6, name: "Cacahuètes", category: "snack", unit: "kg" },
];

const StockEntryScreen = ({navigation }) => {

  const { addStock, currentUser } = useAuth();
  const route = useRoute();
  const { barId } = route.params; //passer l'ID du bar en paramètre de navigation
  // États du formulaire
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState(null);
  
  // États pour l'autocomplétion
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(true);

  // États pour les modales de sélection
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Unités et catégories
  const units = ['bouteilles', 'caisses', 'litres', 'kg', 'pièces'];
  const categories = ['alcool', 'soft', 'snack', 'accessoires', 'nourriture'];

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || expiryDate;
    setShowDatePicker(false);
    setExpiryDate(currentDate);
  };


  // Filtrage des produits pour l'autocomplétion
  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = existingProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Sélection d'un produit existant
  const selectProduct = (product) => {
    setProductName(product.name);
    setCategory(product.category);
    setUnit(product.unit);
    setSearchQuery(product.name);
    setShowSuggestions(false);
    setIsNewProduct(false);
  };

  // Ajout d'une photo
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Soumission du formulaire
 const handleSubmit = async () => {
    if (!productName || !quantity) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    const newStockEntry = {
      productName,
      quantity: parseFloat(quantity),
      unit,
      category,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
      supplier,
      expiryDate: expiryDate.toISOString(),
      entryDate: new Date().toISOString(),
      imageUri: image,
      isNewProduct,
      currentStock: parseFloat(quantity), // Stock initial
    };

    try {
      await addStock(barId, newStockEntry);
      Alert.alert('Succès', 'Produit enregistré avec succès');
      resetForm();
    } catch (error) {
      console.error("Erreur lors de l'ajout du stock: ", error);
      Alert.alert('Erreur', "Échec de l'enregistrement du produit");
    }
  };

  // Réinitialisation du formulaire
  const resetForm = () => {
    setProductName('');
    setQuantity('');
    setUnit('');
    setCategory('');
    setPurchasePrice('');
    setSellingPrice('');
    setSupplier('');
    setImage(null);
    setSearchQuery('');
    setIsNewProduct(true);
  };

  return (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          contentContainerStyle={{
            padding: Platform.select({
              ios: 20, // Padding spécifique iOS
              android: 10 // Padding spécifique Android
            })
          }}
        >
        <CustomHeader title="Enregistrement de Stock" navigation={navigation} />
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
      {/* Photo du produit */}
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="add-a-photo" size={40} color="#666" />
            <Text style={styles.imageText}>Ajouter une photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Nom du produit avec autocomplétion */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nom du produit*</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Rechercher un produit existant ou ajouter un nouveau"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setProductName(text);
              setIsNewProduct(true);
            }}
            onFocus={() => setShowSuggestions(searchQuery.length > 1 && filteredProducts.length > 0)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setSearchQuery('');
                setProductName('');
                setFilteredProducts([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Suggestions d'autocomplétion */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => selectProduct(item)}
                >
                  <Text>{item.name}</Text>
                  <Text style={styles.suggestionCategory}>{item.category}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}
      </View>

      {/* Quantité et Unité */}
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 2 }]}>
          <Text style={styles.label}>Quantité*</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 12"
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Unité</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowUnitModal(true)}
          >
            <Text style={styles.pickerText}>{unit || 'Sélectionner'}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Catégorie */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Catégorie</Text>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.pickerText}>{category || 'Sélectionner'}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Prix d'achat et de vente */}
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <Text style={styles.label}>Prix d'achat (Fcfa)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 15.99"
            keyboardType="numeric"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
          />
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Prix de vente (Fcfa)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 25.99"
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={setSellingPrice}
          />
        </View>
      </View>

      {/* Fournisseur */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Fournisseur</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Grossiste Dubois"
          value={supplier}
          onChangeText={setSupplier}
        />
      </View>

      {/* Date d'expiration */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date d'expiration</Text>
        <TouchableOpacity 
          style={styles.datePickerButton} 
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {expiryDate.toLocaleDateString()}
          </Text>
          <Ionicons name="calendar" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Modale de sélection d'unité */}
      <Modal
        visible={showUnitModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner une unité</Text>
            <FlatList
              data={units}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setUnit(item);
                    setShowUnitModal(false);
                  }}
                >
                  <Text>{item}</Text>
                  {unit === item && <Ionicons name="checkmark" size={20} color="#FF6B6B" />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowUnitModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modale de sélection de catégorie */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text>{item}</Text>
                  {category === item && <Ionicons name="checkmark" size={20} color="#FF6B6B" />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {/* Bouton d'enregistrement */}
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Enregistrer</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
      },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imageText: {
    marginTop: 10,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  label: {
    marginBottom: 5,
    fontWeight: '600',
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchContainer: {
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
    elevation: 3,
  },
  suggestionItem: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionCategory: {
    color: '#888',
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerText: {
    color: '#333',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    color: '#333',
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#eee',
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});

export default StockEntryScreen;