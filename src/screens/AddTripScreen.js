import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { auth } from '../firebase/firebaseConfig';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const GOOGLE_API_KEY = 'AIzaSyCL1__y9f22KmYl-lCbDXiQ_cKoMzGlUnA'; 

const AddTripScreen = ({ navigation }) => {
  
  const getDateString = (dateObj) => {
    if (!dateObj) return null;
    if (isNaN(dateObj.getTime())) return null; 
    try {
      return dateObj.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  };

  // ✅ YENİ: Gezi Başlığı için ayrı bir state
  const [tripTitle, setTripTitle] = useState(''); 
  
  // Şehir Arama (Google) için state
  const [searchQuery, setSearchQuery] = useState(''); 

  const [date, setDate] = useState(new Date()); 
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [suggestions, setSuggestions] = useState([]); 
  const [showList, setShowList] = useState(false); 
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const db = getFirestore();

  const handleSearch = async (text) => {
    setSearchQuery(text);
    // DİKKAT: Artık burada setTitle yapmıyoruz, başlık ayrı!

    if (text.length > 2) { 
      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}&input=${text}&types=(cities)&language=tr`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (json.status === 'OK') {
          setSuggestions(json.predictions); 
          setShowList(true);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Google Arama Hatası:", error);
      }
    } else {
      setSuggestions([]);
      setShowList(false);
    }
  };

  const handleSelectCity = async (item) => {
    const cityName = item.description;
    setSearchQuery(cityName); // Sadece şehir bilgisini güncelle
    setShowList(false); 
    
    try {
      const placeId = item.place_id;
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
      
      const res = await fetch(detailsUrl);
      const json = await res.json();

      if (json.result && json.result.photos && json.result.photos.length > 0) {
        const photoRef = json.result.photos[0].photo_reference;
        const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
        
        setSelectedPhoto(googlePhotoUrl); 
        console.log("Google Fotoğrafı (Arka Planda) Bulundu");
      } else {
        setSelectedPhoto(null); 
      }
    } catch (error) {
      console.log("Fotoğraf çekme hatası:", error);
      setSelectedPhoto(null);
    }
  };

  const turkishToEnglish = (text) => {
    return text
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c');
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleCreateTrip = async () => {
    // Kontroller: Başlık ve Şehir dolu mu?
    if (tripTitle.trim() === '') {
      Alert.alert('Eksik Bilgi', 'Lütfen gezinize bir başlık verin (Örn: Yaz Tatili).');
      return;
    }
    if (searchQuery.trim() === '') {
      Alert.alert('Eksik Bilgi', 'Lütfen gidilecek şehri seçiniz.');
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    try {
      // 1. ÇAKIŞMA KONTROLÜ
      const newTripDate = getDateString(date);
      const tripsRef = collection(db, "trips");
      
      const q = query(tripsRef, where("participants", "array-contains", user.uid));
      const querySnapshot = await getDocs(q);

      let conflictFound = false;
      let conflictTripTitle = "";

      querySnapshot.forEach((doc) => {
        const existingTrip = doc.data();
        let existingTripDateObj = null;
        try {
          if (existingTrip.date && existingTrip.date.seconds) {
             existingTripDateObj = new Date(existingTrip.date.seconds * 1000);
          } else if (existingTrip.date) {
             existingTripDateObj = new Date(existingTrip.date);
          }
        } catch(e) {}

        if (existingTripDateObj) {
           const existingDateString = getDateString(existingTripDateObj);
           if (existingDateString && existingDateString === newTripDate) {
             conflictFound = true;
             conflictTripTitle = existingTrip.title;
           }
        }
      });

      if (conflictFound) {
        Alert.alert(
          "Plan Çakışması! 📅",
          `Seçtiğiniz tarihte zaten "${conflictTripTitle}" gezisinde kaydınız var.`
        );
        setLoading(false);
        return; 
      }

      const creatorName = user.displayName || user.email.split('@')[0];
      const formattedName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
      
      let finalTripImage = selectedPhoto;

      if (!finalTripImage) {
        const rawCity = searchQuery.split(',')[0].trim(); // Başlık değil, şehri kullanıyoruz
        const cleanCityName = turkishToEnglish(rawCity).toLowerCase();
        const randomNum = Math.floor(Math.random() * 1000);
        finalTripImage = `https://loremflickr.com/800/600/${cleanCityName},city,landmark?random=${randomNum}`;
      }

      // ✅ VERİTABANINA KAYIT
      await addDoc(collection(db, 'trips'), {
        title: tripTitle, // Kullanıcının yazdığı Özel Başlık
        city: searchQuery, // Google'dan seçilen Şehir
        date: date,
        description: description,
        creatorId: user.uid,
        creatorName: formattedName,
        creatorPhoto: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        image: finalTripImage,
        createdAt: new Date(),
        participants: [user.uid]
      });

      Alert.alert('Harika!', 'Rotanız başarıyla oluşturuldu. 🚀', [
        { text: 'Tamam', onPress: () => navigation.navigate('Home') }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formattedDateDisplay = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Vazgeç</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Rota Oluştur</Text>
          <View style={{ width: 60 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>Dünyanın her yerine gezi planlayabilirsin.</Text>

          {/* ✅ 1. KUTU: GEZİ BAŞLIĞI */}
          <Text style={styles.label}>Gezinin Adı Ne Olsun?</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Kayak Tatili, Yaz Kampı..."
            placeholderTextColor="#999"
            value={tripTitle}
            onChangeText={setTripTitle}
          />

          {/* ✅ 2. KUTU: ŞEHİR ARAMA (Google) */}
          <Text style={[styles.label, {marginTop: 10}]}>Nereye Gidiyorsun?</Text>
          <View style={{ zIndex: 10 }}> 
            <TextInput
              style={styles.input}
              placeholder="Şehir ara (Örn: Isparta, Tokyo, Floransa)..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch} 
            />
            
            {showList && suggestions.length > 0 && (
              <View style={styles.suggestionList}>
                <ScrollView 
                  nestedScrollEnabled={true} 
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 200 }}
                >
                  {suggestions.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.suggestionItem} 
                      onPress={() => handleSelectCity(item)}
                    >
                      <View>
                        <Text style={styles.mainText}>
                          {item.structured_formatting?.main_text || item.description}
                        </Text>
                        <Text style={styles.secondaryText}>
                          {item.structured_formatting?.secondary_text || ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={[styles.label, {marginTop: 10}]}>Ne Zaman?</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>📅 {formattedDateDisplay}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()} 
            />
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Planın Nedir?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Açıklama..."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.createButton} onPress={handleCreateTrip} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Rotayı Yayınla 🚀</Text>}
          </TouchableOpacity>
          <View style={{height: 100}} /> 
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  closeButtonText: { fontSize: 16, color: '#FF3B30' },
  form: { padding: 20 },
  description: { color: '#666', marginBottom: 25 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 10 },
  dateButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, marginBottom: 5, borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row' },
  dateText: { fontSize: 16, color: '#4A90E2', fontWeight: '600' },
  textArea: { height: 100 },
  createButton: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  suggestionList: { 
    position: 'absolute', 
    top: 150, // Konumunu inputa göre ayarladık
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#eee', 
    zIndex: 1000, 
    maxHeight: 200, 
    elevation: 5 
  },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  mainText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  secondaryText: { fontSize: 12, color: '#888', marginTop: 2 }
});

export default AddTripScreen;