package handler

import (
	"bytes"
	"fmt"
	"github.com/difyz9/bilibili-go-sdk/bilibili"
	"github.com/difyz9/ytb2bili/internal/core"
	"github.com/difyz9/ytb2bili/internal/storage"
	"github.com/difyz9/ytb2bili/pkg/firebase"
	"image/color"
	"image/png"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/skip2/go-qrcode"
)

type AuthHandler struct {
	BaseHandler
	FirebaseClient *firebase.Client // Firebase Backend SDK客户端
}

func NewAuthHandler(app *core.AppServer) *AuthHandler {
	handler := &AuthHandler{
		BaseHandler: BaseHandler{App: app},
	}
	
	// 初始化Firebase客户端（如果配置启用）
	if app.Config.FirebaseConfig != nil && app.Config.FirebaseConfig.Enabled {
		handler.FirebaseClient = firebase.NewClient(
			app.Config.FirebaseConfig.BaseURL,
			app.Config.FirebaseConfig.AppID,
			app.Config.FirebaseConfig.AppSecret,
		)
		log.Printf("Firebase Backend client initialized: %s", app.Config.FirebaseConfig.BaseURL)
	}
	
	return handler
}

// RegisterRoutes 注册认证相关路由
func (h *AuthHandler) RegisterRoutes(server *core.AppServer) {
	api := server.Engine.Group("/api/v1")

	auth := api.Group("/auth")
	{
		auth.GET("/qrcode", h.getQRCode)
		auth.GET("/qrcode/image/:authCode", h.getQRCodeImage)
		auth.POST("/poll", h.pollQRCode)
		auth.GET("/login", h.loadLoginInfo)
		auth.GET("/status", h.checkLoginStatus)
		auth.GET("/userinfo", h.getUserInfo)
		auth.POST("/logout", h.logout)
	}
}

// QRCodeRequest 二维码请求
type QRCodeRequest struct{}

// QRCodeResponse 二维码响应
type QRCodeResponse struct {
	Code      int    `json:"code"`
	Message   string `json:"message"`
	QRCodeURL string `json:"qr_code_url"`
	AuthCode  string `json:"auth_code"`
}

// getQRCode 获取登录二维码
func (h *AuthHandler) getQRCode(c *gin.Context) {
	client := bilibili.NewClient()

	qrResp, err := client.GetQRCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to get QR code: " + err.Error(),
		})
		return
	}

	if qrResp.Code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    qrResp.Code,
			"message": "Failed to get QR code",
		})
		return
	}

	// 构造完整的二维码URL
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	host := c.Request.Host
	fullQRCodeURL := fmt.Sprintf("%s://%s/api/v1/auth/qrcode/image/%s", scheme, host, qrResp.Data.AuthCode)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data: gin.H{
			"qrcode_url": fullQRCodeURL,
			"auth_code":  qrResp.Data.AuthCode,
		},
	})
}

// getQRCodeImage 生成二维码图片
func (h *AuthHandler) getQRCodeImage(c *gin.Context) {
	authCode := c.Param("authCode")
	if authCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Auth code is required",
		})
		return
	}

	// 构造B站二维码URL
	qrURL := fmt.Sprintf("https://passport.bilibili.com/x/passport-tv-login/h5/qrcode/auth?auth_code=%s", authCode)

	// 生成二维码图片
	qrCode, err := qrcode.New(qrURL, qrcode.Medium)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to generate QR code: " + err.Error(),
		})
		return
	}

	// 设置二维码颜色
	qrCode.BackgroundColor = color.RGBA{255, 255, 255, 255} // 白色背景
	qrCode.ForegroundColor = color.RGBA{0, 0, 0, 255}       // 黑色前景

	// 生成PNG图片
	img := qrCode.Image(240)

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to encode QR code image: " + err.Error(),
		})
		return
	}

	// 设置响应头
	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	// 返回图片数据
	c.Data(http.StatusOK, "image/png", buf.Bytes())
}

