// js/firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
// Thay thế các giá trị này bằng cấu hình thực tế từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "AIzaSyBLOOdQQVkOrLTzxaMms96ycTU-iHq-Hak",
  authDomain: "quan-ly-hoi-cho-game.firebaseapp.com",
  projectId: "quan-ly-hoi-cho-game",
  storageBucket: "quan-ly-hoi-cho-game.firebasestorage.app",
  messagingSenderId: "231573095754",
  appId: "1:231573095754:web:5ba226f9915c3640a62db3",
  measurementId: "G-NT87ZVNPGF"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances for use in other files
export { auth, db };