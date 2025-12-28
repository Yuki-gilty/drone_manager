/**
 * Drone management module
 */

import { droneStorage, droneTypeStorage, partStorage, repairStorage, manufacturerStorage, practiceDayStorage } from './storage.js';

let currentDroneId = null;
let selectedTypeFilter = '';

/**
 * Initialize drone management
 */
export function initDroneManagement() {
    loadDroneList();
    loadTypeFilter();
    setupEventListeners();
    updateStats();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // 機体追加ボタン
    const addDroneBtn = document.getElementById('add-drone-btn');
    if (addDroneBtn) {
        addDroneBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAddDroneModal();
        });
    } else {
        console.error('add-drone-btn not found');
    }

    // 種類管理ボタン
    document.getElementById('manage-types-btn').addEventListener('click', () => {
        openManageTypesModal();
    });

    // メーカー管理ボタン（存在する場合のみ）
    const manageManufacturersBtn = document.getElementById('manage-manufacturers-btn');
    if (manageManufacturersBtn) {
        manageManufacturersBtn.addEventListener('click', () => {
            openManageManufacturersModal();
        });
    }

    // 種類フィルター
    document.getElementById('type-filter').addEventListener('change', (e) => {
        selectedTypeFilter = e.target.value;
        loadDroneList();
    });

    // クイックアクション
    const quickAddDroneBtn = document.getElementById('quick-add-drone');
    if (quickAddDroneBtn) {
        quickAddDroneBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAddDroneModal();
        });
    } else {
        console.error('quick-add-drone not found');
    }

    document.getElementById('quick-manage-types').addEventListener('click', () => {
        openManageTypesModal();
    });

    document.getElementById('quick-calendar').addEventListener('click', () => {
        if (window.showPage) {
            window.showPage('calendar-page');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('.nav-link[data-page="calendar"]').classList.add('active');
        }
    });

    // 機体追加フォーム
    document.getElementById('add-drone-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addDrone();
    });

    // 種類追加フォーム
    document.getElementById('add-type-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addDroneType();
    });

    // メーカー追加フォーム
    const addManufacturerForm = document.getElementById('add-manufacturer-form');
    if (addManufacturerForm) {
        addManufacturerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addManufacturer();
            return false;
        });
    }

    // 戻るボタン
    document.getElementById('back-to-list').addEventListener('click', () => {
        showHomePage();
    });

    // モーダルクローズ
    setupModalClose('add-drone-modal', 'cancel-add-drone');
    setupModalClose('manage-types-modal');
    setupModalClose('manage-manufacturers-modal');

    // 写真プレビュー（モーダルが開かれた時に設定）
    setupPhotoPreview();
}

/**
 * Update statistics
 */
export function updateStats() {
    const statDronesCount = document.getElementById('stat-drones-count');
    const statPartsCount = document.getElementById('stat-parts-count');
    const statRepairsCount = document.getElementById('stat-repairs-count');
    const statTypesCount = document.getElementById('stat-types-count');
    
    // ホーム画面が表示されていない場合は何もしない
    if (!statDronesCount || !statPartsCount || !statRepairsCount || !statTypesCount) {
        return;
    }
    
    const drones = droneStorage.getAll();
    const practiceDays = practiceDayStorage.getAll();
    const repairs = repairStorage.getAll();
    const types = droneTypeStorage.getAll();

    statDronesCount.textContent = drones.length;
    statPartsCount.textContent = practiceDays.length;
    statRepairsCount.textContent = repairs.length;
    statTypesCount.textContent = types.length;
}

/**
 * Load drone list
 */
