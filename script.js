// ============================================
// OZON Space - Main Script (PRINT VERSION)
// ============================================

const APPS_KEY = 'ozon_apps_v2';
const USERS_KEY = 'ozon_users_v2';
const SESSION_KEY = 'ozon_session';
const BANNED_KEY = 'ozon_banned_users';

// === СОЗДАНИЕ АДМИНА ===
(function createAdminImmediately() {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        if (!users.find(u => u.email === 'admin@ozon.space')) {
            users.push({
                id: 9999,
                name: 'Администратор OZON',
                email: 'admin@ozon.space',
                phone: '+7 (999) 000-00-00',
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            console.log('✅ Админ создан');
        }
    } catch (e) { console.error(e); }
})();

// === УТИЛИТЫ ===
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function getStorage(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } 
    catch (e) { return []; }
}

function setStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } 
    catch (e) { console.error('Ошибка сохранения:', e); }
}

function getServicePrice(service, area) {
    if (service === 'Склад' && area) return Math.round(area * 700);
    const fixedPrices = { 'ПВЗ': 55000, 'Логистика': 78000 };
    return fixedPrices[service] || 50000;
}

function isUserBanned(email) {
    return getStorage(BANNED_KEY).some(u => u.email === email);
}

// === АВТОРИЗАЦИЯ ===
function register(name, email, phone, password) {
    const users = getStorage(USERS_KEY);
    if (users.find(u => u.email === email)) {
        showToast('Пользователь с таким email уже существует', 'error');
        return false;
    }
    if (isUserBanned(email)) {
        showToast('Этот email заблокирован', 'error');
        return false;
    }
    users.push({ id: Date.now(), name, email, phone, password, role: 'client', createdAt: new Date().toISOString() });
    setStorage(USERS_KEY, users);
    showToast('Регистрация успешна! Теперь войдите в систему.', 'success');
    setTimeout(() => {
        const loginWrapper = document.getElementById('loginWrapper');
        const registerWrapper = document.getElementById('registerWrapper');
        if (loginWrapper && registerWrapper) {
            registerWrapper.classList.remove('active');
            setTimeout(() => loginWrapper.classList.add('active'), 100);
        }
    }, 1000);
    return true;
}

function login(email, password) {
    if (isUserBanned(email)) {
        showToast('Ваш аккаунт заблокирован', 'error');
        return false;
    }
    const users = getStorage(USERS_KEY);
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        setStorage(SESSION_KEY, user);
        showToast(`Добро пожаловать, ${user.name}!`, 'success');
        setTimeout(() => {
            window.location.href = user.role === 'admin' ? 'admin.html' : 'client.html';
        }, 500);
        return true;
    }
    showToast('Неверный email или пароль', 'error');
    return false;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    showToast('Вы вышли из системы', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } 
    catch (e) { return null; }
}

function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        showToast('Необходимо войти в систему', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return null;
    }
    if (isUserBanned(user.email)) {
        localStorage.removeItem(SESSION_KEY);
        showToast('Ваш аккаунт заблокирован', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return null;
    }
    return user;
}

// === БЫСТРАЯ ЗАЯВКА ===
function openQuickOrder(service = '') {
    const quickOrderSection = document.getElementById('quick-order');
    if (quickOrderSection) {
        quickOrderSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            const serviceSelect = document.getElementById('quickService');
            if (serviceSelect && service) serviceSelect.value = service;
        }, 500);
    } else {
        window.location.href = `index.html#quick-order?service=${encodeURIComponent(service)}`;
    }
}