// PollQRCodeRequest 轮询二维码请求
type PollQRCodeRequest struct {
	AuthCode string `json:"auth_code" binding:"required"`
}

// PollQRCodeResponse 轮询二维码响应
type PollQRCodeResponse struct {
	Code      int                 `json:"code"`
	Message   string              `json:"message"`
	LoginInfo *bilibili.LoginInfo `json:"login_info,omitempty"`
}

// pollQRCode 轮询二维码登录状态
func (h *AuthHandler) pollQRCode(c *gin.Context) {
	var req PollQRCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Invalid request parameters: " + err.Error(),
		})
		return
	}

	fmt.Println("--轮询二维码--")

	client := bilibili.NewClient()

	loginInfo, err := client.PollQRCode(req.AuthCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Login failed: " + err.Error(),
		})
		return
	}

	// 获取用户完整信息并补充到LoginInfo中
	var userBasicInfo *storage.UserBasicInfo
	if loginInfo.TokenInfo.Mid > 0 {
		// 构建cookie字符串用于API调用
		cookies := buildCookieString(loginInfo.CookieInfo)

		// 优先使用myinfo API获取完整用户信息 (参考biliup-1.1.16)
		myInfo, err := client.GetMyInfoWithRetry(cookies, 2)
		if err == nil {
			// 使用myinfo API的完整信息
			loginInfo.TokenInfo.Uname = myInfo.Uname
			loginInfo.TokenInfo.Face = myInfo.Face
			if myInfo.Mid > 0 {
				loginInfo.TokenInfo.Mid = myInfo.Mid
			}
			// 转换为存储格式
			userBasicInfo = storage.ConvertMyInfoToUserInfo(myInfo)
		} else {
			log.Printf("Warning: Failed to get myinfo: %v", err)
		}
	} // 登录成功后自动保存到本地（包括用户信息）
	store := storage.GetDefaultStore()
	if userBasicInfo != nil {
		// 保存登录信息和用户信息
		if err := store.SaveWithUserInfo(loginInfo, userBasicInfo); err != nil {
			log.Printf("Warning: Failed to save login info with user info: %v", err)
			// 回退到只保存登录信息
			if err := store.Save(loginInfo); err != nil {
				log.Printf("Warning: Failed to save login info: %v", err)
			}
		}
	} else {
		// 只保存登录信息
		if err := store.Save(loginInfo); err != nil {
			log.Printf("Warning: Failed to save login info: %v", err)
		}
	}

	c.JSON(http.StatusOK, PollQRCodeResponse{
		Code:      0,
		Message:   "Login successful",
		LoginInfo: loginInfo,
	})
}

// LoadLoginInfoResponse 加载登录信息响应
type LoadLoginInfoResponse struct {
	Code      int                 `json:"code"`
	Message   string              `json:"message"`
	LoginInfo *bilibili.LoginInfo `json:"login_info,omitempty"`
}

// loadLoginInfo 从本地加载已保存的登录信息
func (h *AuthHandler) loadLoginInfo(c *gin.Context) {
	store := storage.GetDefaultStore()

	loginInfo, err := store.Load()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "No saved login info or login expired: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "Login info loaded successfully",
		Data:    loginInfo,
	})
}

// CheckLoginStatusResponse 检查登录状态响应
type CheckLoginStatusResponse struct {
	Code              int               `json:"code"`
	Message           string            `json:"message"`
	IsLoggedIn        bool              `json:"is_logged_in"`         // 用户是否登录（Firebase登录）
	BilibiliConnected bool              `json:"bilibili_connected"`   // B站账号是否已绑定
	FirebaseUser      *FirebaseUserInfo `json:"firebase_user,omitempty"` // Firebase用户信息
	BilibiliUser      *BilibiliUserInfo `json:"bilibili_user,omitempty"` // B站用户信息
}

