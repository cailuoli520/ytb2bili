# Firebase 认证与 B站登录说明

## 两个独立的认证系统

ytb2bili 项目使用了两个独立的认证系统：

### 1. Firebase 认证（用户账户系统）
- **用途**: 用户注册、登录、VIP会员管理、订单管理
- **登录方式**: 邮箱密码登录
- **API**: `/api/v1/firebase/*`
- **状态字段**: `response.firebase_user`

### 2. B站认证（视频上传）
- **用途**: 上传视频到B站需要B站账号授权
- **登录方式**: 扫描B站二维码
- **API**: `/api/v1/auth/*`
- **状态字段**: `response.is_logged_in` 和 `response.user`

## 当前状态解释

当你看到：
```json
{
  "code": 0,
  "message": "success",
  "is_logged_in": false
}
```

这表示：
- ✅ **Firebase 登录**: 已成功（你可以访问用户中心、购买VIP等）
- ❌ **B站登录**: 未登录（还不能上传视频到B站）

## 完整的用户状态响应

正常情况下，`/api/v1/auth/status` 应该返回：

```json
{
  "code": 0,
  "message": "success",
  "is_logged_in": false,           // B站登录状态
  "firebase_user": {                // Firebase用户信息
    "uid": "firebase_uid_123",
    "email": "user@example.com",
    "display_name": "用户名",
    "is_vip": false,
    "vip_tier": "",
    "power": 0
  }
}
```

## 为什么没有 firebase_user 字段？

需要完成以下步骤：

### 步骤1: 确认 Firebase Authentication 登录成功

在浏览器控制台检查：
```javascript
import { auth } from '@/lib/firebase';
console.log('Firebase User:', auth.currentUser);
```

应该看到用户信息（uid, email等）。

### 步骤2: 在 Firebase Backend 中创建用户记录

Firebase Authentication 只是认证层，还需要在 Firebase Backend 数据库中创建用户记录。

有两种方式：

#### 方式A: 自动创建（推荐）

修改前端登录成功后的处理，调用 Firebase Backend API 创建/更新用户：

```typescript
// 在登录成功后
const user = auth.currentUser;
if (user) {
  // 调用后端API创建用户（如果不存在）
  await fetch(`http://localhost:8085/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
    }),
  });
}
```

#### 方式B: 手动在 Firebase Backend 中注册

访问 Firebase Backend 的管理界面或使用 API 手动创建用户。

### 步骤3: 验证用户信息

访问：
```
http://localhost:8096/api/v1/auth/status?firebase_uid=YOUR_FIREBASE_UID
```

应该返回完整的用户信息。

## 工作流程示意

```
用户访问网站
    ↓
Firebase 邮箱密码登录 → 获取 Firebase UID
    ↓
前端自动携带 X-Firebase-UID 请求头
    ↓
ytb2bili 后端调用 Firebase Backend API
    ↓
返回用户信息（VIP状态、算力等）
    ↓
如果需要上传视频 → 扫描B站二维码登录
    ↓
上传视频到B站
```

## 快速测试

### 1. 测试 Firebase 登录状态

打开浏览器控制台：
```javascript
// 查看当前 Firebase 用户
import { auth } from '@/lib/firebase';
console.log(auth.currentUser);

// 查看 Zustand store
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
console.log(useFirebaseUserStore.getState());
```

### 2. 测试 B站登录状态

访问: http://localhost:3002/

点击"登录" → 会显示B站二维码 → 扫码登录 → B站登录成功

### 3. 完整状态检查

```bash
# 获取 Firebase UID（从浏览器控制台）
FIREBASE_UID="your_firebase_uid_here"

# 测试完整状态
curl "http://localhost:8096/api/v1/auth/status?firebase_uid=$FIREBASE_UID" | jq .
```

## 当前需要做的事

1. **前端**: 确认 Firebase 登录成功，获取用户 UID
2. **后端**: 确保 Firebase Backend 中有对应的用户记录
3. **验证**: 检查 `/api/v1/auth/status` 返回完整信息

## 添加自动用户创建

我建议在前端 `firebaseUserStore.ts` 的登录成功后自动调用后端创建用户：

```typescript
// 在 signInWithEmail 成功后添加
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')}/api/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Firebase-UID': userCredential.user.uid,
  },
  body: JSON.stringify({
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    displayName: userCredential.user.displayName || userCredential.user.email,
  }),
});
```

这样就不需要手动创建用户了。
