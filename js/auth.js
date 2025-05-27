// js/auth.js

import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Lấy các phần tử DOM. Sử dụng kiểm tra tồn tại để tránh lỗi nếu script được tải trên trang không có các phần tử này.
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('loginErrorMessage');
const registerForm = document.getElementById('registerForm');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerConfirmPasswordInput = document.getElementById('registerConfirmPassword');
const registerStatusMessage = document.getElementById('registerStatusMessage');


// Hàm hiển thị thông báo lỗi/thành công (có thể tái sử dụng cho cả login và register)
function displayMessage(element, message, type = 'error') {
    if (element) {
        element.textContent = message;
        element.classList.remove('error', 'success');
        element.classList.add(type);
        setTimeout(() => {
            element.textContent = '';
            element.classList.remove(type);
        }, 5000); // Clear message after 5 seconds
    }
}

// --- Xử lý trạng thái xác thực người dùng khi tải trang ---
// Listener này sẽ chạy mỗi khi trạng thái đăng nhập thay đổi (đăng nhập, đăng xuất)
onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged triggered.');
    if (user) {
        console.log('User is signed in with UID:', user.uid);
        const userRef = doc(db, 'users', user.uid);
        try {
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('User data from Firestore:', userData);
                console.log('User role from Firestore:', userData.role);

                // Chắc chắn kiểm tra giá trị của role
                if (typeof userData.role === 'string') { // Kiểm tra xem role có phải là chuỗi không
                    if (userData.role === 'admin') {
                        console.log('Role recognized as admin. Redirecting to dashboard.html');
                        // Chỉ chuyển hướng nếu chưa ở trang dashboard.html
                        if (window.location.pathname !== '/dashboard.html' && window.location.pathname !== '/index.html') {
                            window.location.href = 'dashboard.html';
                        }
                    } else if (userData.role === 'employee') {
                        console.log('Role recognized as employee. Redirecting to employee-dashboard.html');
                        // Chỉ chuyển hướng nếu chưa ở trang employee-dashboard.html
                        if (window.location.pathname !== '/employee-dashboard.html') {
                            window.location.href = 'employee-dashboard.html';
                        }
                    } else {
                        // Vai trò không phải 'admin' hoặc 'employee'
                        console.warn('Unknown user role:', userData.role);
                        displayMessage(errorMessage, 'Vai trò người dùng không xác định. Vui lòng liên hệ quản trị viên.', 'error');
                        await signOut(auth); // Đăng xuất người dùng với vai trò không xác định
                        if (window.location.pathname !== '/login.html') {
                            window.location.href = 'login.html';
                        }
                    }
                } else {
                    // Trường 'role' không phải là chuỗi hoặc bị thiếu
                    console.error('User role field is not a string or is missing:', userData.role);
                    displayMessage(errorMessage, 'Dữ liệu vai trò người dùng không hợp lệ. Vui lòng liên hệ quản trị viên.', 'error');
                    await signOut(auth);
                    if (window.location.pathname !== '/login.html') {
                        window.location.href = 'login.html';
                    }
                }

            } else {
                // Tài liệu người dùng không tồn tại trong Firestore
                console.warn('User document not found in Firestore for UID:', user.uid);
                displayMessage(errorMessage, 'Thông tin người dùng không tìm thấy trong Firestore. Vui lòng liên hệ quản trị viên.', 'error');
                await signOut(auth); // Đăng xuất nếu không có dữ liệu vai trò
                if (window.location.pathname !== '/login.html') {
                    window.location.href = 'login.html';
                }
            }
        } catch (firestoreError) {
            // Lỗi khi giao tiếp với Firestore (thường là lỗi quyền)
            console.error("Lỗi khi lấy dữ liệu vai trò từ Firestore:", firestoreError);
            displayMessage(errorMessage, `Lỗi hệ thống khi xác thực vai trò: ${firestoreError.message}. Vui lòng thử lại.`, 'error');
            await signOut(auth); // Đăng xuất nếu gặp lỗi Firestore
            if (window.location.pathname !== '/login.html') {
                window.location.href = 'login.html';
            }
        }
    } else {
        // Không có người dùng nào đăng nhập
        console.log('No user is signed in.');
        // Chỉ chuyển hướng đến login.html nếu không phải là trang login, index hoặc trang gốc
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.location.href = 'login.html';
        }
    }
});

