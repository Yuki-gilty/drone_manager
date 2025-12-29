#!/usr/bin/env python3
"""
Flask server for drone manager with PostgreSQL/SQLite database and authentication
"""
from flask import Flask, render_template, send_from_directory, request, jsonify, session
from flask_session import Session
import os
import json
from datetime import datetime
from database import (
    init_db, get_db, get_cursor, is_postgres_conn, require_auth, get_current_user_id,
    create_user, verify_user, get_user_by_id
)
import psycopg2

app = Flask(__name__, template_folder='templates', static_folder='static')

# セッション設定
secret_key = os.environ.get('SECRET_KEY')
if not secret_key:
    if os.environ.get('FLASK_ENV') == 'production' or os.environ.get('DATABASE_URL'):
        raise ValueError('SECRET_KEY environment variable must be set in production')
    secret_key = 'dev-secret-key-change-in-production'
app.config['SECRET_KEY'] = secret_key

# 本番環境（DATABASE_URLが設定されている場合）ではFlaskのデフォルトセッション（クッキーベース）、
# 開発環境ではファイルシステムセッション
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    # 開発環境: ファイルシステムセッション
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = False
    app.config['PERMANENT_SESSION_LIFETIME'] = 2592000  # 30日間
    Session(app)
else:
    # 本番環境: Flaskのデフォルトセッション（クッキーベース）を使用
    # flask-sessionは使用しない（Renderのファイルシステムは一時的）
    app.config['PERMANENT_SESSION_LIFETIME'] = 2592000  # 30日間

# データベース初期化
init_db()

