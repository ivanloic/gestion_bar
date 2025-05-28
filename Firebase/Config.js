// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAJXzmH4ByA99jX7cGsPgfUc42DQNTEnDc",
  authDomain: "zahame-f508a.firebaseapp.com",
  projectId: "zahame-f508a",
  storageBucket: "zahame-f508a.appspot.com",
  messagingSenderId: "165922216596",
  appId: "1:165922216596:web:7c065337c44eb41280b281",
  measurementId: "G-CJCK83QKRY"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { 
  auth, 
  db, 
  storage,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  doc,
  getDoc
};