import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity,
  ImageBackground, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase/firebaseConfig';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'android') {
      setTimeout(() => {
        Alert.alert(title, message, buttons);
      }, 100);
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const handleRegister = async () => {
    console.log("Kayıt ol butonuna tıklandı.");

    if (!name || !email || !password || !confirmPassword) {
      showAlert('Uyarı', 'Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Hata', 'Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    if (password.length < 6) {
      showAlert('Güvenlik', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("Auth kaydı başarılı:", user.uid);

      if (user) {

        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          createdAt: new Date(),
          bio: "", 
          city: "", 
          role: "traveler"
        });
        console.log("Firestore veritabanı kaydı başarılı.");
      }

      setLoading(false);
      
      showAlert('Başarılı', 'Hesabınız oluşturuldu! Giriş yapabilirsiniz.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Login') }
      ]);
      
    } catch (error) {
      setLoading(false);
      console.error("Kayıt Hatası:", error);

      let errorMessage = 'Beklenmedik bir hata oluştu.';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Bu e-posta zaten kullanımda.';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Geçersiz e-posta adresi.';
      else if (error.code === 'auth/weak-password') errorMessage = 'Şifreniz çok zayıf.';
      else if (error.code === 'auth/network-request-failed') errorMessage = 'İnternet bağlantınızı kontrol edin.';
      else errorMessage = error.message; 
      
      showAlert('Kayıt Başarısız', errorMessage);
    }
  };

  return (

    <ImageBackground 
      source={require('../../Assets/background.jpg')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            <View style={styles.headerContainer}>
              <Text style={styles.title}>TravelBuddy</Text>
              <Text style={styles.subtitle}>Aramıza Katıl</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.icon}>👤</Text> 
                <TextInput
                  style={styles.input}
                  placeholder="Ad Soyad"
                  placeholderTextColor="#666"
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.icon}>✉️</Text> 
                <TextInput
                  style={styles.input}
                  placeholder="E-Posta"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.icon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Şifre"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.icon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Şifre Tekrar"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
                style={{ padding: 10 }}
              >
                <Text style={styles.loginText}>
                  Hesabın var mı? <Text style={styles.loginBold}>Giriş yap</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  title: { 
    fontSize: 42, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 10, 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  subtitle: { 
    fontSize: 16, 
    color: '#fff', 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  formContainer: { width: '100%' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, height: 60 
  },
  icon: { fontSize: 20, marginRight: 10, color: '#666' },
  input: { flex: 1, height: '100%', color: '#333', fontSize: 16 },
  registerButton: {
    backgroundColor: '#4A90E2', borderRadius: 15, height: 60, 
    justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20,
    elevation: 5, 
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginText: { 
    color: '#fff', 
    textAlign: 'center', 
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5
  },
  loginBold: { fontWeight: 'bold' }
});

export default RegisterScreen;