# ==================== 認証関連エンドポイント ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """ユーザー登録"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip() or None
    
    if not username or not password:
        return jsonify({'error': 'ユーザー名とパスワードは必須です'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'パスワードは8文字以上である必要があります'}), 400
    
    user_id = create_user(username, password, email)
    if user_id is None:
        return jsonify({'error': 'このユーザー名は既に使用されています'}), 400
    
    session['user_id'] = user_id
    session.permanent = True
    
    return jsonify({
        'message': '登録が完了しました',
        'user': get_user_by_id(user_id)
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """ログイン"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'ユーザー名とパスワードを入力してください'}), 400
    
    user_id = verify_user(username, password)
    if user_id is None:
        return jsonify({'error': 'ユーザー名またはパスワードが正しくありません'}), 401
    
    session['user_id'] = user_id
    session.permanent = True
    
    return jsonify({
        'message': 'ログインに成功しました',
        'user': get_user_by_id(user_id)
    })

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """ログアウト"""
    session.clear()
    return jsonify({'message': 'ログアウトしました'})

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """現在のユーザー情報を取得"""
    user = get_user_by_id(get_current_user_id())
    if user:
        return jsonify(user)
    return jsonify({'error': 'ユーザーが見つかりません'}), 404

# ==================== 機体関連エンドポイント ====================

@app.route('/api/drones', methods=['GET'])
@require_auth
def get_drones():
    """機体一覧取得"""
    user_id = get_current_user_id()
    type_id = request.args.get('type_id')
    
    conn = get_db()
    is_postgres = is_postgres_conn(conn)
    cursor = get_cursor(conn)
    
    placeholder = '%s' if is_postgres else '?'
    
    if type_id:
        cursor.execute(f'''
            SELECT d.*, dt.name as type_name
            FROM drones d
            JOIN drone_types dt ON d.type_id = dt.id
            WHERE d.user_id = {placeholder} AND d.type_id = {placeholder}
            ORDER BY d.created_at DESC
        ''', (user_id, type_id))
    else:
        cursor.execute(f'''
            SELECT d.*, dt.name as type_name
            FROM drones d
            JOIN drone_types dt ON d.type_id = dt.id
            WHERE d.user_id = {placeholder}
            ORDER BY d.created_at DESC
        ''', (user_id,))
    
    drones = []
    for row in cursor.fetchall():
        # パーツ一覧を取得
        cursor.execute(f'SELECT id FROM parts WHERE drone_id = {placeholder}', (row['id'],))
        part_ids = [p['id'] for p in cursor.fetchall()]
        
        drones.append({
            'id': row['id'],
            'name': row['name'],
            'type': row['type_id'],
            'typeName': row['type_name'],
            'startDate': row['start_date'],
            'photo': row['photo'],
            'status': row['status'] or 'ready',
            'parts': part_ids,
            'createdAt': row['created_at']
        })
    
    cursor.close()
    conn.close()
    return jsonify(drones)

@app.route('/api/drones/<int:drone_id>', methods=['GET'])
@require_auth
def get_drone(drone_id):
    """機体詳細取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT d.*, dt.name as type_name
        FROM drones d
        JOIN drone_types dt ON d.type_id = dt.id
        WHERE d.id = ? AND d.user_id = ?
    ''', (drone_id, user_id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': '機体が見つかりません'}), 404
    
    # パーツ一覧を取得
    cursor.execute('SELECT id FROM parts WHERE drone_id = ?', (drone_id,))
    part_ids = [p['id'] for p in cursor.fetchall()]
    
    drone = {
        'id': row['id'],
        'name': row['name'],
        'type': row['type_id'],
        'typeName': row['type_name'],
        'startDate': row['start_date'],
        'photo': row['photo'],
        'status': row['status'] or 'ready',
        'parts': part_ids,
        'createdAt': row['created_at']
    }
    
    conn.close()
    return jsonify(drone)

@app.route('/api/drones', methods=['POST'])
@require_auth
def create_drone():
    """機体追加"""
    try:
        user_id = get_current_user_id()
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'リクエストボディが空です'}), 400
        
        name = data.get('name', '').strip()
        type_id = data.get('type')
        start_date = data.get('startDate')
        photo = data.get('photo', '')
        status = data.get('status', 'ready')
        
        if not name or not type_id or not start_date:
            return jsonify({'error': '必須項目が不足しています'}), 400
        
        conn = get_db()
        is_postgres = is_postgres_conn(conn)
        cursor = get_cursor(conn)
        placeholder = '%s' if is_postgres else '?'
        
        # 種類が存在するか確認
        cursor.execute(f'SELECT id FROM drone_types WHERE id = {placeholder} AND user_id = {placeholder}', (type_id, user_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': '無効な機体種類です'}), 400
        
        if is_postgres:
            cursor.execute('''
                INSERT INTO drones (user_id, name, type_id, start_date, photo, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (user_id, name, type_id, start_date, photo, status))
            drone_id = cursor.fetchone()['id']
        else:
            cursor.execute('''
                INSERT INTO drones (user_id, name, type_id, start_date, photo, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, name, type_id, start_date, photo, status))
            drone_id = cursor.lastrowid
        
        # デフォルトパーツを追加
        cursor.execute(f'SELECT default_parts FROM drone_types WHERE id = {placeholder}', (type_id,))
        type_row = cursor.fetchone()
        if type_row and type_row['default_parts']:
            default_parts = json.loads(type_row['default_parts'])
            for part_data in default_parts:
                part_name = part_data if isinstance(part_data, str) else part_data.get('name', '')
                manufacturer_id = None if isinstance(part_data, str) else part_data.get('manufacturerId')
                
                if is_postgres:
                    cursor.execute('''
                        INSERT INTO parts (user_id, drone_id, name, start_date, manufacturer_id, replacement_history)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (user_id, drone_id, part_name, start_date, manufacturer_id, '[]'))
                else:
                    cursor.execute('''
                        INSERT INTO parts (user_id, drone_id, name, start_date, manufacturer_id, replacement_history)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (user_id, drone_id, part_name, start_date, manufacturer_id, '[]'))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'id': drone_id, 'message': '機体が追加されました'}), 201
    except Exception as e:
        import traceback
        print(f'Error in create_drone: {str(e)}')
        print(traceback.format_exc())
        return jsonify({'error': f'サーバーエラーが発生しました: {str(e)}'}), 500

@app.route('/api/drones/<int:drone_id>', methods=['PUT'])
@require_auth
def update_drone(drone_id):
    """機体更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 機体が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drones WHERE id = ? AND user_id = ?', (drone_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体が見つかりません'}), 404
    
    # 更新可能なフィールド
    updates = []
    values = []
    
    if 'name' in data:
        updates.append('name = ?')
        values.append(data['name'].strip())
    
    if 'type' in data:
        # 種類が存在するか確認
        cursor.execute('SELECT id FROM drone_types WHERE id = ? AND user_id = ?', (data['type'], user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': '無効な機体種類です'}), 400
        updates.append('type_id = ?')
        values.append(data['type'])
    
    if 'startDate' in data:
        updates.append('start_date = ?')
        values.append(data['startDate'])
    
    if 'photo' in data:
        updates.append('photo = ?')
        values.append(data['photo'])
    
    if 'status' in data:
        updates.append('status = ?')
        values.append(data['status'])
    
    if not updates:
        conn.close()
        return jsonify({'error': '更新する項目がありません'}), 400
    
    updates.append('updated_at = ?')
    values.append(datetime.now().isoformat())
    values.append(drone_id)
    
    cursor.execute(f'''
        UPDATE drones
        SET {', '.join(updates)}
        WHERE id = ?
    ''', values)
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '機体が更新されました'})

@app.route('/api/drones/<int:drone_id>', methods=['DELETE'])
@require_auth
def delete_drone(drone_id):
    """機体削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 機体が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drones WHERE id = ? AND user_id = ?', (drone_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体が見つかりません'}), 404
    
    # 関連するパーツと修理履歴はCASCADEで削除される
    cursor.execute('DELETE FROM drones WHERE id = ?', (drone_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '機体が削除されました'})

# ==================== パーツ関連エンドポイント ====================

@app.route('/api/parts', methods=['GET'])
@require_auth
def get_parts():
    """パーツ一覧取得"""
    user_id = get_current_user_id()
    drone_id = request.args.get('drone_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    if drone_id:
        cursor.execute('''
            SELECT p.*, m.name as manufacturer_name
            FROM parts p
            LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
            WHERE p.user_id = ? AND p.drone_id = ?
            ORDER BY p.created_at DESC
        ''', (user_id, drone_id))
    else:
        cursor.execute('''
            SELECT p.*, m.name as manufacturer_name
            FROM parts p
            LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        ''', (user_id,))
    
    parts = []
    for row in cursor.fetchall():
        replacement_history = json.loads(row['replacement_history'] or '[]')
        parts.append({
            'id': row['id'],
            'droneId': row['drone_id'],
            'name': row['name'],
            'startDate': row['start_date'],
            'manufacturerId': row['manufacturer_id'],
            'manufacturerName': row['manufacturer_name'],
            'replacementHistory': replacement_history,
            'createdAt': row['created_at']
        })
    
    conn.close()
    return jsonify(parts)

@app.route('/api/parts/<int:part_id>', methods=['GET'])
@require_auth
def get_part(part_id):
    """パーツ詳細取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.*, m.name as manufacturer_name
        FROM parts p
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE p.id = ? AND p.user_id = ?
    ''', (part_id, user_id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'パーツが見つかりません'}), 404
    
    replacement_history = json.loads(row['replacement_history'] or '[]')
    part = {
        'id': row['id'],
        'droneId': row['drone_id'],
        'name': row['name'],
        'startDate': row['start_date'],
        'manufacturerId': row['manufacturer_id'],
        'manufacturerName': row['manufacturer_name'],
        'replacementHistory': replacement_history,
        'createdAt': row['created_at']
    }
    
    conn.close()
    return jsonify(part)

@app.route('/api/parts', methods=['POST'])
@require_auth
def create_part():
    """パーツ追加"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    drone_id = data.get('droneId')
    name = data.get('name', '').strip()
    start_date = data.get('startDate')
    manufacturer_id = data.get('manufacturerId')
    
    if not drone_id or not name or not start_date:
        return jsonify({'error': '必須項目が不足しています'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 機体が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drones WHERE id = ? AND user_id = ?', (drone_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体が見つかりません'}), 404
    
    # メーカーが存在するか確認（指定されている場合）
    if manufacturer_id:
        cursor.execute('SELECT id FROM manufacturers WHERE id = ? AND user_id = ?', (manufacturer_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': '無効なメーカーです'}), 400
    
    cursor.execute('''
        INSERT INTO parts (user_id, drone_id, name, start_date, manufacturer_id, replacement_history)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, drone_id, name, start_date, manufacturer_id, '[]'))
    
    part_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': part_id, 'message': 'パーツが追加されました'}), 201

@app.route('/api/parts/<int:part_id>', methods=['PUT'])
@require_auth
def update_part(part_id):
    """パーツ更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # パーツが存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM parts WHERE id = ? AND user_id = ?', (part_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'パーツが見つかりません'}), 404
    
    updates = []
    values = []
    
    if 'name' in data:
        updates.append('name = ?')
        values.append(data['name'].strip())
    
    if 'startDate' in data:
        updates.append('start_date = ?')
        values.append(data['startDate'])
    
    if 'manufacturerId' in data:
        manufacturer_id = data['manufacturerId']
        if manufacturer_id:
            cursor.execute('SELECT id FROM manufacturers WHERE id = ? AND user_id = ?', (manufacturer_id, user_id))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': '無効なメーカーです'}), 400
        updates.append('manufacturer_id = ?')
        values.append(manufacturer_id)
    
    if 'replacementHistory' in data:
        updates.append('replacement_history = ?')
        values.append(json.dumps(data['replacementHistory']))
    
    if not updates:
        conn.close()
        return jsonify({'error': '更新する項目がありません'}), 400
    
    updates.append('updated_at = ?')
    values.append(datetime.now().isoformat())
    values.append(part_id)
    
    cursor.execute(f'''
        UPDATE parts
        SET {', '.join(updates)}
        WHERE id = ?
    ''', values)
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'パーツが更新されました'})

