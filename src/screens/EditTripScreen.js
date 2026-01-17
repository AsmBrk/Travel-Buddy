import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const GOOGLE_API_KEY = 'AIzaSyCL1__y9f22KmYl-lCbDXiQ_cKoMzGlUnA'; 

const EditTripScreen = ({ navigation, route }) => {
  const { trip } = route.params; 

  const [tripTitle, setTripTitle] = useState(''); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [date, setDate] = useState(new Date()); 
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [suggestions, setSuggestions] = useState([]); 
  const [showList, setShowList] = useState(false); 
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const db = getFirestore();

  useEffect(() => {
    if (trip) {
      setTripTitle(trip.title);
      setSearchQuery(trip.city);
      setDescription(trip.description);
      setSelectedPhoto(trip.image);

      if (trip.date) {
        if (trip.date.seconds) {
          setDate(new Date(trip.date.seconds * 1000));
        } else {
          setDate(new Date(trip.date));
        }
      }
    }
  }, [trip]);

  const handleSearch = async (text) => {
    setSearchQuery(text);
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
        console.error(error);
      }
    } else {
      setSuggestions([]);
      setShowList(false);
    }
  };

  const handleSelectCity = async (item) => {
    const cityName = item.description;
    setSearchQuery(cityName); 
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
      }
    } catch (error) {
      console.log(error);
    }
  };

  const turkishToEnglish = (text) => {
    return text.replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ü/g, 'U').replace(/ü/g, 'u').replace(/Ş/g, 'S').replace(/ş/g, 's').replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/Ö/g, 'O').replace(/ö/g, 'o').replace(/Ç/g, 'C').replace(/ç/g, 'c');
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleUpdateTrip = async () => {
    if (tripTitle.trim() === '' || searchQuery.trim() === '') {
      Alert.alert('Eksik Bilgi', 'Başlık ve Şehir boş bırakılamaz.');
      return;
    }

    setLoading(true);

    try {
      let finalTripImage = selectedPhoto;

      if (!finalTripImage) {
        const rawCity = searchQuery.split(',')[0].trim();
        const cleanCityName = turkishToEnglish(rawCity).toLowerCase();
        const randomNum = Math.floor(Math.random() * 1000);
        finalTripImage = `https://loremflickr.com/800/600/${cleanCityName},city,landmark?random=${randomNum}`;
      }

      const tripRef = doc(db, 'trips', trip.id);
      
      await updateDoc(tripRef, {
        title: tripTitle,
        city: searchQuery,
        date: date,
        description: description,
        image: finalTripImage,
      });

      Alert.alert('Başarılı', 'Gezi güncellendi! ✅', [
        { text: 'Tamam', onPress: () => navigation.navigate('Home') }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Güncelleme sırasında bir sorun oluştu.');
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
          <Text style={styles.headerTitle}>Geziyi Düzenle ✏️</Text>
          <View style={{ width: 60 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.label}>Gezinin Adı</Text>
          <TextInput
            style={styles.input}
            value={tripTitle}
            onChangeText={setTripTitle}
          />

          <Text style={[styles.label, {marginTop: 10}]}>Şehir</Text>
          <View style={{ zIndex: 10 }}> 
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={handleSearch} 
            />
            
            {showList && suggestions.length > 0 && (
              <View style={styles.suggestionList}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectCity(item)}>
                      <View>
                        <Text style={styles.mainText}>{item.structured_formatting?.main_text || item.description}</Text>
                        <Text style={styles.secondaryText}>{item.structured_formatting?.secondary_text || ''}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={[styles.label, {marginTop: 10}]}>Tarih</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>📅 {formattedDateDisplay}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker testID="dateTimePicker" value={date} mode="date" is24Hour={true} display="default" onChange={onDateChange} />
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* ✅ GÜNCELLENEN BUTON RENGİ */}
          <TouchableOpacity style={styles.createButton} onPress={handleUpdateTrip} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Değişiklikleri Kaydet 💾</Text>}
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
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 10 },
  dateButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, marginBottom: 5, borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row' },
  dateText: { fontSize: 16, color: '#4A90E2', fontWeight: '600' },
  textArea: { height: 100 },
  
  // ✅ RENGİ BURADA DEĞİŞTİRDİK (#17dbb4)
  createButton: { 
    backgroundColor: '#17dbb4', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 10 
  }, 
  
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  suggestionList: { position: 'absolute', top: 80, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee', zIndex: 1000, maxHeight: 200, elevation: 5 },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  mainText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  secondaryText: { fontSize: 12, color: '#888', marginTop: 2 }
});

export default EditTripScreen;