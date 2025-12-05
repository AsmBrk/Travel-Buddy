import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

const TripDetailScreen = ({ route, navigation }) => {
  const { tripId } = route.params; 
  
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    fetchTripData();
  }, []);

  const fetchTripData = async () => {
    try {
      const docRef = doc(db, 'trips', tripId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert('Hata', 'Bu gezi bulunamadı veya silinmiş.');
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isJoined = trip?.participants?.includes(user?.uid);

  const handleJoinToggle = async () => {
    if (!user) return;
    setJoining(true);

    const tripRef = doc(db, 'trips', tripId);

    try {
      if (isJoined) {
        await updateDoc(tripRef, {
          participants: arrayRemove(user.uid)
        });
        Alert.alert('Bilgi', 'Geziden ayrıldınız.');
      } else {
        await updateDoc(tripRef, {
          participants: arrayUnion(user.uid)
        });
        Alert.alert('Harika!', 'Geziye katıldınız! 🎉');
      }

      fetchTripData();
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: trip.image }} style={styles.headerImage} />
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{trip.title}</Text>
              <Text style={styles.date}>📅 {trip.date}</Text>
            </View>
            <View style={styles.participantBadge}>
              <Text style={styles.participantCount}>
                {trip.participants ? trip.participants.length : 0} Kişi
              </Text>
            </View>
          </View>

          <View style={styles.creatorRow}>
            <Image source={{ uri: trip.creatorPhoto }} style={styles.avatar} />
            <View>
              <Text style={styles.creatorLabel}>Düzenleyen</Text>
              <Text style={styles.creatorName}>{trip.creatorName}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Gezi Hakkında</Text>
          <Text style={styles.description}>
            {trip.description || 'Herhangi bir açıklama girilmemiş.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Durum</Text>
          <Text style={[styles.priceValue, { color: isJoined ? '#4CD964' : '#333' }]}>
            {isJoined ? 'Katıldınız ✅' : 'Katılım Açık'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.actionButton, isJoined && styles.leaveButton]}
          onPress={handleJoinToggle}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isJoined ? 'Ayrıl' : 'Hemen Katıl'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImage: { width: '100%', height: 300, resizeMode: 'cover' },
  backButton: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center'
  },
  backButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: -2 },
  contentContainer: { padding: 20, marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  date: { fontSize: 16, color: '#4A90E2', fontWeight: '600' },
  participantBadge: { backgroundColor: '#f0f8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  participantCount: { color: '#4A90E2', fontWeight: 'bold' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  creatorLabel: { fontSize: 12, color: '#888' },
  creatorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  description: { fontSize: 16, color: '#666', lineHeight: 24 },
  
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: '#eee', elevation: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10
  },
  priceContainer: { flex: 1 },
  priceLabel: { fontSize: 12, color: '#999' },
  priceValue: { fontSize: 18, fontWeight: 'bold' },
  actionButton: {
    backgroundColor: '#4A90E2', paddingHorizontal: 40, paddingVertical: 15,
    borderRadius: 20, elevation: 5
  },
  leaveButton: { backgroundColor: '#FF3B30' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default TripDetailScreen;