function loadDroneList() {
    const drones = droneStorage.getAll();
    const filteredDrones = selectedTypeFilter 
        ? drones.filter(drone => drone.type === selectedTypeFilter)
        : drones;

    const droneList = document.getElementById('drone-list');
    droneList.innerHTML = '';

    if (filteredDrones.length === 0) {
        droneList.innerHTML = `
            <div class="empty-message" style="grid-column: 1/-1; padding: 4rem 2rem;">
                <i data-lucide="package-open" size="48" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>登録されている機体はありません</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filteredDrones.forEach(drone => {
        const card = createDroneCard(drone);
        droneList.appendChild(card);
    });
    
    // アイコンをレンダリング
    lucide.createIcons();
    
    // 統計情報を更新
    updateStats();
}

/**
 * Create drone card element
 */
function createDroneCard(drone) {
    const card = document.createElement('div');
    card.className = 'drone-card';
    card.addEventListener('click', () => showDroneDetail(drone.id));

    const photo = drone.photo 
        ? `<img src="${drone.photo}" alt="${drone.name}" class="drone-photo">`
        : `
            <div class="drone-photo-placeholder" style="display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg-main);">
                <i data-lucide="image" size="32" style="opacity: 0.3;"></i>
                <span style="font-size: 0.75rem; font-weight: 500; opacity: 0.5;">NO IMAGE</span>
            </div>
        `;

    const type = droneTypeStorage.getById(drone.type);
    const typeName = type ? type.name : '不明';

    card.innerHTML = `
        <div class="drone-photo-container">
            ${photo}
        </div>
        <div class="drone-card-info">
            <span class="drone-type-badge">${escapeHtml(typeName)}</span>
            <h3>${escapeHtml(drone.name)}</h3>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.75rem; font-weight: 500;">
                <i data-lucide="calendar" size="14"></i>
                <span>Started: ${formatDate(drone.startDate)}</span>
            </div>
        </div>
    `;

    return card;
}

/**
 * Load type filter dropdown
 */
function loadTypeFilter() {
    const types = droneTypeStorage.getAll();
    const filterSelect = document.getElementById('type-filter');
    const addDroneSelect = document.getElementById('drone-type');

    // フィルター用
    filterSelect.innerHTML = '<option value="">すべての種類</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        filterSelect.appendChild(option);
    });

    // 追加フォーム用
    addDroneSelect.innerHTML = '<option value="">選択してください</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        addDroneSelect.appendChild(option);
    });
}

/**
 * Open add drone modal
 */
/**
 * Setup photo preview
 */
function setupPhotoPreview() {
    const photoInput = document.getElementById('drone-photo');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = document.getElementById('photo-preview');
            if (!preview) return;
            
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.innerHTML = `<img src="${event.target.result}" alt="プレビュー" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-md); margin-top: 0.5rem;">`;
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });
    }
}

function openAddDroneModal() {
    try {
        loadTypeFilter();
        const form = document.getElementById('add-drone-form');
        if (form) {
            form.reset();
        }
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview) {
            photoPreview.innerHTML = '';
        }
        const modal = document.getElementById('add-drone-modal');
        if (modal) {
            modal.style.display = 'flex';
            // アイコンを再レンダリング
            if (window.lucide) {
                window.lucide.createIcons();
            }
        } else {
            console.error('add-drone-modal not found');
        }
    } catch (error) {
        console.error('Error opening add drone modal:', error);
    }
}

/**
 * Add new drone
 */
async function addDrone() {
    const name = document.getElementById('drone-name').value.trim();
    const type = document.getElementById('drone-type').value;
    const startDate = document.getElementById('drone-start-date').value;
    const photoFile = document.getElementById('drone-photo').files[0];

    if (!name || !type || !startDate) {
        alert('必須項目を入力してください');
        return;
    }

    let photoBase64 = '';
    if (photoFile) {
        try {
            photoBase64 = await compressAndConvertToBase64(photoFile);
        } catch (error) {
            alert('写真の処理中にエラーが発生しました。別の写真を選択してください。');
            console.error('Photo compression error:', error);
            return;
        }
    }

    const drone = {
        name,
        type,
        startDate,
        photo: photoBase64,
        parts: []
    };

    const newDrone = droneStorage.add(drone);
    
    // 種類のデフォルトパーツを追加
    const droneType = droneTypeStorage.getById(type);
    if (droneType && droneType.defaultParts && droneType.defaultParts.length > 0) {
        const parts = newDrone.parts || [];
        droneType.defaultParts.forEach(partData => {
            // 互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameとmanufacturerIdを使用
            const partName = typeof partData === 'string' ? partData : partData.name;
            const manufacturerId = typeof partData === 'string' ? null : (partData.manufacturerId || null);
            const part = {
                droneId: newDrone.id,
                name: partName,
                startDate: startDate, // 機体の使用開始日と同じにする
                replacementHistory: [],
                manufacturerId: manufacturerId
            };
            const newPart = partStorage.add(part);
            parts.push(newPart.id);
        });
        droneStorage.update(newDrone.id, { parts });
    }
    
    closeModal('add-drone-modal');
    
    // ホーム画面を表示してから一覧を更新
    showHomePage();
    updateStats();
}

