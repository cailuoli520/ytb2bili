# Firebase Backend 集成指南

本文档说明如何在 ytb2bili 项目中集成 Firebase Backend 服务，实现用户认证、VIP会员管理和订单处理。

## 目录

1. [配置说明](#配置说明)
2. [SDK使用](#sdk使用)
3. [API接口](#api接口)
4. [中间件使用](#中间件使用)
5. [使用示例](#使用示例)

## 配置说明

### 1. 配置文件设置

在 `config.toml` 中添加 Firebase Backend 配置：

```toml
[FirebaseConfig]
  enabled = true                              # 是否启用Firebase用户认证
  base_url = "http://localhost:8080"          # Firebase Backend服务地址
  app_id = "ytb2bili_app"                     # 应用ID（需要在Firebase Backend中注册）
  app_secret = "your-app-secret-here"         # 应用密钥（需要从Firebase Backend获取）
```

### 2. 获取应用凭证

在 Firebase Backend 中注册应用，获取 `app_id` 和 `app_secret`：

```bash
# 在 firebase_backend 项目中注册应用
curl -X POST http://localhost:8080/api/admin/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ytb2bili_app",
    "description": "YouTube to Bilibili conversion app"
  }'
```

## SDK使用

### 初始化客户端

```go
import "github.com/difyz9/ytb2bili/pkg/firebase"

// 创建Firebase客户端
client := firebase.NewClient(
    "http://localhost:8080",  // Base URL
    "ytb2bili_app",            // App ID
    "your-app-secret",         // App Secret
)
```

### 获取用户信息

```go
// 获取用户完整信息
profile, err := client.GetUserProfile(uid)
if err != nil {
    log.Printf("Failed to get user profile: %v", err)
    return
}

fmt.Printf("User: %s (%s)\n", profile.DisplayName, profile.Email)
fmt.Printf("Power: %d\n", profile.Power)
```

### 检查VIP状态

```go
// 获取VIP状态
vipStatus, err := client.GetVIPStatus(uid)
if err != nil {
    log.Printf("Failed to get VIP status: %v", err)
    return
}

if vipStatus.IsVIP {
    fmt.Printf("VIP Tier: %s\n", vipStatus.Tier)
    fmt.Printf("Expire Time: %v\n", vipStatus.ExpireTime)
}
```

### 创建订单

```go
// 创建订单
orderReq := &firebase.CreateOrderRequest{
    UserID:      uid,
    ProductID:   "vip_premium_monthly",
    PayWay:      "alipay",    // alipay, wechat, paypal, mock
    PayType:     "h5",        // h5, pc, native
    ReturnURL:   "https://your-domain.com/payment/success",
    CallbackURL: "https://your-domain.com/api/payment/callback",
    Extra:       "custom_data",
}

order, err := client.CreateOrder(orderReq)
if err != nil {
    log.Printf("Failed to create order: %v", err)
    return
}

fmt.Printf("Order No: %s\n", order.OrderNo)
fmt.Printf("Amount: %.2f\n", order.Amount)
```

### 查询订单状态

```go
// 查询订单状态
status, err := client.GetOrderStatus(orderNo)
if err != nil {
    log.Printf("Failed to get order status: %v", err)
    return
}

fmt.Printf("Status: %s\n", status.Status)
if status.PaidAt != nil {
    fmt.Printf("Paid at: %v\n", *status.PaidAt)
}
```

## API接口

### 用户相关接口

#### 1. 检查登录状态（增强版）

```
GET /api/v1/auth/status
```

请求头：
```
X-Firebase-UID: user_firebase_uid
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "is_logged_in": true,
  "user": {
    "id": "12345",
    "name": "用户名",
    "mid": "12345",
    "avatar": "https://..."
  },
  "firebase_user": {
    "uid": "firebase_uid_123",
    "email": "user@example.com",
    "display_name": "用户名",
    "is_vip": true,
    "vip_tier": "premium",
    "power": 1000,
    "vip_status": {
      "is_vip": true,
      "tier": "premium",
      "expire_time": "2026-12-31T23:59:59Z"
    }
  }
}
```

#### 2. 获取用户信息

```
GET /api/v1/firebase/user/profile
```

请求头：
```
X-Firebase-UID: user_firebase_uid
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uid": "firebase_uid_123",
    "email": "user@example.com",
    "display_name": "用户名",
    "power": 1000,
    "vip_status": {
      "is_vip": true,
      "tier": "premium",
      "expire_time": "2026-12-31T23:59:59Z"
    }
  }
}
```

#### 3. 获取VIP状态

```
GET /api/v1/firebase/user/vip-status
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "is_vip": true,
    "tier": "premium",
    "expire_time": "2026-12-31T23:59:59Z"
  }
}
```

### 订单相关接口

#### 1. 创建订单

```
POST /api/v1/firebase/orders/create
```

请求体：
```json
{
  "product_id": "vip_premium_monthly",
  "pay_way": "alipay",
  "pay_type": "h5",
  "return_url": "https://your-domain.com/success",
  "callback_url": "https://your-domain.com/callback",
  "extra": "custom_data"
}
```

响应：
```json
{
  "code": 0,
  "message": "订单创建成功",
  "data": {
    "order_no": "ORD20260125001",
    "amount": 29.90,
    "product": "Premium VIP - Monthly",
    "created_at": "2026-01-25T10:00:00Z"
  }
}
```

#### 2. 查询订单状态

```
GET /api/v1/firebase/orders/:orderNo
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_no": "ORD20260125001",
    "status": "paid",
    "amount": 29.90,
    "user_id": "firebase_uid_123",
    "pay_way": "alipay",
    "paid_at": "2026-01-25T10:05:00Z",
    "created_at": "2026-01-25T10:00:00Z"
  }
}
```

#### 3. 获取用户订单列表

```
GET /api/v1/firebase/user/orders?limit=20
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "order_no": "ORD20260125001",
      "status": "paid",
      "amount": 29.90,
      "created_at": "2026-01-25T10:00:00Z"
    }
  ]
}
```

## 中间件使用

### 1. 要求用户登录

```go
import "github.com/difyz9/ytb2bili/internal/middleware"

// 创建认证中间件
authMiddleware := middleware.NewFirebaseAuthMiddleware(firebaseClient)

// 在路由中使用
router.GET("/protected", authMiddleware.RequireAuth(), handler)
```

在处理函数中获取用户信息：

```go
func handler(c *gin.Context) {
    uid := middleware.GetFirebaseUID(c)
    user := middleware.GetFirebaseUser(c)
    
    fmt.Printf("User UID: %s\n", uid)
    fmt.Printf("User Email: %s\n", user.Email)
}
```

### 2. 要求VIP会员

```go
// 要求任意VIP等级
router.GET("/vip-only", authMiddleware.RequireVIP(), handler)

// 要求特定VIP等级
router.GET("/premium-only", authMiddleware.RequireVIPTier("premium"), handler)
router.GET("/enterprise-only", authMiddleware.RequireVIPTier("enterprise"), handler)
```

VIP等级说明：
- `basic`: 基础会员
- `premium`: 高级会员
- `enterprise`: 企业会员

## 使用示例

### 示例1: 保护需要VIP权限的上传功能

```go
// 在handler中注册路由
func RegisterRoutes(server *core.AppServer) {
    firebaseClient := firebase.NewClient(
        server.Config.FirebaseConfig.BaseURL,
        server.Config.FirebaseConfig.AppID,
        server.Config.FirebaseConfig.AppSecret,
    )
    
    authMiddleware := middleware.NewFirebaseAuthMiddleware(firebaseClient)
    
    api := server.Engine.Group("/api/v1")
    
    // 普通用户可访问
    api.POST("/upload/basic", uploadBasicHandler)
    
    // VIP用户可访问
    api.POST("/upload/premium", 
        authMiddleware.RequireVIP(), 
        uploadPremiumHandler)
    
    // 企业VIP用户可访问
    api.POST("/upload/batch", 
        authMiddleware.RequireVIPTier("enterprise"), 
        uploadBatchHandler)
}
```

### 示例2: 在上传前检查VIP状态

```go
func uploadHandler(c *gin.Context) {
    // 获取Firebase用户信息
    vipStatus := middleware.GetFirebaseVIP(c)
    
    // 根据VIP等级决定上传参数
    var maxFileSize int64
    var maxResolution string
    
    if vipStatus != nil && vipStatus.IsVIP {
        switch vipStatus.Tier {
        case "premium":
            maxFileSize = 5 * 1024 * 1024 * 1024 // 5GB
            maxResolution = "4K"
        case "enterprise":
            maxFileSize = 20 * 1024 * 1024 * 1024 // 20GB
            maxResolution = "8K"
        default:
            maxFileSize = 1 * 1024 * 1024 * 1024 // 1GB
            maxResolution = "1080P"
        }
    } else {
        maxFileSize = 500 * 1024 * 1024 // 500MB
        maxResolution = "720P"
    }
    
    // 处理上传逻辑...
}
```

### 示例3: 创建VIP购买流程

```go
func purchaseVIPHandler(c *gin.Context) {
    uid := middleware.GetFirebaseUID(c)
    
    var req struct {
        Plan    string `json:"plan"` // monthly, yearly
        Tier    string `json:"tier"` // premium, enterprise
        PayWay  string `json:"pay_way"` // alipay, wechat
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    // 构建产品ID
    productID := fmt.Sprintf("vip_%s_%s", req.Tier, req.Plan)
    
    // 创建订单
    orderReq := &firebase.CreateOrderRequest{
        UserID:    uid,
        ProductID: productID,
        PayWay:    req.PayWay,
        PayType:   "h5",
        ReturnURL: "https://your-domain.com/payment/success",
    }
    
    order, err := firebaseClient.CreateOrder(orderReq)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{
        "order_no": order.OrderNo,
        "amount":   order.Amount,
        "product":  order.Product,
    })
}
```

## 错误处理

所有接口遵循统一的错误响应格式：

```json
{
  "code": 401,
  "message": "未登录，请先登录"
}
```

常见错误码：
- `400`: 请求参数错误
- `401`: 未登录或认证失败
- `403`: 权限不足（如非VIP用户访问VIP功能）
- `500`: 服务器内部错误

## 注意事项

1. **安全性**：确保 `app_secret` 保密，不要提交到代码仓库
2. **HTTPS**：生产环境必须使用 HTTPS 传输用户凭证
3. **错误处理**：所有API调用都应该有适当的错误处理
4. **缓存**：可以缓存VIP状态减少API调用，但要注意过期时间
5. **测试**：开发环境可以设置 `enabled = false` 跳过Firebase认证

## 开发和测试

### 本地测试

1. 启动 Firebase Backend 服务：
```bash
cd firebase_backend
./start-dev.sh
```

2. 配置 ytb2bili：
```toml
[FirebaseConfig]
  enabled = true
  base_url = "http://localhost:8080"
  app_id = "ytb2bili_app"
  app_secret = "test-secret"
```

3. 使用 mock 支付进行测试：
```bash
curl -X POST http://localhost:8096/api/v1/firebase/orders/create \
  -H "X-Firebase-UID: test_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "vip_premium_monthly",
    "pay_way": "mock",
    "pay_type": "h5"
  }'
```

## 常见问题

### Q: 如何在前端传递Firebase UID？

A: 有三种方式：
1. 请求头：`X-Firebase-UID: user_uid`
2. URL参数：`?firebase_uid=user_uid`
3. Cookie：设置名为 `firebase_uid` 的cookie

### Q: VIP权限检查失败怎么办？

A: 检查以下几点：
1. Firebase Backend 服务是否正常运行
2. `app_id` 和 `app_secret` 是否正确
3. 用户是否真的是VIP会员
4. VIP会员是否已过期

### Q: 如何测试不同VIP等级的功能？

A: 在 Firebase Backend 中可以手动为测试用户设置VIP状态，或使用 mock 支付完成测试购买。

## 更多信息

- Firebase Backend 项目：`/firebase_backend`
- Firebase Backend API 文档：`http://localhost:8080/swagger/index.html`
- SDK 源码：`/ytb2bili/pkg/firebase/client.go`
