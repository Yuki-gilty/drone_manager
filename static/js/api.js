/**
 * API communication module
 * Handles all HTTP requests to the server
 */

const API_BASE = '/api';

/**
 * API request helper
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Cookieを含める
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        
        // Content-Typeをチェック
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // JSONでない場合（HTMLエラーページなど）
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            
            // 認証エラーの可能性
            if (response.status === 401 || response.status === 403) {
                throw new Error('認証が必要です。ログインし直してください。');
            }
            
            throw new Error(`サーバーエラーが発生しました (${response.status})`);
        }
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `リクエストに失敗しました (${response.status})`);
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        // エラーメッセージを改善
        if (error.message.includes('Unexpected token')) {
            throw new Error('サーバーからの応答が不正です。ログインし直してください。');
        }
        throw error;
    }
}

// ==================== 認証関連 ====================

export const authAPI = {
    async register(username, password, email = null) {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: { username, password, email },
        });
    },

    async login(username, password) {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: { username, password },
        });
    },

    async logout() {
        return apiRequest('/auth/logout', {
            method: 'POST',
        });
    },

    async getCurrentUser() {
        return apiRequest('/auth/me', {
            method: 'GET',
        });
    },
};

// ==================== 機体関連 ====================

export const droneAPI = {
    async getAll(typeId = null) {
        const query = typeId ? `?type_id=${typeId}` : '';
        return apiRequest(`/drones${query}`, {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/drones/${id}`, {
            method: 'GET',
        });
    },

    async create(drone) {
        return apiRequest('/drones', {
            method: 'POST',
            body: drone,
        });
    },

    async update(id, updates) {
        return apiRequest(`/drones/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/drones/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== パーツ関連 ====================

export const partAPI = {
    async getAll(droneId = null) {
        const query = droneId ? `?drone_id=${droneId}` : '';
        return apiRequest(`/parts${query}`, {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/parts/${id}`, {
            method: 'GET',
        });
    },

    async create(part) {
        return apiRequest('/parts', {
            method: 'POST',
            body: part,
        });
    },

    async update(id, updates) {
        return apiRequest(`/parts/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/parts/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== 修理履歴関連 ====================

export const repairAPI = {
    async getAll(droneId = null, partId = null) {
        const params = new URLSearchParams();
        if (droneId) params.append('drone_id', droneId);
        if (partId) params.append('part_id', partId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/repairs${query}`, {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/repairs/${id}`, {
            method: 'GET',
        });
    },

    async create(repair) {
        return apiRequest('/repairs', {
            method: 'POST',
            body: repair,
        });
    },

    async update(id, updates) {
        return apiRequest(`/repairs/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/repairs/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== 機体種類関連 ====================

export const droneTypeAPI = {
    async getAll() {
        return apiRequest('/drone-types', {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/drone-types/${id}`, {
            method: 'GET',
        });
    },

    async create(type) {
        return apiRequest('/drone-types', {
            method: 'POST',
            body: type,
        });
    },

    async update(id, updates) {
        return apiRequest(`/drone-types/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/drone-types/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== メーカー関連 ====================

export const manufacturerAPI = {
    async getAll() {
        return apiRequest('/manufacturers', {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/manufacturers/${id}`, {
            method: 'GET',
        });
    },

    async create(manufacturer) {
        return apiRequest('/manufacturers', {
            method: 'POST',
            body: manufacturer,
        });
    },

    async update(id, updates) {
        return apiRequest(`/manufacturers/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/manufacturers/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== 練習日関連 ====================

export const practiceDayAPI = {
    async getAll() {
        return apiRequest('/practice-days', {
            method: 'GET',
        });
    },

    async getById(id) {
        return apiRequest(`/practice-days/${id}`, {
            method: 'GET',
        });
    },

    async create(practiceDay) {
        return apiRequest('/practice-days', {
            method: 'POST',
            body: practiceDay,
        });
    },

    async update(id, updates) {
        return apiRequest(`/practice-days/${id}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async delete(id) {
        return apiRequest(`/practice-days/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== データ移行関連 ====================

export const migrateAPI = {
    async importData(data) {
        return apiRequest('/migrate/import', {
            method: 'POST',
            body: data,
        });
    },
};