@app.route('/api/parts/<int:part_id>', methods=['DELETE'])
@require_auth
def delete_part(part_id):
    """パーツ削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # パーツが存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM parts WHERE id = ? AND user_id = ?', (part_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'パーツが見つかりません'}), 404
    
    cursor.execute('DELETE FROM parts WHERE id = ?', (part_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'パーツが削除されました'})

# ==================== 修理履歴関連エンドポイント ====================

@app.route('/api/repairs', methods=['GET'])
@require_auth
def get_repairs():
    """修理履歴一覧取得"""
    user_id = get_current_user_id()
    drone_id = request.args.get('drone_id')
    part_id = request.args.get('part_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM repairs WHERE user_id = ?'
    params = [user_id]
    
    if drone_id:
        query += ' AND drone_id = ?'
        params.append(drone_id)
    
    if part_id:
        query += ' AND part_id = ?'
        params.append(part_id)
    
    query += ' ORDER BY date DESC'
    
    cursor.execute(query, params)
    
    repairs = []
    for row in cursor.fetchall():
        repairs.append({
            'id': row['id'],
            'droneId': row['drone_id'],
            'partId': row['part_id'],
            'date': row['date'],
            'description': row['description'],
            'createdAt': row['created_at']
        })
    
    conn.close()
    return jsonify(repairs)

@app.route('/api/repairs', methods=['POST'])
@require_auth
def create_repair():
    """修理履歴追加"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    drone_id = data.get('droneId')
    part_id = data.get('partId')
    date = data.get('date')
    description = data.get('description', '').strip()
    
    if not drone_id or not date or not description:
        return jsonify({'error': '必須項目が不足しています'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 機体が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drones WHERE id = ? AND user_id = ?', (drone_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体が見つかりません'}), 404
    
    # パーツが存在するか確認（指定されている場合）
    if part_id:
        cursor.execute('SELECT id FROM parts WHERE id = ? AND user_id = ?', (part_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'パーツが見つかりません'}), 404
    
    cursor.execute('''
        INSERT INTO repairs (user_id, drone_id, part_id, date, description)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, drone_id, part_id, date, description))
    
    repair_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': repair_id, 'message': '修理履歴が追加されました'}), 201

@app.route('/api/repairs/<int:repair_id>', methods=['PUT'])
@require_auth
def update_repair(repair_id):
    """修理履歴更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 修理履歴が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM repairs WHERE id = ? AND user_id = ?', (repair_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '修理履歴が見つかりません'}), 404
    
    updates = []
    values = []
    
    if 'date' in data:
        updates.append('date = ?')
        values.append(data['date'])
    
    if 'description' in data:
        updates.append('description = ?')
        values.append(data['description'].strip())
    
    if not updates:
        conn.close()
        return jsonify({'error': '更新する項目がありません'}), 400
    
    updates.append('updated_at = ?')
    values.append(datetime.now().isoformat())
    values.append(repair_id)
    
    cursor.execute(f'''
        UPDATE repairs
        SET {', '.join(updates)}
        WHERE id = ?
    ''', values)
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '修理履歴が更新されました'})

@app.route('/api/repairs/<int:repair_id>', methods=['DELETE'])
@require_auth
def delete_repair(repair_id):
    """修理履歴削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 修理履歴が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM repairs WHERE id = ? AND user_id = ?', (repair_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '修理履歴が見つかりません'}), 404
    
    cursor.execute('DELETE FROM repairs WHERE id = ?', (repair_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '修理履歴が削除されました'})

# ==================== 機体種類関連エンドポイント ====================

@app.route('/api/drone-types', methods=['GET'])
@require_auth
def get_drone_types():
    """機体種類一覧取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM drone_types
        WHERE user_id = ?
        ORDER BY created_at DESC
    ''', (user_id,))
    
    types = []
    for row in cursor.fetchall():
        default_parts = json.loads(row['default_parts'] or '[]')
        types.append({
            'id': row['id'],
            'name': row['name'],
            'defaultParts': default_parts,
            'createdAt': row['created_at']
        })
    
    conn.close()
    return jsonify(types)

