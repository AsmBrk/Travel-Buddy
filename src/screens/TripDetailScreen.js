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
import axios from 'axios'; 
import { auth } from '../firebase/firebaseConfig';
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc,
  collection, 
  query,      
  where,     
  getDocs     
} from 'firebase/firestore';

const API_KEY = 'efcfdd39812868e03de419c052a1341b'; 

const TripDetailScreen = ({ route, navigation }) => {
  // Tarihleri "2024-05-20" formatına çevirip kıyaslamak için yardımcı fonksiyon
  const getDateString = (dateData) => {
    if (!dateData) return null;
    const d = dateData.seconds ? new Date(dateData.seconds * 1000) : new Date(dateData);
    return d.toISOString().split('T')[0]; // Sadece tarihi al (Saat önemsiz)
  };
  const { tripId } = route.params; 
  
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [weather, setWeather] = useState(null); 
  
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
        const data = { id: docSnap.id, ...docSnap.data() };
        setTrip(data);
        if (data.city || data.title) {
          fetchWeather(data.city || data.title);
        }
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

  const fetchWeather = async (cityName) => {
    const cleanCity = cityName.split(',')[0].trim(); 
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${cleanCity}&appid=${API_KEY}&units=metric&lang=tr`
      );
      setWeather(response.data);
    } catch (error) {
      console.log("Hava durumu çekilemedi:", error);
    }
  };

  const formatDate = (dateData) => {
    if (!dateData) return 'Tarih Yok';
    if (dateData.seconds) {
      return new Date(dateData.seconds * 1000).toLocaleDateString('tr-TR');
    }
    if (dateData instanceof Date) {
      return dateData.toLocaleDateString('tr-TR');
    }
    return dateData;
  };

  const isJoined = trip?.participants?.includes(user?.uid) || false;
  const isCreator = trip?.creatorId === user?.uid;

  const handleJoinToggle = async () => {
    if (!user) return;
    setProcessing(true);
    const tripRef = doc(db, 'trips', tripId);
    
    try {
      // EĞER ZATEN KATILDIYSA -> AYRILMA İŞLEMİ (Kontrole gerek yok)
      if (isJoined) {
        await updateDoc(tripRef, { participants: arrayRemove(user.uid) });
        Alert.alert('Bilgi', 'Geziden ayrıldınız.');
      
      // EĞER KATILACAKSA -> ÇAKIŞMA KONTROLÜ YAP
      } else {
        
        // 1. Bu gezinin tarihini al
        const targetDate = getDateString(trip.date);

        // 2. Kullanıcının katıldığı (veya kurduğu) TÜM gezileri bul
        const tripsRef = collection(db, "trips");
        
        // Hem katılımcı olduklarını hem de kurucu olduklarını kontrol etmeliyiz
        // (Basitlik için sadece katılımcı listesine bakıyoruz, çünkü kurucu da katılımcıdır)
        const q = query(tripsRef, where("participants", "array-contains", user.uid));
        const querySnapshot = await getDocs(q);

        let conflictFound = false;
        let conflictTripTitle = "";

        // 3. Tarihleri karşılaştır
        querySnapshot.forEach((doc) => {
          const otherTrip = doc.data();
          // Kendi gezisiyle kıyaslamasın (Gerçi zaten isJoined false ama olsun)
          if (doc.id !== tripId) {
            const otherDate = getDateString(otherTrip.date);
            if (otherDate === targetDate) {
              conflictFound = true;
              conflictTripTitle = otherTrip.title;
            }
          }
        });

        // 4. Çakışma varsa HATA ver ve durdur
        if (conflictFound) {
          Alert.alert(
            "Çakışma Var! ⚠️",
            `Aynı tarihte "${conflictTripTitle}" isimli başka bir geziniz var. İki yere birden gidemezsiniz! 😉`
          );
          setProcessing(false);
          return; // Fonksiyonu burada bitir, kaydetme yapma!
        }

        // 5. Çakışma yoksa KAYDET
        await updateDoc(tripRef, { participants: arrayUnion(user.uid) });
        Alert.alert('Harika!', 'Geziye katıldınız! 🎉');
      }

      // Ekranı güncelle
      const updatedSnap = await getDoc(tripRef);
      setTrip({ id: updatedSnap.id, ...updatedSnap.data() });

    } catch (error) {
      console.error("Güncelleme hatası:", error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleDeleteTrip = () => {
    Alert.alert(
      "Geziyi Sil", "Emin misiniz?",
      [{ text: "Vazgeç", style: "cancel" },
       { text: "Sil", style: "destructive", onPress: async () => {
            try {
              setProcessing(true);
              await deleteDoc(doc(db, 'trips', tripId));
              Alert.alert("Başarılı", "Gezi silindi.");
              navigation.goBack();
            } catch (error) { Alert.alert("Hata", "Gezi silinemedi."); setProcessing(false); }
          }
       }]
    );
  };
  
  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A90E2" /></View>;

  let isExpired = false;
  if (trip && trip.date) {
    const now = new Date();
    let tripDate;
    if (trip.date.seconds) {
      tripDate = new Date(trip.date.seconds * 1000);
    } else {
      tripDate = new Date(trip.date);
    }
    tripDate.setHours(23, 59, 59);
    isExpired = now > tripDate; // Eğer şu an, gezi tarihini geçtiyse "true" olur
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: trip.image || 'https://via.placeholder.com/400x300' }} style={styles.headerImage} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{trip.title}</Text>
              <Text style={styles.date}>📅 {formatDate(trip.date)}</Text>
              <Text style={styles.cityText}>📍 {trip.city || trip.title}</Text>
            </View>
            <View style={styles.participantBadge}>
              <Text style={styles.participantCount}>{trip.participants ? trip.participants.length : 0} Kişi</Text>
            </View>
          </View>

          {/* ✅ GEZİ BİTTİ UYARISI */}
          {isExpired && (
            <View style={{ backgroundColor: '#FFEDED', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FFCDD2' }}>
              <Text style={{ color: '#D32F2F', fontWeight: 'bold', textAlign: 'center' }}>
                🏁 Bu Gezi Tamamlandı
              </Text>
              <Text style={{ color: '#D32F2F', fontSize: 12, textAlign: 'center' }}>
                Artık bu geziye katılım sağlanamaz.
              </Text>
            </View>
          )}

          {weather && (
            <View>
              <View style={styles.weatherCard}>
                <View>
                  <Text style={styles.weatherTitle}>📍 Şehirde Güncel Hava Durumu</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.weatherTemp}>{Math.round(weather.main.temp)}°C</Text>
                      <View style={{ marginLeft: 10 }}>
                          <Text style={styles.weatherDesc}>{weather.weather[0].description.toUpperCase()}</Text>
                          <Text style={styles.weatherSub}>Nem: %{weather.main.humidity} • Rüzgar: {weather.wind.speed} km/s</Text>
                      </View>
                  </View>
                </View>
                <Image style={{ width: 60, height: 60 }} source={{ uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png` }} />
              </View>
              <Text style={styles.weatherNote}>⚠️ Seyahat tarihinizdeki hava durumu tahminleri için tarih yaklaştığında tekrar kontrol ediniz.</Text>
            </View>
          )}
          

          <View style={styles.creatorRow}>
            <Image source={{ uri: trip.creatorPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} style={styles.avatar} />
            <View><Text style={styles.creatorLabel}>Düzenleyen</Text><Text style={styles.creatorName}>{isCreator ? "Siz (Gezi Sahibi)" : trip.creatorName}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Gezi Hakkında</Text>
          <Text style={styles.description}>{trip.description || 'Herhangi bir açıklama girilmemiş.'}</Text>
        </View>
        {(isJoined || isCreator) && (
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', { tripId: trip.id, title: trip.title })}
            >
              <Text style={styles.chatButtonText}>💬 Grup Sohbeti</Text>
              <Text style={styles.chatButtonSub}>Yol arkadaşlarınla plan yap</Text>
            </TouchableOpacity>
          )}
      </ScrollView>
      
      <View style={styles.footer}>
        {isCreator ? (
           <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
             
             {/* ✏️ DÜZENLE BUTONU (Turkuaz Oldu) */}
             {!isExpired && (
               <TouchableOpacity 
                 style={[styles.actionButton, { backgroundColor: '#17dbb4', flex: 1 }]} 
                 onPress={() => navigation.navigate('EditTrip', { trip: trip })}
                 disabled={processing}
               >
                 <Text style={styles.actionButtonText}>✏️ Düzenle</Text>
               </TouchableOpacity>
             )}

             {/* 🗑 SİL BUTONU */}
             <TouchableOpacity 
               style={[styles.actionButton, styles.deleteButton, { flex: 1 }]} 
               onPress={handleDeleteTrip} 
               disabled={processing}
             >
               {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>🗑 Geziyi Sil</Text>}
             </TouchableOpacity>
           </View>
        ) : (
           // MİSAFİR KISMI AYNI
           <>
             {isExpired ? (
                <View style={[styles.actionButton, { backgroundColor: '#ccc' }]}>
                  <Text style={styles.actionButtonText}>Süre Doldu 🔒</Text>
                </View>
             ) : (
                <TouchableOpacity style={[styles.actionButton, isJoined && styles.leaveButton]} onPress={handleJoinToggle} disabled={processing}>
                  {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>{isJoined ? 'Ayrıl' : 'Hemen Katıl'}</Text>}
                </TouchableOpacity>
             )}
           </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImage: { width: '100%', height: 300, resizeMode: 'cover' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  backButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: -2 },
  contentContainer: { padding: 20, marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  date: { fontSize: 16, color: '#4A90E2', fontWeight: '600' },
  cityText: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },
  participantBadge: { backgroundColor: '#f0f8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, height: 35, justifyContent: 'center' },
  participantCount: { color: '#4A90E2', fontWeight: 'bold' },
  weatherCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 15, marginBottom: 5, borderWidth: 1, borderColor: '#BBDEFB' },
  weatherTitle: { fontSize: 12, color: '#1976D2', fontWeight: 'bold', marginBottom: 5 },
  weatherTemp: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
  weatherDesc: { fontSize: 14, color: '#1565C0', fontWeight: 'bold' },
  weatherSub: { fontSize: 11, color: '#64B5F6', marginTop: 2 },
  weatherNote: { fontSize: 11, color: '#7f8c8d', marginTop: 0, marginBottom: 20, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 10 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  creatorLabel: { fontSize: 12, color: '#888' },
  creatorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  description: { fontSize: 16, color: '#666', lineHeight: 24 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#eee', elevation: 20, justifyContent: 'space-between' },
  priceContainer: { flex: 1 },
  priceLabel: { fontSize: 12, color: '#999' },
  priceValue: { fontSize: 18, fontWeight: 'bold' },
  actionButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 20, elevation: 5, flex: 1, alignItems: 'center' },
  leaveButton: { backgroundColor: '#FF3B30' },
  deleteButton: { backgroundColor: '#e74c3c', width: '100%' }, 
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    borderStyle: 'dashed' 
  },
  chatButtonText: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 18,
  },
  chatButtonSub: {
    color: '#4A90E2',
    fontSize: 12,
    marginTop: 2
  },
});

export default TripDetailScreen;