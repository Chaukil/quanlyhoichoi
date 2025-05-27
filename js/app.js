// js/app.js
// File này chứa toàn bộ logic cho trang Dashboard của quản trị viên.
// Nó giả định người dùng đã được xác thực và có vai trò 'admin'
// (việc xác thực và chuyển hướng được xử lý bởi auth.js).

import { auth, db } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp // Import Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Khai báo các phần tử DOM ---
// Sử dụng kiểm tra null để đảm bảo phần tử tồn tại trước khi thao tác
const logoutButton = document.getElementById('logoutButton');
const pageTitle = document.getElementById('pageTitle');
const userName = document.getElementById('userName');

// Điều hướng Sidebar
const navDashboard = document.getElementById('navDashboard');
const navProducts = document.getElementById('navProducts');
const navInventoryIn = document.getElementById('navInventoryIn');
const navInventoryHistory = document.getElementById('navInventoryHistory');
const navConsume = document.getElementById('navConsume');
const navReports = document.getElementById('navReports');

// Phần tử Sidebar
const sidebar = document.querySelector('.sidebar');
const mainContentArea = document.querySelector('.main-content-area');
const sidebarToggle = document.getElementById('sidebarToggle');

// Các phần (sections) nội dung
const dashboardSection = document.getElementById('dashboardSection');
const productsSection = document.getElementById('productsSection');
const inventoryInSection = document.getElementById('inventoryInSection');
const inventoryHistorySection = document.getElementById('inventoryHistorySection');
const consumeSection = document.getElementById('consumeSection');
const reportsSection = document.getElementById('reportsSection'); // Đây là phần tử chính cho báo cáo

// Các phần tử cho Dashboard Summary
const dailyRevenueElem = document.getElementById('dailyRevenue');
const monthlyRevenueElem = document.getElementById('monthlyRevenue');
const lowStockCountElem = document.getElementById('lowStockCount');
const revenueChartCanvas = document.getElementById('revenueChart');
let revenueChart; // Để giữ thể hiện của Chart.js

// Các phần tử cho Quản lý Sản phẩm
const addNewProductButton = document.getElementById('addNewProductButton');
const productModal = document.getElementById('productModal');
const closeButton = productModal ? productModal.querySelector('.close-button') : null; // Kiểm tra null
const modalTitle = document.getElementById('modalTitle');

const addProductForm = document.getElementById('addProductForm');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const productUnitInput = document.getElementById('productUnit');
const productMinStockInput = document.getElementById('productMinStock');
const productsTableBody = document.getElementById('productsTableBody');
const productStatusMessage = document.getElementById('productStatusMessage');
const saveProductButton = document.getElementById('saveProductButton');
let editingProductId = null;

// Các phần tử cho Nhập kho
const addInventoryInForm = document.getElementById('addInventoryInForm');
const inventoryProductNameSelect = document.getElementById('inventoryProductName');
const inventoryQuantityInput = document.getElementById('inventoryQuantity');
const inventoryPriceInput = document.getElementById('inventoryPrice');
const inventoryDateInput = document.getElementById('inventoryDate');
const inventoryStatusMessage = document.getElementById('inventoryStatusMessage');

// Các phần tử cho Lịch sử Nhập kho
const inventoryInHistoryTableBody = document.getElementById('inventoryInHistoryTableBody');
const inventoryHistoryStatusMessage = document.getElementById('inventoryHistoryStatusMessage');

// Các phần tử cho Tiêu hao Hàng hóa
const consumableProductsTableBody = document.getElementById('consumableProductsTableBody');
const saveConsumptionButton = document.getElementById('saveConsumptionButton');
const consumeStatusMessage = document.getElementById('consumeStatusMessage');

// Các phần tử cho Báo cáo
const reportTypeSelect = document.getElementById('reportType');
const reportStartDateInput = document.getElementById('reportStartDate');
const reportEndDateInput = document.getElementById('reportEndDate');
const generateReportButton = document.getElementById('generateReportButton'); // Nút tạo báo cáo doanh thu
const reportContent = document.getElementById('reportContent'); // Khu vực hiển thị báo cáo chung
const reportMonthInput = document.getElementById('reportMonth');
const reportYearInput = document.getElementById('reportYear');
const reportDailyDateInput = document.getElementById('reportDailyDate');

// Các phần tử cho Báo cáo Lợi nhuận
const profitReportFilter = document.getElementById('profitReportFilter');
const profitInventoryInStartDateInput = document.getElementById('profitInventoryInStartDate');
const profitInventoryInEndDateInput = document.getElementById('profitInventoryInEndDate');
const profitConsumeStartDateInput = document.getElementById('profitConsumeStartDate');
const profitConsumeEndDateInput = document.getElementById('profitConsumeEndDate');
const generateProfitReportBtn = document.getElementById('generateProfitReportBtn'); // Nút tạo báo cáo lợi nhuận
const profitReportContent = document.getElementById('profitReportContent'); // Khu vực hiển thị báo cáo lợi nhuận

// --- Helper Functions ---

