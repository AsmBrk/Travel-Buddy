import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const HomeScreen = ({ navigation }) => {
  const [username, setUsername] = useState('Gezgin');
  const [trips, setTrips] = useState([]);      
  const [searchText, setSearchText] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const db = getFirestore();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const displayName = user.displayName || user.email.split('@')[0];
      const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      setUsername(formattedName);
    }

    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Tarihi geçenleri temizle
      const now = new Date();
      
      const activeTrips = tripsList.filter(trip => {
        if (!trip.date) return false; 
        
        let tripDate;
        if (trip.date.seconds) {
           tripDate = new Date(trip.date.seconds * 1000);
        } else {
           tripDate = new Date(trip.date);
        }

        tripDate.setHours(23, 59, 59);
        return tripDate >= now; 
      });

      setTrips(activeTrips); 
      setCurrentPage(1);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (dateData) => {
    if (!dateData) return '';
    if (dateData.seconds) {
      return new Date(dateData.seconds * 1000).toLocaleDateString('tr-TR');
    }
    if (dateData instanceof Date) {
      return dateData.toLocaleDateString('tr-TR');
    }
    return dateData;
  };

  // ✅ BURASI GÜNCELLENDİ: ARTIK ŞEHİR İSMİNE DE BAKIYOR
  const filteredTrips = trips.filter(trip => {
    const text = searchText.toLowerCase(); 
    
    // Veritabanında şehir ismi olmayabilir, hata vermemesi için kontrol ediyoruz (trip.city || '')
    const city = trip.city ? trip.city.toLowerCase() : '';
    const title = trip.title ? trip.title.toLowerCase() : '';
    const creator = trip.creatorName ? trip.creatorName.toLowerCase() : '';

    return (
      title.includes(text) || 
      creator.includes(text) ||
      city.includes(text) // ✅ Şehir araması eklendi
    );
  });

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greetingText}>
          Merhaba, <Text style={styles.userName}>{username}</Text> 👋
        </Text>
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
          style={styles.profileImageHeader} 
        />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Şehir veya gezi ara..." 
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={text => {
            setSearchText(text);
            setCurrentPage(1);
          }} 
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ color: '#999', fontSize: 18, paddingHorizontal: 5 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
        ) : filteredTrips.length > 0 ? (
          paginatedTrips.map((trip) => (
            <TouchableOpacity 
              key={trip.id} 
              style={styles.card}
              onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
            >
              <Image 
                source={{ uri: trip.image || 'https://via.placeholder.com/150' }} 
                style={styles.cardImage} 
              />
              
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{trip.title}</Text>
                  <Text style={styles.cardDate}>📅 {formatDate(trip.date)}</Text>
                  {/* İstersen kartın içine şehir ismini de ufakça yazdırabilirsin */}
                  <Text style={{fontSize: 12, color:'#999', marginTop: 2}}>📍 {trip.city}</Text>
                </View>
                
                <View style={styles.cardFooter}>
                  <View style={styles.creatorInfo}>
                    <Image 
                      source={{ uri: trip.creatorPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                      style={styles.creatorAvatar} 
                    />
                    <Text style={styles.creatorName} numberOfLines={1}>
                      {trip.creatorName}
                    </Text>
                  </View>
                  
                  <View style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>İncele</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Text style={{ fontSize: 40 }}>😕</Text>
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>
              {searchText ? 'Aradığınız kriterde bir gezi bulunamadı.' : 'Henüz hiç rota oluşturulmamış.'}
            </Text>
          </View>
        )}

        {/* PAGINATION */}
        {filteredTrips.length > 0 && totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>← Önceki</Text>
            </TouchableOpacity>

            <View style={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <TouchableOpacity
                  key={page}
                  style={[
                    styles.pageNumber,
                    currentPage === page && styles.pageNumberActive,
                  ]}
                  onPress={() => goToPage(page)}
                >
                  <Text
                    style={[
                      styles.pageNumberText,
                      currentPage === page && styles.pageNumberTextActive,
                    ]}
                  >
                    {page}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>Sonraki →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, { color: '#4A90E2' }]}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.addButtonContainer}
          onPress={() => navigation.navigate('AddTrip')} 
        >
          <View style={styles.addButton}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')} 
        >
          <Text style={styles.navIcon}>👤</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 10, marginBottom: 20,
  },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  userName: { color: '#000' },
  profileImageHeader: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1, borderColor: '#ddd' },
  
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0',
    marginHorizontal: 20, borderRadius: 25, paddingHorizontal: 15, height: 50, marginBottom: 20,
  },
  searchIcon: { fontSize: 18, marginRight: 10, color: '#999' },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  
  scrollContent: { paddingHorizontal: 20 },
  
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, height: 140, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, padding: 10,
  },
  cardImage: { width: 100, height: '100%', borderRadius: 10 },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: 'space-between', paddingVertical: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  cardDate: { fontSize: 14, color: '#7f8c8d' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  creatorAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  creatorName: { fontSize: 12, color: '#333', maxWidth: 70 },
  joinButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  joinButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    height: 80, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#eee',
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 10,
  },
  navItem: { padding: 10 },
  navIcon: { fontSize: 28, color: '#BDC3C7' },
  addButtonContainer: {
    top: -20, shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  addButton: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#4A90E2',
    justifyContent: 'center', alignItems: 'center',
  },
  plusIcon: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },
  
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  paginationButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#ddd',
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 5,
  },
  pageNumber: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pageNumberActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
});

export default HomeScreen;