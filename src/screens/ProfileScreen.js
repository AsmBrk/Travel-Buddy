import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: 'Misafir',
    email: '',
    photo: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', 
    about: '...'
  });
  
  const [createdTrips, setCreatedTrips] = useState([]); 
  const [joinedTrips, setJoinedTrips] = useState([]);   
  const [loading, setLoading] = useState(true);
  const [currentPageCreated, setCurrentPageCreated] = useState(1);
  const [currentPageJoined, setCurrentPageJoined] = useState(1);
  const itemsPerPage = 5;

  const db = getFirestore();

  // ✅ EKLENEN KISIM: Tarih Formatlama Fonksiyonu (ÇÖKMEYİ ENGELLER)
  const formatDate = (dateData) => {
    if (!dateData) return '';
    // 1. Durum: Firestore Timestamp (saniye)
    if (dateData.seconds) {
      return new Date(dateData.seconds * 1000).toLocaleDateString('tr-TR');
    }
    // 2. Durum: JavaScript Date Objesi
    if (dateData instanceof Date) {
      return dateData.toLocaleDateString('tr-TR');
    }
    // 3. Durum: Zaten yazı (String) ise
    return dateData;
  };

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) return;

      const fetchUserProfile = async () => {
        let aboutText = 'Seyahat etmeyi ve yeni yerler keşfetmeyi seviyorum.';
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().about) {
            aboutText = docSnap.data().about;
          }
        } catch (error) {
          console.log("Hata:", error);
        }

        const displayName = user.displayName || user.email.split('@')[0];
        const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        setUserData({
          name: formattedName,
          email: user.email,
          photo: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          about: aboutText
        });
      };
      fetchUserProfile();

      const qCreated = query(collection(db, 'trips'), where('creatorId', '==', user.uid));
      const unsubCreated = onSnapshot(qCreated, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCreatedTrips(list);
      });

      const qJoined = query(collection(db, 'trips'), where('participants', 'array-contains', user.uid));
      const unsubJoined = onSnapshot(qJoined, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const onlyJoined = list.filter(trip => trip.creatorId !== user.uid);
        onlyJoined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setJoinedTrips(onlyJoined);
        setLoading(false);
      });

      return () => {
        unsubCreated();
        unsubJoined();
      };
    }, [])
  );

  const handleDeleteTrip = (tripId) => {
    Alert.alert(
      "Rotayı Sil",
      "Bu rotayı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'trips', tripId));
              Alert.alert("Başarılı", "Rota silindi.");
            } catch (error) {
              Alert.alert("Hata", "Silme işlemi sırasında bir sorun oluştu.");
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // navigation.reset yerine replace veya navigate kullanmak daha güvenli olabilir
      // ama senin yapında reset çalışıyorsa kalabilir.
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılamadı.');
    }
  };

  const totalPagesCreated = Math.ceil(createdTrips.length / itemsPerPage);
  const paginatedCreatedTrips = createdTrips.slice(
    (currentPageCreated - 1) * itemsPerPage,
    currentPageCreated * itemsPerPage
  );

  const totalPagesJoined = Math.ceil(joinedTrips.length / itemsPerPage);
  const paginatedJoinedTrips = joinedTrips.slice(
    (currentPageJoined - 1) * itemsPerPage,
    currentPageJoined * itemsPerPage
  );

  const handlePreviousPageCreated = () => {
    if (currentPageCreated > 1) setCurrentPageCreated(currentPageCreated - 1);
  };

  const handleNextPageCreated = () => {
    if (currentPageCreated < totalPagesCreated) setCurrentPageCreated(currentPageCreated + 1);
  };

  const goToPageCreated = (page) => setCurrentPageCreated(page);

  const handlePreviousPageJoined = () => {
    if (currentPageJoined > 1) setCurrentPageJoined(currentPageJoined - 1);
  };

  const handleNextPageJoined = () => {
    if (currentPageJoined < totalPagesJoined) setCurrentPageJoined(currentPageJoined + 1);
  };

  const goToPageJoined = (page) => setCurrentPageJoined(page);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Image source={{ uri: userData.photo }} style={styles.avatar} />
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')} 
          >
            <Text style={styles.editButtonText}>Profili Düzenle ✏️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkımda</Text>
          <Text style={styles.aboutText}>{userData.about}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yönettiğim Rotalar ({createdTrips.length})</Text>
          {createdTrips.length > 0 ? (
            paginatedCreatedTrips.map((trip) => (
              <View key={trip.id} style={styles.tripCardWrapper}>
                <TouchableOpacity 
                  style={styles.tripCard}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
                >
                  <Image source={{ uri: trip.image }} style={styles.tripImage} />
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    {/* ✅ DÜZELTİLDİ: Tarih formatlama eklendi */}
                    <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Yönetici 👑</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTrip(trip.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz rota oluşturmadınız.</Text>
          )}
          
          {/* Pagination Created Trips */}
          {createdTrips.length > 0 && totalPagesCreated > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity 
                style={[styles.paginationButton, currentPageCreated === 1 && styles.paginationButtonDisabled]}
                onPress={handlePreviousPageCreated}
                disabled={currentPageCreated === 1}
              >
                <Text style={[styles.paginationButtonText, currentPageCreated === 1 && styles.paginationButtonTextDisabled]}>← Önceki</Text>
              </TouchableOpacity>

              <View style={styles.pageNumbers}>
                {Array.from({ length: totalPagesCreated }, (_, i) => i + 1).map((page) => (
                  <TouchableOpacity
                    key={page}
                    style={[
                      styles.pageNumber,
                      currentPageCreated === page && styles.pageNumberActive,
                    ]}
                    onPress={() => goToPageCreated(page)}
                  >
                    <Text style={[styles.pageNumberText, currentPageCreated === page && styles.pageNumberTextActive]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.paginationButton, currentPageCreated === totalPagesCreated && styles.paginationButtonDisabled]}
                onPress={handleNextPageCreated}
                disabled={currentPageCreated === totalPagesCreated}
              >
                <Text style={[styles.paginationButtonText, currentPageCreated === totalPagesCreated && styles.paginationButtonTextDisabled]}>Sonraki →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Katıldığım Rotalar ({joinedTrips.length})</Text>
          {joinedTrips.length > 0 ? (
            paginatedJoinedTrips.map((trip) => (
              <TouchableOpacity 
                key={trip.id} 
                style={styles.tripCardWrapper} 
                onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
              >
                <View style={styles.tripCard}>
                  <Image source={{ uri: trip.image }} style={styles.tripImage} />
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    {/* ✅ DÜZELTİLDİ: Tarih formatlama eklendi */}
                    <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
                    <Text style={styles.creatorNameSub}>👤 {trip.creatorName}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#e1ffe1' }]}>
                    <Text style={[styles.badgeText, { color: '#2ecc71' }]}>Katılımcı ✅</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Başka bir geziye katılmadınız.</Text>
          )}
          
          {/* Pagination Joined Trips */}
          {joinedTrips.length > 0 && totalPagesJoined > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity 
                style={[styles.paginationButton, currentPageJoined === 1 && styles.paginationButtonDisabled]}
                onPress={handlePreviousPageJoined}
                disabled={currentPageJoined === 1}
              >
                <Text style={[styles.paginationButtonText, currentPageJoined === 1 && styles.paginationButtonTextDisabled]}>← Önceki</Text>
              </TouchableOpacity>

              <View style={styles.pageNumbers}>
                {Array.from({ length: totalPagesJoined }, (_, i) => i + 1).map((page) => (
                  <TouchableOpacity
                    key={page}
                    style={[
                      styles.pageNumber,
                      currentPageJoined === page && styles.pageNumberActive,
                    ]}
                    onPress={() => goToPageJoined(page)}
                  >
                    <Text style={[styles.pageNumberText, currentPageJoined === page && styles.pageNumberTextActive]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.paginationButton, currentPageJoined === totalPagesJoined && styles.paginationButtonDisabled]}
                onPress={handleNextPageJoined}
                disabled={currentPageJoined === totalPagesJoined}
              >
                <Text style={[styles.paginationButtonText, currentPageJoined === totalPagesJoined && styles.paginationButtonTextDisabled]}>Sonraki →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButtonContainer} onPress={() => navigation.navigate('AddTrip')}>
          <View style={styles.addButton}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={[styles.navIcon, { color: '#4A90E2' }]}>👤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, borderWidth: 2, borderColor: '#4A90E2' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginBottom: 10 },
  editButton: { padding: 8, backgroundColor: '#f0f8ff', borderRadius: 20, marginTop: 5 },
  editButtonText: { color: '#4A90E2', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  aboutText: { color: '#555', lineHeight: 20 },
  
  tripCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  tripCard: { 
    flex: 1, 
    flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 12, 
    padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  
  tripImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tripDate: { fontSize: 12, color: '#888' },
  creatorNameSub: { fontSize: 11, color: '#666', marginTop: 2 },
  
  badge: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#856404' },
  
  deleteButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    backgroundColor: '#FF3B30', 
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: { fontSize: 18 },
  
  emptyText: { color: '#999', fontStyle: 'italic', fontSize: 14 },
  signOutButton: { marginTop: 10, backgroundColor: '#FF3B30', padding: 15, borderRadius: 10, alignItems: 'center' },
  signOutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', 
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', 
    height: 80, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#eee', 
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 10 
  },
  navItem: { padding: 10 },
  navIcon: { fontSize: 28, color: '#BDC3C7' },
  addButtonContainer: { 
    top: -20, shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 
  },
  addButton: { 
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#4A90E2', 
    justifyContent: 'center', alignItems: 'center' 
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

export default ProfileScreen;