"""
Database setup and models for drone manager
"""
import os
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session, jsonify, request
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

def get_db():
    """データベース接続を取得"""
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        # PostgreSQL (本番環境)
        # DATABASE_URL形式: postgresql://user:password@host:port/dbname
        parsed = urlparse(database_url)
        conn = psycopg2.connect(
            database=parsed.path[1:],  # 先頭の/を削除
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port
        )
        return conn
    else:
        # SQLite (開発環境)
        import sqlite3
        DB_PATH = 'drone_manager.db'
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def get_cursor(conn):
    """データベースカーソルを取得（PostgreSQLの場合はRealDictCursorを使用）"""
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    if is_postgres:
        return conn.cursor(cursor_factory=RealDictCursor)
    else:
        return conn.cursor()

def is_postgres_conn(conn):
    """接続がPostgreSQLかどうかを判定"""
    return isinstance(conn, psycopg2.extensions.connection)

def init_db():
    """データベースを初期化"""
    conn = get_db()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    cursor = conn.cursor()
    
    # SQLiteとPostgreSQLで異なる構文を使用
    if is_postgres:
        # PostgreSQL用の構文
        id_type = 'SERIAL PRIMARY KEY'
        text_type = 'TEXT'
        timestamp_default = 'DEFAULT CURRENT_TIMESTAMP'
        unique_constraint = 'UNIQUE'
    else:
        # SQLite用の構文
        id_type = 'INTEGER PRIMARY KEY AUTOINCREMENT'
        text_type = 'TEXT'
        timestamp_default = 'DEFAULT CURRENT_TIMESTAMP'
        unique_constraint = 'UNIQUE'
    
    # ユーザーテーブル
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS users (
            id {id_type},
            username {text_type} {unique_constraint} NOT NULL,
            email {text_type} {unique_constraint},
            password_hash {text_type} NOT NULL,
            created_at TIMESTAMP {timestamp_default},
            updated_at TIMESTAMP {timestamp_default}
        )
    ''')
    
    # 機体種類テーブル
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS drone_types (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                default_parts TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, name)
            )
        ''')
    else:
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
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS manufacturers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, name)
            )
        ''')
    else:
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
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS drones (
                id SERIAL PRIMARY KEY,
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
    else:
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
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS parts (
                id SERIAL PRIMARY KEY,
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
    else:
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
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS repairs (
                id SERIAL PRIMARY KEY,
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
    else:
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
    if is_postgres:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS practice_days (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, date)
            )
        ''')
    else:
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
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    cursor = get_cursor(conn)
    
    password_hash = generate_password_hash(password)
    
    try:
        if is_postgres:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id
            ''', (username, email, password_hash))
            user_id = cursor.fetchone()['id']
        else:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', (username, email, password_hash))
            user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except (psycopg2.errors.UniqueViolation if is_postgres else __import__('sqlite3').IntegrityError):
        return None
    finally:
        cursor.close()
        conn.close()

def verify_user(username, password):
    """ユーザー認証"""
    conn = get_db()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    cursor = get_cursor(conn)
    
    if is_postgres:
        cursor.execute('SELECT id, password_hash FROM users WHERE username = %s', (username,))
    else:
        cursor.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        return user['id']
    return None

def get_user_by_id(user_id):
    """ユーザーIDからユーザー情報を取得"""
    conn = get_db()
    is_postgres = isinstance(conn, psycopg2.extensions.connection)
    cursor = get_cursor(conn)
    
    if is_postgres:
        cursor.execute('SELECT id, username, email, created_at FROM users WHERE id = %s', (user_id,))
    else:
        cursor.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user:
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'created_at': user['created_at']
        }
    return None
