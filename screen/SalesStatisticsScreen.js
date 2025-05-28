import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,Modal } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

const SalesStatisticsScreen = () => {
  // Données d'exemple (à remplacer par vos données réelles)
  const [salesData, setSalesData] = useState({
    '2023-05': {
      total: 4850,
      products: [
        { name: 'Bière blonde', sales: 1200, quantity: 240 },
        { name: 'Vin rouge', sales: 850, quantity: 140 },
        { name: 'Cocktail Mojito', sales: 980, quantity: 110 },
        { name: 'Whisky', sales: 750, quantity: 80 },
        { name: 'Plateau fromage', sales: 620, quantity: 50 },
        { name: 'Chips', sales: 450, quantity: 150 }
      ]
    },
    '2023-04': {
      total: 4200,
      products: [
        { name: 'Bière blonde', sales: 1100, quantity: 220 },
        { name: 'Vin rouge', sales: 800, quantity: 130 },
        { name: 'Cocktail Mojito', sales: 850, quantity: 95 },
        { name: 'Whisky', sales: 700, quantity: 75 },
        { name: 'Plateau fromage', sales: 550, quantity: 45 },
        { name: 'Chips', sales: 400, quantity: 140 }
      ]
    }
  });

  const [selectedMonth, setSelectedMonth] = useState('2023-05');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [timeRange, setTimeRange] = useState('3'); // 3 mois par défaut

  // Options pour le sélecteur de mois
  const monthOptions = Object.keys(salesData).map(key => ({
    label: `Mois ${key.split('-')[1]}/${key.split('-')[0]}`,
    value: key
  }));

  // Options pour le sélecteur de période
  const timeOptions = [
    { label: '1 mois', value: '1' },
    { label: '3 mois', value: '3' },
    { label: '6 mois', value: '6' },
    { label: '12 mois', value: '12' }
  ];

  // Données pour le graphique linéaire global
  const prepareLineData = () => {
    const months = Object.keys(salesData).sort();
    const labels = months.map(m => `M${m.split('-')[1]}`);
    const data = months.map(m => salesData[m].total);
    
    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Données pour le graphique circulaire
  const preparePieData = () => {
    return salesData[selectedMonth].products.map(product => ({
      name: product.name,
      sales: product.sales,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };

  // Données pour le graphique linéaire par produit
  const prepareProductTrendData = (productName) => {
    const months = Object.keys(salesData).sort();
    const productData = months.map(month => {
      const product = salesData[month].products.find(p => p.name === productName);
      return product ? product.sales : 0;
    });
    
    return {
      labels: months.map(m => `M${m.split('-')[1]}`),
      datasets: [{
        data: productData,
        color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  return (
    <ScrollView style={styles.container}>
      {/* En-tête avec sélecteurs */}
      <View style={styles.header}>
        <Text style={styles.title}>Statistiques des Ventes</Text>
        
        <View style={styles.selectorsContainer}>
          <View style={styles.selector}>
            <Text style={styles.selectorLabel}>Période:</Text>
            <RNPickerSelect
              onValueChange={(value) => setTimeRange(value)}
              items={timeOptions}
              value={timeRange}
              style={pickerSelectStyles}
              placeholder={{}}
            />
          </View>
          
          <View style={styles.selector}>
            <Text style={styles.selectorLabel}>Mois:</Text>
            <RNPickerSelect
              onValueChange={(value) => setSelectedMonth(value)}
              items={monthOptions}
              value={selectedMonth}
              style={pickerSelectStyles}
              placeholder={{}}
            />
          </View>
        </View>
      </View>

      {/* Carte de résumé */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Bilan Mensuel</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Ventes</Text>
            <Text style={styles.summaryValue}>{salesData[selectedMonth].total} €</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Articles Vendus</Text>
            <Text style={styles.summaryValue}>
              {salesData[selectedMonth].products.reduce((sum, p) => sum + p.quantity, 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Graphique linéaire - Évolution globale */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Évolution des Ventes (Global)</Text>
        <LineChart
          data={prepareLineData()}
          width={Dimensions.get('window').width - 30}
          height={220}
          yAxisLabel="€"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#4BC0C0'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Graphique circulaire - Répartition des ventes */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Répartition des Ventes ({selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]})</Text>
        <PieChart
          data={preparePieData()}
          width={Dimensions.get('window').width - 30}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="sales"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
        />
      </View>

      {/* Liste des produits avec mini-graphiques */}
      <Text style={styles.sectionTitle}>Détail par Produit</Text>
      {salesData[selectedMonth].products.map((product, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.productCard}
          onPress={() => setSelectedProduct(product.name)}
        >
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSales}>{product.sales} € ({product.quantity} ventes)</Text>
          </View>
          
          <View style={styles.miniChart}>
            <LineChart
              data={prepareProductTrendData(product.name)}
              width={120}
              height={60}
              withDots={false}
              withShadow={false}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundGradientFrom: '#f5f5f5',
                backgroundGradientTo: '#f5f5f5',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
                propsForBackgroundLines: {
                  strokeWidth: 0
                }
              }}
              bezier
              style={{ paddingRight: 0 }}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Modal pour le détail produit */}
      {selectedProduct && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={!!selectedProduct}
          onRequestClose={() => setSelectedProduct(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProduct}</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>Évolution des ventes</Text>
              <LineChart
                data={prepareProductTrendData(selectedProduct)}
                width={Dimensions.get('window').width - 40}
                height={220}
                yAxisLabel="€"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  }
                }}
                bezier
              />

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Ventes ce mois</Text>
                  <Text style={styles.statValue}>
                    {salesData[selectedMonth].products.find(p => p.name === selectedProduct).sales} €
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Quantité vendue</Text>
                  <Text style={styles.statValue}>
                    {salesData[selectedMonth].products.find(p => p.name === selectedProduct).quantity}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Moyenne/mois</Text>
                  <Text style={styles.statValue}>
                    {Math.round(
                      Object.values(salesData)
                        .reduce((sum, month) => sum + month.products.find(p => p.name === selectedProduct).sales, 0) 
                      / Object.keys(salesData).length
                    )} €
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Part du total</Text>
                  <Text style={styles.statValue}>
                    {Math.round(
                      (salesData[selectedMonth].products.find(p => p.name === selectedProduct).sales / 
                      salesData[selectedMonth].total * 100
                    ))}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  selectorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  selector: {
    width: '48%'
  },
  selectorLabel: {
    marginBottom: 5,
    color: '#666',
    fontSize: 14
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  summaryItem: {
    alignItems: 'center',
    width: '48%'
  },
  summaryLabel: {
    color: '#666',
    fontSize: 14
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  chart: {
    borderRadius: 10,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16
  },
  productSales: {
    color: '#666',
    fontSize: 14
  },
  miniChart: {
    width: 120,
    height: 60
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  modalContent: {
    flex: 1
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  }
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    backgroundColor: 'white'
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    backgroundColor: 'white'
  }
});

export default SalesStatisticsScreen;