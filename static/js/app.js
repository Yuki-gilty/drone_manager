/**
 * Main application module
 */

import { initDroneManagement, showDroneDetail, getCurrentDroneId } from './drone.js';
import { initCalendar } from './calendar.js';
import { partStorage, repairStorage, droneStorage, droneTypeStorage, manufacturerStorage } from './storage.js';
import { addReplacement } from './parts.js';
import { initAuth } from './auth.js';

/**
 * Initialize application
 */
export async function initApp() {
    // ナビゲーション
    setupNavigation();
    
    // 機体管理の初期化
    await initDroneManagement();
    
    // カレンダーの初期化
    await initCalendar();
    
    // モーダルの設定
    setupModals();

    // Lucideアイコンの初期化
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Initialize application (non-async wrapper for backward compatibility)
 */
async function init() {
    await initApp();
}

/**
 * Setup navigation
 */
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // クリックされた要素がボタンでない場合、親要素を探す
            const button = e.target.closest('.nav-link');
            if (!button) return;
            
            const page = button.dataset.page;
            if (page === 'home') {
                showPage('home-page');
            } else if (page === 'calendar') {
                showPage('calendar-page');
                // カレンダーを再レンダリング（showPage内でも呼ばれるが、重複を防ぐためここではイベントリスナーのみ設定）
                import('./calendar.js').then(async module => {
                    // 少し待ってからイベントリスナーを設定（DOMが完全に表示されるまで）
                    setTimeout(() => {
                        // イベントリスナーを再設定
                        if (module.reinitCalendarListeners) {
                            module.reinitCalendarListeners();
                        } else if (window.reinitCalendarListeners) {
                            window.reinitCalendarListeners();
                        }
                        
                        // ボタンが存在することを確認してから直接イベントリスナーを設定（フォールバック）
                        const addPracticeDayBtn = document.getElementById('add-practice-day');
                        if (addPracticeDayBtn && window.openAddPracticeModal) {
                            addPracticeDayBtn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Add practice day button clicked (direct)');
                                window.openAddPracticeModal();
                            };
                        }
                    }, 100);
                }).catch(err => {
                    console.error('Error loading calendar module:', err);
                    // フォールバック: window経由で呼び出す
                    setTimeout(() => {
                        if (window.reinitCalendarListeners) {
                            window.reinitCalendarListeners();
                        }
                        const addPracticeDayBtn = document.getElementById('add-practice-day');
                        if (addPracticeDayBtn && window.openAddPracticeModal) {
                            addPracticeDayBtn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.openAddPracticeModal();
                            };
                        }
                    }, 100);
                });
            }
            
            // アクティブ状態を更新
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

/**
 * Show specific page
 */
async function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // カレンダーページが表示された時にカレンダーを再レンダリング
        if (pageId === 'calendar-page') {
            // 少し待ってからイベントリスナーを設定（DOMが完全に表示されるまで待つ）
            setTimeout(async () => {
                // カレンダーコンテナが既に内容を持っている場合はスキップ（重複防止）
                const container = document.getElementById('calendar-container');
                if (container && container.children.length === 0) {
                    // カレンダーがまだレンダリングされていない場合のみレンダリング
                    if (window.renderCalendar) {
                        await window.renderCalendar();
                    }
                }
                
                // イベントリスナーを再設定（ボタンが確実に存在する状態で）
                if (window.reinitCalendarListeners) {
                    window.reinitCalendarListeners();
                }
            }, 50);
        }
    }
}

/**
 * Setup modals
 */
function setupModals() {
    // パーツ追加モーダル
    const addPartForm = document.getElementById('add-part-form');
    if (addPartForm) {
        addPartForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addPart();
        });
    }
    
    // パーツ追加モーダルのクローズボタン
    setupModalCloseButton('add-part-modal');

    // カスタムパーツ名入力の切り替え
    const useCustomPartNameLink = document.getElementById('use-custom-part-name');
    if (useCustomPartNameLink) {
        useCustomPartNameLink.addEventListener('click', (e) => {
            e.preventDefault();
            const select = document.getElementById('part-name');
            const customInput = document.getElementById('part-name-custom');
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.required = true;
            select.required = false;
            useCustomPartNameLink.style.display = 'none';
        });
    }

    // 交換履歴追加モーダル
    const addReplacementForm = document.getElementById('add-replacement-form');
    if (addReplacementForm) {
        addReplacementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addReplacement();
        });
    }
    setupModalCloseButton('add-replacement-modal');

    // 修理履歴追加モーダル
    const addRepairForm = document.getElementById('add-repair-form');
    if (addRepairForm) {
        addRepairForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addRepair();
        });
    }
    setupModalCloseButton('add-repair-modal');

    // パーツ追加モーダルの開閉
    window.openAddPartModal = async function() {
        document.getElementById('add-part-form').reset();
        await loadPartNameOptions();
        document.getElementById('part-name-custom').style.display = 'none';
        document.getElementById('add-part-modal').style.display = 'flex';
    };

    // 修理履歴追加モーダルの開閉
    window.openAddRepairModal = function() {
        document.getElementById('add-repair-form').reset();
        document.getElementById('add-repair-modal').style.display = 'flex';
    };
}

/**
 * Load part name options from drone type default parts
 */
