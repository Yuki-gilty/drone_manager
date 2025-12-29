/**
 * Authentication management module
 */

import { authAPI } from './api.js';

let currentUser = null;

/**
 * Check authentication status
 */
export async function checkAuth() {
    try {
        const user = await authAPI.getCurrentUser();
        currentUser = user;
        return user;
    } catch (error) {
        currentUser = null;
        return null;
    }
}

/**
 * Show login page
 */
export function showLoginPage() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('nav-links').style.display = 'none';
    document.getElementById('user-menu').style.display = 'none';
    document.getElementById('theme-toggle').style.display = 'none';
}

/**
 * Show register page
 */
export function showRegisterPage() {
    document.getElementById('register-page').classList.add('active');
    document.getElementById('register-page').style.display = 'flex';
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
}

/**
 * Show main app
 */
export function showMainApp(user) {
    currentUser = user;
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('nav-links').style.display = 'flex';
    document.getElementById('user-menu').style.display = 'flex';
    document.getElementById('theme-toggle').style.display = 'block';
    
    if (user) {
        document.getElementById('username-display').textContent = user.username;
    }
}

/**
 * Initialize authentication
 */
export async function initAuth() {
    // ログインフォーム
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            
            try {
                const result = await authAPI.login(username, password);
                await showMainApp(result.user);
                // アプリケーションを初期化
                if (window.initApp) {
                    window.initApp();
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'ログインに失敗しました';
                errorDiv.style.display = 'block';
            }
        });
    }
    
    // 新規登録フォーム
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim() || null;
            const password = document.getElementById('register-password').value;
            const errorDiv = document.getElementById('register-error');
            
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            
            if (password.length < 8) {
                errorDiv.textContent = 'パスワードは8文字以上である必要があります';
                errorDiv.style.display = 'block';
                return;
            }
            
            try {
                const result = await authAPI.register(username, password, email);
                await showMainApp(result.user);
                // アプリケーションを初期化
                if (window.initApp) {
                    window.initApp();
                }
            } catch (error) {
                errorDiv.textContent = error.message || '登録に失敗しました';
                errorDiv.style.display = 'block';
            }
        });
    }
    
    // ページ切り替えボタン
    const showRegisterBtn = document.getElementById('show-register');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            showRegisterPage();
        });
    }
    
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            showLoginPage();
        });
    }
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await authAPI.logout();
                showLoginPage();
                currentUser = null;
            } catch (error) {
                console.error('Logout error:', error);
                // エラーが発生してもログアウト状態にする
                showLoginPage();
                currentUser = null;
            }
        });
    }
    
    // 認証状態をチェック
    const user = await checkAuth();
    if (user) {
        await showMainApp(user);
        return true;
    } else {
        showLoginPage();
        return false;
    }
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}

// グローバルに公開
window.checkAuth = checkAuth;
window.showLoginPage = showLoginPage;
window.showMainApp = showMainApp;

