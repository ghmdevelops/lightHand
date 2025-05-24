import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAlCe9u3sqAhZMRZCh_EF29EQh2KH_xzUY",
  authDomain: "lighthand-1c526.firebaseapp.com",
  databaseURL: "https://lighthand-1c526-default-rtdb.firebaseio.com",
  projectId: "lighthand-1c526",
  storageBucket: "lighthand-1c526.firebasestorage.app",
  messagingSenderId: "686513083893",
  appId: "1:686513083893:web:ce2a7743db4658edb53cbc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);