// === PDF ЧЕК (ЧЕРЕЗ ПЕЧАТЬ) ===
function generatePDFReceipt(app, user) {
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Чек OZON Space #${app.id.toString().padStart(4, '0')}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: black; max-width: 800px; margin: 0 auto; }
                h1 { color: #005BFF; font-size: 32px; margin-bottom: 10px; }
                h2 { color: #333; margin-bottom: 30px; }
                h3 { color: #005BFF; border-bottom: 2px solid #005BFF; padding-bottom: 10px; margin-top: 30px; }
                p { margin: 10px 0; font-size: 16px; line-height: 1.6; }
                .sum-box { background: #F0F5FF; padding: 25px; margin: 30px 0; text-align: center; border-radius: 8px; }
                .sum-box p { margin: 0; color: #005BFF; font-size: 28px; font-weight: bold; }
                .status-box { background: #00A651; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .status-box p { margin: 0; font-size: 20px; font-weight: bold; }
                hr { margin: 40px 0; border: none; border-top: 1px solid #ddd; }
                .footer { text-align: center; color: gray; font-size: 12px; margin-top: 40px; }
                @media print { 
                    body { padding: 20px; }
                    .no-print { display: none; }
                    @page { margin: 1cm; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 12px 24px; background: #005BFF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                    <i class="fas fa-print"></i> Печать / Сохранить как PDF
                </button>
                <button onclick="window.close()" style="padding: 12px 24px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    Закрыть
                </button>
            </div>
            
            <h1>OZON Space</h1>
            <h2>Чек об оплате</h2>
            
            <h3>ИНФОРМАЦИЯ О КЛИЕНТЕ</h3>
            <p><strong>ФИО:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Телефон:</strong> ${user.phone || app.clientPhone || '—'}</p>
            
            <h3>ДЕТАЛИ ЗАЯВКИ</h3>
            <p><strong>Номер заявки:</strong> #${app.id.toString().padStart(4, '0')}</p>
            <p><strong>Услуга:</strong> ${app.service}</p>
            ${app.area ? `<p><strong>Площадь:</strong> ${app.area} м²</p>` : ''}
            <p><strong>Дата оплаты:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            
            <div class="sum-box">
                <p>СУММА К ОПЛАТЕ: ${app.price.toLocaleString('ru-RU')} ₽</p>
            </div>
            
            <div class="status-box">
                <p>СТАТУС: ОПЛАЧЕНО</p>
            </div>
            
            ${app.message ? `
                <h3>ПОЖЕЛАНИЯ КЛИЕНТА</h3>
                <p>${app.message}</p>
            ` : ''}
            
            <hr>
            <div class="footer">
                <p>Спасибо за обращение в OZON Space!</p>
                <p>admin@ozon.space</p>
                <p>Данный чек является подтверждением оплаты</p>
            </div>
            
            <script>
                // Автоматически открываем диалог печати при загрузке
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `;

    // Открываем новое окно
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    showToast('Откройте диалог печати и выберите "Сохранить как PDF"', 'success');
}

// === ЭКСПОРТ ДАННЫХ (ЧЕРЕЗ ПЕЧАТЬ) ===
function exportData() {
    const apps = getStorage(APPS_KEY);
    const bannedUsers = getStorage(BANNED_KEY);
    const users = getStorage(USERS_KEY);

    if (apps.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }

    const total = apps.length;
    const newApps = apps.filter(a => a.status === 'new').length;
    const pricedApps = apps.filter(a => a.status === 'priced').length;
    const paidApps = apps.filter(a => a.status === 'paid').length;
    const revenue = apps.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.price, 0);

    let appsTableRows = apps.map(app => `
        <tr>
            <td>#${app.id.toString().padStart(4, '0')}</td>
            <td>${app.date}</td>
            <td>${app.clientName}</td>
            <td>${app.service}${app.area ? ' (' + app.area + ' м²)' : ''}</td>
            <td>${app.status === 'new' ? 'Новая' : app.status === 'priced' ? 'Ожидает' : 'Оплачено'}</td>
            <td>${app.price > 0 ? app.price.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
        </tr>
    `).join('');

    let bannedSection = '';
    if (bannedUsers.length > 0) {
        const bannedRows = bannedUsers.map(bu => `
            <tr>
                <td>${bu.name}</td>
                <td>${bu.email}</td>
                <td>${bu.phone || '—'}</td>
                <td>${bu.reason || '—'}</td>
            </tr>
        `).join('');
        
        bannedSection = `
            <h2 style="color: #FF4757;">ЗАБАНЕННЫЕ ПОЛЬЗОВАТЕЛИ</h2>
            <table>
                <thead>
                    <tr><th>Имя</th><th>Email</th><th>Телефон</th><th>Причина</th></tr>
                </thead>
                <tbody>${bannedRows}</tbody>
            </table>
        `;
    }

    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Отчёт OZON Space ${new Date().toISOString().slice(0, 10)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: black; max-width: 1000px; margin: 0 auto; }
                h1 { color: #005BFF; font-size: 32px; margin-bottom: 10px; }
                h2 { color: #005BFF; border-bottom: 2px solid #005BFF; padding-bottom: 10px; margin-top: 30px; }
                p { margin: 10px 0; font-size: 14px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #005BFF; color: white; }
                tr:nth-child(even) { background: #f8f9fb; }
                .stats-table td { padding: 12px; }
                .stats-table tr:nth-child(odd) { background: #F0F5FF; }
                hr { margin: 40px 0; border: none; border-top: 1px solid #ddd; }
                .footer { text-align: center; color: gray; font-size: 10px; margin-top: 40px; }
                .no-print { margin-bottom: 20px; text-align: center; }
                .btn { padding: 12px 24px; background: #005BFF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 0 5px; }
                .btn-gray { background: #666; }
                @media print { 
                    body { padding: 20px; }
                    .no-print { display: none; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; }
                    @page { margin: 1cm; }
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn">
                    <i class="fas fa-print"></i> Печать / Сохранить как PDF
                </button>
                <button onclick="window.close()" class="btn btn-gray">
                    Закрыть
                </button>
            </div>
            
            <h1>OZON Space</h1>
            <h2 style="border: none; color: #333;">Отчёт по заявкам и пользователям</h2>
            <p style="color: gray;">Дата формирования: ${new Date().toLocaleString('ru-RU')}</p>
            
            <h2>СТАТИСТИКА</h2>
            <table class="stats-table">
                <tr><td><strong>Всего заявок:</strong></td><td><strong>${total}</strong></td></tr>
                <tr><td>Новые:</td><td>${newApps}</td></tr>
                <tr><td>Ожидают оплаты:</td><td>${pricedApps}</td></tr>
                <tr><td>Оплачено:</td><td>${paidApps}</td></tr>
                <tr><td><strong>Общая выручка:</strong></td><td><strong>${revenue.toLocaleString('ru-RU')} ₽</strong></td></tr>
                <tr><td>Всего пользователей:</td><td>${users.length}</td></tr>
                <tr><td>Забанено:</td><td>${bannedUsers.length}</td></tr>
            </table>
            
            <h2>ЗАЯВКИ</h2>
            <table>
                <thead>
                    <tr><th>ID</th><th>Дата</th><th>Клиент</th><th>Услуга</th><th>Статус</th><th>Цена</th></tr>
                </thead>
                <tbody>${appsTableRows}</tbody>
            </table>
            
            ${bannedSection}
            
            <hr>
            <div class="footer">
                <p>OZON Space © 2026 | Конфиденциальный отчёт</p>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    showToast('Откройте диалог печати и выберите "Сохранить как PDF"', 'success');
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.openQuickOrder = openQuickOrder;
window.generatePDFReceipt = generatePDFReceipt;
window.exportData = exportData;
window.login = login;
window.register = register;
window.logout = logout;
window.requireAuth = requireAuth;
window.getCurrentUser = getCurrentUser;
window.getStorage = getStorage;
window.setStorage = setStorage;
window.getServicePrice = getServicePrice;
window.isUserBanned = isUserBanned;
window.showToast = showToast;

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    // === LOGIN PAGE ===
    if (currentPage.includes('login.html') || currentPage === '/') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');
        const loginWrapper = document.getElementById('loginWrapper');
        const registerWrapper = document.getElementById('registerWrapper');

        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                loginWrapper.classList.remove('active');
                setTimeout(() => registerWrapper.classList.add('active'), 100);
            });
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                registerWrapper.classList.remove('active');
                setTimeout(() => loginWrapper.classList.add('active'), 100);
            });
        }

        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) input.type = input.type === 'password' ? 'text' : 'password';
            });
        });

        const regPassword = document.getElementById('registerPassword');
        const strengthEl = document.getElementById('passwordStrength');
        if (regPassword && strengthEl) {
            regPassword.addEventListener('input', function() {
                const password = this.value;
                let strength = 0;
                if (password.length >= 6) strength++;
                if (password.length >= 10) strength++;
                if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
                if (/\d/.test(password)) strength++;
                if (/[^a-zA-Z0-9]/.test(password)) strength++;
                const colors = ['#ff4757', '#ffa502', '#2ed573'];
                const texts = ['Слабый', 'Средний', 'Надёжный'];
                if (password.length > 0) {
                    strengthEl.style.display = 'block';
                    strengthEl.style.color = colors[Math.min(strength, 2)];
                    strengthEl.textContent = texts[Math.min(strength, 2)];
                } else {
                    strengthEl.style.display = 'none';
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('registerName').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const phone = document.getElementById('registerPhone').value.trim();
                const password = document.getElementById('registerPassword').value;
                const confirm = document.getElementById('registerConfirm').value;
                const agreeTerms = document.getElementById('agreeTerms').checked;
                
                if (!name || !email || !phone || !password || !confirm) {
                    showToast('Заполните все обязательные поля', 'error');
                    return;
                }
                
                if (!agreeTerms) {
                    showToast('Вы должны согласиться с условиями использования', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    showToast('Пароль должен содержать минимум 6 символов', 'error');
                    return;
                }
                
                if (password !== confirm) {
                    showToast('Пароли не совпадают', 'error');
                    document.getElementById('registerPassword').style.borderColor = '#FF4757';
                    document.getElementById('registerConfirm').style.borderColor = '#FF4757';
                    setTimeout(() => {
                        document.getElementById('registerPassword').style.borderColor = '';
                        document.getElementById('registerConfirm').style.borderColor = '';
                    }, 3000);
                    return;
                }
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showToast('Введите корректный email', 'error');
                    return;
                }
                
                register(name, email, phone, password);
            });
        }

        const termsModal = document.getElementById('termsModal');
        const termsLink = document.querySelector('.terms-link');
        const closeTermsModal = document.getElementById('closeTermsModal');
        const acceptTermsBtn = document.getElementById('acceptTermsBtn');
        const agreeTermsCheckbox = document.getElementById('agreeTerms');

        if (termsLink && termsModal) {
            termsLink.addEventListener('click', function(e) {
                e.preventDefault();
                termsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeTermsModal && termsModal) {
            closeTermsModal.addEventListener('click', function() {
                termsModal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        if (acceptTermsBtn && termsModal) {
            acceptTermsBtn.addEventListener('click', function() {
                if (agreeTermsCheckbox) agreeTermsCheckbox.checked = true;
                termsModal.classList.remove('active');
                document.body.style.overflow = '';
                showToast('Вы приняли условия использования', 'success');
            });
        }

        if (termsModal) {
            termsModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }

        const currentUser = getCurrentUser();
        if (currentUser) {
            window.location.href = currentUser.role === 'admin' ? 'admin.html' : 'client.html';
        }
    }

    // === CLIENT PAGE ===
    if (currentPage.includes('client.html')) {
        const user = requireAuth();
        if (!user) return;

        document.getElementById('welcomeName').textContent = user.name.split(' ')[0];
        document.getElementById('headerUserName').textContent = user.name;
        document.getElementById('userAvatar').innerHTML = `<span>${user.name.charAt(0).toUpperCase()}</span>`;

        let currentFilter = 'all';
        let currentPaymentApp = null;

        function loadClientOrders() {
            const apps = getStorage(APPS_KEY).filter(a => a.clientId === user.id || a.clientEmail === user.email);
            const total = apps.length;
            const pending = apps.filter(a => a.status === 'priced').length;
            const paid = apps.filter(a => a.status === 'paid').length;
            const spent = apps.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.price, 0);

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statPending').textContent = pending;
            document.getElementById('statPaid').textContent = paid;
            document.getElementById('statSpent').textContent = spent.toLocaleString('ru-RU') + ' ₽';

            let filteredApps = apps;
            if (currentFilter !== 'all') filteredApps = apps.filter(a => a.status === currentFilter);

            const ordersList = document.getElementById('ordersList');
            const emptyState = document.getElementById('emptyState');

            if (filteredApps.length === 0) {
                ordersList.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            ordersList.innerHTML = filteredApps.slice().reverse().map(app => {
                const areaInfo = app.area ? ` (${app.area} м²)` : '';
                const priceInfo = app.price > 0 ? `${app.price.toLocaleString('ru-RU')} ₽` : 'Рассчитывается...';
                let statusClass = '', statusText = '', statusIcon = '', actions = '';

                if (app.status === 'new') {
                    statusClass = 'status-new'; statusText = 'На рассмотрении'; statusIcon = 'fa-clock';
                    actions = `<button class="btn btn-sm btn-outline" disabled><i class="fas fa-hourglass-half"></i> Ожидание</button>`;
                } else if (app.status === 'priced') {
                    statusClass = 'status-priced'; statusText = 'Ожидает оплаты'; statusIcon = 'fa-credit-card';
                    actions = `<button class="btn btn-sm btn-primary pay-btn" data-id="${app.id}"><i class="fas fa-credit-card"></i> Оплатить ${priceInfo}</button>`;
                } else if (app.status === 'paid') {
                    statusClass = 'status-paid'; statusText = 'Оплачено'; statusIcon = 'fa-check-circle';
                    actions = `<button class="btn btn-sm btn-success receipt-btn" data-id="${app.id}"><i class="fas fa-file-pdf"></i> Скачать чек</button>`;
                }

                return `
                    <div class="order-card fade-in">
                        <div class="order-header">
                            <div class="order-id">#${app.id.toString().padStart(4, '0')}</div>
                            <div class="order-status ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</div>
                            <div class="order-date">${app.date}</div>
                        </div>
                        <div class="order-body">
                            <div class="order-service">
                                <i class="fas fa-box"></i>
                                <div>
                                    <div class="order-service-name">${app.service}${areaInfo}</div>
                                    <div class="order-service-desc">Услуга</div>
                                </div>
                            </div>
                            <div class="order-price">
                                <div class="order-price-value">${priceInfo}</div>
                                <div class="order-price-label">Стоимость</div>
                            </div>
                        </div>
                        ${app.message ? `<div class="order-message"><i class="fas fa-comment"></i><span>${app.message}</span></div>` : ''}
                        <div class="order-actions">${actions}</div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.pay-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const appId = parseInt(this.getAttribute('data-id'));
                    openPaymentModal(appId);
                });
            });

            document.querySelectorAll('.receipt-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const appId = parseInt(this.getAttribute('data-id'));
                    const app = getStorage(APPS_KEY).find(a => a.id === appId);
                    if (app && user) {
                        generatePDFReceipt(app, user);
                    }
                });
            });
        }

        function openQuickOrderModal(service = '') {
            const modal = document.getElementById('quickOrderModal');
            if (user) {
                document.getElementById('qoName').value = user.name;
                document.getElementById('qoPhone').value = user.phone || '';
                document.getElementById('qoEmail').value = user.email;
            }
            if (service) {
                document.getElementById('qoService').value = service;
                toggleAreaField(service);
            }
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeQuickOrderModal() {
            document.getElementById('quickOrderModal').classList.remove('active');
            document.body.style.overflow = '';
            document.getElementById('quickOrderFormModal').reset();
        }

        function toggleAreaField(service) {
            const areaGroup = document.getElementById('qoAreaGroup');
            if (service === 'Склад') areaGroup.style.display = 'block';
            else areaGroup.style.display = 'none';
        }

        function openPaymentModal(appId) {
            const apps = getStorage(APPS_KEY);
            const app = apps.find(a => a.id === appId);
            if (!app) return;
            currentPaymentApp = app;
            document.getElementById('paymentDetails').innerHTML = `
                <div class="payment-row"><span>Заявка:</span><strong>#${app.id.toString().padStart(4, '0')}</strong></div>
                <div class="payment-row"><span>Услуга:</span><strong>${app.service}${app.area ? ' (' + app.area + ' м²)' : ''}</strong></div>
                <div class="payment-row total"><span>К оплате:</span><strong>${app.price.toLocaleString('ru-RU')} ₽</strong></div>
            `;
            document.getElementById('paymentModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closePaymentModal() {
            document.getElementById('paymentModal').classList.remove('active');
            document.body.style.overflow = '';
            currentPaymentApp = null;
        }

        function confirmPayment() {
            if (!currentPaymentApp) return;
            const btn = document.getElementById('confirmPaymentBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
            setTimeout(() => {
                let apps = getStorage(APPS_KEY);
                const idx = apps.findIndex(a => a.id === currentPaymentApp.id);
                if (idx !== -1) {
                    apps[idx].status = 'paid';
                    apps[idx].paidAt = new Date().toISOString();
                    setStorage(APPS_KEY, apps);
                    generatePDFReceipt(apps[idx], user);
                    closePaymentModal();
                    showToast('Оплата прошла успешно! Откроется окно для печати/сохранения чека.', 'success');
                    loadClientOrders();
                }
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-lock"></i> Оплатить';
            }, 2000);
        }

        document.getElementById('createOrderBtn').addEventListener('click', () => openQuickOrderModal());
        document.getElementById('emptyCreateBtn').addEventListener('click', () => openQuickOrderModal());
        document.getElementById('newOrderLink').addEventListener('click', (e) => { e.preventDefault(); openQuickOrderModal(); });
        document.getElementById('closeQuickOrderModal').addEventListener('click', closeQuickOrderModal);
        document.getElementById('cancelQuickOrder').addEventListener('click', closeQuickOrderModal);
        document.getElementById('closePaymentModal').addEventListener('click', closePaymentModal);
        document.getElementById('confirmPaymentBtn').addEventListener('click', confirmPayment);
        document.getElementById('logoutBtn').addEventListener('click', logout);

        document.getElementById('qoService').addEventListener('change', function() {
            toggleAreaField(this.value);
        });

        document.getElementById('quickOrderFormModal').addEventListener('submit', function(e) {
            e.preventDefault();
            const newApp = {
                id: Date.now(),
                clientId: user.id,
                clientName: document.getElementById('qoName').value,
                clientEmail: document.getElementById('qoEmail').value || user.email,
                clientPhone: document.getElementById('qoPhone').value,
                service: document.getElementById('qoService').value,
                area: document.getElementById('qoArea').value ? parseInt(document.getElementById('qoArea').value) : null,
                message: document.getElementById('qoMessage').value,
                date: new Date().toLocaleDateString('ru-RU'),
                status: 'new',
                price: 0
            };
            if (!newApp.clientName || !newApp.clientPhone || !newApp.service) {
                showToast('Заполните обязательные поля', 'error');
                return;
            }
            const apps = getStorage(APPS_KEY);
            apps.push(newApp);
            setStorage(APPS_KEY, apps);
            closeQuickOrderModal();
            showToast('Заявка успешно отправлена!', 'success');
            loadClientOrders();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.getAttribute('data-filter');
                loadClientOrders();
            });
        });

        document.querySelectorAll('.quick-service-card').forEach(card => {
            card.addEventListener('click', function() {
                const service = this.getAttribute('data-service');
                openQuickOrderModal(service);
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // === ЧАТ-БОТ ПОДДЕРЖКИ ===
        const chatToggleBtn = document.getElementById('chatToggleBtn');
        const chatWidget = document.getElementById('chatWidget');
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        const chatMessages = document.getElementById('chatMessages');

        const botKnowledge = {
            'заявк': {
                answer: 'Чтобы подать заявку, нажмите кнопку "Создать заявку" вверху страницы или выберите одну из услуг в разделе "Быстрые заявки". Заполните форму, и мы свяжемся с вами в течение 24 часов! 📝',
                keywords: ['заявк', 'подать', 'оставить', 'создать']
            },
            'цен': {
                answer: 'Наши цены:\n• ПВЗ: от 55 000 ₽/мес\n• Склад: 700 ₽/м²/мес\n• Логистика: от 78 000 ₽/мес\n\nТочная стоимость зависит от площади и расположения. Оставьте заявку для расчёта! 💰',
                keywords: ['цен', 'стоимост', 'сколько', 'прайс', 'тариф']
            },
            'оплат': {
                answer: 'Оплата происходит после подтверждения заявки администратором. В личном кабинете нажмите "Оплатить" рядом с заявкой. Мы принимаем банковские карты, СБП и электронные кошельки. После оплаты автоматически формируется PDF-чек! 💳',
                keywords: ['оплат', 'платить', 'карт', 'сбп', 'чек', 'квитанц']
            },
            'срок': {
                answer: 'Сроки рассмотрения заявки — до 24 часов. После подтверждения счёта у вас есть время на оплату. После оплаты помещение предоставляется в течение 1-3 рабочих дней. ⏰',
                keywords: ['срок', 'долго', 'когда', 'быстро', 'время', 'рассмотрен']
            },
            'документ': {
                answer: 'Для оформления заявки нужны только паспортные данные и контактная информация. Договор аренды подписывается после подтверждения заявки. Все документы можно получить в электронном виде! 📄',
                keywords: ['документ', 'паспорт', 'договор', 'бумаг']
            },
            'контакт': {
                answer: 'Связаться с нами можно:\n• Email: admin@ozon.space\n• Телефон: +7 (999) 123-45-67\n• Через форму заявки на сайте\n\nМы работаем 24/7! 📞',
                keywords: ['контакт', 'связать', 'телефон', 'email', 'почт', 'позвонить']
            },
            'бан': {
                answer: 'Если ваш аккаунт заблокирован, обратитесь к администратору по email: admin@ozon.space с указанием причины. Мы рассмотрим ваш запрос в течение 24 часов. 🔒',
                keywords: ['бан', 'блокировк', 'заблокиров', 'нельзя войти']
            },
            'чек': {
                answer: 'После оплаты откроется окно для печати чека. В диалоге печати выберите "Сохранить как PDF" вместо принтера. Вы также можете скачать чек в любой момент в разделе "История заявок" — нажмите кнопку "Скачать чек" рядом с оплаченной заявкой. 📥',
                keywords: ['чек', 'квитанц', 'pdf', 'скачать', 'получить', 'печать']
            },
            'площад': {
                answer: 'Мы предлагаем помещения от 50 до 1000 м²:\n• ПВЗ: 30-80 м²\n• Склады: 50-1000 м² (700 ₽/м²)\n• Логистика: от 100 м²\n\nУкажите желаемую площадь в заявке! 📐',
                keywords: ['площад', 'размер', 'метр', 'м2', 'квадрат']
            },
            'привет': {
                answer: 'Здравствуйте! Рад вас видеть! Чем могу помочь? 😊',
                keywords: ['привет', 'здравствуй', 'хай', 'добрый']
            },
            'спасиб': {
                answer: 'Пожалуйста! Рад был помочь! Если есть ещё вопросы — обращайтесь! 😊',
                keywords: ['спасиб', 'благодар', 'thanks']
            }
        };

        function getBotResponse(message) {
            const lowerMessage = message.toLowerCase();
            
            for (const key in botKnowledge) {
                const topic = botKnowledge[key];
                if (topic.keywords.some(keyword => lowerMessage.includes(keyword))) {
                    return topic.answer;
                }
            }
            
            return 'Извините, я не совсем понял ваш вопрос. Попробуйте переформулировать или выберите один из предложенных вариантов выше. Также вы можете связаться с нами по email: admin@ozon.space ';
        }

        function addMessage(text, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
            
            const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p>${text.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="message-time">${time}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = '<span></span><span></span><span></span>';
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function removeTypingIndicator() {
            const typing = document.getElementById('typingIndicator');
            if (typing) typing.remove();
        }

        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            addMessage(message, true);
            chatInput.value = '';
            
            showTypingIndicator();
            
            setTimeout(() => {
                removeTypingIndicator();
                const response = getBotResponse(message);
                addMessage(response, false);
            }, 1000 + Math.random() * 1000);
        }

        if (chatToggleBtn) {
            chatToggleBtn.addEventListener('click', () => {
                chatWidget.classList.add('active');
                chatToggleBtn.style.display = 'none';
                const badge = chatToggleBtn.querySelector('.chat-badge');
                if (badge) badge.remove();
            });
        }

        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', () => {
                chatWidget.classList.remove('active');
                setTimeout(() => {
                    chatToggleBtn.style.display = 'flex';
                }, 300);
            });
        }

        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', sendMessage);
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const question = this.getAttribute('data-question');
                chatInput.value = question;
                sendMessage();
            });
        });

        loadClientOrders();
    }

    // === ADMIN PAGE ===
    if (currentPage.includes('admin.html')) {
        const user = requireAuth();
        if (!user || user.role !== 'admin') {
            window.location.href = 'login.html';
            return;
        }

        document.getElementById('headerAdminName').textContent = user.name;

        let currentSort = { column: 'id', direction: 'desc' };
        let currentFilter = 'all';
        let searchQuery = '';
        let currentConfirmApp = null;
        let currentBanUser = null;

        function loadAdminDashboard() {
            const apps = getStorage(APPS_KEY);
            const bannedUsers = getStorage(BANNED_KEY);

            const total = apps.length;
            const newApps = apps.filter(a => a.status === 'new').length;
            const paid = apps.filter(a => a.status === 'paid').length;
            const revenue = apps.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.price, 0);

            document.getElementById('adminStatTotal').textContent = total;
            document.getElementById('adminStatNew').textContent = newApps;
            document.getElementById('adminStatPaid').textContent = paid;
            document.getElementById('adminStatRevenue').textContent = revenue.toLocaleString('ru-RU') + ' ₽';

            let filteredApps = [...apps];
            if (currentFilter !== 'all') filteredApps = filteredApps.filter(a => a.status === currentFilter);
            if (searchQuery) {
                filteredApps = filteredApps.filter(a => 
                    a.clientName.toLowerCase().includes(searchQuery) ||
                    a.clientEmail.toLowerCase().includes(searchQuery) ||
                    a.clientPhone.includes(searchQuery) ||
                    a.id.toString().includes(searchQuery)
                );
            }

            filteredApps.sort((a, b) => {
                let valA, valB;
                if (currentSort.column === 'id' || currentSort.column === 'date') { valA = a.id; valB = b.id; }
                else if (currentSort.column === 'price') { valA = a.price || 0; valB = b.price || 0; }
                else if (currentSort.column === 'status') {
                    const statusOrder = { 'new': 1, 'priced': 2, 'paid': 3 };
                    valA = statusOrder[a.status] || 0; valB = statusOrder[b.status] || 0;
                }
                return currentSort.direction === 'asc' ? valA - valB : valB - valA;
            });

            const tableBody = document.getElementById('adminTableBody');
            const emptyState = document.getElementById('adminEmptyState');

            if (filteredApps.length === 0) {
                tableBody.innerHTML = '';
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
                tableBody.innerHTML = filteredApps.map(app => {
                    const areaInfo = app.area ? `<div class="text-small text-blue">${app.area} м²</div>` : '';
                    const messagePreview = app.message ? `<div class="message-preview" title="${app.message}">💬 ${app.message}</div>` : '<span class="text-muted">—</span>';
                    let statusBadge = '', actions = '';

                    if (app.status === 'new') {
                        statusBadge = '<span class="badge badge-new"><i class="fas fa-clock"></i> Новая</span>';
                        actions = `
                            <button class="btn-action btn-confirm confirm-app-btn" data-id="${app.id}" title="Подтвердить"><i class="fas fa-check"></i></button>
                            <button class="btn-action btn-ban ban-user-btn" data-email="${app.clientEmail}" title="Забанить"><i class="fas fa-ban"></i></button>
                            <button class="btn-action btn-delete delete-app-btn" data-id="${app.id}" title="Удалить"><i class="fas fa-trash"></i></button>
                        `;
                    } else if (app.status === 'priced') {
                        statusBadge = '<span class="badge badge-priced"><i class="fas fa-credit-card"></i> Ожидает оплаты</span>';
                        actions = `
                            <button class="btn-action btn-pdf pdf-receipt-btn" data-id="${app.id}" title="Отправить чек"><i class="fas fa-file-pdf"></i></button>
                            <button class="btn-action btn-ban ban-user-btn" data-email="${app.clientEmail}" title="Забанить"><i class="fas fa-ban"></i></button>
                            <button class="btn-action btn-delete delete-app-btn" data-id="${app.id}" title="Удалить"><i class="fas fa-trash"></i></button>
                        `;
                    } else if (app.status === 'paid') {
                        statusBadge = '<span class="badge badge-paid"><i class="fas fa-check-circle"></i> Оплачено</span>';
                        actions = `
                            <button class="btn-action btn-pdf pdf-receipt-btn" data-id="${app.id}" title="Отправить чек"><i class="fas fa-file-pdf"></i></button>
                            <button class="btn-action btn-delete delete-app-btn" data-id="${app.id}" title="Удалить"><i class="fas fa-trash"></i></button>
                        `;
                    }

                    return `
                        <tr>
                            <td><strong>#${app.id.toString().padStart(4, '0')}</strong></td>
                            <td>${app.date}</td>
                            <td><div class="client-info"><div class="client-name">${app.clientName}</div><div class="client-email">${app.clientEmail}</div><div class="client-phone">${app.clientPhone}</div></div></td>
                            <td><div class="service-info"><div class="service-name">${app.service}</div>${areaInfo}</div></td>
                            <td>${statusBadge}</td>
                            <td><div class="price-info">${app.price > 0 ? `<strong>${app.price.toLocaleString('ru-RU')} ₽</strong>` : '<span class="text-muted">—</span>'}</div></td>
                            <td>${messagePreview}</td>
                            <td><div class="actions-group">${actions}</div></td>
                        </tr>
                    `;
                }).join('');
            }

            loadBannedUsers(bannedUsers);

            document.querySelectorAll('.confirm-app-btn').forEach(btn => {
                btn.addEventListener('click', function() { openConfirmModal(parseInt(this.getAttribute('data-id'))); });
            });
            document.querySelectorAll('.ban-user-btn').forEach(btn => {
                btn.addEventListener('click', function() { openBanModal(this.getAttribute('data-email')); });
            });
            document.querySelectorAll('.delete-app-btn').forEach(btn => {
                btn.addEventListener('click', function() { deleteApplication(parseInt(this.getAttribute('data-id'))); });
            });
            document.querySelectorAll('.pdf-receipt-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const appId = parseInt(this.getAttribute('data-id'));
                    const app = getStorage(APPS_KEY).find(a => a.id === appId);
                    const users = getStorage(USERS_KEY);
                    const u = users.find(x => x.email === app.clientEmail);
                    if (app && u) generatePDFReceipt(app, u);
                    else showToast('Пользователь не найден', 'error');
                });
            });
        }

        function loadBannedUsers(bannedUsers) {
            const tableBody = document.getElementById('bannedTableBody');
            const emptyState = document.getElementById('bannedEmptyState');
            if (!bannedUsers || bannedUsers.length === 0) {
                tableBody.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }
            emptyState.style.display = 'none';
            tableBody.innerHTML = bannedUsers.map(bu => `
                <tr>
                    <td>#${bu.id.toString().padStart(4, '0')}</td>
                    <td><strong>${bu.name}</strong></td>
                    <td>${bu.email}</td>
                    <td>${bu.phone || '—'}</td>
                    <td>${bu.bannedAt}</td>
                    <td>${bu.reason || 'Не указана'}</td>
                    <td><button class="btn-action btn-unban unban-user-btn" data-email="${bu.email}"><i class="fas fa-check"></i> Разбанить</button></td>
                </tr>
            `).join('');

            document.querySelectorAll('.unban-user-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (!confirm('Разбанить пользователя?')) return;
                    let bannedUsers = getStorage(BANNED_KEY);
                    bannedUsers = bannedUsers.filter(b => b.email !== this.getAttribute('data-email'));
                    setStorage(BANNED_KEY, bannedUsers);
                    showToast('Пользователь разбанен', 'success');
                    loadAdminDashboard();
                });
            });
        }

        function openConfirmModal(appId) {
            const apps = getStorage(APPS_KEY);
            const app = apps.find(a => a.id === appId);
            if (!app) return;
            currentConfirmApp = app;
            document.getElementById('confirmDetails').innerHTML = `
                <div class="detail-row"><span>Заявка:</span><strong>#${app.id.toString().padStart(4, '0')}</strong></div>
                <div class="detail-row"><span>Клиент:</span><strong>${app.clientName}</strong></div>
                <div class="detail-row"><span>Услуга:</span><strong>${app.service}${app.area ? ' (' + app.area + ' м²)' : ''}</strong></div>
                <div class="detail-row"><span>Цена:</span><strong>${getServicePrice(app.service, app.area).toLocaleString('ru-RU')} ₽</strong></div>
            `;
            document.getElementById('confirmModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeConfirmModal() {
            document.getElementById('confirmModal').classList.remove('active');
            document.body.style.overflow = '';
            currentConfirmApp = null;
        }

        function confirmApplication() {
            if (!currentConfirmApp) return;
            const btn = document.getElementById('confirmBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
            setTimeout(() => {
                let apps = getStorage(APPS_KEY);
                const idx = apps.findIndex(a => a.id === currentConfirmApp.id);
                if (idx !== -1) {
                    apps[idx].price = getServicePrice(apps[idx].service, apps[idx].area);
                    apps[idx].status = 'priced';
                    apps[idx].confirmedAt = new Date().toISOString();
                    setStorage(APPS_KEY, apps);
                    closeConfirmModal();
                    showToast('Заявка подтверждена! Клиент может оплатить.', 'success');
                    loadAdminDashboard();
                }
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Подтвердить';
            }, 1000);
        }

        function openBanModal(email) {
            currentBanUser = email;
            document.getElementById('banModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeBanModal() {
            document.getElementById('banModal').classList.remove('active');
            document.body.style.overflow = '';
            currentBanUser = null;
            document.getElementById('banReason').value = '';
        }

        function executeBan() {
            if (!currentBanUser) return;
            const reason = document.getElementById('banReason').value;
            if (!reason) { showToast('Укажите причину бана', 'error'); return; }
            const bannedUsers = getStorage(BANNED_KEY);
            const users = getStorage(USERS_KEY);
            const user = users.find(u => u.email === currentBanUser);
            if (user && !bannedUsers.find(b => b.email === currentBanUser)) {
                bannedUsers.push({
                    id: user.id, name: user.name, email: user.email,
                    phone: user.phone, bannedAt: new Date().toLocaleString('ru-RU'), reason: reason
                });
                setStorage(BANNED_KEY, bannedUsers);
                closeBanModal();
                showToast('Пользователь забанен', 'success');
                loadAdminDashboard();
            }
        }

        function deleteApplication(id) {
            if (!confirm('Удалить заявку?')) return;
            let apps = getStorage(APPS_KEY);
            apps = apps.filter(a => a.id !== id);
            setStorage(APPS_KEY, apps);
            showToast('Заявка удалена', 'success');
            loadAdminDashboard();
        }

        document.getElementById('adminLogoutBtn').addEventListener('click', logout);
        document.getElementById('exportDataBtn').addEventListener('click', exportData);
        document.getElementById('refreshDataBtn').addEventListener('click', () => { loadAdminDashboard(); showToast('Данные обновлены', 'success'); });
        document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
        document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
        document.getElementById('confirmBtn').addEventListener('click', confirmApplication);
        document.getElementById('closeBanModal').addEventListener('click', closeBanModal);
        document.getElementById('cancelBanBtn').addEventListener('click', closeBanModal);
        document.getElementById('executeBanBtn').addEventListener('click', executeBan);

        document.getElementById('searchInput').addEventListener('input', function() {
            searchQuery = this.value.toLowerCase();
            loadAdminDashboard();
        });

        document.getElementById('filterStatus').addEventListener('change', function() {
            currentFilter = this.value;
            loadAdminDashboard();
        });

        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', function() {
                const col = this.getAttribute('data-sort');
                if (currentSort.column === col) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                else { currentSort.column = col; currentSort.direction = 'desc'; }
                loadAdminDashboard();
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        loadAdminDashboard();
    }

    // === INDEX PAGE ===
    if (currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/')) {
        const quickOrderForm = document.getElementById('quickOrderForm');
        if (quickOrderForm) {
            quickOrderForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const user = getCurrentUser();
                const email = document.getElementById('quickEmail').value;
                if (email && isUserBanned(email)) { showToast('Этот email заблокирован', 'error'); return; }
                const newApp = {
                    id: Date.now(),
                    clientId: user ? user.id : 'guest',
                    clientName: document.getElementById('quickName').value,
                    clientEmail: document.getElementById('quickEmail').value || (user ? user.email : ''),
                    clientPhone: document.getElementById('quickPhone').value,
                    service: document.getElementById('quickService').value,
                    area: null,
                    message: document.getElementById('quickMessage').value,
                    date: new Date().toLocaleDateString('ru-RU'),
                    status: 'new',
                    price: 0
                };
                if (!newApp.clientName || !newApp.clientPhone || !newApp.service) {
                    showToast('Заполните обязательные поля', 'error');
                    return;
                }
                const apps = getStorage(APPS_KEY);
                apps.push(newApp);
                setStorage(APPS_KEY, apps);
                quickOrderForm.reset();
                showToast('Заявка успешно отправлена!', 'success');
            });
        }

        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href.length > 1) {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        const sections = document.querySelectorAll('section[id]');
        if (sections.length > 0) {
            window.addEventListener('scroll', () => {
                let current = '';
                sections.forEach(section => {
                    const sectionTop = section.offsetTop - 100;
                    if (window.scrollY >= sectionTop) current = section.getAttribute('id');
                });
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
                });
            });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.fade-in').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }
});

console.log('✅ OZON Space Script загружен');