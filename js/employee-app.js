// js/employee-app.js

import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    addDoc,
    Timestamp // Import Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM Elements ---
const logoutButton = document.getElementById('logoutButton');
const pageTitle = document.getElementById('pageTitle');
const userName = document.getElementById('userName');

// Navigation
const navEmployeeDashboard = document.getElementById('navEmployeeDashboard');
const navEmployeeConsume = document.getElementById('navEmployeeConsume');

// Sections
const employeeDashboardSection = document.getElementById('employeeDashboardSection');
const employeeConsumeSection = document.getElementById('employeeConsumeSection');

// Dashboard Summary Elements
const dailyRevenueElem = document.getElementById('dailyRevenue');
const monthlyRevenueElem = document.getElementById('monthlyRevenue');
const employeeRevenueChartCanvas = document.getElementById('employeeRevenueChart');
let employeeRevenueChart; // To hold the Chart.js instance

// Consume Elements
const consumableProductsTableBody = document.getElementById('consumableProductsTableBody');
const saveConsumptionButton = document.getElementById('saveConsumptionButton');
const consumeStatusMessage = document.getElementById('consumeStatusMessage');


// --- Helper Functions ---

// Function to hide all content sections and show the active one
function showSection(sectionToShow, title) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    sectionToShow.classList.remove('hidden');
    pageTitle.textContent = title;

    // Update active class on nav links
    document.querySelectorAll('.main-nav li a').forEach(link => {
        link.classList.remove('active');
    });
    if (sectionToShow === employeeDashboardSection) navEmployeeDashboard.classList.add('active');
    else if (sectionToShow === employeeConsumeSection) navEmployeeConsume.classList.add('active');
}

