package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/difyz9/ytb2bili/internal/core"
	"github.com/difyz9/ytb2bili/internal/middleware"
	"github.com/difyz9/ytb2bili/pkg/firebase"
	"github.com/gin-gonic/gin"
)

type FirebaseHandler struct {
	BaseHandler
	Client *firebase.Client
}

func NewFirebaseHandler(app *core.AppServer) *FirebaseHandler {
	handler := &FirebaseHandler{
		BaseHandler: BaseHandler{App: app},
	}

	// 初始化Firebase客户端
	if app.Config.FirebaseConfig != nil && app.Config.FirebaseConfig.Enabled {
		handler.Client = firebase.NewClient(
			app.Config.FirebaseConfig.BaseURL,
			app.Config.FirebaseConfig.AppID,
			app.Config.FirebaseConfig.AppSecret,
		)
		log.Printf("Firebase handler initialized with client: %s", app.Config.FirebaseConfig.BaseURL)
	}

	return handler
}

// RegisterRoutes 注册Firebase相关路由
func (h *FirebaseHandler) RegisterRoutes(server *core.AppServer) {
	if h.Client == nil {
		log.Println("Firebase client not initialized, skipping Firebase routes registration")
		return
	}

	api := server.Engine.Group("/api/v1")
	
	// 创建Firebase认证中间件
	authMiddleware := middleware.NewFirebaseAuthMiddleware(h.Client)

	firebase := api.Group("/firebase")
	{
		// 用户相关
		firebase.GET("/user/profile", authMiddleware.RequireAuth(), h.getUserProfile)
		firebase.GET("/user/vip-status", authMiddleware.RequireAuth(), h.getVIPStatus)
		firebase.GET("/user/orders", authMiddleware.RequireAuth(), h.getUserOrders)
		
		// 订单相关
		firebase.POST("/orders/create", authMiddleware.RequireAuth(), h.createOrder)
		firebase.GET("/orders/:orderNo", authMiddleware.RequireAuth(), h.getOrderStatus)
		
		// VIP会员相关（需要VIP权限的示例）
		firebase.GET("/vip/features", authMiddleware.RequireVIP(), h.getVIPFeatures)
	}
}

// getUserProfile 获取用户个人信息
func (h *FirebaseHandler) getUserProfile(c *gin.Context) {
	uid := middleware.GetFirebaseUID(c)
	if uid == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未找到用户信息",
		})
		return
	}

	profile, err := h.Client.GetUserProfile(uid)
	if err != nil {
		log.Printf("Failed to get user profile: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取用户信息失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    profile,
	})
}

// getVIPStatus 获取VIP状态
func (h *FirebaseHandler) getVIPStatus(c *gin.Context) {
	uid := middleware.GetFirebaseUID(c)
	if uid == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未找到用户信息",
		})
		return
	}

	vipStatus, err := h.Client.GetVIPStatus(uid)
	if err != nil {
		log.Printf("Failed to get VIP status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取VIP状态失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    vipStatus,
	})
}

// CreateOrderRequest 创建订单请求
type CreateOrderRequest struct {
	ProductID   string `json:"product_id" binding:"required"`
	PayWay      string `json:"pay_way" binding:"required"`      // alipay, wechat, paypal, mock
	PayType     string `json:"pay_type" binding:"required"`     // h5, pc, native
	ReturnURL   string `json:"return_url"`                      // 支付成功跳转地址
	CallbackURL string `json:"callback_url"`                    // 第三方回调地址
	Extra       string `json:"extra"`                           // 自定义数据
}

// createOrder 创建订单
func (h *FirebaseHandler) createOrder(c *gin.Context) {
	uid := middleware.GetFirebaseUID(c)
	if uid == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未找到用户信息",
		})
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 调用Firebase Backend创建订单
	orderReq := &firebase.CreateOrderRequest{
		UserID:      uid,
		ProductID:   req.ProductID,
		PayWay:      req.PayWay,
		PayType:     req.PayType,
		ReturnURL:   req.ReturnURL,
		CallbackURL: req.CallbackURL,
		Extra:       req.Extra,
	}

	order, err := h.Client.CreateOrder(orderReq)
	if err != nil {
		log.Printf("Failed to create order: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建订单失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "订单创建成功",
		Data:    order,
	})
}

// getOrderStatus 查询订单状态
func (h *FirebaseHandler) getOrderStatus(c *gin.Context) {
	orderNo := c.Param("orderNo")
	if orderNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "订单号不能为空",
		})
		return
	}

	// 验证订单是否属于当前用户
	uid := middleware.GetFirebaseUID(c)
	
	status, err := h.Client.GetOrderStatus(orderNo)
	if err != nil {
		log.Printf("Failed to get order status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取订单状态失败: " + err.Error(),
		})
		return
	}

	// 检查订单是否属于当前用户
	if status.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": "无权访问该订单",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    status,
	})
}

// getUserOrders 获取用户订单列表
func (h *FirebaseHandler) getUserOrders(c *gin.Context) {
	uid := middleware.GetFirebaseUID(c)
	if uid == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未找到用户信息",
		})
		return
	}

	// 获取分页参数
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	orders, err := h.Client.GetUserOrders(uid, limit)
	if err != nil {
		log.Printf("Failed to get user orders: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取订单列表失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    orders,
	})
}

// getVIPFeatures 获取VIP专属功能（示例：需要VIP权限）
func (h *FirebaseHandler) getVIPFeatures(c *gin.Context) {
	vipStatus := middleware.GetFirebaseVIP(c)
	
	features := map[string]interface{}{
		"advanced_upload":   true,
		"batch_processing":  true,
		"priority_support":  true,
		"custom_watermark":  true,
		"higher_resolution": true,
	}

	// 根据VIP等级返回不同的功能
	if vipStatus != nil {
		features["tier"] = vipStatus.Tier
		features["expire_time"] = vipStatus.ExpireTime
		
		// 不同等级解锁不同功能
		switch vipStatus.Tier {
		case "premium":
			features["ai_translation"] = true
			features["video_analysis"] = true
		case "enterprise":
			features["ai_translation"] = true
			features["video_analysis"] = true
			features["api_access"] = true
			features["white_label"] = true
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    features,
	})
}

// HealthCheck Firebase服务健康检查
func (h *FirebaseHandler) HealthCheck(c *gin.Context) {
	if h.Client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code":    503,
			"message": "Firebase client not initialized",
			"status":  "unavailable",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "Firebase service is healthy",
		Data: gin.H{
			"status": "ok",
			"config": gin.H{
				"base_url": h.Client.BaseURL,
				"app_id":   h.Client.AppID,
			},
		},
	})
}