/**
 * Compress and convert image file to base64
 */
function compressAndConvertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 最大サイズを設定（800x800px）
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                // アスペクト比を維持しながらリサイズ
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = (width * MAX_HEIGHT) / height;
                        height = MAX_HEIGHT;
                    }
                }

                // Canvasでリサイズと圧縮
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG品質を0.7に設定して圧縮
                let compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // サイズチェック（約500KB以下を目安）
                const sizeInMB = (compressedBase64.length * 3) / 4 / 1024 / 1024;
                if (sizeInMB > 0.5) {
                    // さらに圧縮を試みる（品質0.5）
                    compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                }
                
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Show drone detail page
 */
export function showDroneDetail(droneId) {
    currentDroneId = droneId;
    const drone = droneStorage.getById(droneId);
    if (!drone) return;

    const type = droneTypeStorage.getById(drone.type);
    const typeName = type ? type.name : '不明';
    const parts = partStorage.getByDroneId(droneId);
    const repairs = repairStorage.getByDroneId(droneId);
    
    // パーツにメーカー情報を追加
    const partsWithManufacturer = parts.map(part => {
        const manufacturer = part.manufacturerId ? manufacturerStorage.getById(part.manufacturerId) : null;
        return {
            ...part,
            manufacturerName: manufacturer ? manufacturer.name : null
        };
    });

    const detailContent = document.getElementById('drone-detail-content');
    detailContent.innerHTML = `
        <div class="drone-detail-header" style="display: grid; grid-template-columns: 300px 1fr; gap: 2.5rem; align-items: start; border-bottom: 1px solid var(--border-base); padding-bottom: 2.5rem; margin-bottom: 2.5rem;">
            <div style="width: 100%; aspect-ratio: 1; border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-main); border: 1px solid var(--border-base);">
                ${drone.photo ? `<img src="${drone.photo}" alt="${drone.name}" style="width: 100%; height: 100%; object-fit: cover;">` : `
                    <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); gap: 0.75rem;">
                        <i data-lucide="image" size="48" style="opacity: 0.2;"></i>
                        <span style="font-weight: 500; opacity: 0.5;">NO PHOTO</span>
                    </div>
                `}
            </div>
            <div class="drone-detail-info">
                <span class="drone-type-badge">${escapeHtml(typeName)}</span>
                <h2 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -0.025em;">${escapeHtml(drone.name)}</h2>
                
                <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: var(--text-muted);">
                        <i data-lucide="calendar-days" size="20"></i>
                        <span style="font-weight: 500;">使用開始日: ${formatDate(drone.startDate)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: var(--text-muted);">
                        <i data-lucide="component" size="20"></i>
                        <span style="font-weight: 500;">搭載パーツ: ${parts.length}個</span>
                    </div>
                </div>

                <div style="display: flex; gap: 0.75rem;">
                    <button id="delete-drone-btn" class="btn btn-danger">
                        <i data-lucide="trash-2" size="18"></i>
                        機体を削除
                    </button>
                </div>
            </div>
        </div>

        <div class="drone-detail-section" style="margin-bottom: 3rem;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i data-lucide="cpu" class="text-gradient"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700;">使用中のパーツ</h3>
                </div>
                <button id="add-part-btn" class="btn btn-primary btn-small">
                    <i data-lucide="plus" size="16"></i>
                    パーツ追加
                </button>
            </div>
            <div id="parts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                ${partsWithManufacturer.length === 0 ? `
                    <div class="empty-message" style="grid-column: 1/-1; background: var(--bg-main); border: 2px dashed var(--border-base); border-radius: var(--radius-md); padding: 2rem;">
                        <p>パーツが登録されていません</p>
                    </div>
                ` : ''}
                ${partsWithManufacturer.map(part => `
                    <div class="part-item" style="background: var(--bg-main); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-base); display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
                        <div>
                            <h4 style="font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">${escapeHtml(part.name)}</h4>
                            <div style="font-size: 0.8125rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
                                ${part.manufacturerName ? `
                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                        <i data-lucide="factory" size="12"></i>
                                        <span>${escapeHtml(part.manufacturerName)}</span>
                                    </div>
                                ` : ''}
                                <div style="display: flex; align-items: center; gap: 0.4rem;">
                                    <i data-lucide="clock" size="12"></i>
                                    <span>${formatDate(part.startDate)}〜</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-small view-part-btn" data-part-id="${part.id}" style="width: 100%;">
                            詳細を表示
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="drone-detail-section">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i data-lucide="wrench" class="text-gradient"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700;">修理・メンテナンス履歴</h3>
                </div>
                <button id="add-repair-btn" class="btn btn-primary btn-small">
                    <i data-lucide="plus" size="16"></i>
                    履歴を追加
                </button>
            </div>
            <div id="repairs-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${repairs.length === 0 ? `
                    <div class="empty-message" style="background: var(--bg-main); border: 2px dashed var(--border-base); border-radius: var(--radius-md); padding: 2rem;">
                        <p>修理履歴はありません</p>
                    </div>
                ` : ''}
                ${repairs.map(repair => {
                    const part = repair.partId ? partStorage.getById(repair.partId) : null;
                    return `
                        <div class="repair-item" style="background: var(--bg-card); border-left: 4px solid var(--primary); padding: 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; box-shadow: var(--shadow-sm); border-top: 1px solid var(--border-base); border-right: 1px solid var(--border-base); border-bottom: 1px solid var(--border-base);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                                <div style="font-weight: 700; color: var(--primary); font-size: 0.875rem;">${formatDate(repair.date)}</div>
                                ${part ? `<span style="font-size: 0.75rem; background: var(--bg-main); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-weight: 600; color: var(--text-muted); border: 1px solid var(--border-base);">${escapeHtml(part.name)}</span>` : '<span style="font-size: 0.75rem; background: var(--bg-main); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-weight: 600; color: var(--primary); border: 1px solid var(--primary);">機体全体</span>'}
                            </div>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-main);">${escapeHtml(repair.description)}</p>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // アイコンをレンダリング
    lucide.createIcons();

    // イベントリスナーを設定
    document.getElementById('add-part-btn').addEventListener('click', () => {
        openAddPartModal();
    });

    document.getElementById('add-repair-btn').addEventListener('click', () => {
        openAddRepairModal();
    });

    document.getElementById('delete-drone-btn').addEventListener('click', () => {
        deleteDrone(droneId);
    });

    // 現在の機体IDを保存
    document.getElementById('current-drone-id').value = droneId;

    document.querySelectorAll('.view-part-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partId = e.target.dataset.partId;
            import('./parts.js').then(module => {
                module.showPartDetail(partId);
            });
        });
    });

    if (window.showPage) {
        window.showPage('drone-detail-page');
    }
}

