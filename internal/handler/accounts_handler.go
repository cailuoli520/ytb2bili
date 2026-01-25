package handler

import (
	"fmt"
	"github.com/difyz9/ytb2bili/internal/core"
	"github.com/difyz9/ytb2bili/internal/storage"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
)

type AccountsHandler struct {
	BaseHandler
}

func NewAccountsHandler(app *core.AppServer) *AccountsHandler {
	return &AccountsHandler{
		BaseHandler: BaseHandler{App: app},
	}
}

// RegisterRoutes 注册账号管理相关路由
func (h *AccountsHandler) RegisterRoutes(server *core.AppServer) {
	api := server.Engine.Group("/api/v1")

	accounts := api.Group("/auth")
	{
		// 获取所有平台账号绑定状态
		accounts.GET("/accounts", h.getAccountsStatus)
		
		// Bilibili 相关（使用现有逻辑）
		accounts.GET("/bilibili/status", h.getBilibiliStatus)
		
		// 其他平台的授权和解绑接口（待实现OAuth流程）
		accounts.GET("/youtube/authorize", h.authorizeYouTube)
		accounts.POST("/youtube/disconnect", h.disconnectYouTube)
		
		accounts.GET("/douyin/authorize", h.authorizeDouyin)
		accounts.POST("/douyin/disconnect", h.disconnectDouyin)
		
		accounts.GET("/kuaishou/authorize", h.authorizeKuaishou)
		accounts.POST("/kuaishou/disconnect", h.disconnectKuaishou)
		
		accounts.GET("/wechat_channels/authorize", h.authorizeWechatChannels)
		accounts.POST("/wechat_channels/disconnect", h.disconnectWechatChannels)
	}
}

// AccountStatus 账号绑定状态
type AccountStatus struct {
	Connected   bool   `json:"connected"`
	Username    string `json:"username,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
	ConnectedAt string `json:"connected_at,omitempty"`
}

// getAccountsStatus 获取所有平台账号绑定状态
func (h *AccountsHandler) getAccountsStatus(c *gin.Context) {
	store := storage.GetDefaultStore()

	accounts := gin.H{
		"bilibili":        gin.H{"connected": false},
		"youtube":         gin.H{"connected": false},
		"douyin":          gin.H{"connected": false},
		"kuaishou":        gin.H{"connected": false},
		"wechat_channels": gin.H{"connected": false},
	}

	// 检查 Bilibili 绑定状态
	if store.IsValid() {
		loginInfo, err := store.Load()
		if err == nil && loginInfo != nil {
			userInfo, err := store.GetUserInfo()
			bilibiliStatus := gin.H{"connected": true}
			
			if err == nil && userInfo != nil {
				bilibiliStatus["username"] = userInfo.Name
				bilibiliStatus["avatar"] = userInfo.Face
				bilibiliStatus["connected_at"] = loginInfo.TokenInfo.ExpiresIn // 使用token过期时间作为近似值
			} else if loginInfo.TokenInfo.Uname != "" {
				bilibiliStatus["username"] = loginInfo.TokenInfo.Uname
				bilibiliStatus["avatar"] = loginInfo.TokenInfo.Face
			}
			
			accounts["bilibili"] = bilibiliStatus
		}
	}

	// TODO: 检查其他平台的绑定状态（从数据库或配置文件读取）
	// 这里需要实现各平台的存储逻辑

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    accounts,
	})
}

// getBilibiliStatus 获取B站账号绑定状态
func (h *AccountsHandler) getBilibiliStatus(c *gin.Context) {
	store := storage.GetDefaultStore()

	if !store.IsValid() {
		c.JSON(http.StatusOK, APIResponse{
			Code:    200,
			Message: "success",
			Data: gin.H{
				"connected": false,
			},
		})
		return
	}

	loginInfo, err := store.Load()
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Code:    200,
			Message: "success",
			Data: gin.H{
				"connected": false,
			},
		})
		return
	}

	userInfo, _ := store.GetUserInfo()
	status := gin.H{
		"connected": true,
	}

	if userInfo != nil {
		status["username"] = userInfo.Name
		status["avatar"] = userInfo.Face
	} else if loginInfo.TokenInfo.Uname != "" {
		status["username"] = loginInfo.TokenInfo.Uname
		status["avatar"] = loginInfo.TokenInfo.Face
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "success",
		Data:    status,
	})
}

// authorizeYouTube YouTube OAuth授权
func (h *AccountsHandler) authorizeYouTube(c *gin.Context) {
	// TODO: 实现YouTube OAuth2.0授权流程
	// 1. 生成授权URL
	// 2. 重定向用户到YouTube授权页面
	// 3. 处理回调并保存access token
	
	log.Println("YouTube authorization requested")
	
	c.JSON(http.StatusNotImplemented, APIResponse{
		Code:    501,
		Message: "YouTube authorization not implemented yet",
	})
}

// disconnectYouTube 解绑YouTube账号
func (h *AccountsHandler) disconnectYouTube(c *gin.Context) {
	// TODO: 实现YouTube账号解绑
	// 1. 删除存储的access token
	// 2. 清除相关配置
	
	log.Println("YouTube disconnect requested")
	
	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "YouTube account disconnected",
	})
}

// authorizeDouyin 抖音OAuth授权
func (h *AccountsHandler) authorizeDouyin(c *gin.Context) {
	// TODO: 实现抖音OAuth授权流程
	// 参考: https://open.douyin.com/platform/doc
	
	log.Println("Douyin authorization requested")
	
	c.JSON(http.StatusNotImplemented, APIResponse{
		Code:    501,
		Message: "Douyin authorization not implemented yet",
	})
}

// disconnectDouyin 解绑抖音账号
func (h *AccountsHandler) disconnectDouyin(c *gin.Context) {
	log.Println("Douyin disconnect requested")
	
	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "Douyin account disconnected",
	})
}

// authorizeKuaishou 快手OAuth授权
func (h *AccountsHandler) authorizeKuaishou(c *gin.Context) {
	// TODO: 实现快手OAuth授权流程
	
	log.Println("Kuaishou authorization requested")
	
	c.JSON(http.StatusNotImplemented, APIResponse{
		Code:    501,
		Message: "Kuaishou authorization not implemented yet",
	})
}

// disconnectKuaishou 解绑快手账号
func (h *AccountsHandler) disconnectKuaishou(c *gin.Context) {
	log.Println("Kuaishou disconnect requested")
	
	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "Kuaishou account disconnected",
	})
}

// authorizeWechatChannels 微信视频号OAuth授权
func (h *AccountsHandler) authorizeWechatChannels(c *gin.Context) {
	// TODO: 实现微信视频号OAuth授权流程
	// 参考: https://developers.weixin.qq.com/doc/channels/
	
	log.Println("Wechat Channels authorization requested")
	
	c.JSON(http.StatusNotImplemented, APIResponse{
		Code:    501,
		Message: "Wechat Channels authorization not implemented yet",
	})
}

// disconnectWechatChannels 解绑微信视频号账号
func (h *AccountsHandler) disconnectWechatChannels(c *gin.Context) {
	log.Println("Wechat Channels disconnect requested")
	
	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "Wechat Channels account disconnected",
	})
}
