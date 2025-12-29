# データ管理移行設計書

## 概要
ブラウザ内のlocalStorageからサーバー側のSQLiteデータベースへの移行設計

## 1. データベーススキーマ設計

### 1.1 ユーザーテーブル
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 機体種類テーブル
```sql
CREATE TABLE drone_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    default_parts TEXT,  -- JSON形式で保存
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

### 1.3 メーカーテーブル
```sql
CREATE TABLE manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

### 1.4 機体テーブル
```sql
CREATE TABLE drones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    photo TEXT,  -- Base64エンコードされた画像データ
    status TEXT DEFAULT 'ready',  -- 'ready', 'unstable', 'faulty'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES drone_types(id) ON DELETE RESTRICT
);
```

### 1.5 パーツテーブル
```sql
CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drone_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    manufacturer_id INTEGER,
    replacement_history TEXT,  -- JSON形式で保存
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
);
```

### 1.6 修理履歴テーブル
```sql
CREATE TABLE repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drone_id INTEGER NOT NULL,
    part_id INTEGER,  -- NULLの場合は機体全体の修理
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
);
```

### 1.7 練習日テーブル
```sql
CREATE TABLE practice_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);
```

## 2. ユーザー認証システム

### 2.1 認証方式
- **セッション管理**: Flask-Sessionを使用
- **パスワードハッシュ**: Werkzeugの`generate_password_hash`と`check_password_hash`を使用
- **セッション有効期限**: 30日間（設定可能）

### 2.2 認証フロー
1. ユーザーがログインフォームでユーザー名とパスワードを入力
2. サーバーがパスワードを検証
3. 検証成功時、セッションIDを発行してCookieに保存
4. 以降のリクエストではセッションIDで認証状態を確認

### 2.3 認可
- すべてのAPIエンドポイントでユーザー認証を必須とする
- ユーザーは自分のデータのみアクセス可能（user_idでフィルタリング）

## 3. APIエンドポイント設計

### 3.1 認証関連
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報取得

### 3.2 機体関連
- `GET /api/drones` - 機体一覧取得
- `GET /api/drones/<id>` - 機体詳細取得
- `POST /api/drones` - 機体追加
- `PUT /api/drones/<id>` - 機体更新
- `DELETE /api/drones/<id>` - 機体削除

### 3.3 パーツ関連
- `GET /api/parts` - パーツ一覧取得（クエリパラメータ: `drone_id`）
- `GET /api/parts/<id>` - パーツ詳細取得
- `POST /api/parts` - パーツ追加
- `PUT /api/parts/<id>` - パーツ更新
- `DELETE /api/parts/<id>` - パーツ削除

### 3.4 修理履歴関連
- `GET /api/repairs` - 修理履歴一覧取得（クエリパラメータ: `drone_id`, `part_id`）
- `GET /api/repairs/<id>` - 修理履歴詳細取得
- `POST /api/repairs` - 修理履歴追加
- `PUT /api/repairs/<id>` - 修理履歴更新
- `DELETE /api/repairs/<id>` - 修理履歴削除

### 3.5 機体種類関連
- `GET /api/drone-types` - 機体種類一覧取得
- `GET /api/drone-types/<id>` - 機体種類詳細取得
- `POST /api/drone-types` - 機体種類追加
- `PUT /api/drone-types/<id>` - 機体種類更新
- `DELETE /api/drone-types/<id>` - 機体種類削除

### 3.6 メーカー関連
- `GET /api/manufacturers` - メーカー一覧取得
- `GET /api/manufacturers/<id>` - メーカー詳細取得
- `POST /api/manufacturers` - メーカー追加
- `PUT /api/manufacturers/<id>` - メーカー更新
- `DELETE /api/manufacturers/<id>` - メーカー削除

### 3.7 練習日関連
- `GET /api/practice-days` - 練習日一覧取得（クエリパラメータ: `date`で範囲指定可能）
- `GET /api/practice-days/<id>` - 練習日詳細取得
- `POST /api/practice-days` - 練習日追加
- `PUT /api/practice-days/<id>` - 練習日更新
- `DELETE /api/practice-days/<id>` - 練習日削除

## 4. セキュリティ考慮事項

### 4.1 パスワード管理
- パスワードはハッシュ化して保存（平文保存禁止）
- パスワード強度要件（最低8文字、推奨：大文字・小文字・数字・記号を含む）

### 4.2 SQLインジェクション対策
- SQLiteのパラメータ化クエリを使用
- ORM（SQLAlchemy）または手動でパラメータ化クエリを実装

### 4.3 XSS対策
- クライアント側で入力値のサニタイズ
- サーバー側でも出力時のエスケープ処理

### 4.4 CSRF対策
- Flask-WTFを使用してCSRFトークンを実装（必要に応じて）

### 4.5 認証トークン
- セッションIDはHttpOnly Cookieに保存
- 必要に応じてSecureフラグを設定（HTTPS使用時）

## 5. データ移行戦略

### 5.1 移行手順
1. 既存のlocalStorageデータをエクスポート（JSON形式）
2. ユーザー登録（初回ログイン時に自動登録も可能）
3. エクスポートしたデータをサーバーにインポート
4. インポート完了後、localStorageをクリア

### 5.2 移行スクリプト
- `/api/migrate/import` エンドポイントを作成
- クライアント側からlocalStorageデータを送信
- サーバー側でデータを検証・変換してDBに保存

## 6. 運用考慮事項

### 6.1 データベースバックアップ
- 定期的なSQLiteファイルのバックアップ
- バックアップスクリプトの作成

### 6.2 エラーハンドリング
- APIエラーレスポンスの統一フォーマット
- クライアント側でのエラー表示

### 6.3 パフォーマンス
- インデックスの適切な設定
- 大量データ取得時のページネーション

### 6.4 ログ管理
- 認証ログの記録
- エラーログの記録

## 7. 実装の優先順位

1. **Phase 1**: データベーススキーマ作成とユーザー認証
2. **Phase 2**: 基本的なCRUD API実装（機体、パーツ、修理履歴）
3. **Phase 3**: クライアント側の変更（API呼び出しへの置き換え）
4. **Phase 4**: データ移行機能の実装
5. **Phase 5**: セキュリティ強化とテスト