// --- Xử lý Đăng nhập ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            displayMessage(errorMessage, 'Vui lòng nhập đầy đủ email và mật khẩu.', 'error');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('Successfully logged in user UID:', user.uid);

            // Get user's role from Firestore after successful login
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('User data from Firestore after login:', userData);
                console.log('User role from Firestore after login:', userData.role);

                if (typeof userData.role === 'string') {
                    if (userData.role === 'admin') {
                        displayMessage(errorMessage, 'Đăng nhập thành công! Chuyển hướng...', 'success');
                        window.location.href = 'dashboard.html';
                    } else if (userData.role === 'employee') {
                        displayMessage(errorMessage, 'Đăng nhập thành công! Chuyển hướng...', 'success');
                        window.location.href = 'employee-dashboard.html';
                    } else {
                        console.warn('Unknown user role after login attempt:', userData.role);
                        displayMessage(errorMessage, 'Vai trò người dùng không xác định. Vui lòng liên hệ quản trị viên.', 'error');
                        await signOut(auth); // Sign out if role is unknown
                    }
                } else {
                    console.error('User role field is not a string or is missing after login:', userData.role);
                    displayMessage(errorMessage, 'Dữ liệu vai trò người dùng không hợp lệ sau đăng nhập. Vui lòng liên hệ quản trị viên.', 'error');
                    await signOut(auth);
                }

            } else {
                console.warn('User document not found in Firestore after successful login for UID:', user.uid);
                displayMessage(errorMessage, 'Thông tin vai trò không tìm thấy trong Firestore. Vui lòng liên hệ quản trị viên.', 'error');
                await signOut(auth); // Sign out if user data is missing
            }
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            let errorMessageText = 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessageText = 'Email không hợp lệ.';
                        break;
                    case 'auth/user-disabled':
                        errorMessageText = 'Tài khoản của bạn đã bị vô hiệu hóa.';
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential': // Generic error for wrong email/password in newer SDKs
                        errorMessageText = 'Email hoặc mật khẩu không đúng.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessageText = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.';
                        break;
                    default:
                        errorMessageText = `Lỗi: ${error.message}`; // Hiển thị lỗi Firebase cụ thể
                        break;
                }
            }
            displayMessage(errorMessage, errorMessageText, 'error');
        }
    });
}

// --- Xử lý Đăng ký ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value.trim();
        const confirmPassword = registerConfirmPasswordInput.value.trim();

        if (!email || !password || !confirmPassword) {
            displayMessage(registerStatusMessage, 'Vui lòng điền đầy đủ thông tin.', 'error');
            return;
        }

        if (password.length < 6) {
            displayMessage(registerStatusMessage, 'Mật khẩu phải có ít nhất 6 ký tự.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            displayMessage(registerStatusMessage, 'Mật khẩu xác nhận không khớp.', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('Successfully registered user UID:', user.uid);

            // Thêm thông tin vai trò mặc định vào Firestore sau khi đăng ký thành công
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                email: user.email,
                role: 'employee', // Gán vai trò mặc định là 'employee'
                createdAt: new Date().toISOString()
            });

            displayMessage(registerStatusMessage, 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
            registerForm.reset(); // Xóa form sau khi đăng ký

            // Chuyển hướng người dùng sau khi đăng ký thành công (tùy chọn)
            // window.location.href = 'login.html';

        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            let errorMessageText = 'Đăng ký thất bại. Vui lòng thử lại.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessageText = 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.';
                        break;
                    case 'auth/invalid-email':
                        errorMessageText = 'Email không hợp lệ.';
                        break;
                    case 'auth/weak-password':
                        errorMessageText = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessageText = 'Đăng ký bằng Email/Password chưa được bật. Vui lòng liên hệ quản trị viên.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessageText = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.';
                        break;
                    // Lỗi từ Firestore khi tạo tài liệu user (Missing or insufficient permissions)
                    case 'permission-denied':
                    case 'unavailable':
                        errorMessageText = 'Lỗi hệ thống khi lưu thông tin người dùng. Vui lòng liên hệ quản trị viên.';
                        break;
                    default:
                        errorMessageText = `Lỗi: ${error.message}`;
                        break;
                }
            }
            displayMessage(registerStatusMessage, errorMessageText, 'error');
        }
    });
}

// --- Xử lý Đăng xuất (chỉ áp dụng nếu bạn có nút đăng xuất trong các trang dashboard) ---
// (Bạn có thể thêm event listener cho nút đăng xuất ở đây nếu muốn tập trung tất cả logic auth vào file này)
// Ví dụ: const logoutButton = document.getElementById('logoutButton');
// if (logoutButton) {
//     logoutButton.addEventListener('click', async () => {
//         try {
//             await signOut(auth);
//             console.log('User signed out successfully.');
//             window.location.href = 'login.html'; // Redirect to login page
//         } catch (error) {
//             console.error('Error signing out:', error);
//             // Có thể hiển thị thông báo lỗi nếu không thể đăng xuất
//         }
//     });
// }