/**
 * Open add part modal
 */
function openAddPartModal() {
    if (window.openAddPartModal) {
        window.openAddPartModal();
    }
}

/**
 * Open add repair modal
 */
function openAddRepairModal() {
    if (window.openAddRepairModal) {
        window.openAddRepairModal();
    }
}

/**
 * Show home page
 */
function showHomePage() {
    if (window.showPage) {
        window.showPage('home-page');
    }
    loadDroneList();
    updateStats();
}

/**
 * Setup modal close handlers
 */
function setupModalClose(modalId, cancelButtonId = null) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found`);
        return;
    }
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal(modalId);
        });
    } else {
        console.warn(`Close button not found in modal ${modalId}`);
    }
    
    if (cancelButtonId) {
        const cancelBtn = document.getElementById(cancelButtonId);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal(modalId);
            });
        }
    }

    // モーダルの背景をクリックした時に閉じる
    modal.addEventListener('click', (e) => {
        // モーダルコンテンツ内のクリックは無視
        if (e.target.closest('.modal-content')) {
            return;
        }
        
        // メーカー管理モーダルの場合は、種類管理モーダルを閉じないようにする
        if (modalId === 'manage-manufacturers-modal') {
            // メーカー管理モーダルが開いている場合、種類管理モーダルは閉じない
            if (e.target === modal) {
                closeModal(modalId);
            }
        } else {
            if (e.target === modal) {
                closeModal(modalId);
            }
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

/**
 * Open manage types modal
 */
function openManageTypesModal() {
    loadTypesList();
    document.getElementById('add-type-form').reset();
    document.getElementById('manage-types-modal').style.display = 'flex';
}

/**
 * Load types list
 */
function loadTypesList() {
    const types = droneTypeStorage.getAll();
    const typesList = document.getElementById('types-list');
    
    typesList.innerHTML = '';
    
    if (types.length === 0) {
        typesList.innerHTML = `
            <div class="empty-message" style="background: var(--bg-main); border: 2px dashed var(--border-base); border-radius: var(--radius-md); padding: 2rem;">
                <p>カテゴリーが登録されていません</p>
            </div>
        `;
        return;
    }

    types.forEach(type => {
        const defaultParts = type.defaultParts || [];
        const item = document.createElement('div');
        item.className = 'type-item-expandable';
        item.style.marginBottom = '1rem';
        item.dataset.typeId = type.id;
        
        const isExpanded = item.dataset.expanded === 'true';
        
        item.innerHTML = `
            <div class="type-item-header" style="background: var(--bg-main); border-radius: var(--radius-md); padding: 1rem; border: 1px solid var(--border-base); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i data-lucide="tag" size="18" style="color: var(--primary);"></i>
                    <span class="type-name" style="font-weight: 700;">${escapeHtml(type.name)}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); background: var(--border-base); padding: 0.1rem 0.5rem; border-radius: var(--radius-full);">${defaultParts.length}パーツ</span>
                </div>
                <div class="type-item-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-small toggle-parts-btn" data-type-id="${type.id}">
                        <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" size="14"></i>
                        ${isExpanded ? 'パーツを閉じる' : 'パーツ管理'}
                    </button>
                    <button class="btn btn-danger btn-small delete-type-btn" data-type-id="${type.id}">
                        <i data-lucide="trash-2" size="14"></i>
                    </button>
                </div>
            </div>
            <div class="type-parts-section" style="display: ${isExpanded ? 'block' : 'none'}; padding: 1.25rem; border: 1px solid var(--border-base); border-top: none; border-radius: 0 0 var(--radius-md) var(--radius-md); background: var(--bg-card);">
                <div class="type-parts-list" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;">
                    ${defaultParts.length === 0 
                        ? '<p class="empty-message" style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">デフォルトパーツはありません</p>'
                        : defaultParts.map((part, index) => {
                            const partName = typeof part === 'string' ? part : part.name;
                            const partObj = typeof part === 'string' ? { name: part, manufacturerId: null } : part;
                            const manufacturer = partObj.manufacturerId ? manufacturerStorage.getById(partObj.manufacturerId) : null;
                            const manufacturerName = manufacturer ? manufacturer.name : '';
                            return `
                                <div class="type-part-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-main); border-radius: var(--radius-sm); border: 1px solid var(--border-base);">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i data-lucide="component" size="14" style="color: var(--secondary);"></i>
                                        <span style="font-weight: 500; font-size: 0.875rem;">${escapeHtml(partName)}</span>
                                        ${manufacturerName ? `<span style="color: var(--text-muted); font-size: 0.75rem; background: var(--bg-card); padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-base);">${escapeHtml(manufacturerName)}</span>` : ''}
                                    </div>
                                    <button class="btn btn-danger btn-small delete-type-part-btn" data-type-id="${type.id}" data-part-index="${index}" style="padding: 0.25rem; background: transparent; border: none;">
                                        <i data-lucide="x" size="14"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
                <form class="add-type-part-form" data-type-id="${type.id}">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="text" class="type-part-name-input" placeholder="パーツ名" required style="flex: 2; min-width: 150px;">
                        <div style="flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 0.125rem;">
                            <select class="type-part-manufacturer-select" data-type-id="${type.id}" style="flex: 1; min-width: 120px;">
                                <option value="">メーカー(任意)</option>
                            </select>
                            <a href="#" class="open-manufacturer-modal-link" style="font-size: 0.7rem; color: var(--text-muted); text-decoration: none; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">+ メーカーを追加</a>
                        </div>
                        <button type="submit" class="btn btn-primary btn-small">
                            <i data-lucide="plus" size="14"></i>
                            追加
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // アイコンをレンダリング（個別に追加した後にも必要）
        lucide.createIcons();

        // イベントリスナーを設定
        item.querySelector('.toggle-parts-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTypeParts(type.id);
        });
        
        item.querySelector('.delete-type-btn').addEventListener('click', () => {
            if (confirm(`カテゴリー「${type.name}」を削除しますか？`)) {
                deleteDroneType(type.id);
            }
        });
        
        const addPartForm = item.querySelector('.add-type-part-form');
        addPartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addTypePart(type.id);
        });
        
        const manufacturerSelect = item.querySelector('.type-part-manufacturer-select');
        loadManufacturerOptionsForType(manufacturerSelect);
        
        // メーカー管理モーダルを開くリンクのイベントリスナー
        const openManufacturerModalLink = item.querySelector('.open-manufacturer-modal-link');
        if (openManufacturerModalLink) {
            openManufacturerModalLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openManageManufacturersModal();
            });
        }
        
        item.querySelectorAll('.delete-type-part-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partIndex = parseInt(e.currentTarget.dataset.partIndex);
                deleteTypePart(type.id, partIndex);
            });
        });
        
        typesList.appendChild(item);
    });
    
    lucide.createIcons();
}

/**
 * Load manufacturer options for type part form
 */
function loadManufacturerOptionsForType(selectElement) {
    const manufacturers = manufacturerStorage.getAll();
    selectElement.innerHTML = '<option value="">メーカー（任意）</option>';
    
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer.id;
        option.textContent = manufacturer.name;
        selectElement.appendChild(option);
    });
}

/**
 * Toggle type parts section
 */
function toggleTypeParts(typeId) {
    const typeItem = document.querySelector(`.type-item-expandable[data-type-id="${typeId}"]`);
    if (!typeItem) return;
    
    const partsSection = typeItem.querySelector('.type-parts-section');
    const toggleBtn = typeItem.querySelector('.toggle-parts-btn');
    const isExpanded = partsSection.style.display !== 'none';
    
    partsSection.style.display = isExpanded ? 'none' : 'block';
    toggleBtn.textContent = isExpanded ? 'パーツを管理' : 'パーツを閉じる';
    typeItem.dataset.expanded = (!isExpanded).toString();
}

/**
 * Add part to type
 */
function addTypePart(typeId) {
    const typeItem = document.querySelector(`.type-item-expandable[data-type-id="${typeId}"]`);
    if (!typeItem) return;
    
    const input = typeItem.querySelector('.type-part-name-input');
    const manufacturerSelect = typeItem.querySelector('.type-part-manufacturer-select');
    const partName = input.value.trim();
    const manufacturerId = manufacturerSelect.value || null;
    
    if (!partName) {
        alert('パーツ名を入力してください');
        return;
    }
    
    const type = droneTypeStorage.getById(typeId);
    if (!type) return;
    
    // defaultPartsを正規化（文字列の場合はオブジェクトに変換）
    let defaultParts = type.defaultParts || [];
    defaultParts = defaultParts.map(part => {
        if (typeof part === 'string') {
            return { name: part, manufacturerId: null };
        }
        return part;
    });
    
    // 既に同じ名前のパーツが存在するかチェック
    if (defaultParts.some(part => {
        const name = typeof part === 'string' ? part : part.name;
        return name === partName;
    })) {
        alert('このパーツは既に登録されています');
        return;
    }
    
    defaultParts.push({ name: partName, manufacturerId });
    droneTypeStorage.update(typeId, { defaultParts });
    
    input.value = '';
    manufacturerSelect.value = '';
    loadTypesList();
}

/**
 * Delete part from type
 */
function deleteTypePart(typeId, partIndex) {
    const type = droneTypeStorage.getById(typeId);
    if (!type) return;
    
    const defaultParts = type.defaultParts || [];
    if (partIndex < 0 || partIndex >= defaultParts.length) return;
    
    // 互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameを使用
    const part = defaultParts[partIndex];
    const partName = typeof part === 'string' ? part : part.name;
    
    if (!confirm(`「${partName}」を削除しますか？`)) {
        return;
    }
    
    defaultParts.splice(partIndex, 1);
    droneTypeStorage.update(typeId, { defaultParts });
    
    loadTypesList();
}

/**
 * Add drone type
 */
function addDroneType() {
    const name = document.getElementById('new-type-name').value.trim();
    if (!name) {
        alert('種類名を入力してください');
        return;
    }

    droneTypeStorage.add({ name });
    document.getElementById('new-type-name').value = '';
    loadTypesList();
    loadTypeFilter();
}

/**
 * Delete drone type
 */
function deleteDroneType(typeId) {
    // 使用中の機体があるかチェック
    const drones = droneStorage.getAll();
    const inUse = drones.some(drone => drone.type === typeId);
    
    if (inUse) {
        alert('この種類を使用している機体があるため削除できません');
        return;
    }

    droneTypeStorage.remove(typeId);
    loadTypesList();
    loadTypeFilter();
}

/**
 * Delete drone
 */
function deleteDrone(droneId) {
    const drone = droneStorage.getById(droneId);
    if (!drone) return;

    if (!confirm(`「${drone.name}」を削除しますか？\n\n関連するパーツと修理履歴もすべて削除されます。`)) {
        return;
    }

    // 関連するパーツを削除
    const parts = partStorage.getByDroneId(droneId);
    parts.forEach(part => {
        // パーツに関連する修理履歴を削除
        const partRepairs = repairStorage.getByPartId(part.id);
        partRepairs.forEach(repair => {
            repairStorage.remove(repair.id);
        });
        partStorage.remove(part.id);
    });

    // 機体に関連する修理履歴を削除
    const repairs = repairStorage.getByDroneId(droneId);
    repairs.forEach(repair => {
        repairStorage.remove(repair.id);
    });

    // 機体を削除
    droneStorage.remove(droneId);

    // 一覧ページに戻る
    showHomePage();
    updateStats();
}

/**
 * Get current drone ID
 */
export function getCurrentDroneId() {
    return currentDroneId;
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility: Format date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Open manage manufacturers modal
 */
function openManageManufacturersModal() {
    loadManufacturersList();
    const form = document.getElementById('add-manufacturer-form');
    if (form) {
        form.reset();
    }
    const modal = document.getElementById('manage-manufacturers-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Load manufacturers list
 */
function loadManufacturersList() {
    const manufacturers = manufacturerStorage.getAll();
    const manufacturersList = document.getElementById('manufacturers-list');
    
    manufacturersList.innerHTML = '';
    
    if (manufacturers.length === 0) {
        manufacturersList.innerHTML = '<p class="empty-message">メーカーが登録されていません</p>';
        return;
    }

    manufacturers.forEach(manufacturer => {
        const item = document.createElement('div');
        item.className = 'type-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '0.75rem 1rem';
        item.style.border = '1px solid var(--border-base)';
        item.style.borderRadius = 'var(--radius-md)';
        item.style.marginBottom = '0.5rem';
        item.style.background = 'var(--bg-main)';
        item.innerHTML = `
            <span class="type-name" style="font-weight: 500;">${escapeHtml(manufacturer.name)}</span>
            <button class="btn btn-danger btn-small delete-manufacturer-btn" data-manufacturer-id="${manufacturer.id}">削除</button>
        `;
        
        item.querySelector('.delete-manufacturer-btn').addEventListener('click', () => {
            if (confirm(`「${manufacturer.name}」を削除しますか？`)) {
                deleteManufacturer(manufacturer.id);
            }
        });
        
        manufacturersList.appendChild(item);
    });
}

/**
 * Add manufacturer
 */
function addManufacturer() {
    const nameInput = document.getElementById('new-manufacturer-name');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('メーカー名を入力してください');
        return;
    }

    // メーカーを追加
    manufacturerStorage.add({ name });
    
    // 入力フィールドをクリア
    nameInput.value = '';
    
    // メーカーリストを更新
    loadManufacturersList();
    
    // 種類管理画面のメーカー選択プルダウンを更新
    updateAllTypePartManufacturerSelects();
    
    // メーカー管理モーダルを開いたままにする（閉じない）
    // 種類管理モーダルも開いたままにする
}

/**
 * Update all manufacturer selects in type part forms
 */
function updateAllTypePartManufacturerSelects() {
    document.querySelectorAll('.type-part-manufacturer-select').forEach(select => {
        loadManufacturerOptionsForType(select);
    });
}

/**
 * Delete manufacturer
 */
function deleteManufacturer(manufacturerId) {
    // 使用中のパーツがあるかチェック
    const parts = partStorage.getAll();
    const inUse = parts.some(part => part.manufacturerId === manufacturerId);
    
    if (inUse) {
        alert('このメーカーを使用しているパーツがあるため削除できません');
        return;
    }

    manufacturerStorage.remove(manufacturerId);
    loadManufacturersList();
}

