# データ移行ガイド

## 概要
このガイドでは、ブラウザ内のlocalStorageからサーバー側のSQLiteデータベースへのデータ移行方法を説明します。

## 移行手順

### 1. サーバーの起動
```bash
python server.py
```

### 2. ブラウザでアプリケーションにアクセス
http://localhost:8000 にアクセスします。

### 3. 新規ユーザー登録
- 「新規登録」ボタンをクリック
- ユーザー名、パスワード（8文字以上）、メールアドレス（任意）を入力
- 登録を完了

### 4. 既存データのエクスポート（手動）
ブラウザの開発者ツール（F12）を開き、コンソールで以下のコマンドを実行：

```javascript
// localStorageからデータを取得
const exportData = {
    drones: JSON.parse(localStorage.getItem('drones') || '[]'),
    parts: JSON.parse(localStorage.getItem('parts') || '[]'),
    repairs: JSON.parse(localStorage.getItem('repairs') || '[]'),
    drone_types: JSON.parse(localStorage.getItem('drone_types') || '[]'),
    practice_days: JSON.parse(localStorage.getItem('practice_days') || '[]'),
    manufacturers: JSON.parse(localStorage.getItem('manufacturers') || '[]')
};

// データをJSONファイルとしてダウンロード
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'drone-manager-export.json';
a.click();
```

### 5. データのインポート
エクスポートしたJSONファイルを開き、以下のコマンドをコンソールで実行：

```javascript
// エクスポートしたJSONファイルの内容を読み込む
// （実際のデータに置き換えてください）
const importData = {
    drones: [...],  // エクスポートしたデータ
    parts: [...],
    repairs: [...],
    drone_types: [...],
    practice_days: [...],
    manufacturers: [...]
};

// APIを呼び出してインポート
fetch('/api/migrate/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(importData)
})
.then(res => res.json())
.then(data => {
    console.log('インポート完了:', data);
    alert('データのインポートが完了しました');
})
.catch(err => {
    console.error('インポートエラー:', err);
    alert('インポート中にエラーが発生しました: ' + err.message);
});
```

### 6. 移行確認
- ホーム画面でデータが正しく表示されることを確認
- 機体、パーツ、修理履歴などがすべて表示されることを確認

### 7. localStorageのクリア（オプション）
移行が完了し、正常に動作することを確認したら、localStorageをクリアできます：

```javascript
// 注意: この操作は取り消せません
localStorage.clear();
location.reload();
```

## 注意事項

1. **バックアップ**: 移行前に必ずデータのバックアップを取ってください
2. **テスト**: 本番環境で移行する前に、テスト環境で移行を試してください
3. **IDの変更**: 移行後、データのIDは新しいものになります
4. **写真データ**: Base64エンコードされた写真データも移行されますが、サイズが大きい場合は時間がかかる場合があります

## トラブルシューティング

### インポートが失敗する場合
- ブラウザのコンソールでエラーメッセージを確認
- サーバーのログを確認
- データ形式が正しいか確認（JSON形式）

### データが表示されない場合
- ブラウザをリロード
- ログアウトして再度ログイン
- サーバーのログを確認

