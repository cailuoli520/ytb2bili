package middleware

import (
	"fmt"
	"log"
	"net/http"

	"github.com/difyz9/ytb2bili/pkg/firebase"
	"github.com/gin-gonic/gin"
)

// FirebaseAuthMiddleware Firebase认证中间件配置
type FirebaseAuthMiddleware struct {
	Client *firebase.Client
}

// NewFirebaseAuthMiddleware 创建Firebase认证中间件
func NewFirebaseAuthMiddleware(client *firebase.Client) *FirebaseAuthMiddleware {
	return &FirebaseAuthMiddleware{
		Client: client,
	}
}

// RequireAuth 要求用户已登录
func (m *FirebaseAuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头或cookie中获取Firebase UID
		uid := c.GetHeader("X-Firebase-UID")
		if uid == "" {
			uid = c.Query("uid")
		}
		if uid == "" {
			// 尝试从cookie中获取
			cookie, err := c.Cookie("firebase_uid")
			if err == nil {
				uid = cookie
			}
		}

		if uid == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "未登录，请先登录",
			})
			c.Abort()
			return
		}

		// 验证用户是否存在
		profile, err := m.Client.GetUserProfile(uid)
		if err != nil {
			log.Printf("Failed to get user profile: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "用户验证失败: " + err.Error(),
			})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("firebase_uid", uid)
		c.Set("firebase_user", profile)

		c.Next()
	}
}

// RequireVIP 要求用户是VIP会员
func (m *FirebaseAuthMiddleware) RequireVIP() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 先执行登录验证
		uid := c.GetString("firebase_uid")
		if uid == "" {
			// 如果没有通过RequireAuth，尝试获取UID
			uid = c.GetHeader("X-Firebase-UID")
			if uid == "" {
				uid = c.Query("uid")
			}
			if uid == "" {
				cookie, err := c.Cookie("firebase_uid")
				if err == nil {
					uid = cookie
				}
			}

			if uid == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"code":    401,
					"message": "未登录，请先登录",
				})
				c.Abort()
				return
			}

			// 获取用户信息
			profile, err := m.Client.GetUserProfile(uid)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"code":    401,
					"message": "用户验证失败",
				})
				c.Abort()
				return
			}
			c.Set("firebase_uid", uid)
			c.Set("firebase_user", profile)
		}

		// 检查VIP状态
		vipStatus, err := m.Client.GetVIPStatus(uid)
		if err != nil {
			log.Printf("Failed to get VIP status: %v", err)
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "VIP状态检查失败: " + err.Error(),
			})
			c.Abort()
			return
		}

		if vipStatus == nil || !vipStatus.IsVIP {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "此功能仅限VIP会员使用，请先开通会员",
			})
			c.Abort()
			return
		}

		// 将VIP状态存储到上下文中
		c.Set("firebase_vip", vipStatus)

		c.Next()
	}
}

// RequireVIPTier 要求特定等级的VIP
func (m *FirebaseAuthMiddleware) RequireVIPTier(minTier string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 先检查VIP状态
		vipStatus, exists := c.Get("firebase_vip")
		if !exists {
			// 如果没有通过RequireVIP，先检查VIP
			uid := c.GetString("firebase_uid")
			if uid == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"code":    401,
					"message": "未登录，请先登录",
				})
				c.Abort()
				return
			}

			var err error
			vipStatus, err = m.Client.GetVIPStatus(uid)
			if err != nil || vipStatus == nil {
				c.JSON(http.StatusForbidden, gin.H{
					"code":    403,
					"message": "此功能仅限VIP会员使用",
				})
				c.Abort()
				return
			}
		}

		status, ok := vipStatus.(*firebase.VIPStatus)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "VIP状态数据格式错误",
			})
			c.Abort()
			return
		}

		// 检查等级是否满足要求
		if !checkVIPTierLevel(status.Tier, minTier) {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": fmt.Sprintf("此功能需要%s及以上等级的VIP会员", minTier),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// checkVIPTierLevel 检查VIP等级是否满足要求
// 等级顺序: basic < premium < enterprise
func checkVIPTierLevel(currentTier, minTier string) bool {
	tierLevels := map[string]int{
		"basic":      1,
		"premium":    2,
		"enterprise": 3,
	}

	currentLevel, currentExists := tierLevels[currentTier]
	minLevel, minExists := tierLevels[minTier]

	if !currentExists || !minExists {
		return false
	}

	return currentLevel >= minLevel
}

// GetFirebaseUID 从上下文获取Firebase UID的辅助函数
func GetFirebaseUID(c *gin.Context) string {
	uid, _ := c.Get("firebase_uid")
	if uidStr, ok := uid.(string); ok {
		return uidStr
	}
	return ""
}

// GetFirebaseUser 从上下文获取Firebase用户信息的辅助函数
func GetFirebaseUser(c *gin.Context) *firebase.UserProfile {
	user, _ := c.Get("firebase_user")
	if profile, ok := user.(*firebase.UserProfile); ok {
		return profile
	}
	return nil
}

// GetFirebaseVIP 从上下文获取VIP状态的辅助函数
func GetFirebaseVIP(c *gin.Context) *firebase.VIPStatus {
	vip, _ := c.Get("firebase_vip")
	if status, ok := vip.(*firebase.VIPStatus); ok {
		return status
	}
	return nil
}