// BilibiliUserInfo B站用户信息
type BilibiliUserInfo struct {
	Mid    string `json:"mid"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

// 保持 UserInfo 用于向后兼容
type UserInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Mid    string `json:"mid"`
	Avatar string `json:"avatar"`
}

type FirebaseUserInfo struct {
	UID         string                `json:"uid"`
	Email       string                `json:"email"`
	DisplayName string                `json:"display_name"`
	IsVIP       bool                  `json:"is_vip"`
	VIPTier     string                `json:"vip_tier"`
	VIPStatus   *firebase.VIPStatus   `json:"vip_status,omitempty"`
	Power       int                   `json:"power"`
}

// checkLoginStatus 检查登录状态（Firebase登录 + B站账号绑定）
func (h *AuthHandler) checkLoginStatus(c *gin.Context) {
	store := storage.GetDefaultStore()
	bilibiliConnected := store.IsValid()

	// 默认响应数据
	responseData := gin.H{
		"is_logged_in":        false, // 默认未登录
		"bilibili_connected": bilibiliConnected,
	}

	// 检查B站账号绑定状态，如果已绑定则返回B站用户信息
	if bilibiliConnected {
		// 优先从缓存中获取B站用户信息
		cachedUserInfo, err := store.GetUserInfo()
		if err == nil && cachedUserInfo != nil {
			// 使用缓存的B站用户信息
			responseData["bilibili_user"] = gin.H{
				"mid":    fmt.Sprintf("%d", cachedUserInfo.Mid),
				"name":   cachedUserInfo.Name,
				"avatar": cachedUserInfo.Face,
			}
		} else {
			// 没有缓存的用户信息，从API获取
			loginInfo, _ := store.Load()
			if loginInfo != nil {
				client := bilibili.NewClient()

				// 构建cookie字符串
				cookies := buildCookieString(loginInfo.CookieInfo)

				// 尝试使用myinfo API获取完整用户信息 (参考biliup-1.1.16)
				userName := fmt.Sprintf("用户_%d", loginInfo.TokenInfo.Mid) // 默认用户名
				userAvatar := ""
				userMid := fmt.Sprintf("%d", loginInfo.TokenInfo.Mid)

				// 如果登录信息中有用户名，使用它
				if loginInfo.TokenInfo.Uname != "" {
					userName = loginInfo.TokenInfo.Uname
				}
				if loginInfo.TokenInfo.Face != "" {
					userAvatar = loginInfo.TokenInfo.Face
				}

				var userBasicInfo *storage.UserBasicInfo

				// 优先使用myinfo API获取最新用户信息
				myInfo, err := client.GetMyInfoWithRetry(cookies, 2)
				if err == nil {
					// 使用myinfo API的完整信息
					userName = myInfo.Uname
					userAvatar = myInfo.Face
					userMid = fmt.Sprintf("%d", myInfo.Mid)

					// 更新并保存登录信息和用户信息
					loginInfo.TokenInfo.Uname = myInfo.Uname
					loginInfo.TokenInfo.Face = myInfo.Face
					if myInfo.Mid > 0 {
						loginInfo.TokenInfo.Mid = myInfo.Mid
					}
					userBasicInfo = storage.ConvertMyInfoToUserInfo(myInfo)
				} else {
					log.Printf("Warning: Failed to get myinfo: %v", err)
				} // 保存更新后的信息（包括用户信息）
				if userBasicInfo != nil {
					store.SaveWithUserInfo(loginInfo, userBasicInfo)
				} else {
					store.Save(loginInfo)
				}

				responseData["bilibili_user"] = gin.H{
					"mid":    userMid,
					"name":   userName,
					"avatar": userAvatar,
				}
			}
		}
	}
	
	// 检查Firebase用户登录状态
	if h.FirebaseClient != nil {
		// 从请求头或参数中获取Firebase UID
		firebaseUID := c.GetHeader("X-Firebase-UID")
		if firebaseUID == "" {
			firebaseUID = c.Query("firebase_uid")
		}
		if firebaseUID == "" {
			// 尝试从cookie获取
			cookie, err := c.Cookie("firebase_uid")
			if err == nil {
				firebaseUID = cookie
			}
		}
		
		if firebaseUID != "" {
			// 获取Firebase用户信息
			profile, err := h.FirebaseClient.GetUserProfile(firebaseUID)
			if err == nil && profile != nil {
				// 用户已通过Firebase登录
				responseData["is_logged_in"] = true
				
				firebaseUser := gin.H{
					"uid":          profile.UID,
					"email":        profile.Email,
					"display_name": profile.DisplayName,
					"power":        profile.Power,
				}
				
				// 获取VIP状态
				if profile.VIPStatus != nil {
					firebaseUser["is_vip"] = profile.VIPStatus.IsVIP
					firebaseUser["vip_tier"] = profile.VIPStatus.Tier
					firebaseUser["vip_status"] = profile.VIPStatus
				}
				
				responseData["firebase_user"] = firebaseUser
			} else {
				log.Printf("Warning: Failed to get Firebase user profile: %v", err)
			}
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    responseData,
	})
}

// GetUserInfoResponse 获取用户信息响应
type GetUserInfoResponse struct {
	Code     int                     `json:"code"`
	Message  string                  `json:"message"`
	UserInfo *bilibili.UserBasicInfo `json:"user_info,omitempty"`
}

// getUserInfo 获取当前登录用户的详细信息
func (h *AuthHandler) getUserInfo(c *gin.Context) {
	store := storage.GetDefaultStore()
	if !store.IsValid() {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "User not logged in",
		})
		return
	}

	loginInfo, err := store.Load()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to load login info: " + err.Error(),
		})
		return
	}

	client := bilibili.NewClient()

	// 构建cookie字符串
	cookies := buildCookieString(loginInfo.CookieInfo)

	// 优先使用myinfo API获取用户信息 (参考biliup-1.1.16)
	myInfo, err := client.GetMyInfoWithRetry(cookies, 3)
	if err != nil {
		log.Printf("Failed to get myinfo: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to get user info: " + err.Error(),
		})
		return
	}

	// 使用myinfo API返回的完整信息
	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "success",
		"data":    myInfo,
	})
}

// LogoutResponse 登出响应
type LogoutResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// logout 删除本地保存的登录信息（登出）
func (h *AuthHandler) logout(c *gin.Context) {
	store := storage.GetDefaultStore()

	if err := store.Delete(); err != nil {
		log.Printf("Warning: Failed to delete login info: %v", err)
	}

	c.JSON(http.StatusOK, LogoutResponse{
		Code:    0,
		Message: "Logout successful",
	})
}

// buildCookieString 构建正确的cookie字符串
func buildCookieString(cookieInfo map[string]interface{}) string {
	if cookieInfo == nil {
		return ""
	}

	// 检查是否是新的数组格式
	if cookies, ok := cookieInfo["cookies"].([]interface{}); ok {
		cookieParts := []string{}
		for _, cookie := range cookies {
			if cookieMap, ok := cookie.(map[string]interface{}); ok {
				if name, nameOk := cookieMap["name"].(string); nameOk {
					if value, valueOk := cookieMap["value"].(string); valueOk {
						cookieParts = append(cookieParts, fmt.Sprintf("%s=%s", name, value))
					}
				}
			}
		}
		if len(cookieParts) > 0 {
			return strings.Join(cookieParts, "; ")
		}
	}

	// 回退到旧的key-value格式处理
	cookieParts := []string{}
	for key, value := range cookieInfo {
		if key == "cookies" || key == "domains" {
			continue // 跳过特殊字段
		}
		if valueStr, ok := value.(string); ok {
			cookieParts = append(cookieParts, fmt.Sprintf("%s=%s", key, valueStr))
		}
	}

	if len(cookieParts) > 0 {
		return strings.Join(cookieParts, "; ")
	}

	return ""
}
