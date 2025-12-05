import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDaS_zzbqwDvUrxyJQckZhz1cfoWYwFMqk",
  authDomain: "travelbuddy-77f96.firebaseapp.com",
  projectId: "travelbuddy-77f96",
  storageBucket: "travelbuddy-77f96.firebasestorage.app",
  messagingSenderId: "421409521674",
  appId: "1:421409521674:web:dacc5a62c69c2b48cedff3",
  measurementId: "G-C5S2MG7K2H"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);