// Hàm ẩn tất cả các phần nội dung và hiển thị phần đang hoạt động
function showSection(sectionToShow, title) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    if (sectionToShow) { // Kiểm tra tồn tại của sectionToShow
        sectionToShow.classList.remove('hidden');
    }
    if (pageTitle) { // Kiểm tra tồn tại của pageTitle
        pageTitle.textContent = title;
    }

    // Cập nhật lớp 'active' trên các liên kết điều hướng
    document.querySelectorAll('.main-nav li a').forEach(link => {
        link.classList.remove('active');
    });
    // Thêm lớp 'active' cho <li> cha của liên kết đã nhấp
    if (sectionToShow === dashboardSection && navDashboard) navDashboard.querySelector('a').classList.add('active');
    else if (sectionToShow === productsSection && navProducts) navProducts.querySelector('a').classList.add('active');
    else if (sectionToShow === inventoryInSection && navInventoryIn) navInventoryIn.querySelector('a').classList.add('active');
    else if (sectionToShow === inventoryHistorySection && navInventoryHistory) navInventoryHistory.querySelector('a').classList.add('active');
    else if (sectionToShow === consumeSection && navConsume) navConsume.querySelector('a').classList.add('active');
    else if (sectionToShow === reportsSection && navReports) navReports.querySelector('a').classList.add('active');

    // Đóng sidebar trên thiết bị di động sau khi điều hướng
    if (window.innerWidth <= 992) {
        hideSidebar();
    }
}

// Hàm hiển thị thông báo trạng thái
function displayStatusMessage(element, message, type) {
    if (element) { // Kiểm tra tồn tại của phần tử
        element.innerHTML = message; // Sử dụng innerHTML để hỗ trợ hiển thị <br>
        element.className = `status-message ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 5000); // Tăng thời gian hiển thị thông báo
    }
}

// --- Hàm Modal ---
function openProductModal(isEdit = false, productId = null) {
    if (productModal) { // Kiểm tra tồn tại của productModal
        productModal.classList.remove('hidden');
        productModal.classList.add('show');
    }
    if (addProductForm) { // Kiểm tra tồn tại của addProductForm
        addProductForm.reset();
    }
    if (productStatusMessage) { // Kiểm tra tồn tại của productStatusMessage
        productStatusMessage.textContent = '';
    }

    if (modalTitle && saveProductButton) { // Kiểm tra tồn tại của modalTitle và saveProductButton
        if (isEdit) {
            modalTitle.textContent = 'Chỉnh sửa Sản phẩm';
            saveProductButton.innerHTML = '<i class="fas fa-save"></i> Cập nhật sản phẩm';
            editingProductId = productId;
        } else {
            modalTitle.textContent = 'Thêm Sản phẩm';
            saveProductButton.innerHTML = '<i class="fas fa-plus"></i> Thêm sản phẩm';
            editingProductId = null;
        }
    }
}

function closeProductModal() {
    if (productModal) { // Kiểm tra tồn tại của productModal
        productModal.classList.remove('show');
        productModal.classList.add('hidden');
    }
    editingProductId = null;
    if (addProductForm) { // Kiểm tra tồn tại của addProductForm
        addProductForm.reset();
    }
    if (productStatusMessage) { // Kiểm tra tồn tại của productStatusMessage
        productStatusMessage.textContent = '';
    }
}

// Event listeners cho modal
if (closeButton) {
    closeButton.addEventListener('click', closeProductModal);
}
if (productModal) {
    window.addEventListener('click', (event) => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });
}

// --- Chức năng chuyển đổi Sidebar ---
function toggleSidebar() {
    if (sidebar && mainContentArea) {
        sidebar.classList.toggle('hidden');

        if (sidebar.classList.contains('hidden')) {
            mainContentArea.classList.add('full-width');
        } else {
            mainContentArea.classList.remove('full-width');
        }

        if (window.innerWidth <= 992) {
            sidebar.classList.toggle('show');
        } else {
            sidebar.classList.remove('show');
        }
    }
}

function hideSidebar() {
    if (sidebar && mainContentArea) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('show');
        mainContentArea.classList.remove('full-width');
    }
}

// Thêm event listener cho nút chuyển đổi
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
}

// Điều chỉnh sidebar khi thay đổi kích thước cửa sổ
window.addEventListener('resize', () => {
    if (sidebar && mainContentArea) {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('hidden', 'show');
            mainContentArea.classList.remove('full-width');
        } else {
            if (!sidebar.classList.contains('show')) {
                sidebar.classList.add('hidden');
            }
            mainContentArea.classList.remove('full-width');
        }
    }
});

// --- Logic khởi tạo Dashboard ---
// Hàm này sẽ được gọi sau khi DOM đã tải và auth.js đã xử lý đăng nhập.
async function initializeDashboard() {
    // Lấy thông tin người dùng hiện tại từ Firebase Auth
    const user = auth.currentUser;
    if (user && userName) {
        // Hiển thị tên người dùng (phần trước @ của email)
        userName.textContent = user.email.split('@')[0];
    } else if (userName) {
        userName.textContent = user.email.split('@')[0]; // Hoặc ẩn đi nếu không có người dùng
    }

    // Tải tất cả dữ liệu cần thiết cho dashboard
    await loadDashboardSummary();
    await loadProducts();
    await loadProductsForInventoryIn();
    await loadInventoryInHistory();
    await loadConsumableProducts();
    setupReportFilters(); // Thiết lập bộ lọc báo cáo
    showSection(dashboardSection, 'Tổng quan'); // Hiển thị phần tổng quan mặc định
}

// --- Xử lý Đăng xuất ---
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log('User signed out successfully.');
            window.location.href = 'login.html'; // Chuyển hướng đến trang đăng nhập
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            alert('Không thể đăng xuất. Vui lòng thử lại.'); // Sử dụng alert tạm thời, nên thay bằng modal
        }
    });
}

// --- Xử lý Điều hướng Sidebar ---
if (navDashboard) {
    navDashboard.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(dashboardSection, 'Tổng quan');
        await loadDashboardSummary(); // Tải lại dữ liệu tóm tắt
    });
}

if (navProducts) {
    navProducts.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(productsSection, 'Quản lý Sản phẩm');
        await loadProducts(); // Tải lại danh sách sản phẩm
        closeProductModal();
    });
}

if (navInventoryIn) {
    navInventoryIn.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(inventoryInSection, 'Nhập kho');
        await loadProductsForInventoryIn(); // Tải lại danh sách sản phẩm cho nhập kho
        if (addInventoryInForm) addInventoryInForm.reset(); // Reset form
        if (inventoryStatusMessage) inventoryStatusMessage.textContent = ''; // Xóa thông báo
        // Đặt ngày nhập kho mặc định là hôm nay
        if (inventoryDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            inventoryDateInput.value = `${year}-${month}-${day}`;
        }
    });
}

if (navInventoryHistory) {
    navInventoryHistory.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(inventoryHistorySection, 'Lịch sử Nhập kho');
        await loadInventoryInHistory(); // Tải lại lịch sử nhập kho
    });
}

if (navConsume) {
    navConsume.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(consumeSection, 'Tiêu hao Hàng hóa');
        await loadConsumableProducts(); // Tải lại danh sách sản phẩm tiêu hao
    });
}

if (navReports) {
    navReports.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(reportsSection, 'Báo cáo Doanh thu & Lợi nhuận');
        setupReportFilters(); // Thiết lập lại bộ lọc báo cáo
        if (reportContent) reportContent.innerHTML = '<p style="text-align:center; color:#666;">Chọn loại báo cáo và khoảng thời gian để tạo báo cáo.</p>';
        if (profitReportContent) profitReportContent.innerHTML = '<p style="text-align:center; color:#666;">Chọn loại báo cáo và khoảng thời gian để tạo báo cáo.</p>';
    });
}

// --- Hàm Tóm tắt Dashboard ---
async function loadDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt về đầu ngày

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    let totalDailyRevenue = 0;
    let totalMonthlyRevenue = 0;
    let lowStockCount = 0;

    try {
        const transactionsCol = collection(db, 'daily_transactions');
        // Lấy tất cả giao dịch, sau đó lọc trong JS cho tính linh hoạt
        // Hoặc bạn có thể thêm các truy vấn where cho ngày/tháng cụ thể nếu cần tối ưu hơn
        const transactionsSnap = await getDocs(transactionsCol);

        transactionsSnap.forEach(doc => {
            const data = doc.data();
            let transactionDate;
            if (data.date instanceof Timestamp) {
                transactionDate = data.date.toDate();
            } else if (typeof data.date === 'string') {
                // Đảm bảo parse đúng múi giờ để so sánh ngày
                const dateParts = data.date.split('-'); // Format YYYY-MM-DD
                transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            } else {
                console.warn('Invalid date format for transaction:', data.date);
                return;
            }
            transactionDate.setHours(0, 0, 0, 0); // Đặt về đầu ngày để so sánh chính xác

            if (transactionDate.toDateString() === today.toDateString()) {
                totalDailyRevenue += data.revenue || 0;
            }

            if (transactionDate >= firstDayOfMonth &&
                transactionDate.getFullYear() === today.getFullYear() &&
                transactionDate.getMonth() === today.getMonth()) {
                totalMonthlyRevenue += data.revenue || 0;
            }
        });

        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);
        productSnapshot.forEach(doc => {
            const product = doc.data();
            if (product.currentStock !== undefined && product.minStock !== undefined && product.currentStock <= product.minStock) {
                lowStockCount++;
            }
        });

        if (dailyRevenueElem) dailyRevenueElem.textContent = `${totalDailyRevenue.toLocaleString('vi-VN')} VNĐ`;
        if (monthlyRevenueElem) monthlyRevenueElem.textContent = `${totalMonthlyRevenue.toLocaleString('vi-VN')} VNĐ`;
        if (lowStockCountElem) lowStockCountElem.textContent = lowStockCount;

        updateRevenueChart(transactionsSnap.docs.map(doc => doc.data()));

    } catch (error) {
        console.error("Lỗi khi tải tóm tắt dashboard:", error);
        // Hiển thị thông báo lỗi cụ thể cho người dùng
        if (dailyRevenueElem) dailyRevenueElem.textContent = 'Lỗi!';
        if (monthlyRevenueElem) monthlyRevenueElem.textContent = 'Lỗi!';
        if (lowStockCountElem) lowStockCountElem.textContent = 'Lỗi!';
        displayStatusMessage(document.querySelector('.dashboard-summary'), `Lỗi khi tải dữ liệu tổng quan: ${error.message}`, 'error'); // Hiển thị ở một vị trí phù hợp
    }
}

// Chart.js cho Dashboard
function updateRevenueChart(transactions) {
    if (!revenueChartCanvas) return; // Đảm bảo canvas tồn tại

    if (revenueChart) {
        revenueChart.destroy();
    }

    const dailyRevenueMap = new Map();
    transactions.forEach(data => {
        let transactionDate;
        if (data.date instanceof Timestamp) {
            transactionDate = data.date.toDate();
        } else if (typeof data.date === 'string') {
             const dateParts = data.date.split('-'); // Format YYYY-MM-DD
             transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
            return;
        }
        const dateString = transactionDate.toISOString().slice(0, 10);
        dailyRevenueMap.set(dateString, (dailyRevenueMap.get(dateString) || 0) + (data.revenue || 0));
    });

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) { // Lấy dữ liệu 7 ngày gần nhất
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }));
        data.push(dailyRevenueMap.get(dateString) || 0);
    }

    const ctx = revenueChartCanvas.getContext('2d');
    revenueChart = new Chart(ctx, {
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
                            return value.toLocaleString('vi-VN');
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

// --- Hàm Quản lý Sản phẩm ---
async function loadProducts() {
    if (!productsTableBody) return; // Đảm bảo table body tồn tại

    productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải danh sách sản phẩm...</td></tr>';
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);

        productsTableBody.innerHTML = '';

        if (productSnapshot.empty) {
            productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có sản phẩm nào. Vui lòng thêm sản phẩm mới.</td></tr>';
            return;
        }

        productSnapshot.forEach(doc => {
            const product = doc.data();
            const row = productsTableBody.insertRow();
            row.setAttribute('data-id', doc.id);

            const isLowStock = (product.currentStock !== undefined && product.minStock !== undefined && product.currentStock <= product.minStock);

            row.innerHTML = `
                <td>${product.name || 'N/A'}</td>
                <td>${(product.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td>${(product.currentStock || 0)} ${product.unit || ''}</td>
                <td>${(product.minStock || 0)} ${product.unit || ''}</td>
                <td class="${isLowStock ? 'low-stock-alert' : ''}">
                    ${isLowStock ? 'Thấp!' : 'Ổn định'}
                </td>
                <td class="action-buttons">
                    <button class="edit-btn btn-edit" data-id="${doc.id}"><i class="fas fa-edit"></i> Sửa</button>
                    <button class="delete-btn btn-delete" data-id="${doc.id}"><i class="fas fa-trash-alt"></i> Xóa</button>
                    ${isLowStock ? `<button class="import-btn btn-import" data-id="${doc.id}"><i class="fas fa-truck-loading"></i> Nhập kho</button>` : ''}
                </td>
            `;
        });

        productsTableBody.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditProduct);
        });
        productsTableBody.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteProduct);
        });
        productsTableBody.querySelectorAll('.import-btn').forEach(button => {
            button.addEventListener('click', handleImportProduct);
        });

    } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        productsTableBody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Lỗi khi tải sản phẩm. Vui lòng kiểm tra console.</td></tr>';
        displayStatusMessage(productStatusMessage, `Lỗi khi tải sản phẩm: ${error.message}`, 'error');
    }
}

if (addNewProductButton) {
    addNewProductButton.addEventListener('click', () => {
        openProductModal(false);
    });
}

if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);
        const unit = productUnitInput.value.trim();
        const minStock = parseInt(productMinStockInput.value);

        if (!name || isNaN(price) || price <= 0 || !unit || isNaN(minStock) || minStock < 0) {
            displayStatusMessage(productStatusMessage, 'Vui lòng nhập đầy đủ và hợp lệ thông tin sản phẩm.', 'error');
            return;
        }

        try {
            if (editingProductId) {
                const productRef = doc(db, 'products', editingProductId);
                await updateDoc(productRef, {
                    name: name,
                    price: price,
                    unit: unit,
                    minStock: minStock
                });
                displayStatusMessage(productStatusMessage, 'Cập nhật sản phẩm thành công!', 'success');
            } else {
                await addDoc(collection(db, 'products'), {
                    name: name,
                    price: price,
                    unit: unit,
                    minStock: minStock,
                    currentStock: 0
                });
                displayStatusMessage(productStatusMessage, 'Thêm sản phẩm thành công!', 'success');
            }

            addProductForm.reset();
            closeProductModal();
            loadProducts();
            loadProductsForInventoryIn();
            loadConsumableProducts();
            loadDashboardSummary();

        } catch (error) {
            console.error("Lỗi khi lưu sản phẩm:", error);
            displayStatusMessage(productStatusMessage, `Lỗi khi lưu sản phẩm: ${error.message}`, 'error');
        }
    });
}

async function handleEditProduct(e) {
    const productId = e.currentTarget.dataset.id;
    openProductModal(true, productId);

    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = productSnap.data();
            if (productNameInput) productNameInput.value = product.name;
            if (productPriceInput) productPriceInput.value = product.price;
            if (productUnitInput) productUnitInput.value = product.unit;
            if (productMinStockInput) productMinStockInput.value = product.minStock;
        } else {
            displayStatusMessage(productStatusMessage, 'Không tìm thấy sản phẩm để chỉnh sửa.', 'error');
            closeProductModal();
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin sản phẩm để chỉnh sửa:", error);
        displayStatusMessage(productStatusMessage, `Lỗi: ${error.message}`, 'error');
        closeProductModal();
    }
}

async function handleDeleteProduct(e) {
    const productId = e.currentTarget.dataset.id;
    // Thay thế confirm() bằng modal tùy chỉnh nếu bạn không muốn dùng alert/confirm của trình duyệt
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'products', productId));
        displayStatusMessage(productStatusMessage, 'Xóa sản phẩm thành công!', 'success');
        loadProducts();
        loadProductsForInventoryIn();
        loadConsumableProducts();
        loadDashboardSummary();

    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        displayStatusMessage(productStatusMessage, `Lỗi khi xóa sản phẩm: ${error.message}`, 'error');
    }
}

async function handleImportProduct(e) {
    const productId = e.currentTarget.dataset.id;

    showSection(inventoryInSection, 'Nhập kho');

    await loadProductsForInventoryIn();

    if (inventoryProductNameSelect) inventoryProductNameSelect.value = productId;

    if (inventoryDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        inventoryDateInput.value = `${year}-${month}-${day}`;
    }

    if (inventoryProductNameSelect) {
        inventoryProductNameSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// --- Hàm Nhập kho (Import) ---
async function loadProductsForInventoryIn() {
    if (!inventoryProductNameSelect) return; // Đảm bảo select box tồn tại

    inventoryProductNameSelect.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);

        if (productSnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có sản phẩm để nhập kho';
            inventoryProductNameSelect.appendChild(option);
            return;
        }

        productSnapshot.forEach(doc => {
            const product = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = product.name;
            inventoryProductNameSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Lỗi khi tải sản phẩm cho nhập kho:", error);
        displayStatusMessage(inventoryStatusMessage, `Lỗi khi tải danh sách sản phẩm: ${error.message}`, 'error');
    }
}

if (addInventoryInForm) {
    addInventoryInForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productId = inventoryProductNameSelect.value;
        const quantity = parseInt(inventoryQuantityInput.value);
        const price = parseFloat(inventoryPriceInput.value);
        const date = inventoryDateInput.value;

        if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) {
            displayStatusMessage(inventoryStatusMessage, 'Vui lòng nhập đầy đủ và hợp lệ thông tin nhập kho.', 'error');
            return;
        }

        try {
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                const currentStock = productData.currentStock || 0;
                const newStock = currentStock + quantity;

                await updateDoc(productRef, {
                    currentStock: newStock
                });

                await addDoc(collection(db, 'inventory_in_history'), {
                    productId: productId,
                    productName: productData.name,
                    quantity: quantity,
                    price: price,
                    unit: productData.unit,
                    date: date,
                    timestamp: Timestamp.now()
                });

                displayStatusMessage(inventoryStatusMessage, 'Nhập kho thành công!', 'success');
                addInventoryInForm.reset();
                if (inventoryDateInput) { // Đặt lại ngày sau khi reset form
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    inventoryDateInput.value = `${year}-${month}-${day}`;
                }


                loadProducts();
                loadInventoryInHistory();
                loadConsumableProducts();
                loadDashboardSummary();

            } else {
                displayStatusMessage(inventoryStatusMessage, 'Sản phẩm không tồn tại.', 'error');
            }

        } catch (error) {
            console.error("Lỗi khi nhập kho:", error);
            displayStatusMessage(inventoryStatusMessage, `Lỗi khi nhập kho: ${error.message}`, 'error');
        }
    });
}

async function loadInventoryInHistory() {
    if (!inventoryInHistoryTableBody) return; // Đảm bảo table body tồn tại

    inventoryInHistoryTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải lịch sử nhập kho...</td></tr>';
    try {
        const inventoryCol = collection(db, 'inventory_in_history');
        const q = query(inventoryCol, orderBy('timestamp', 'desc'));
        const inventorySnapshot = await getDocs(q);

        inventoryInHistoryTableBody.innerHTML = '';

        if (inventorySnapshot.empty) {
            inventoryInHistoryTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có lịch sử nhập kho.</td></tr>';
            return;
        }

        inventorySnapshot.forEach(doc => {
            const item = doc.data();
            const row = inventoryInHistoryTableBody.insertRow();
            row.setAttribute('data-id', doc.id);
            row.innerHTML = `
                <td>${item.date || 'N/A'}</td>
                <td>${item.productName || 'N/A'}</td>
                <td>${item.quantity || 0} ${item.unit || ''}</td>
                <td>${(item.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                <td>${((item.quantity || 0) * (item.price || 0)).toLocaleString('vi-VN')} VNĐ</td>
                <td>
                    <button class="delete-btn btn-delete" data-id="${doc.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });

        // Đã sửa selector để phù hợp với class mới: .delete-btn
        inventoryInHistoryTableBody.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteInventoryIn);
        });

    } catch (error) {
        console.error("Lỗi khi tải lịch sử nhập kho:", error);
        inventoryInHistoryTableBody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Lỗi khi tải lịch sử nhập kho. Vui lòng kiểm tra console.</td></tr>';
        displayStatusMessage(inventoryHistoryStatusMessage, `Lỗi khi tải lịch sử nhập kho: ${error.message}`, 'error');
    }
}

async function handleDeleteInventoryIn(e) {
    const inventoryId = e.currentTarget.dataset.id;
    // Thay thế confirm() bằng modal tùy chỉnh
    if (!confirm('Bạn có chắc chắn muốn xóa mục nhập kho này? Việc này sẽ HOÀN TÁC số lượng hàng hóa đã nhập.')) {
        return;
    }

    try {
        const inventoryRef = doc(db, 'inventory_in_history', inventoryId);
        const inventorySnap = await getDoc(inventoryRef);

        if (inventorySnap.exists()) {
            const inventoryData = inventorySnap.data();
            const productId = inventoryData.productId;
            const quantity = inventoryData.quantity;

            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                const currentStock = productData.currentStock || 0;
                const newStock = Math.max(0, currentStock - quantity); // Đảm bảo tồn kho không âm

                await updateDoc(productRef, {
                    currentStock: newStock
                });
            } else {
                console.warn('Sản phẩm liên quan đến mục nhập kho đã bị xóa hoặc không tồn tại:', productId);
            }

            await deleteDoc(inventoryRef);

            displayStatusMessage(inventoryHistoryStatusMessage, 'Xóa mục nhập kho thành công và cập nhật tồn kho!', 'success');
            loadInventoryInHistory();
            loadProducts();
            loadConsumableProducts();
            loadDashboardSummary();

        } else {
            displayStatusMessage(inventoryHistoryStatusMessage, 'Không tìm thấy mục nhập kho để xóa.', 'error');
        }

    } catch (error) {
        console.error("Lỗi khi xóa mục nhập kho:", error);
        displayStatusMessage(inventoryHistoryStatusMessage, `Lỗi khi xóa mục nhập kho: ${error.message}`, 'error');
    }
}

// --- Hàm Tiêu hao Hàng hóa ---
async function loadConsumableProducts() {
    if (!consumableProductsTableBody) return; // Đảm bảo table body tồn tại

    consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải danh sách hàng hóa tiêu hao...</td></tr>';
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);

        consumableProductsTableBody.innerHTML = '';
        if (productSnapshot.empty) {
            consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có hàng hóa để tiêu hao.</td></tr>';
            return;
        }

        productSnapshot.forEach(doc => {
            const product = doc.data();
            const row = consumableProductsTableBody.insertRow();
            row.setAttribute('data-id', doc.id);
            row.setAttribute('data-price', product.price);

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
        displayStatusMessage(consumeStatusMessage, `Lỗi khi tải hàng hóa tiêu hao: ${error.message}`, 'error');
    }
}

if (saveConsumptionButton) {
    saveConsumptionButton.addEventListener('click', async () => {
        const consumptionInputs = document.querySelectorAll('.consumption-input');
        const updates = [];
        let hasError = false;
        let errorMessageAccumulator = '';

        const today = new Date().toISOString().slice(0, 10);

        try {
            for (const input of consumptionInputs) {
                const productId = input.dataset.productId;
                const quantityConsumed = parseInt(input.value);
                const productPrice = parseFloat(input.closest('tr').dataset.price);

                if (isNaN(quantityConsumed) || quantityConsumed <= 0) {
                    continue; // Bỏ qua nếu số lượng không hợp lệ hoặc bằng 0
                }

                const productRef = doc(db, 'products', productId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const productData = productSnap.data();
                    const currentStock = productData.currentStock || 0;

                    if (quantityConsumed > currentStock) {
                        errorMessageAccumulator += `Số lượng tiêu hao của <strong>${productData.name}</strong> (${quantityConsumed}) vượt quá tồn kho thực tế (${currentStock}). Vui lòng điều chỉnh.<br>`;
                        hasError = true;
                        continue; // Bỏ qua sản phẩm này nhưng tiếp tục xử lý các sản phẩm khác
                    }

                    const newStock = currentStock - quantityConsumed;
                    const revenueGenerated = quantityConsumed * productPrice;

                    updates.push(updateDoc(productRef, {
                        currentStock: newStock
                    }));

                    // Kiểm tra giao dịch hàng ngày hiện có cho sản phẩm và ngày này
                    const transactionQuery = query(
                        collection(db, 'daily_transactions'),
                        where('date', '==', today),
                        where('productId', '==', productId)
                    );
                    const transactionSnap = await getDocs(transactionQuery);

                    if (!transactionSnap.empty) {
                        const transactionDoc = transactionSnap.docs[0];
                        const existingData = transactionDoc.data();
                        updates.push(updateDoc(doc(db, 'daily_transactions', transactionDoc.id), {
                            quantityConsumed: (existingData.quantityConsumed || 0) + quantityConsumed,
                            revenue: (existingData.revenue || 0) + revenueGenerated
                        }));
                    } else {
                        updates.push(addDoc(collection(db, 'daily_transactions'), {
                            date: today,
                            productId: productId,
                            productName: productData.name,
                            quantityConsumed: quantityConsumed,
                            revenue: revenueGenerated,
                            timestamp: Timestamp.now() // Thêm timestamp để sắp xếp và truy vấn tốt hơn
                        }));
                    }
                } else {
                    console.warn(`Sản phẩm với ID ${productId} không tồn tại khi lưu tiêu hao.`);
                    errorMessageAccumulator += `Sản phẩm với ID ${productId} không tồn tại khi lưu tiêu hao.<br>`;
                    hasError = true;
                    continue;
                }
            }

            if (hasError) {
                displayStatusMessage(consumeStatusMessage, `<strong>Lỗi:</strong><br>${errorMessageAccumulator}`, 'error');
            } else if (updates.length > 0) {
                await Promise.all(updates);
                displayStatusMessage(consumeStatusMessage, 'Cập nhật tiêu hao hàng hóa thành công!', 'success');
                loadConsumableProducts();
                loadProducts();
                loadDashboardSummary();
            } else {
                displayStatusMessage(consumeStatusMessage, 'Không có số lượng tiêu hao nào được nhập hoặc tất cả đều bằng 0.', 'error');
            }

        } catch (error) {
            console.error("Lỗi khi lưu tiêu hao:", error);
            displayStatusMessage(consumeStatusMessage, `Lỗi khi lưu tiêu hao: ${error.message}`, 'error');
        }
    });
}

// --- Hàm Báo cáo ---
function setupReportFilters() {
    // Đặt giá trị mặc định cho các bộ lọc ngày
    if (reportDailyDateInput) reportDailyDateInput.value = new Date().toISOString().slice(0, 10);
    const today = new Date();
    if (reportMonthInput) reportMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (reportYearInput) reportYearInput.value = today.getFullYear().toString();

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    if (profitInventoryInStartDateInput) profitInventoryInStartDateInput.value = thirtyDaysAgo.toISOString().slice(0, 10);
    if (profitInventoryInEndDateInput) profitInventoryInEndDateInput.value = today.toISOString().slice(0, 10);
    if (profitConsumeStartDateInput) profitConsumeStartDateInput.value = thirtyDaysAgo.toISOString().slice(0, 10);
    if (profitConsumeEndDateInput) profitConsumeEndDateInput.value = today.toISOString().slice(0, 10);

    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', () => {
            const type = reportTypeSelect.value;
            // Ẩn tất cả các bộ lọc trước
            const dailyFilter = document.getElementById('dailyReportFilter');
            const monthlyFilter = document.getElementById('monthlyReportFilter');
            const yearlyFilter = document.getElementById('yearlyReportFilter');
            const dateRangeFilter = document.getElementById('dateRangeReportFilter');

            if (dailyFilter) dailyFilter.classList.add('hidden');
            if (monthlyFilter) monthlyFilter.classList.add('hidden');
            if (yearlyFilter) yearlyFilter.classList.add('hidden');
            if (dateRangeFilter) dateRangeFilter.classList.add('hidden');
            if (profitReportFilter) profitReportFilter.classList.add('hidden');

            // Hiển thị bộ lọc tương ứng
            if (type === 'daily' && dailyFilter) {
                dailyFilter.classList.remove('hidden');
            } else if (type === 'monthly' && monthlyFilter) {
                monthlyFilter.classList.remove('hidden');
            } else if (type === 'yearly' && yearlyFilter) {
                yearlyFilter.classList.remove('hidden');
            } else if (type === 'dateRange' && dateRangeFilter) {
                dateRangeFilter.classList.remove('hidden');
            } else if (type === 'profit' && profitReportFilter) {
                profitReportFilter.classList.remove('hidden');
            }
        });

        // Kích hoạt sự kiện change để đặt trạng thái ban đầu
        reportTypeSelect.dispatchEvent(new Event('change'));
    }
}

if (generateReportButton) {
    generateReportButton.addEventListener('click', async () => {
        const reportType = reportTypeSelect.value;
        if (reportContent) reportContent.innerHTML = '<p style="text-align:center; color:#666;">Đang tạo báo cáo...</p>';

        try {
            if (reportType === 'profit') {
                // Logic cho báo cáo lợi nhuận được xử lý bởi nút riêng generateProfitReportBtn
                if (reportContent) reportContent.innerHTML = '<p style="text-align:center; color:#666;">Vui lòng sử dụng nút "Tạo Báo cáo Lợi nhuận" riêng.</p>';
                return;
            } else {
                let transactions = [];
                const transactionsCol = collection(db, 'daily_transactions');
                let q;

                if (reportType === 'daily') {
                    const selectedDate = reportDailyDateInput.value;
                    if (!selectedDate) {
                        if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn ngày cho báo cáo ngày.</p>';
                        return;
                    }
                    q = query(transactionsCol, where('date', '==', selectedDate));
                } else if (reportType === 'monthly') {
                    const selectedMonth = reportMonthInput.value;
                    if (!selectedMonth) {
                        if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn tháng cho báo cáo tháng.</p>';
                        return;
                    }
                    const startDate = `${selectedMonth}-01`;
                    const year = parseInt(selectedMonth.substring(0, 4));
                    const month = parseInt(selectedMonth.substring(5, 7));
                    const lastDay = new Date(year, month, 0).getDate();
                    const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

                    q = query(transactionsCol, where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date'));
                } else if (reportType === 'yearly') {
                    const selectedYear = reportYearInput.value;
                    if (!selectedYear) {
                        if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn năm cho báo cáo năm.</p>';
                        return;
                    }
                    const startDate = `${selectedYear}-01-01`;
                    const endDate = `${selectedYear}-12-31`;
                    q = query(transactionsCol, where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date'));
                } else if (reportType === 'dateRange') {
                    const startDate = reportStartDateInput.value;
                    const endDate = reportEndDateInput.value;
                    if (!startDate || !endDate) {
                        if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn đầy đủ khoảng ngày cho báo cáo.</p>';
                        return;
                    }
                    if (new Date(startDate) > new Date(endDate)) {
                        if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Ngày bắt đầu không thể lớn hơn ngày kết thúc.</p>';
                        return;
                    }
                    q = query(transactionsCol, where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date'));
                } else {
                    if (reportContent) reportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn loại báo cáo.</p>';
                    return;
                }

                const querySnapshot = await getDocs(q);
                transactions = querySnapshot.docs.map(doc => doc.data());
                renderReport(reportType, transactions);
            }

        } catch (error) {
            console.error("Lỗi khi tạo báo cáo:", error);
            if (reportContent) reportContent.innerHTML = `<p style="color:red; text-align:center;">Lỗi khi tạo báo cáo: ${error.message}</p>`;
        }
    });
}

function renderReport(reportType, transactions) {
    if (!reportContent) return; // Đảm bảo reportContent tồn tại

    if (transactions.length === 0) {
        reportContent.innerHTML = '<p style="text-align:center; color:#666;">Không có dữ liệu cho báo cáo này.</p>';
        return;
    }

    let reportHtml = '';
    let totalRevenue = 0;
    let totalQuantity = 0;

    const reportTitle = reportType === 'daily' ? 'Ngày' : reportType === 'monthly' ? 'Tháng' : reportType === 'yearly' ? 'Năm' : 'Khoảng ngày';
    reportHtml += `<h3>Báo cáo Doanh thu (${reportTitle})</h3>`;
    reportHtml += `<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Ngày</th><th>Tên Hàng Hóa</th><th>Số lượng tiêu hao</th><th>Doanh thu</th></tr></thead><tbody>`;

    // Sắp xếp giao dịch theo ngày để báo cáo dễ đọc hơn
    transactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
    });

    transactions.forEach(item => {
        reportHtml += `
            <tr>
                <td>${item.date || 'N/A'}</td>
                <td>${item.productName || 'N/A'}</td>
                <td>${item.quantityConsumed || 0}</td>
                <td>${(item.revenue || 0).toLocaleString('vi-VN')} VNĐ</td>
            </tr>
        `;
        totalRevenue += item.revenue || 0;
        totalQuantity += item.quantityConsumed || 0;
    });

    reportHtml += `</tbody><tfoot><tr><td colspan="2" style="text-align:right; font-weight:bold;">Tổng cộng:</td><td>${totalQuantity}</td><td>${totalRevenue.toLocaleString('vi-VN')} VNĐ</td></tr></tfoot></table></div>`;
    reportContent.innerHTML = reportHtml;
}

// Hàm tạo Báo cáo Lợi nhuận
if (generateProfitReportBtn) {
    generateProfitReportBtn.addEventListener('click', async () => {
        if (profitReportContent) profitReportContent.innerHTML = '<p style="text-align:center; color:#666;">Đang tạo báo cáo lợi nhuận...</p>';

        const invInStartDate = profitInventoryInStartDateInput.value;
        const invInEndDate = profitInventoryInEndDateInput.value;
        const consumeStartDate = profitConsumeStartDateInput.value;
        const consumeEndDate = profitConsumeEndDateInput.value;

        if (!invInStartDate || !invInEndDate || !consumeStartDate || !consumeEndDate) {
            if (profitReportContent) profitReportContent.innerHTML = '<p style="color:red; text-align:center;">Vui lòng chọn đầy đủ các khoảng ngày cho báo cáo lợi nhuận.</p>';
            return;
        }

        if (new Date(invInStartDate) > new Date(invInEndDate) || new Date(consumeStartDate) > new Date(consumeEndDate)) {
            if (profitReportContent) profitReportContent.innerHTML = '<p style="color:red; text-align:center;">Ngày bắt đầu không thể lớn hơn ngày kết thúc trong bất kỳ khoảng thời gian nào.</p>';
            return;
        }

        let totalInventoryInCost = 0;
        let totalRevenueFromConsumption = 0;

        try {
            const inventoryInCol = collection(db, 'inventory_in_history');
            const qInvIn = query(
                inventoryInCol,
                where('date', '>=', invInStartDate),
                where('date', '<=', invInEndDate)
            );
            const invInSnapshot = await getDocs(qInvIn);

            invInSnapshot.forEach(doc => {
                const item = doc.data();
                totalInventoryInCost += (item.quantity || 0) * (item.price || 0);
            });

            const transactionsCol = collection(db, 'daily_transactions');
            const qConsume = query(
                transactionsCol,
                where('date', '>=', consumeStartDate),
                where('date', '<=', consumeEndDate)
            );
            const consumeSnapshot = await getDocs(qConsume);

            consumeSnapshot.forEach(doc => {
                const transaction = doc.data();
                totalRevenueFromConsumption += (transaction.revenue || 0);
            });

            const netProfit = totalRevenueFromConsumption - totalInventoryInCost;

            renderProfitReport(totalInventoryInCost, totalRevenueFromConsumption, netProfit, invInStartDate, invInEndDate, consumeStartDate, consumeEndDate);

        } catch (error) {
            console.error("Lỗi khi tạo báo cáo lợi nhuận:", error);
            if (profitReportContent) profitReportContent.innerHTML = `<p style="color:red; text-align:center;">Lỗi khi tạo báo cáo lợi nhuận: ${error.message}</p>`;
        }
    });
}


function renderProfitReport(totalInventoryInCost, totalRevenueFromConsumption, netProfit, invInStartDate, invInEndDate, consumeStartDate, consumeEndDate) {
    if (!profitReportContent) return; // Đảm bảo profitReportContent tồn tại

    let reportHtml = `
        <h3>Báo cáo Lợi nhuận</h3>
        <p><strong>Khoảng thời gian nhập kho:</strong> từ ${invInStartDate} đến ${invInEndDate}</p>
        <p><strong>Khoảng thời gian tiêu hao (doanh thu):</strong> từ ${consumeStartDate} đến ${consumeEndDate}</p>
        <div class="summary-cards-profit">
            <div class="summary-card">
                <h3>Tổng chi phí nhập kho</h3>
                <p style="color: #d73a49;">${totalInventoryInCost.toLocaleString('vi-VN')} VNĐ</p>
            </div>
            <div class="summary-card">
                <h3>Tổng doanh thu từ tiêu hao</h3>
                <p style="color: #28a745;">${totalRevenueFromConsumption.toLocaleString('vi-VN')} VNĐ</p>
            </div>
            <div class="summary-card">
                <h3>Lợi nhuận ròng</h3>
                <p style="color: ${netProfit >= 0 ? '#28a745' : '#d73a49'};">${netProfit.toLocaleString('vi-VN')} VNĐ</p>
            </div>
        </div>
        <p style="margin-top: 20px; font-style: italic; color: #586069;">
            Lợi nhuận được tính bằng: Tổng doanh thu từ tiêu hao - Tổng chi phí nhập kho.
            Lưu ý: Đây là báo cáo lợi nhuận đơn giản dựa trên tổng chi phí nhập kho và tổng doanh thu tiêu hao trong các khoảng thời gian đã chọn, không phải là tính toán giá vốn hàng bán theo phương pháp kế toán.
        </p>
    `;
    profitReportContent.innerHTML = reportHtml;
}


// --- Khởi tạo Dashboard khi DOM đã tải ---
// Sử dụng DOMContentLoaded để đảm bảo tất cả HTML đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ khởi tạo dashboard nếu đang ở trang dashboard.html
    // (auth.js đã xử lý việc chuyển hướng đến đây)
    if (window.location.pathname.endsWith('/dashboard.html') || window.location.pathname === '/') {
        initializeDashboard();
    }
    // Kích hoạt sự kiện resize để điều chỉnh sidebar ban đầu
    window.dispatchEvent(new Event('resize'));
});