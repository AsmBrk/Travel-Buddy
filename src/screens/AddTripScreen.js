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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const AddTripScreen = ({ navigation }) => {
  const [title, setTitle] = useState(''); 
  const [date, setDate] = useState('');   
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [query, setQuery] = useState(''); 
  const [suggestions, setSuggestions] = useState([]); 
  const [showList, setShowList] = useState(false); 

  const db = getFirestore();

  const citiesDatabase = [
    // Türkiye 81 İl
    "Adana, Türkiye", "Adıyaman, Türkiye", "Afyonkarahisar, Türkiye", "Ağrı, Türkiye", "Amasya, Türkiye", "Ankara, Türkiye", "Antalya, Türkiye", "Artvin, Türkiye", "Aydın, Türkiye", "Balıkesir, Türkiye", "Bilecik, Türkiye", "Bingöl, Türkiye", "Bitlis, Türkiye", "Bolu, Türkiye", "Burdur, Türkiye", "Bursa, Türkiye", "Çanakkale, Türkiye", "Çankırı, Türkiye", "Çorum, Türkiye", "Denizli, Türkiye", "Diyarbakır, Türkiye", "Edirne, Türkiye", "Elazığ, Türkiye", "Erzincan, Türkiye", "Erzurum, Türkiye", "Eskişehir, Türkiye", "Gaziantep, Türkiye", "Giresun, Türkiye", "Gümüşhane, Türkiye", "Hakkari, Türkiye", "Hatay, Türkiye", "Isparta, Türkiye", "Mersin, Türkiye", "İstanbul, Türkiye", "İzmir, Türkiye", "Kars, Türkiye", "Kastamonu, Türkiye", "Kayseri, Türkiye", "Kırklareli, Türkiye", "Kırşehir, Türkiye", "Kocaeli, Türkiye", "Konya, Türkiye", "Kütahya, Türkiye", "Malatya, Türkiye", "Manisa, Türkiye", "Kahramanmaraş, Türkiye", "Mardin, Türkiye", "Muğla, Türkiye", "Muş, Türkiye", "Nevşehir, Türkiye", "Niğde, Türkiye", "Ordu, Türkiye", "Rize, Türkiye", "Sakarya, Türkiye", "Samsun, Türkiye", "Siirt, Türkiye", "Sinop, Türkiye", "Sivas, Türkiye", "Tekirdağ, Türkiye", "Tokat, Türkiye", "Trabzon, Türkiye", "Tunceli, Türkiye", "Şanlıurfa, Türkiye", "Uşak, Türkiye", "Van, Türkiye", "Yozgat, Türkiye", "Zonguldak, Türkiye", "Aksaray, Türkiye", "Bayburt, Türkiye", "Karaman, Türkiye", "Kırıkkale, Türkiye", "Batman, Türkiye", "Şırnak, Türkiye", "Bartın, Türkiye", "Ardahan, Türkiye", "Iğdır, Türkiye", "Yalova, Türkiye", "Karabük, Türkiye", "Kilis, Türkiye", "Osmaniye, Türkiye", "Düzce, Türkiye",
    // Dünya Başkentleri & Popüler Şehirler
    "Paris, Fransa", "Londra, İngiltere", "Berlin, Almanya", "Roma, İtalya", "Madrid, İspanya", "Barselona, İspanya", "Amsterdam, Hollanda", "Viyana, Avusturya", "Prag, Çekya", "Budapeşte, Macaristan", "New York, ABD", "Los Angeles, ABD", "San Francisco, ABD", "Miami, ABD", "Tokyo, Japonya", "Seul, Güney Kore", "Bangkok, Tayland", "Dubai, BAE", "Moskova, Rusya", "Kiev, Ukrayna", "Bakü, Azerbaycan", "Atina, Yunanistan", "Selanik, Yunanistan"
  ];

  const handleSearch = (text) => {
    setQuery(text);
    setTitle(text); 

    if (text.length > 0) {
      const searchText = text.toLocaleLowerCase('tr');
      
      const filtered = citiesDatabase.filter(city => 
        city.toLocaleLowerCase('tr').includes(searchText)
      );
      
      setSuggestions(filtered);
      setShowList(true);
    } else {
      setShowList(false);
    }
  };

  const handleSelectCity = (city) => {
    setQuery(city);
    setTitle(city); 
    setShowList(false);
  };

  const handleCreateTrip = async () => {
    if (title.trim() === '' || date.trim() === '') {
      Alert.alert('Eksik Bilgi', 'Lütfen gidilecek yeri ve tarihi yazınız.');
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    try {
      const creatorName = user.displayName || user.email.split('@')[0];
      const formattedName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
      
      const randomImageId = Math.floor(Math.random() * 1000); 
      const tripImage = `https://picsum.photos/seed/${randomImageId}/400/300`;

      await addDoc(collection(db, 'trips'), {
        title: title,
        date: date,
        description: description,
        creatorId: user.uid,
        creatorName: formattedName,
        creatorPhoto: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        image: tripImage,
        createdAt: new Date(),
        participants: [user.uid]
      });

      Alert.alert('Harika!', 'Rotanız başarıyla oluşturuldu.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Home') }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Vazgeç</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Rota Oluştur</Text>
          <View style={{ width: 60 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>
            Gideceğin yeri ve tarihleri belirle, yol arkadaşlarını bulmaya başla.
          </Text>

          <Text style={styles.label}>Nereye Gidiyorsun?</Text>
          <View style={{ zIndex: 10 }}> 
            <TextInput
              style={styles.input}
              placeholder="Şehir ara (Örn: Isparta...)"
              placeholderTextColor="#999"
              value={query}
              onChangeText={handleSearch} 
            />
            
            {showList && suggestions.length > 0 && (
              <View style={styles.suggestionList}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.suggestionItem}
                      onPress={() => handleSelectCity(item)}
                    >
                      <Text style={styles.suggestionText}>📍 {item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={styles.label}>Ne Zaman?</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 2-29 Mayıs"
            placeholderTextColor="#999"
            value={date}
            onChangeText={setDate}
          />

          <Text style={styles.label}>Planın Nedir? (Opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Gezilecek yerler, konaklama planı vs."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Rotayı Yayınla 🚀</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeButtonText: { fontSize: 16, color: '#FF3B30' },
  form: { padding: 20 },
  description: { color: '#666', marginBottom: 25, lineHeight: 20 },
  label: { fontSize: 14, color: '#333', fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', marginBottom: 20,
  },
  textArea: { height: 100 },
  createButton: {
    backgroundColor: '#4A90E2', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10,
    shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
  },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  suggestionList: {
    position: 'absolute', top: 55, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee',
    elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.2,
    zIndex: 1000, maxHeight: 200
  },
  suggestionItem: {
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  suggestionText: { fontSize: 16, color: '#333' }
});

export default AddTripScreen;