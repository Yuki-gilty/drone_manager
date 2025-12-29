"""
Database setup and models for drone manager
"""
import sqlite3
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session, jsonify, request

# データベースファイルパス
DB_PATH = 'drone_manager.db'

def get_db():
    """データベース接続を取得"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """データベースを初期化"""
    conn = get_db()
    cursor = conn.cursor()
    
    # ユーザーテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 機体種類テーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drone_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            default_parts TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, name)
        )
    ''')
    
    # メーカーテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS manufacturers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, name)
        )
    ''')
    
    # 機体テーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type_id INTEGER NOT NULL,
            start_date DATE NOT NULL,
            photo TEXT,
            status TEXT DEFAULT 'ready',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (type_id) REFERENCES drone_types(id) ON DELETE RESTRICT
        )
    ''')
    
    # パーツテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            drone_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            start_date DATE NOT NULL,
            manufacturer_id INTEGER,
            replacement_history TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
        )
    ''')
    
    # 修理履歴テーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            drone_id INTEGER NOT NULL,
            part_id INTEGER,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
            FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
        )
    ''')
    
    # 練習日テーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS practice_days (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, date)
        )
    ''')
    
    # インデックスの作成
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_drones_user_id ON drones(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_drones_type_id ON drones(type_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_parts_user_id ON parts(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_parts_drone_id ON parts(drone_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_repairs_user_id ON repairs(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_repairs_drone_id ON repairs(drone_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_repairs_part_id ON repairs(part_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_practice_days_user_id ON practice_days(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_practice_days_date ON practice_days(date)')
    
    conn.commit()
    conn.close()

def require_auth(f):
    """認証が必要なエンドポイント用デコレータ"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '認証が必要です'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user_id():
    """現在のユーザーIDを取得"""
    return session.get('user_id')

def create_user(username, password, email=None):
    """ユーザーを作成"""
    conn = get_db()
    cursor = conn.cursor()
    
    password_hash = generate_password_hash(password)
    
    try:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, password_hash))
        user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def verify_user(username, password):
    """ユーザー認証"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        return user['id']
    return None

def get_user_by_id(user_id):
    """ユーザーIDからユーザー情報を取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'created_at': user['created_at']
        }
    return None