@app.route('/api/drone-types/<int:type_id>', methods=['GET'])
@require_auth
def get_drone_type(type_id):
    """機体種類詳細取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM drone_types
        WHERE id = ? AND user_id = ?
    ''', (type_id, user_id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': '機体種類が見つかりません'}), 404
    
    default_parts = json.loads(row['default_parts'] or '[]')
    type_data = {
        'id': row['id'],
        'name': row['name'],
        'defaultParts': default_parts,
        'createdAt': row['created_at']
    }
    
    conn.close()
    return jsonify(type_data)

@app.route('/api/drone-types', methods=['POST'])
@require_auth
def create_drone_type():
    """機体種類追加"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    name = data.get('name', '').strip()
    default_parts = data.get('defaultParts', [])
    
    if not name:
        return jsonify({'error': '種類名は必須です'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO drone_types (user_id, name, default_parts)
            VALUES (?, ?, ?)
        ''', (user_id, name, json.dumps(default_parts)))
        
        type_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': type_id, 'message': '機体種類が追加されました'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'この種類名は既に使用されています'}), 400

@app.route('/api/drone-types/<int:type_id>', methods=['PUT'])
@require_auth
def update_drone_type(type_id):
    """機体種類更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 種類が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drone_types WHERE id = ? AND user_id = ?', (type_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体種類が見つかりません'}), 404
    
    updates = []
    values = []
    
    if 'name' in data:
        updates.append('name = ?')
        values.append(data['name'].strip())
    
    if 'defaultParts' in data:
        updates.append('default_parts = ?')
        values.append(json.dumps(data['defaultParts']))
    
    if not updates:
        conn.close()
        return jsonify({'error': '更新する項目がありません'}), 400
    
    updates.append('updated_at = ?')
    values.append(datetime.now().isoformat())
    values.append(type_id)
    
    try:
        cursor.execute(f'''
            UPDATE drone_types
            SET {', '.join(updates)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': '機体種類が更新されました'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'この種類名は既に使用されています'}), 400

@app.route('/api/drone-types/<int:type_id>', methods=['DELETE'])
@require_auth
def delete_drone_type(type_id):
    """機体種類削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 種類が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM drone_types WHERE id = ? AND user_id = ?', (type_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '機体種類が見つかりません'}), 404
    
    # 使用中の機体があるかチェック
    cursor.execute('SELECT id FROM drones WHERE type_id = ?', (type_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'この種類を使用している機体があるため削除できません'}), 400
    
    cursor.execute('DELETE FROM drone_types WHERE id = ?', (type_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '機体種類が削除されました'})

# ==================== メーカー関連エンドポイント ====================

@app.route('/api/manufacturers', methods=['GET'])
@require_auth
def get_manufacturers():
    """メーカー一覧取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM manufacturers
        WHERE user_id = ?
        ORDER BY created_at DESC
    ''', (user_id,))
    
    manufacturers = []
    for row in cursor.fetchall():
        manufacturers.append({
            'id': row['id'],
            'name': row['name'],
            'createdAt': row['created_at']
        })
    
    conn.close()
    return jsonify(manufacturers)

@app.route('/api/manufacturers', methods=['POST'])
@require_auth
def create_manufacturer():
    """メーカー追加"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'メーカー名は必須です'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO manufacturers (user_id, name)
            VALUES (?, ?)
        ''', (user_id, name))
        
        manufacturer_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': manufacturer_id, 'message': 'メーカーが追加されました'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'このメーカー名は既に使用されています'}), 400

@app.route('/api/manufacturers/<int:manufacturer_id>', methods=['PUT'])
@require_auth
def update_manufacturer(manufacturer_id):
    """メーカー更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # メーカーが存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM manufacturers WHERE id = ? AND user_id = ?', (manufacturer_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'メーカーが見つかりません'}), 404
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'メーカー名は必須です'}), 400
    
    try:
        cursor.execute('''
            UPDATE manufacturers
            SET name = ?, updated_at = ?
            WHERE id = ?
        ''', (name, datetime.now().isoformat(), manufacturer_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'メーカーが更新されました'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'このメーカー名は既に使用されています'}), 400

@app.route('/api/manufacturers/<int:manufacturer_id>', methods=['DELETE'])
@require_auth
def delete_manufacturer(manufacturer_id):
    """メーカー削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # メーカーが存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM manufacturers WHERE id = ? AND user_id = ?', (manufacturer_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'メーカーが見つかりません'}), 404
    
    # 使用中のパーツがあるかチェック
    cursor.execute('SELECT id FROM parts WHERE manufacturer_id = ?', (manufacturer_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'このメーカーを使用しているパーツがあるため削除できません'}), 400
    
    cursor.execute('DELETE FROM manufacturers WHERE id = ?', (manufacturer_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'メーカーが削除されました'})

# ==================== 練習日関連エンドポイント ====================

@app.route('/api/practice-days', methods=['GET'])
@require_auth
def get_practice_days():
    """練習日一覧取得"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM practice_days
        WHERE user_id = ?
        ORDER BY date DESC
    ''', (user_id,))
    
    practice_days = []
    for row in cursor.fetchall():
        practice_days.append({
            'id': row['id'],
            'date': row['date'],
            'note': row['note'],
            'createdAt': row['created_at']
        })
    
    conn.close()
    return jsonify(practice_days)

@app.route('/api/practice-days', methods=['POST'])
@require_auth
def create_practice_day():
    """練習日追加"""
    try:
        user_id = get_current_user_id()
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'リクエストボディが空です'}), 400
        
        date = data.get('date')
        # noteがNoneまたは空文字列の場合はNoneにする
        note_value = data.get('note')
        if note_value is None or note_value == '':
            note = None
        else:
            note = str(note_value).strip() or None
        
        if not date:
            return jsonify({'error': '日付は必須です'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO practice_days (user_id, date, note)
                VALUES (?, ?, ?)
            ''', (user_id, date, note))
            
            practice_day_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return jsonify({'id': practice_day_id, 'message': '練習日が追加されました'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'この日付には既に練習日が登録されています'}), 400
        except Exception as e:
            conn.close()
            import traceback
            print(f'Error in create_practice_day: {str(e)}')
            print(traceback.format_exc())
            return jsonify({'error': f'データベースエラーが発生しました: {str(e)}'}), 500
    except Exception as e:
        import traceback
        print(f'Error in create_practice_day (outer): {str(e)}')
        print(traceback.format_exc())
        return jsonify({'error': f'サーバーエラーが発生しました: {str(e)}'}), 500

@app.route('/api/practice-days/<int:practice_day_id>', methods=['PUT'])
@require_auth
def update_practice_day(practice_day_id):
    """練習日更新"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 練習日が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM practice_days WHERE id = ? AND user_id = ?', (practice_day_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '練習日が見つかりません'}), 404
    
    updates = []
    values = []
    
    if 'date' in data:
        updates.append('date = ?')
        values.append(data['date'])
    
    if 'note' in data:
        updates.append('note = ?')
        values.append(data['note'].strip() or None)
    
    if not updates:
        conn.close()
        return jsonify({'error': '更新する項目がありません'}), 400
    
    updates.append('updated_at = ?')
    values.append(datetime.now().isoformat())
    values.append(practice_day_id)
    
    try:
        cursor.execute(f'''
            UPDATE practice_days
            SET {', '.join(updates)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': '練習日が更新されました'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'この日付には既に練習日が登録されています'}), 400

@app.route('/api/practice-days/<int:practice_day_id>', methods=['DELETE'])
@require_auth
def delete_practice_day(practice_day_id):
    """練習日削除"""
    user_id = get_current_user_id()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 練習日が存在し、ユーザーのものか確認
    cursor.execute('SELECT id FROM practice_days WHERE id = ? AND user_id = ?', (practice_day_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': '練習日が見つかりません'}), 404
    
    cursor.execute('DELETE FROM practice_days WHERE id = ?', (practice_day_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '練習日が削除されました'})

# ==================== データ移行エンドポイント ====================

@app.route('/api/migrate/import', methods=['POST'])
@require_auth
def import_data():
    """localStorageデータのインポート"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 機体種類のインポート
        if 'drone_types' in data:
            for type_data in data['drone_types']:
                default_parts = type_data.get('defaultParts', [])
                # 既存の種類をチェック
                cursor.execute('SELECT id FROM drone_types WHERE user_id = ? AND name = ?', (user_id, type_data['name']))
                existing = cursor.fetchone()
                if not existing:
                    cursor.execute('''
                        INSERT INTO drone_types (user_id, name, default_parts)
                        VALUES (?, ?, ?)
                    ''', (user_id, type_data['name'], json.dumps(default_parts)))
        
        # メーカーのインポート
        if 'manufacturers' in data:
            for mfg_data in data['manufacturers']:
                cursor.execute('SELECT id FROM manufacturers WHERE user_id = ? AND name = ?', (user_id, mfg_data['name']))
                existing = cursor.fetchone()
                if not existing:
                    cursor.execute('''
                        INSERT INTO manufacturers (user_id, name)
                        VALUES (?, ?)
                    ''', (user_id, mfg_data['name']))
        
        # 機体のインポート
        type_id_map = {}
        if 'drones' in data:
            for drone_data in data['drones']:
                # 種類IDをマッピング
                type_name = drone_data.get('typeName', '')
                if type_name:
                    cursor.execute('SELECT id FROM drone_types WHERE user_id = ? AND name = ?', (user_id, type_name))
                    type_row = cursor.fetchone()
                    if type_row:
                        type_id = type_row['id']
                    else:
                        # 種類が存在しない場合は作成
                        cursor.execute('''
                            INSERT INTO drone_types (user_id, name, default_parts)
                            VALUES (?, ?, ?)
                        ''', (user_id, type_name, '[]'))
                        type_id = cursor.lastrowid
                    
                    cursor.execute('''
                        INSERT INTO drones (user_id, name, type_id, start_date, photo, status)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (user_id, drone_data['name'], type_id, drone_data['startDate'], 
                          drone_data.get('photo', ''), drone_data.get('status', 'ready')))
                    drone_id = cursor.lastrowid
                    type_id_map[drone_data.get('id')] = drone_id
        
        # パーツのインポート
        part_id_map = {}
        if 'parts' in data:
            for part_data in data['parts']:
                old_drone_id = part_data.get('droneId')
                new_drone_id = type_id_map.get(old_drone_id)
                if new_drone_id:
                    manufacturer_id = None
                    if part_data.get('manufacturerId'):
                        # メーカーIDをマッピング（簡略化のため、名前で検索）
                        pass  # 実装を簡略化
                    
                    replacement_history = json.dumps(part_data.get('replacementHistory', []))
                    cursor.execute('''
                        INSERT INTO parts (user_id, drone_id, name, start_date, manufacturer_id, replacement_history)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (user_id, new_drone_id, part_data['name'], part_data['startDate'], 
                          manufacturer_id, replacement_history))
                    part_id_map[part_data.get('id')] = cursor.lastrowid
        
        # 修理履歴のインポート
        if 'repairs' in data:
            for repair_data in data['repairs']:
                old_drone_id = repair_data.get('droneId')
                new_drone_id = type_id_map.get(old_drone_id)
                if new_drone_id:
                    part_id = None
                    if repair_data.get('partId'):
                        part_id = part_id_map.get(repair_data['partId'])
                    
                    cursor.execute('''
                        INSERT INTO repairs (user_id, drone_id, part_id, date, description)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (user_id, new_drone_id, part_id, repair_data['date'], repair_data['description']))
        
        # 練習日のインポート
        if 'practice_days' in data:
            for practice_data in data['practice_days']:
                try:
                    cursor.execute('''
                        INSERT INTO practice_days (user_id, date, note)
                        VALUES (?, ?, ?)
                    ''', (user_id, practice_data['date'], practice_data.get('note')))
                except sqlite3.IntegrityError:
                    pass  # 既に存在する場合はスキップ
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'データのインポートが完了しました'})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': f'インポート中にエラーが発生しました: {str(e)}'}), 500

# ==================== 静的ファイル配信 ====================

@app.route('/')
def index():
    """メインHTMLページを配信"""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """静的ファイルを配信"""
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
