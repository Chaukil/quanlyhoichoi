// js/firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
// Thay thế các giá trị này bằng cấu hình thực tế từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "AIzaSyBLOOdQQVkOrLTzxaMms96ycTU-iHq-Hak",
    authDomain: "quan-ly-hoi-cho-game.firebaseapp.com", // Có thể xóa nếu không dùng auth
    projectId: "quan-ly-hoi-cho-game",
    storageBucket: "quan-ly-hoi-cho-game.firebasestorage.app", // Có thể xóa nếu không dùng storage
    messagingSenderId: "231573095754", // Có thể xóa nếu không dùng messaging
    appId: "1:231573095754:web:5ba226f9915c3640a62db3",
    measurementId: "G-NT87ZVNPGF" // Có thể xóa nếu không dùng analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db }; // Chỉ export db