// Function to display a status message
function displayStatusMessage(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`; // Add type class (success/error)
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
    }, 3000); // Clear message after 3 seconds
}

// --- Authentication and Authorization ---

// Check user authentication state and role on page load
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html'; // No user, redirect to login
        return; // Important: Stop execution after redirect
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentUserRole = userData.role;
        userName.textContent = userData.email.split('@')[0]; // Display part of email as username

        // If not an employee, redirect to admin dashboard (or login if role is unknown)
        if (currentUserRole !== 'employee') {
            // Only redirect if not already on dashboard.html
            if (window.location.pathname !== '/dashboard.html') {
                window.location.href = 'dashboard.html'; // Redirect to admin dashboard
            }
            return; // Important: Stop execution after redirect
        }

        // Employee user - proceed to load dashboard data
        // Only load data if on employee-dashboard.html
        if (window.location.pathname.endsWith('/employee-dashboard.html')) { // Use endsWith for robustness
            loadDashboardSummary();
            loadConsumableProducts(); // Load products for consumption
        }

    } else {
        alert('Thông tin người dùng không tìm thấy. Vui lòng đăng nhập lại.');
        await signOut(auth);
        window.location.href = 'login.html';
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        alert('Không thể đăng xuất. Vui lòng thử lại.');
    }
});

// --- Navigation Handling ---
navEmployeeDashboard.addEventListener('click', () => {
    showSection(employeeDashboardSection, 'Tổng quan Doanh thu');
    loadDashboardSummary(); // Refresh summary data
});

navEmployeeConsume.addEventListener('click', () => {
    showSection(employeeConsumeSection, 'Tiêu hao Hàng hóa');
    loadConsumableProducts(); // Refresh consumable products
});

// --- Dashboard Summary Functions (Simplified for Employee) ---
async function loadDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    let totalDailyRevenue = 0;
    let totalMonthlyRevenue = 0;

    try {
        const transactionsQuery = query(collection(db, 'daily_transactions'));
        const transactionsSnap = await getDocs(transactionsQuery);

        transactionsSnap.forEach(doc => {
            const data = doc.data();
            let transactionDate;
            if (data.date instanceof Timestamp) {
                transactionDate = data.date.toDate();
            } else if (typeof data.date === 'string') {
                transactionDate = new Date(data.date + 'T00:00:00');
            } else {
                console.warn('Invalid date format for transaction:', data.date);
                return; // Skip this transaction if date is invalid
            }
            transactionDate.setHours(0, 0, 0, 0);


            if (transactionDate.toDateString() === today.toDateString()) {
                totalDailyRevenue += data.revenue || 0;
            }

            if (transactionDate >= firstDayOfMonth && transactionDate <= today) {
                totalMonthlyRevenue += data.revenue || 0;
            }
        });

        dailyRevenueElem.textContent = `${totalDailyRevenue.toLocaleString('vi-VN')} VNĐ`;
        monthlyRevenueElem.textContent = `${totalMonthlyRevenue.toLocaleString('vi-VN')} VNĐ`;

        updateEmployeeRevenueChart(transactionsSnap.docs.map(doc => doc.data()));

    } catch (error) {
        console.error("Lỗi khi tải tóm tắt dashboard nhân viên:", error);
        alert('Không thể tải dữ liệu dashboard.');
    }
}

// Chart.js for Employee Dashboard
function updateEmployeeRevenueChart(transactions) {
    if (employeeRevenueChart) {
        employeeRevenueChart.destroy(); // Destroy previous chart instance
    }

    const dailyRevenueMap = new Map(); // Date (YYYY-MM-DD) -> Revenue
    transactions.forEach(data => {
        let transactionDate;
        if (data.date instanceof Timestamp) {
            transactionDate = data.date.toDate();
        } else if (typeof data.date === 'string') {
            transactionDate = new Date(data.date + 'T00:00:00');
        } else {
            return;
        }
        const dateString = transactionDate.toISOString().slice(0, 10); // YYYY-MM-DD
        dailyRevenueMap.set(dateString, (dailyRevenueMap.get(dateString) || 0) + (data.revenue || 0));
    });

    // Get last 7 days for chart
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }));
        data.push(dailyRevenueMap.get(dateString) || 0);
    }

    const ctx = employeeRevenueChartCanvas.getContext('2d');
    employeeRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false,
                borderWidth: 2,
                pointBackgroundColor: 'rgb(75, 192, 192)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(75, 192, 192)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Doanh thu (VNĐ)'
                    },
                     ticks: {
                        callback: function(value, index, ticks) {
                            return value.toLocaleString('vi-VN'); // Format Y-axis labels as currency
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString('vi-VN') + ' VNĐ';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


// --- Consume Functions ---

// Load products into the consumable table
async function loadConsumableProducts() {
    consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải danh sách hàng hóa tiêu hao...</td></tr>';
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);

        consumableProductsTableBody.innerHTML = ''; // Clear previous content
        if (productSnapshot.empty) {
            consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có hàng hóa để tiêu hao.</td></tr>';
            return; // Exit function if no products
        }

        productSnapshot.forEach(doc => {
            const product = doc.data();
            const row = consumableProductsTableBody.insertRow();
            row.setAttribute('data-id', doc.id); // Store Firestore document ID
            row.setAttribute('data-price', product.price); // Store price for revenue calculation

            const currentStockDisplay = product.currentStock !== undefined ? product.currentStock : 'N/A';

            row.innerHTML = `
                <td>${product.name || 'N/A'}</td>
                <td>${(product.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td>${currentStockDisplay} ${product.unit || ''}</td>
                <td>
                    <input type="number" class="consumption-input" data-product-id="${doc.id}" min="0" value="0" max="${product.currentStock || 0}">
                </td>
            `;
        });

    } catch (error) {
        console.error("Lỗi khi tải hàng hóa tiêu hao:", error);
        consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Lỗi khi tải hàng hóa tiêu hao. Vui lòng kiểm tra console.</td></tr>';
    }
}

saveConsumptionButton.addEventListener('click', async () => {
    const consumptionInputs = document.querySelectorAll('.consumption-input');
    const updates = []; // Array to store promises for Firestore updates

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    try {
        for (const input of consumptionInputs) {
            const productId = input.dataset.productId;
            const quantityConsumed = parseInt(input.value);
            const productPrice = parseFloat(input.closest('tr').dataset.price);

            // Only process if a positive quantity was entered
            if (isNaN(quantityConsumed) || quantityConsumed <= 0) {
                // If input is invalid or 0, just skip this product
                continue;
            }

            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                const currentStock = productData.currentStock || 0;

                if (quantityConsumed > currentStock) {
                    displayStatusMessage(consumeStatusMessage, `Số lượng tiêu hao của ${productData.name} (${quantityConsumed}) vượt quá tồn kho thực tế (${currentStock}). Vui lòng điều chỉnh.`, 'error');
                    return; // Stop processing if any item exceeds stock
                }

                const newStock = currentStock - quantityConsumed;
                const revenueGenerated = quantityConsumed * productPrice;

                // 1. Update product stock
                updates.push(updateDoc(productRef, {
                    currentStock: newStock
                }));

                // 2. Update or add daily_transactions
                const transactionQuery = query(
                    collection(db, 'daily_transactions'),
                    where('date', '==', today),
                    where('productId', '==', productId)
                );
                const transactionSnap = await getDocs(transactionQuery);

                if (!transactionSnap.empty) {
                    // Update existing transaction for today and this product
                    const transactionDoc = transactionSnap.docs[0];
                    const existingData = transactionDoc.data();
                    updates.push(updateDoc(doc(db, 'daily_transactions', transactionDoc.id), {
                        quantityConsumed: (existingData.quantityConsumed || 0) + quantityConsumed,
                        revenue: (existingData.revenue || 0) + revenueGenerated
                    }));
                } else {
                    // Add new transaction for today and this product
                    updates.push(addDoc(collection(db, 'daily_transactions'), {
                        date: today, // Store as YYYY-MM-DD string
                        productId: productId,
                        productName: productData.name,
                        quantityConsumed: quantityConsumed,
                        revenue: revenueGenerated
                    }));
                }
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates); // Wait for all updates to complete
            displayStatusMessage(consumeStatusMessage, 'Cập nhật tiêu hao hàng hóa thành công!', 'success');
            loadConsumableProducts(); // Reload to show updated stock
            loadDashboardSummary(); // Refresh dashboard summary (revenue)
        } else {
            displayStatusMessage(consumeStatusMessage, 'Không có số lượng tiêu hao nào được nhập.', 'error');
        }

    } catch (error) {
        console.error("Lỗi khi lưu tiêu hao:", error);
        displayStatusMessage(consumeStatusMessage, 'Lỗi khi lưu tiêu hao. Vui lòng thử lại.', 'error');
    }
});

// Initial load (show dashboard by default)
showSection(employeeDashboardSection, 'Tổng quan Doanh thu');