async function loadPartNameOptions() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const drone = await droneStorage.getById(droneId);
    if (!drone) return;

    const droneType = await droneTypeStorage.getById(drone.type);
    if (!droneType) return;

    // 既に追加されているパーツ名を取得
    const existingParts = await partStorage.getByDroneId(droneId);
    const existingPartNames = existingParts.map(part => part.name);

    // 種類のデフォルトパーツを取得（互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameを使用）
    const defaultParts = droneType.defaultParts || [];
    const defaultPartNames = defaultParts.map(part => typeof part === 'string' ? part : part.name);
    
    // 既に追加されているパーツを除外
    const availableParts = defaultPartNames.filter(partName => !existingPartNames.includes(partName));

    const select = document.getElementById('part-name');
    select.innerHTML = '<option value="">選択してください</option>';
    
    availableParts.forEach(partName => {
        const option = document.createElement('option');
        option.value = partName;
        option.textContent = partName;
        select.appendChild(option);
    });

    // パーツが利用可能な場合、selectを表示、そうでなければカスタム入力を表示
    if (availableParts.length === 0) {
        select.style.display = 'none';
        const customInput = document.getElementById('part-name-custom');
        customInput.style.display = 'block';
        customInput.required = true;
        select.required = false;
        document.getElementById('use-custom-part-name').style.display = 'none';
    } else {
        select.style.display = 'block';
        const customInput = document.getElementById('part-name-custom');
        customInput.style.display = 'none';
        customInput.required = false;
        select.required = true;
        document.getElementById('use-custom-part-name').style.display = 'block';
    }

    // メーカー選択肢を読み込む
    await loadManufacturerOptions();
}

/**
 * Load manufacturer options
 */
async function loadManufacturerOptions() {
    const manufacturers = await manufacturerStorage.getAll();
    const select = document.getElementById('part-manufacturer');
    
    select.innerHTML = '<option value="">選択してください（任意）</option>';
    
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer.id;
        option.textContent = manufacturer.name;
        select.appendChild(option);
    });
}

/**
 * Add part
 */
async function addPart() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const select = document.getElementById('part-name');
    const customInput = document.getElementById('part-name-custom');
    const manufacturerSelect = document.getElementById('part-manufacturer');
    const startDate = document.getElementById('part-start-date').value;

    // パーツ名を取得（selectまたはカスタム入力から）
    let name = '';
    const selectDisplay = window.getComputedStyle(select).display;
    const customInputDisplay = window.getComputedStyle(customInput).display;
    
    if (selectDisplay !== 'none' && select.value) {
        name = select.value.trim();
    } else if (customInputDisplay !== 'none' && customInput.value) {
        name = customInput.value.trim();
    }

    if (!name || !startDate) {
        alert('必須項目を入力してください');
        return;
    }

    // 既に同じ名前のパーツが存在するかチェック
    const existingParts = await partStorage.getByDroneId(droneId);
    if (existingParts.some(part => part.name === name)) {
        alert('このパーツは既に追加されています');
        return;
    }

    const part = {
        droneId,
        name,
        startDate,
        replacementHistory: [],
        manufacturerId: manufacturerSelect.value || null
    };

    const newPart = await partStorage.add(part);
    
    // 機体のparts配列を更新
    const drone = await droneStorage.getById(droneId);
    if (drone) {
        const parts = drone.parts || [];
        parts.push(newPart.id);
        await droneStorage.update(droneId, { parts });
    }

    closeModal('add-part-modal');
    
    // 機体詳細を再表示
    await showDroneDetail(droneId);
}

/**
 * Add repair
 */
async function addRepair() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const date = document.getElementById('repair-date').value;
    const description = document.getElementById('repair-description').value.trim();

    if (!date || !description) {
        alert('必須項目を入力してください');
        return;
    }

    const repair = {
        droneId,
        partId: null, // 機体全体の修理
        date,
        description
    };

    await repairStorage.add(repair);
    closeModal('add-repair-modal');
    
    // 機体詳細を再表示
    await showDroneDetail(droneId);
}

/**
 * Setup modal close button
 */
function setupModalCloseButton(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal(modalId);
        });
    }
    
    // モーダルの背景をクリックした時に閉じる
    modal.addEventListener('click', (e) => {
        // モーダルコンテンツ内のクリックは無視
        if (e.target.closest('.modal-content')) {
            return;
        }
        
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// グローバルに公開
window.showPage = showPage;
window.closeModal = closeModal;
window.showDroneDetail = showDroneDetail;

/**
 * Cookieを取得する
 * @param {string} name - Cookie名
 * @returns {string|null} Cookieの値、存在しない場合はnull
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

/**
 * Cookieを設定する
 * @param {string} name - Cookie名
 * @param {string} value - Cookieの値
 * @param {number} days - 有効期限（日数）
 */
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

/**
 * テーマを初期化する（Cookieから復元）
 */
function initTheme() {
    const savedTheme = getCookie('theme');
    const theme = savedTheme || 'light';
    applyTheme(theme);
    updateThemeButton(theme);
}

/**
 * テーマを適用する
 * @param {string} theme - 'light' または 'dark'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * テーマ切り替えボタンの表示を更新する
 * @param {string} theme - 現在のテーマ
 */
function updateThemeButton(theme) {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    if (!sunIcon || !moonIcon) {
        return;
    }
    
    if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

/**
 * テーマを切り替える
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    applyTheme(newTheme);
    setCookie('theme', newTheme, 365);
    updateThemeButton(newTheme);
}

/**
 * テーマ切り替えボタンのイベントリスナーを設定
 */
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
    // テーマを最初に初期化（DOMが読み込まれた直後）
    initTheme();
    setupThemeToggle();
    
    // 認証を初期化
    const isAuthenticated = await initAuth();
    
    // 認証済みの場合のみアプリを初期化
    if (isAuthenticated) {
        init();
    }
});

// グローバルに公開
window.initApp = init;

