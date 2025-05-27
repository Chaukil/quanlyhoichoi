// js/register.js

import { auth, db } from './firebase-config.js'; // Đảm bảo đường dẫn đúng
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM Elements ---
const registerForm = document.getElementById('registerForm');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerConfirmPasswordInput = document.getElementById('registerConfirmPassword');
// const registerRoleSelect = document.getElementById('registerRole'); // Nếu bạn có lựa chọn vai trò
const registerStatusMessage = document.getElementById('registerStatusMessage');
const registerButton = document.getElementById('registerButton');

// Function to display a status message
function displayStatusMessage(element, message, type) {
    element.textContent = message;
    element.className = `auth-status-message ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'auth-status-message';
    }, 3000);
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value.trim();
    const confirmPassword = registerConfirmPasswordInput.value.trim();
    // const role = registerRoleSelect.value; // Lấy vai trò nếu có lựa chọn

    if (password !== confirmPassword) {
        displayStatusMessage(registerStatusMessage, 'Mật khẩu xác nhận không khớp.', 'error');
        return;
    }

    if (password.length < 6) {
        displayStatusMessage(registerStatusMessage, 'Mật khẩu phải có ít nhất 6 ký tự.', 'error');
        return;
    }

    // Nếu bạn muốn đăng ký user admin đầu tiên, bạn có thể cứng vai trò là 'admin'
    // Hoặc nếu bạn muốn admin tự tạo tài khoản nhân viên, bạn có thể dùng select box
    const userRole = 'admin'; // Hoặc lấy từ registerRoleSelect.value nếu cho phép chọn

    registerButton.disabled = true; // Vô hiệu hóa nút để tránh spam
    registerButton.textContent = 'Đang đăng ký...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Lưu thông tin người dùng vào Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: userRole, // Gán vai trò cho người dùng
            createdAt: new Date().toISOString()
        });

        displayStatusMessage(registerStatusMessage, 'Đăng ký thành công! Đang chuyển hướng...', 'success');
        // Chuyển hướng đến trang đăng nhập hoặc dashboard
        window.location.href = 'login.html';

    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        let errorMessage = 'Lỗi đăng ký. Vui lòng thử lại.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email này đã được sử dụng. Vui lòng sử dụng email khác.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Đăng ký bằng email/mật khẩu chưa được bật. Vui lòng liên hệ quản trị viên.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
                break;
            default:
                errorMessage = `Lỗi: ${error.message}`;
        }
        displayStatusMessage(registerStatusMessage, errorMessage, 'error');
    } finally {
        registerButton.disabled = false; // Kích hoạt lại nút
        registerButton.textContent = 'Đăng ký';
    }
});