import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCXjledNpjFx3HZy91p-rSko795irBnQfA",
    authDomain: "meetnest-67b2b.firebaseapp.com",
    projectId: "meetnest-67b2b",
    storageBucket: "meetnest-67b2b.firebasestorage.app",
    messagingSenderId: "231197773504",
    appId: "1:231197773504:web:0333249efa683543b62725",
    measurementId: "G-GQHPQRV609",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };