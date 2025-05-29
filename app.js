// js/app.js
// File này chứa toàn bộ logic cho trang Dashboard.
// Toàn bộ chức năng đăng nhập, đăng ký, và phân quyền đã được loại bỏ.

import { db } from './firebase-config.js'; // Chỉ import db, không còn auth
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
const pageTitle = document.getElementById('pageTitle');

// Điều hướng Sidebar
const navDashboard = document.getElementById('navDashboard');
const navProducts = document.getElementById('navProducts');
const navInventoryIn = document.getElementById('navInventoryIn');
const navInventoryHistory = document.getElementById('navInventoryHistory');
const navConsume = document.getElementById('navConsume');
const navReports = document.getElementById('navReports');
const navSettings = document.getElementById('navSettings'); // Thêm navSettings
const navLogout = document.getElementById('navLogout'); // Thêm navLogout

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
const reportsSection = document.getElementById('reportsSection');
const settingsSection = document.getElementById('settingsSection'); // Thêm settingsSection

// Báo cáo - CẬP NHẬT ID Ở ĐÂY
const reportPeriodSelect = document.getElementById('reportPeriod'); // Đã thay đổi ID từ reportTypeSelect
const customDateRangeDiv = document.getElementById('customDateRange'); // ID của div chứa ngày tùy chỉnh
const reportStartDateInput = document.getElementById('startDate'); // Đã thay đổi ID từ reportStartDate
const reportEndDateInput = document.getElementById('endDate'); // Đã thay đổi ID từ reportEndDate
const generateReportButton = document.getElementById('generateReportButton');
const profitReportContent = document.getElementById('profitReportContent'); // Vẫn là profitReportContent cho báo cáo

// Sản phẩm
const addProductButton = document.getElementById('addProductButton');
const productSearchInput = document.getElementById('productSearch'); // Đã thay đổi từ productSearchInput
const productsTableBody = document.getElementById('productsTableBody');

// Modal Sản phẩm
const productModal = document.getElementById('productModal');
const closeButton = document.querySelector('.modal .close-button');
const modalTitle = document.getElementById('modalTitle');
const addProductForm = document.getElementById('addProductForm');
const productIdInput = document.getElementById('productId'); // Đã thay đổi từ productId
const productNameInput = document.getElementById('productName'); // Đã thay đổi từ productName
const productPriceInput = document.getElementById('productPrice'); // Đã thay đổi từ productPrice
const productUnitInput = document.getElementById('productUnit'); // Đã thay đổi từ productUnit
const productMinStockInput = document.getElementById('productMinStock'); // Đã thay đổi từ productMinStock
const saveProductButton = document.getElementById('saveProductButton');
const productStatusMessage = document.getElementById('productStatusMessage');

// Nhập kho
const inventoryInProductSelect = document.getElementById('inventoryInProductSelect'); // Đã thay đổi từ inventoryProductSelect
const inventoryInQuantityInput = document.getElementById('inventoryInQuantity'); // Đã thay đổi từ inventoryQuantityInput
const inventoryInCostInput = document.getElementById('inventoryInCost'); // Đã thay đổi từ inventoryPriceInput
const inventoryDateInput = document.getElementById('inventoryDateInput'); // Cần kiểm tra xem có còn dùng không
const saveInventoryInButton = document.getElementById('saveInventoryInButton'); // Đã thay đổi từ saveInventoryButton
const inventoryInStatusMessage = document.getElementById('inventoryInStatusMessage'); // Đã thay đổi từ inventoryStatusMessage

// Lịch sử nhập kho
const inventoryHistoryTableBody = document.getElementById('inventoryHistoryTableBody');

// Tiêu hao
const consumableProductsTableBody = document.getElementById('consumableProductsTableBody');
const saveConsumptionButton = document.getElementById('saveConsumptionButton');
const consumeStatusMessage = document.getElementById('consumeStatusMessage');
const consumptionHistoryTableBody = document.getElementById('consumptionHistoryTableBody'); // Thêm phần lịch sử tiêu hao

// Pagination Controls (Sản phẩm)
const prevProductsPageButton = document.getElementById('prevProductsPage');
const nextProductsPageButton = document.getElementById('nextProductsPage');
const currentProductsPageSpan = document.getElementById('currentProductsPage');
const totalPagesProductsSpan = document.getElementById('totalPagesProducts');

// Pagination Controls (Lịch sử nhập kho)
const prevInventoryHistoryPageButton = document.getElementById('prevInventoryHistoryPage');
const nextInventoryHistoryPageButton = document.getElementById('nextInventoryHistoryPage');
const currentInventoryHistoryPageSpan = document.getElementById('currentInventoryHistoryPage');
const totalPagesInventoryHistorySpan = document.getElementById('totalPagesInventoryHistory');

// Pagination Controls (Lịch sử tiêu hao)
const prevConsumptionHistoryPageButton = document.getElementById('prevConsumptionHistoryPage');
const nextConsumptionHistoryPageButton = document.getElementById('nextConsumptionHistoryPage');
const currentConsumptionHistoryPageSpan = document.getElementById('currentConsumptionHistoryPage');
const totalPagesConsumptionHistorySpan = document.getElementById('totalPagesConsumptionHistory');

// --- Biến chung ---
let currentProductsPage = 1;
const productsPerPage = 10;
let currentInventoryHistoryPage = 1;
const inventoryHistoryPerPage = 10;
let currentConsumptionHistoryPage = 1;
const consumptionHistoryPerPage = 10;

// --- Hàm chung ---

function showSection(section, title) {
    // Ẩn tất cả các section
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    // Hiển thị section mong muốn
    if (section) {
        section.classList.remove('hidden');
    }
    // Cập nhật tiêu đề trang
    if (pageTitle) {
        pageTitle.textContent = title;
    }
}

function displayStatusMessage(element, message, type) {
    if (element) {
        element.textContent = message;
        element.className = `status-message ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 5000);
    }
}

// --- Dashboard Logic ---

async function loadDashboardKPIs() {
    // Logic tải KPI
    const productsCol = collection(db, 'products');
    try {
        const querySnapshot = await getDocs(productsCol);
        let totalProducts = 0;
        let totalStockQuantity = 0;
        let totalStockValue = 0;
        let lowStockCount = 0;
        const productNames = [];
        const productStocks = [];

        querySnapshot.forEach(doc => {
            const product = doc.data();
            totalProducts++;
            totalStockQuantity += product.stock || 0;
            totalStockValue += (product.stock || 0) * (product.price || 0); // Giả sử giá bán để tính giá trị tồn kho
            if (product.stock < product.minStock) {
                lowStockCount++;
            }
            productNames.push(product.name);
            productStocks.push(product.stock || 0);
        });

        if (document.getElementById('totalProductsCount')) document.getElementById('totalProductsCount').textContent = totalProducts;
        if (document.getElementById('totalStockQuantity')) document.getElementById('totalStockQuantity').textContent = totalStockQuantity;
        if (document.getElementById('totalStockValue')) document.getElementById('totalStockValue').textContent = totalStockValue.toLocaleString('vi-VN') + ' VNĐ';
        if (document.getElementById('lowStockCount')) document.getElementById('lowStockCount').textContent = lowStockCount;

        // Cập nhật biểu đồ tồn kho (nếu có)
        updateStockChart(productNames, productStocks);
    } catch (error) {
        console.error("Lỗi khi tải KPIs dashboard:", error);
    }
}

let stockChartInstance;
function updateStockChart(labels, data) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    stockChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tồn kho hiện tại',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Số lượng tồn kho'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tên Sản phẩm'
                    }
                }
            }
        }
    });
}

// --- Product Management Logic ---

async function loadProducts(page = 1, searchQuery = '') {
    currentProductsPage = page;
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải sản phẩm...</td></tr>';

    try {
        let productsRef = collection(db, 'products');
        let q = query(productsRef, orderBy('name'));

        if (searchQuery) {
            // Firebase không hỗ trợ tìm kiếm substring trực tiếp hoặc case-insensitive hoàn toàn trên client-side cho `orderBy`
            // Bạn sẽ cần lọc kết quả sau khi lấy về, hoặc sử dụng dịch vụ tìm kiếm bên ngoài (vd: Algolia, ElasticSearch)
            // hoặc tìm kiếm chính xác. Ở đây, tôi sẽ lọc sau khi lấy về.
        }

        const querySnapshot = await getDocs(q);
        let products = [];
        querySnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (searchQuery) {
            const lowerCaseSearchQuery = searchQuery.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(lowerCaseSearchQuery));
        }

        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / productsPerPage);
        if (totalPagesProductsSpan) totalPagesProductsSpan.textContent = totalPages > 0 ? totalPages : 1;
        if (currentProductsPageSpan) currentProductsPageSpan.textContent = currentProductsPage;

        const startIndex = (currentProductsPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedProducts = products.slice(startIndex, endIndex);

        productsTableBody.innerHTML = '';
        if (paginatedProducts.length === 0) {
            productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy sản phẩm nào.</td></tr>';
            return;
        }

        paginatedProducts.forEach(product => {
            const row = productsTableBody.insertRow();
            row.setAttribute('data-id', product.id);

            // Kiểm tra tồn kho thấp
            const isLowStock = (product.stock !== undefined && product.minStock !== undefined) && (product.stock <= product.minStock);
            if (isLowStock) {
                row.classList.add('low-stock-row'); // Thêm lớp CSS cho hàng tồn kho thấp
            }
            
            // Xây dựng các nút hành động
            let actionsHtml = `
                <button class="edit-product-button action-button small" data-id="${product.id}"><i class="fas fa-edit"></i> Sửa</button>
                <button class="delete-product-button action-button small danger" data-id="${product.id}"><i class="fas fa-trash-alt"></i> Xóa</button>
            `;
            if (isLowStock) {
                // Thêm nút "Nhập kho" nếu tồn kho thấp
                actionsHtml += `
                    <button class="restock-product-button action-button small primary"
                            data-id="${product.id}"
                            data-name="${product.name}"
                            title="Nhập kho sản phẩm này do tồn kho thấp">
                        <i class="fas fa-truck-loading"></i> Nhập kho
                    </button>
                `;
            }

            row.innerHTML = `
                <td>${product.name} ${isLowStock ? '<i class="fas fa-exclamation-triangle low-stock-icon" title="Tồn kho thấp!"></i>' : ''}</td>
                <td>${product.price ? product.price.toLocaleString('vi-VN') : '0'} VNĐ</td>
                <td>${product.unit || ''}</td>
                <td>${product.stock || 0}</td>
                <td>${product.minStock || 0}</td>
                <td>${isLowStock ? 'Cần nhập' : 'Ổn định'}</td> <td class="actions">
                    ${actionsHtml}
                </td>
            `;
        });

        // Gắn sự kiện cho các nút Edit và Delete
        document.querySelectorAll('.edit-product-button').forEach(button => {
            button.addEventListener('click', (e) => editProduct(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-product-button').forEach(button => {
            button.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
        });
        document.querySelectorAll('.restock-product-button').forEach(button => {
            button.addEventListener('click', (e) => restockProduct(e.target.dataset.id, e.target.dataset.name));
        });

        if (prevProductsPageButton) prevProductsPageButton.disabled = currentProductsPage === 1;
        if (nextProductsPageButton) nextProductsPageButton.disabled = currentProductsPage === totalPages;

    } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Lỗi khi tải sản phẩm.</td></tr>';
    }
}

async function restockProduct(productId, productName) {
    // Chuyển đến phần nhập kho
    showSection(inventoryInSection, 'Nhập kho');

    // Đặt sản phẩm và số lượng mặc định (ví dụ: 1)
    if (inventoryInProductSelect) {
        // Đảm bảo các sản phẩm đã được tải trước khi đặt giá trị
        await loadProductsForInventoryIn(); // Tải lại danh sách sản phẩm để đảm bảo tùy chọn có sẵn
        inventoryInProductSelect.value = productId; // Chọn sản phẩm trong dropdown

        // Bạn có thể tùy chọn đặt số lượng nhập mặc định, ví dụ: 1 hoặc mức minStock của sản phẩm
        if (inventoryInQuantityInput) {
            // Lấy thông tin sản phẩm để đặt số lượng mặc định
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const product = productSnap.data();
                // Đặt số lượng nhập mặc định để đạt minStock + 1 hoặc một giá trị cố định
                const quantityNeeded = (product.minStock || 0) - (product.stock || 0) + 10; // Ví dụ: nhập thêm 10 đơn vị vượt mức tối thiểu
                inventoryInQuantityInput.value = quantityNeeded > 0 ? quantityNeeded : 1;
            } else {
                inventoryInQuantityInput.value = '1';
            }
        }
    }
    // Đặt ngày nhập kho mặc định là ngày hiện tại
    if (inventoryDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        inventoryDateInput.value = `${year}-${month}-${day}`;
    }

    // Cuộn đến phần nhập kho để người dùng dễ dàng nhìn thấy
    inventoryInSection.scrollIntoView({ behavior: 'smooth' });
}

async function addOrUpdateProduct(e) {
    e.preventDefault();

    const productId = productIdInput ? productIdInput.value : '';
    const productName = productNameInput ? productNameInput.value.trim() : '';
    const productPrice = productPriceInput ? parseFloat(productPriceInput.value) : 0;
    const productUnit = productUnitInput ? productUnitInput.value.trim() : '';
    const productMinStock = productMinStockInput ? parseInt(productMinStockInput.value) : 0;

    if (!productName || isNaN(productPrice) || productPrice < 0 || !productUnit || isNaN(productMinStock) || productMinStock < 0) {
        displayStatusMessage(productStatusMessage, 'Vui lòng điền đầy đủ và chính xác các thông tin sản phẩm.', 'error');
        return;
    }

    try {
        const productData = {
            name: productName,
            price: productPrice,
            unit: productUnit,
            minStock: productMinStock,
            stock: 0 // Mặc định tồn kho là 0 khi thêm mới
        };

        if (productId) {
            // Cập nhật sản phẩm hiện có
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, productData);
            displayStatusMessage(productStatusMessage, 'Cập nhật sản phẩm thành công!', 'success');
        } else {
            // Thêm sản phẩm mới
            await addDoc(collection(db, 'products'), productData);
            displayStatusMessage(productStatusMessage, 'Thêm sản phẩm thành công!', 'success');
        }

        // Tải lại danh sách sản phẩm và đóng modal
        await loadProducts(currentProductsPage);
        if (productModal) productModal.classList.add('hidden');
    } catch (error) {
        console.error("Lỗi khi lưu sản phẩm:", error);
        displayStatusMessage(productStatusMessage, `Lỗi khi lưu sản phẩm: ${error.message}`, 'error');
    }
}

async function editProduct(productId) {
    if (!productModal || !modalTitle || !addProductForm || !productIdInput || !productNameInput || !productPriceInput || !productUnitInput || !productMinStockInput || !saveProductButton) return;

    modalTitle.textContent = 'Sửa Sản phẩm';
    saveProductButton.textContent = 'Cập nhật Sản phẩm';
    productModal.classList.remove('hidden');
    addProductForm.reset(); // Đặt lại form

    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = productSnap.data();
            productIdInput.value = productId;
            productNameInput.value = product.name || '';
            productPriceInput.value = product.price || 0;
            productUnitInput.value = product.unit || '';
            productMinStockInput.value = product.minStock || 0;
        } else {
            displayStatusMessage(productStatusMessage, 'Không tìm thấy sản phẩm để sửa.', 'error');
            if (productModal) productModal.classList.add('hidden');
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin sản phẩm để sửa:", error);
        displayStatusMessage(productStatusMessage, `Lỗi: ${error.message}`, 'error');
        if (productModal) productModal.classList.add('hidden');
    }
}

async function deleteProduct(productId) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            displayStatusMessage(productStatusMessage, 'Xóa sản phẩm thành công!', 'success');
            await loadProducts(currentProductsPage); // Tải lại danh sách sản phẩm
        } catch (error) {
            console.error("Lỗi khi xóa sản phẩm:", error);
            displayStatusMessage(productStatusMessage, `Lỗi khi xóa sản phẩm: ${error.message}`, 'error');
        }
    }
}

// --- Inventory In Logic ---

async function loadProductsForInventoryIn() {
    if (!inventoryInProductSelect) return;
    inventoryInProductSelect.innerHTML = '<option value="">-- Đang tải sản phẩm --</option>';
    try {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, orderBy('name'));
        const querySnapshot = await getDocs(q);
        inventoryInProductSelect.innerHTML = '<option value="">-- Chọn sản phẩm --</option>'; // Reset
        querySnapshot.forEach(doc => {
            const product = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = product.name;
            inventoryInProductSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Lỗi khi tải sản phẩm cho nhập kho:", error);
        displayStatusMessage(inventoryInStatusMessage, 'Lỗi khi tải danh sách sản phẩm.', 'error');
    }
}

async function saveInventoryIn() {
    if (!inventoryInProductSelect || !inventoryInQuantityInput || !inventoryInCostInput || !inventoryDateInput || !saveInventoryInButton) return;
    const productId = inventoryInProductSelect.value;
    const quantity = parseInt(inventoryInQuantityInput.value);
    const cost = parseFloat(inventoryInCostInput.value);
    const date = inventoryDateInput.value; // Dạng YYYY-MM-DD

    if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(cost) || cost < 0 || !date) {
        displayStatusMessage(inventoryInStatusMessage, 'Vui lòng điền đầy đủ và chính xác thông tin nhập kho.', 'error');
        return;
    }

    try {
        // Lấy thông tin sản phẩm để cập nhật tồn kho
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
            displayStatusMessage(inventoryInStatusMessage, 'Sản phẩm không tồn tại.', 'error');
            return;
        }
        const currentStock = productSnap.data().stock || 0;
        const newStock = currentStock + quantity;

        // Cập nhật tồn kho sản phẩm
        await updateDoc(productRef, { stock: newStock });

        // Ghi lịch sử nhập kho
        await addDoc(collection(db, 'inventoryHistory'), {
            productId: productId,
            productName: productSnap.data().name,
            quantity: quantity,
            cost: cost,
            totalCost: quantity * cost,
            timestamp: Timestamp.fromDate(new Date(date)) // Lưu dưới dạng Timestamp
        });

        displayStatusMessage(inventoryInStatusMessage, 'Nhập kho thành công!', 'success');
        // Reset form
        inventoryInProductSelect.value = '';
        inventoryInQuantityInput.value = '1';
        inventoryInCostInput.value = '';

        // Cập nhật lại dashboard (nếu cần)
        await loadDashboardKPIs();
        // Cập nhật lại lịch sử nhập kho (nếu đang ở trang đó)
        if (!inventoryHistorySection.classList.contains('hidden')) {
            await loadInventoryInHistory();
        }

    } catch (error) {
        console.error("Lỗi khi lưu nhập kho:", error);
        displayStatusMessage(inventoryInStatusMessage, `Lỗi khi lưu nhập kho: ${error.message}`, 'error');
    }
}

// --- Inventory History Logic ---

async function loadInventoryInHistory(page = 1) {
    currentInventoryHistoryPage = page;
    if (!inventoryHistoryTableBody) return;
    inventoryHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải lịch sử nhập kho...</td></tr>';

    try {
        const historyCol = collection(db, 'inventoryHistory');
        const q = query(historyCol, orderBy('timestamp', 'desc')); // Sắp xếp theo thời gian mới nhất

        const querySnapshot = await getDocs(q);
        let historyEntries = [];
        querySnapshot.forEach(doc => {
            const entry = doc.data();
            historyEntries.push({ id: doc.id, ...entry });
        });

        const totalEntries = historyEntries.length;
        const totalPages = Math.ceil(totalEntries / inventoryHistoryPerPage);
        if (totalPagesInventoryHistorySpan) totalPagesInventoryHistorySpan.textContent = totalPages > 0 ? totalPages : 1;
        if (currentInventoryHistoryPageSpan) currentInventoryHistoryPageSpan.textContent = currentInventoryHistoryPage;

        const startIndex = (currentInventoryHistoryPage - 1) * inventoryHistoryPerPage;
        const endIndex = startIndex + inventoryHistoryPerPage;
        const paginatedEntries = historyEntries.slice(startIndex, endIndex);

        inventoryHistoryTableBody.innerHTML = '';
        if (paginatedEntries.length === 0) {
            inventoryHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Không có lịch sử nhập kho.</td></tr>';
            return;
        }

        paginatedEntries.forEach(entry => {
            const row = inventoryHistoryTableBody.insertRow();
            const date = entry.timestamp ? new Date(entry.timestamp.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A';
            row.innerHTML = `
                <td>${date}</td>
                <td>${entry.productName || 'N/A'}</td>
                <td>${entry.quantity || 0}</td>
                <td>${entry.cost ? entry.cost.toLocaleString('vi-VN') : '0'} VNĐ</td>
                <td>${entry.totalCost ? entry.totalCost.toLocaleString('vi-VN') : '0'} VNĐ</td>
            `;
        });

        if (prevInventoryHistoryPageButton) prevInventoryHistoryPageButton.disabled = currentInventoryHistoryPage === 1;
        if (nextInventoryHistoryPageButton) nextInventoryHistoryPageButton.disabled = currentInventoryHistoryPage === totalPages;

    } catch (error) {
        console.error("Lỗi khi tải lịch sử nhập kho:", error);
        inventoryHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Lỗi khi tải lịch sử nhập kho.</td></tr>';
    }
}

// --- Consume Logic ---

async function loadConsumableProducts() {
    if (!consumableProductsTableBody) return;
    consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải sản phẩm tiêu hao...</td></tr>';
    try {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, where('stock', '>', 0), orderBy('stock', 'desc'));
        const querySnapshot = await getDocs(q);
        consumableProductsTableBody.innerHTML = '';
        if (querySnapshot.empty) {
            consumableProductsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Không có sản phẩm nào để tiêu hao.</td></tr>';
            return;
        }
        querySnapshot.forEach(doc => {
            const product = doc.data();
            const row = consumableProductsTableBody.insertRow();
            row.setAttribute('data-id', doc.id);
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.price.toLocaleString('vi-VN')} VNĐ</td>
                <td>${product.stock || 0} ${product.unit || ''}</td>
                <td>
                    <input type="number" class="consume-quantity-input" data-product-id="${doc.id}" max="${product.stock || 0}" min="0" value="0">
                </td>
            `;
        });
    } catch (error) {
        console.error("Lỗi khi tải sản phẩm tiêu hao:", error);
        displayStatusMessage(consumeStatusMessage, 'Lỗi khi tải danh sách sản phẩm tiêu hao.', 'error');
    }
}

async function saveConsumption() {
    if (!saveConsumptionButton) return; // Kiểm tra nút có tồn tại

    const confirmSave = confirm('Bạn có chắc chắn muốn lưu các mục tiêu hao này?');
    if (!confirmSave) return;

    const quantityInputs = document.querySelectorAll('.consume-quantity-input');
    const updates = [];
    const today = new Date().toISOString().slice(0, 10); // Lấy ngày hiện tại YYYY-MM-DD

    try {
        for (const input of quantityInputs) {
            const productId = input ? input.dataset.productId : null;
            const quantityConsumed = (input && input.value !== undefined && input.value !== null) ? parseInt(input.value) : 0; // Đã sửa lỗi ở đây

            if (quantityConsumed > 0 && productId) {
                updates.push({ productId, quantityConsumed, inputElement: input });
            } else {
                console.warn('Bỏ qua phần tử input không hợp lệ:', input);
            }
        }

        if (updates.length === 0) {
            displayStatusMessage(consumeStatusMessage, 'Không có mục tiêu hao nào để lưu.', 'warning');
            return;
        }

        for (const item of updates) {
            const { productId, quantityConsumed, inputElement } = item;
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const product = productSnap.data();
                const currentStock = product.stock || 0;
                if (quantityConsumed > currentStock) {
                    displayStatusMessage(consumeStatusMessage, `Lỗi: Số lượng tiêu hao cho ${product.name} vượt quá tồn kho hiện tại (${currentStock}).`, 'error');
                    // Không rollback các mục khác, chỉ hiển thị lỗi cho mục này
                    // Bạn có thể cần một chiến lược xử lý lỗi phức tạp hơn nếu muốn giao dịch nguyên tử
                    continue; // Bỏ qua mục này và tiếp tục với các mục khác
                }

                const newStock = currentStock - quantityConsumed;
                const costPerUnit = product.cost || 0; // Giả sử sản phẩm có thuộc tính giá vốn (cost)
                const salePricePerUnit = product.price || 0; // Giá bán
                const totalCostOfConsumption = quantityConsumed * costPerUnit;
                const totalRevenueFromConsumption = quantityConsumed * salePricePerUnit;
                const profit = totalRevenueFromConsumption - totalCostOfConsumption;

                // Cập nhật tồn kho
                await updateDoc(productRef, { stock: newStock });

                // Ghi lịch sử tiêu hao (bán hàng)
                await addDoc(collection(db, 'consumptionHistory'), {
                    productId: productId,
                    productName: product.name,
                    quantity: quantityConsumed,
                    costPerUnit: costPerUnit, // Giá vốn mỗi đơn vị
                    salePricePerUnit: salePricePerUnit, // Giá bán mỗi đơn vị
                    totalCost: totalCostOfConsumption,
                    totalRevenue: totalRevenueFromConsumption,
                    profit: profit,
                    timestamp: Timestamp.fromDate(new Date(today)) // Ghi ngày tiêu hao
                });

                // Đặt lại giá trị input về 0 sau khi lưu thành công
                if (inputElement) {
                    inputElement.value = "0";
                }

            } else {
                console.warn(`Sản phẩm với ID ${productId} không tồn tại.`);
            }
        }
        displayStatusMessage(consumeStatusMessage, 'Tiêu hao đã được lưu thành công và tồn kho đã được cập nhật!', 'success');

        // Tải lại các KPI và lịch sử tiêu hao sau khi lưu thành công
        await loadDashboardKPIs();
        await loadConsumptionHistory();

    } catch (error) {
        console.error("Lỗi khi lưu tiêu hao:", error);
        displayStatusMessage(consumeStatusMessage, `Lỗi khi lưu tiêu hao: ${error.message}`, 'error');
    }
}

window.addEventListener('resize', () => {
    setInitialSidebarState(); // Gọi lại hàm để điều chỉnh trạng thái sidebar
});

function setInitialSidebarState() {
    if (window.innerWidth <= 768) {
        // Màn hình nhỏ: ẩn sidebar mặc định
        if (sidebar && !sidebar.classList.contains('hidden')) {
            sidebar.classList.add('hidden');
        }
    } else {
        // Màn hình lớn: hiện sidebar mặc định
        if (sidebar && sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
        }
    }
}

async function loadConsumptionHistory(page = 1) {
    currentConsumptionHistoryPage = page;
    if (!consumptionHistoryTableBody) return;
    consumptionHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải lịch sử tiêu hao...</td></tr>';

    try {
        const historyCol = collection(db, 'consumptionHistory');
        const q = query(historyCol, orderBy('timestamp', 'desc'));

        const querySnapshot = await getDocs(q);
        let historyEntries = [];
        querySnapshot.forEach(doc => {
            const entry = doc.data();
            historyEntries.push({ id: doc.id, ...entry });
        });

        const totalEntries = historyEntries.length;
        const totalPages = Math.ceil(totalEntries / consumptionHistoryPerPage);
        if (totalPagesConsumptionHistorySpan) totalPagesConsumptionHistorySpan.textContent = totalPages > 0 ? totalPages : 1;
        if (currentConsumptionHistoryPageSpan) currentConsumptionHistoryPageSpan.textContent = currentConsumptionHistoryPage;

        const startIndex = (currentConsumptionHistoryPage - 1) * consumptionHistoryPerPage;
        const endIndex = startIndex + consumptionHistoryPerPage;
        const paginatedEntries = historyEntries.slice(startIndex, endIndex);

        consumptionHistoryTableBody.innerHTML = '';
        if (paginatedEntries.length === 0) {
            consumptionHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Không có lịch sử tiêu hao.</td></tr>';
            return;
        }

        paginatedEntries.forEach(entry => {
            const row = consumptionHistoryTableBody.insertRow();
            const date = entry.timestamp ? new Date(entry.timestamp.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A';
            row.innerHTML = `
                <td>${date}</td>
                <td>${entry.productName || 'N/A'}</td>
                <td>${entry.quantity || 0}</td>
                <td>${entry.totalCost ? entry.totalCost.toLocaleString('vi-VN') : '0'} VNĐ</td>
                <td>${entry.totalRevenue ? entry.totalRevenue.toLocaleString('vi-VN') : '0'} VNĐ</td>
            `;
        });

        if (prevConsumptionHistoryPageButton) prevConsumptionHistoryPageButton.disabled = currentConsumptionHistoryPage === 1;
        if (nextConsumptionHistoryPageButton) nextConsumptionHistoryPageButton.disabled = currentConsumptionHistoryPage === totalPages;

    } catch (error) {
        console.error("Lỗi khi tải lịch sử tiêu hao:", error);
        consumptionHistoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Lỗi khi tải lịch sử tiêu hao.</td></tr>';
    }
}

// --- Reports Logic ---

// Hàm này sẽ được gọi khi thay đổi loại báo cáo
function setupReportFilters() {
    if (!reportPeriodSelect || !customDateRangeDiv || !reportStartDateInput || !reportEndDateInput) {
        console.error("Không tìm thấy các phần tử DOM để thiết lập bộ lọc báo cáo.");
        return;
    }

    // Thiết lập trạng thái ban đầu dựa trên giá trị mặc định của select
    const initialReportType = reportPeriodSelect.value;
    updateReportFilterVisibility(initialReportType);

    reportPeriodSelect.addEventListener('change', () => {
        const selectedType = reportPeriodSelect.value;
        updateReportFilterVisibility(selectedType);
    });
}

function updateReportFilterVisibility(selectedType) {
    if (customDateRangeDiv) {
        if (selectedType === 'custom') {
            customDateRangeDiv.classList.remove('hidden');
        } else {
            customDateRangeDiv.classList.add('hidden');
        }
    }
}

async function generateRevenueReport(reportPeriod, dates = {}) {
    if (!profitReportContent) return;
    profitReportContent.innerHTML = '<p style="text-align:center;">Đang tạo báo cáo...</p>';

    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt về đầu ngày

    try {
        switch (reportPeriod) {
            case 'today':
                startDate = Timestamp.fromDate(today);
                endDate = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)); // Cuối ngày
                break;
            case 'last7days':
                startDate = Timestamp.fromDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
                endDate = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1));
                break;
            case 'thisMonth':
                startDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), 1));
                endDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)); // Cuối tháng
                break;
            case 'lastMonth':
                startDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                endDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999));
                break;
            case 'thisYear':
                startDate = Timestamp.fromDate(new Date(today.getFullYear(), 0, 1));
                endDate = Timestamp.fromDate(new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999));
                break;
            case 'custom':
                if (dates.startDate && dates.endDate) {
                    startDate = Timestamp.fromDate(new Date(dates.startDate));
                    endDate = Timestamp.fromDate(new Date(new Date(dates.endDate).getTime() + 24 * 60 * 60 * 1000 - 1)); // Cuối ngày kết thúc
                } else {
                    displayStatusMessage(reportsSection, 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc cho báo cáo tùy chỉnh.', 'error');
                    profitReportContent.innerHTML = '';
                    return;
                }
                break;
            default:
                displayStatusMessage(reportsSection, 'Loại báo cáo không hợp lệ.', 'error');
                profitReportContent.innerHTML = '';
                return;
        }

        // Truy vấn dữ liệu tiêu hao (doanh thu)
        const consumptionCol = collection(db, 'consumptionHistory');
        const q = query(
            consumptionCol,
            where('timestamp', '>=', startDate),
            where('timestamp', '<=', endDate),
            orderBy('timestamp', 'asc')
        );
        const querySnapshot = await getDocs(q);

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        const dailyData = {}; // Để tổng hợp theo ngày cho biểu đồ

        querySnapshot.forEach(doc => {
            const entry = doc.data();
            totalRevenue += entry.totalRevenue || 0;
            totalCost += entry.totalCost || 0;
            totalProfit += entry.profit || 0;

            // Thu thập dữ liệu theo ngày cho biểu đồ
            const dateKey = entry.timestamp.toDate().toISOString().slice(0, 10);
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { revenue: 0, profit: 0 };
            }
            dailyData[dateKey].revenue += entry.totalRevenue || 0;
            dailyData[dateKey].profit += entry.profit || 0;
        });

        // Tạo dữ liệu cho biểu đồ
        const chartLabels = Object.keys(dailyData).sort();
        const chartRevenueData = chartLabels.map(date => dailyData[date].revenue);
        const chartProfitData = chartLabels.map(date => dailyData[date].profit);

        profitReportContent.innerHTML = `
            <h3>Báo cáo Doanh thu & Lợi nhuận ${reportPeriod === 'custom' ? `từ ${new Date(dates.startDate).toLocaleDateString('vi-VN')} đến ${new Date(dates.endDate).toLocaleDateString('vi-VN')}` : ''}</h3>
            <p><strong>Tổng Doanh thu:</strong> ${totalRevenue.toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Tổng Giá vốn hàng bán:</strong> ${totalCost.toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Tổng Lợi nhuận:</strong> ${totalProfit.toLocaleString('vi-VN')} VNĐ</p>
            <div class="chart-container" style="margin-top: 20px;">
                <canvas id="revenueProfitChart"></canvas>
            </div>
        `;

        updateRevenueProfitChart(chartLabels, chartRevenueData, chartProfitData);

    } catch (error) {
        console.error("Lỗi khi tạo báo cáo doanh thu:", error);
        displayStatusMessage(reportsSection, `Lỗi khi tạo báo cáo: ${error.message}`, 'error');
        profitReportContent.innerHTML = '';
    }
}

let revenueProfitChartInstance;
function updateRevenueProfitChart(labels, revenueData, profitData) {
    const ctx = document.getElementById('revenueProfitChart');
    if (!ctx) return;

    if (revenueProfitChartInstance) {
        revenueProfitChartInstance.destroy();
    }

    revenueProfitChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doanh thu',
                    data: revenueData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Lợi nhuận',
                    data: profitData,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Số tiền (VNĐ)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày'
                    }
                }
            }
        }
    });
}


// --- Event Listeners ---

// Sidebar Toggle
if (sidebarToggle && sidebar && mainContentArea) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        // Trên màn hình nhỏ, mainContentArea không cần toggle 'expanded' vì sidebar là fixed
        // mainContentArea.classList.toggle('expanded'); // Bỏ dòng này
    });
}

// Thêm sự kiện click cho mainContentArea để đóng sidebar khi click ra ngoài (trên mobile)
if (mainContentArea && sidebar) {
    mainContentArea.addEventListener('click', () => {
        // Chỉ đóng sidebar nếu nó đang mở và màn hình là nhỏ (dưới 768px)
        if (!sidebar.classList.contains('hidden') && window.innerWidth <= 768) {
            sidebar.classList.add('hidden');
        }
    });
}
// Thêm sự kiện click cho các liên kết điều hướng để đóng sidebar sau khi chọn (trên mobile)
document.querySelectorAll('.main-nav ul li').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768 && !sidebar.classList.contains('hidden')) {
            sidebar.classList.add('hidden');
        }
    });
});

// Navigation
if (navDashboard) {
    navDashboard.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(dashboardSection, 'Tổng quan Kho hàng'); // Đã thay đổi tiêu đề
        await loadDashboardKPIs();
    });
}

if (navProducts) {
    navProducts.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(productsSection, 'Quản lý Sản phẩm');
        await loadProducts();
    });
}

if (addProductButton) {
    addProductButton.addEventListener('click', () => {
        if (!productModal || !modalTitle || !addProductForm || !productIdInput || !saveProductButton || !productStatusMessage) return;
        modalTitle.textContent = 'Thêm Sản phẩm';
        saveProductButton.textContent = 'Thêm sản phẩm';
        productIdInput.value = ''; // Xóa ID sản phẩm khi thêm mới
        addProductForm.reset();
        productStatusMessage.textContent = ''; // Xóa thông báo trạng thái
        productModal.classList.remove('hidden');
    });
}

if (closeButton) {
    closeButton.addEventListener('click', () => {
        if (productModal) productModal.classList.add('hidden');
    });
}

// Đóng modal khi click ra ngoài
if (productModal) {
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.classList.add('hidden');
        }
    });
}

if (addProductForm) {
    addProductForm.addEventListener('submit', addOrUpdateProduct);
}

if (productSearchInput) {
    productSearchInput.addEventListener('input', () => {
        // Debounce search input if needed for performance
        loadProducts(1, productSearchInput.value);
    });
}

if (prevProductsPageButton) {
    prevProductsPageButton.addEventListener('click', () => {
        if (currentProductsPage > 1) {
            loadProducts(currentProductsPage - 1, productSearchInput ? productSearchInput.value : '');
        }
    });
}

if (nextProductsPageButton) {
    nextProductsPageButton.addEventListener('click', () => {
        loadProducts(currentProductsPage + 1, productSearchInput ? productSearchInput.value : '');
    });
}


if (navInventoryIn) {
    navInventoryIn.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(inventoryInSection, 'Nhập kho');
        await loadProductsForInventoryIn();
        // Đặt ngày nhập kho mặc định là ngày hiện tại
        if (inventoryDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            inventoryDateInput.value = `${year}-${month}-${day}`;
        }
    });
}

if (saveInventoryInButton) {
    saveInventoryInButton.addEventListener('click', saveInventoryIn);
}

if (navInventoryHistory) {
    navInventoryHistory.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(inventoryHistorySection, 'Lịch sử Nhập kho');
        await loadInventoryInHistory();
    });
}

if (prevInventoryHistoryPageButton) {
    prevInventoryHistoryPageButton.addEventListener('click', () => {
        if (currentInventoryHistoryPage > 1) {
            loadInventoryInHistory(currentInventoryHistoryPage - 1);
        }
    });
}

if (nextInventoryHistoryPageButton) {
    nextInventoryHistoryPageButton.addEventListener('click', () => {
        loadInventoryInHistory(currentInventoryHistoryPage + 1);
    });
}


if (navConsume) {
    navConsume.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(consumeSection, 'Tiêu hao Hàng hóa');
        await loadConsumableProducts();
        await loadConsumptionHistory(); // Tải lịch sử tiêu hao khi chuyển đến trang này
    });
}

if (saveConsumptionButton) {
    saveConsumptionButton.addEventListener('click', saveConsumption);
}

if (prevConsumptionHistoryPageButton) {
    prevConsumptionHistoryPageButton.addEventListener('click', () => {
        if (currentConsumptionHistoryPage > 1) {
            loadConsumptionHistory(currentConsumptionHistoryPage - 1);
        }
    });
}

if (nextConsumptionHistoryPageButton) {
    nextConsumptionHistoryPageButton.addEventListener('click', () => {
        loadConsumptionHistory(currentConsumptionHistoryPage + 1);
    });
}

if (navReports) {
    navReports.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(reportsSection, 'Báo cáo Doanh thu & Lợi nhuận');
        setupReportFilters(); // Thiết lập bộ lọc hiển thị
        if (profitReportContent) profitReportContent.innerHTML = '<p style="text-align:center; color:#666;">Chọn khoảng thời gian và nhấp "Tạo Báo cáo".</p>';
    });
}

if (generateReportButton) {
    generateReportButton.addEventListener('click', async () => {
        const reportPeriod = reportPeriodSelect ? reportPeriodSelect.value : null;
        let startDate = null;
        let endDate = null;

        if (reportPeriod === 'custom') {
            startDate = reportStartDateInput ? reportStartDateInput.value : null;
            endDate = reportEndDateInput ? reportEndDateInput.value : null;
            if (!startDate || !endDate) {
                displayStatusMessage(reportsSection, 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc cho báo cáo tùy chỉnh.', 'error');
                if (profitReportContent) profitReportContent.innerHTML = '';
                return;
            }
        }

        if (reportPeriod) {
            await generateRevenueReport(reportPeriod, { startDate, endDate });
        } else {
            displayStatusMessage(reportsSection, 'Vui lòng chọn loại báo cáo hợp lệ.', 'error');
            if (profitReportContent) profitReportContent.innerHTML = '';
        }
    });
}

// Khởi tạo trạng thái ban đầu của Dashboard khi tải trang
document.addEventListener('DOMContentLoaded', async () => {
    // Đảm bảo các phần tử DOM quan trọng đã được lấy
    if (dashboardSection) {
        showSection(dashboardSection, 'Tổng quan Kho hàng');
        setInitialSidebarState();
        await loadDashboardKPIs();
    } else {
        console.error("Dashboard section not found.");
    }

    // Các thiết lập ban đầu cho các phần khác
    // Đảm bảo reportPeriodSelect tồn tại trước khi gọi setupReportFilters
    if (navReports && reportPeriodSelect) {
        setupReportFilters();
    }
});

// Chức năng Đăng xuất (giữ nguyên nhưng không có logic firebase auth)
if (navLogout) {
    navLogout.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Bạn đã đăng xuất.'); // Hoặc chuyển hướng đến trang đăng nhập
        // window.location.href = 'index.html'; // Chuyển hướng đến trang đăng nhập
    });
}

// Chức năng Cài đặt (placeholder)
if (navSettings) {
    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(settingsSection, 'Cài đặt');
    });
}