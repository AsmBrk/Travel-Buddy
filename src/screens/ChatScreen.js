import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

const ChatScreen = ({ route, navigation }) => {
  const { tripId, title } = route.params; // Gezinin ID'si ve Başlığı
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const db = getFirestore();
  const user = auth.currentUser;
  const flatListRef = useRef();

  // Mesajları Anlık Dinle (Real-time Listener)
  useEffect(() => {
    const messagesRef = collection(db, 'trips', tripId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
      
      // Yeni mesaj gelince en aşağı kaydır
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [tripId]);

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const textToSend = inputText;
    setInputText(''); // Kutuyu hemen temizle

    try {
      const userDisplayName = user.displayName || user.email.split('@')[0];
      
      await addDoc(collection(db, 'trips', tripId, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        senderName: userDisplayName,
        createdAt: new Date() // Sıralama için tarih
      });
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
    }
  };

  const renderItem = ({ item }) => {
    const isMyMessage = item.senderId === user.uid;

    return (
      <View style={[
        styles.messageContainer, 
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && <Text style={styles.senderName}>{item.senderName}</Text>}
        <View style={[
          styles.bubble, 
          isMyMessage ? styles.myBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText, 
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMyMessage ? {color: '#e1f5fe'} : {color: '#999'}]}>
             {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{width: 30}} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Mesaj Yazma Alanı */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yaz..."
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backButton: { padding: 5 },
  backText: { fontSize: 24, color: '#4A90E2', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', maxWidth: '70%' },
  
  messageContainer: { marginBottom: 10, maxWidth: '80%' },
  myMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  
  senderName: { fontSize: 12, color: '#666', marginBottom: 2, marginLeft: 5 },
  
  bubble: { padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: '#4A90E2', borderBottomRightRadius: 2 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#ddd' },
  
  messageText: { fontSize: 16 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#333' },
  
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 5 },

  inputContainer: { 
    flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#eee'
  },
  input: { 
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 20, paddingHorizontal: 15, 
    height: 45, borderWidth: 1, borderColor: '#ddd', marginRight: 10 
  },
  sendButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default ChatScreen;