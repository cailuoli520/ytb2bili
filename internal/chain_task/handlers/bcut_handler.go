package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/difyz9/ytb2bili/internal/chain_task/base"
	"github.com/difyz9/ytb2ibili/internal/chain_task/manager"
	"github.com/difyz9/ytb2bili/internal/core"
	"github.com/difyz9/ytb2bili/pkg/cos"
	"gorm.io/gorm"
)

const (
	APIBaseURL      = "https://member.bilibili.com/x/bcut/rubick-interface"
	APIReqUpload    = APIBaseURL + "/resource/create"
	APICommitUpload = APIBaseURL + "/resource/create/complete"
	APICreateTask   = APIBaseURL + "/task"
	APIQueryResult  = APIBaseURL + "/task/result"
)

// BcutHandler B站必剪语音转录处理器
type BcutHandler struct {
	base.BaseTask
	App      *core.AppServer
	DB       *gorm.DB
	Language string // 语言代码，如 "zh", "en"
	
	// 上传相关状态
	uploadID    string
	uploadURLs  []string
	perSize     int
	clips       int
	inBossKey   string
	etags       []string
	taskID      string
}

// NewBcutHandler 创建B站必剪转录处理器
func NewBcutHandler(name string, app *core.AppServer, stateManager *manager.StateManager, client *cos.CosClient, language string) *BcutHandler {
	if language == "" {
		language = "zh" // 默认中文
	}
	
	return &BcutHandler{
		BaseTask: base.BaseTask{
			Name:         name,
			StateManager: stateManager,
			Client:       client,
		},
		App:      app,
		Language: language,
		etags:    []string{},
	}
}

// Execute 执行B站必剪转录任务
func (h *BcutHandler) Execute(context map[string]interface{}) bool {
	fmt.Println("开始使用 B站必剪 转录音频")
	
	// 检查音频文件是否存在
	audioPath := h.StateManager.OriginalWAV
	if audioPath == "" {
		// 如果没有WAV文件，尝试使用其他音频格式
		audioPath = h.StateManager.AudioFilePath
	}
	
	if _, err := os.Stat(audioPath); os.IsNotExist(err) {
		fmt.Printf("错误: 音频文件不存在: %s\n", audioPath)
		context["error"] = fmt.Sprintf("音频文件不存在: %s", audioPath)
		return false
	}
	
	fmt.Printf("📝 使用 B站必剪 转录: %s\n", audioPath)
	fmt.Printf("   语言: %s\n", h.Language)
	
	// 读取音频文件
	fileData, err := os.ReadFile(audioPath)
	if err != nil {
		fmt.Printf("❌ 读取音频文件失败: %v\n", err)
		context["error"] = fmt.Sprintf("读取音频文件失败: %v", err)
		return false
	}
	
	// 1. 申请上传
	if err := h.requestUpload(len(fileData)); err != nil {
		fmt.Printf("❌ 申请上传失败: %v\n", err)
		context["error"] = fmt.Sprintf("申请上传失败: %v", err)
		return false
	}
	
	// 2. 上传音频文件
	if err := h.uploadParts(fileData); err != nil {
		fmt.Printf("❌ 上传音频失败: %v\n", err)
		context["error"] = fmt.Sprintf("上传音频失败: %v", err)
		return false
	}
	
	// 3. 提交上传
	if err := h.commitUpload(); err != nil {
		fmt.Printf("❌ 提交上传失败: %v\n", err)
		context["error"] = fmt.Sprintf("提交上传失败: %v", err)
		return false
	}
	
	// 4. 创建转录任务
	if err := h.createTask(); err != nil {
		fmt.Printf("❌ 创建任务失败: %v\n", err)
		context["error"] = fmt.Sprintf("创建任务失败: %v", err)
		return false
	}
	
	// 5. 轮询查询结果
	result, err := h.queryResultWithRetry(60, 3*time.Second)
	if err != nil {
		fmt.Printf("❌ 查询结果失败: %v\n", err)
		context["error"] = fmt.Sprintf("查询结果失败: %v", err)
		return false
	}
	
	// 6. 保存字幕文件
	if err := h.saveSubtitle(result); err != nil {
		fmt.Printf("❌ 保存字幕失败: %v\n", err)
		context["error"] = fmt.Sprintf("保存字幕失败: %v", err)
		return false
	}
	
	fmt.Printf("✅ B站必剪转录完成，字幕文件保存至: %s\n", h.StateManager.OriginalSRT)
	context["subtitle_path"] = h.StateManager.OriginalSRT
	return true
}

// requestUpload 申请上传
func (h *BcutHandler) requestUpload(fileSize int) error {
	payload := map[string]interface{}{
		"type":       2,
		"name":       "audio.wav",
		"size":       fileSize,
		"resource_id": 0,
		"model_id":   7,
	}
	
	respData, err := h.makeRequest("POST", APIReqUpload, payload)
	if err != nil {
		return err
	}
	
	data := respData["data"].(map[string]interface{})
	h.uploadID = data["upload_id"].(string)
	h.inBossKey = data["in_boss_key"].(string)
	h.perSize = int(data["per_size"].(float64))
	
	uploadURLs := data["upload_urls"].([]interface{})
	h.uploadURLs = make([]string, len(uploadURLs))
	for i, url := range uploadURLs {
		h.uploadURLs[i] = url.(string)
	}
	
	h.clips = len(h.uploadURLs)
	
	fmt.Printf("📤 申请上传成功 - ID: %s, 分片数: %d, 分片大小: %dKB\n", 
		h.uploadID, h.clips, h.perSize/1024)
	
	return nil
}

// uploadParts 上传音频分片
func (h *BcutHandler) uploadParts(fileData []byte) error {
	for i := 0; i < h.clips; i++ {
		start := i * h.perSize
		end := start + h.perSize
		if end > len(fileData) {
			end = len(fileData)
		}
		
		fmt.Printf("📤 上传分片 %d/%d: %d-%d bytes\n", i+1, h.clips, start, end)
		
		req, err := http.NewRequest("PUT", h.uploadURLs[i], bytes.NewReader(fileData[start:end]))
		if err != nil {
			return fmt.Errorf("创建上传请求失败: %v", err)
		}
		
		req.Header.Set("Content-Type", "application/octet-stream")
		
		client := &http.Client{Timeout: 60 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("上传分片 %d 失败: %v", i, err)
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("上传分片 %d 失败，状态码: %d", i, resp.StatusCode)
		}
		
		etag := strings.Trim(resp.Header.Get("ETag"), "\"")
		h.etags = append(h.etags, etag)
		
		fmt.Printf("✅ 分片 %d 上传成功，ETag: %s\n", i+1, etag)
	}
	
	return nil
}

// commitUpload 提交上传
func (h *BcutHandler) commitUpload() error {
	parts := make([]map[string]interface{}, len(h.etags))
	for i, etag := range h.etags {
		parts[i] = map[string]interface{}{
			"part_number": i + 1,
			"etag":        etag,
		}
	}
	
	payload := map[string]interface{}{
		"in_boss_key": h.inBossKey,
		"upload_id":   h.uploadID,
		"model_id":    7,
		"parts":       parts,
	}
	
	_, err := h.makeRequest("POST", APICommitUpload, payload)
	if err != nil {
		return err
	}
	
	fmt.Println("✅ 上传提交成功")
	return nil
}

// createTask 创建转录任务
func (h *BcutHandler) createTask() error {
	payload := map[string]interface{}{
		"resource": map[string]interface{}{
			"in_boss_key": h.inBossKey,
			"upload_id":   h.uploadID,
			"model_id":    7,
		},
		"model_id": "8",
	}
	
	respData, err := h.makeRequest("POST", APICreateTask, payload)
	if err != nil {
		return err
	}
	
	data := respData["data"].(map[string]interface{})
	h.taskID = data["task_id"].(string)
	
	fmt.Printf("✅ 任务创建成功 - TaskID: %s\n", h.taskID)
	return nil
}

// queryResult 查询转录结果
func (h *BcutHandler) queryResult() (map[string]interface{}, error) {
	url := fmt.Sprintf("%s?model_id=7&task_id=%s", APIQueryResult, h.taskID)
	
	respData, err := h.makeRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	data := respData["data"].(map[string]interface{})
	return data, nil
}

// queryResultWithRetry 轮询查询结果
func (h *BcutHandler) queryResultWithRetry(maxRetries int, interval time.Duration) (map[string]interface{}, error) {
	fmt.Printf("🔄 开始查询转录结果，最多重试 %d 次...\n", maxRetries)
	
	for i := 0; i < maxRetries; i++ {
		result, err := h.queryResult()
		if err != nil {
			return nil, err
		}
		
		status := int(result["status"].(float64))
		
		switch status {
		case 2: // 成功
			fmt.Println("✅ 转录成功")
			return result, nil
		case 3: // 失败
			errorCode := "Unknown"
			if ec, ok := result["error_code"]; ok {
				errorCode = fmt.Sprintf("%v", ec)
			}
			return nil, fmt.Errorf("转录任务失败，错误代码: %s", errorCode)
		case 0, 1: // 处理中
			fmt.Printf("⏳ 转录处理中... (%d/%d)\n", i+1, maxRetries)
			time.Sleep(interval)
		default:
			return nil, fmt.Errorf("未知状态: %d", status)
		}
	}
	
	return nil, fmt.Errorf("查询超时，已重试 %d 次", maxRetries)
}

// saveSubtitle 保存字幕文件
func (h *BcutHandler) saveSubtitle(result map[string]interface{}) error {
	resultJSON := result["result"].(string)
	
	var resultData map[string]interface{}
	if err := json.Unmarshal([]byte(resultJSON), &resultData); err != nil {
		return fmt.Errorf("解析结果JSON失败: %v", err)
	}
	
	utterances, ok := resultData["utterances"].([]interface{})
	if !ok {
		return fmt.Errorf("未找到utterances数据")
	}
	
	// 创建SRT文件
	outFile, err := os.Create(h.StateManager.OriginalSRT)
	if err != nil {
		return fmt.Errorf("创建字幕文件失败: %v", err)
	}
	defer outFile.Close()
	
	// 写入SRT格式
	for i, u := range utterances {
		utterance := u.(map[string]interface{})
		text := strings.TrimSpace(utterance["transcript"].(string))
		
		// B站ASR返回的时间戳是毫秒，需要转换为秒
		startTime := int64(utterance["start_time"].(float64))
		endTime := int64(utterance["end_time"].(float64))
		
		// SRT序号（从1开始）
		fmt.Fprintf(outFile, "%d\n", i+1)
		
		// SRT时间格式: HH:MM:SS,mmm --> HH:MM:SS,mmm
		fmt.Fprintf(outFile, "%s --> %s\n",
			formatSRTTimeFromMS(startTime),
			formatSRTTimeFromMS(endTime))
		
		// 字幕文本
		fmt.Fprintf(outFile, "%s\n\n", text)
	}
	
	// 提取语言信息
	if lang, ok := resultData["language"].(string); ok {
		fmt.Printf("📝 检测到语言: %s\n", lang)
	}
	
	return nil
}

// makeRequest 发起HTTP请求
func (h *BcutHandler) makeRequest(method, url string, payload interface{}) (map[string]interface{}, error) {
	var body io.Reader
	
	if payload != nil {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("序列化请求数据失败: %v", err)
		}
		body = bytes.NewReader(jsonData)
	}
	
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}
	
	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %v", err)
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("解析响应JSON失败: %v", err)
	}
	
	code, ok := result["code"].(float64)
	if !ok || int(code) != 0 {
		message := "未知错误"
		if msg, ok := result["message"].(string); ok {
			message = msg
		}
		return nil, fmt.Errorf("API错误 (code: %.0f): %s", code, message)
	}
	
	return result, nil
}

// formatSRTTimeFromMS 格式化毫秒时间为SRT格式 (HH:MM:SS,mmm)
func formatSRTTimeFromMS(ms int64) string {
	totalSeconds := ms / 1000
	milliseconds := ms % 1000
	
	hours := totalSeconds / 3600
	minutes := (totalSeconds % 3600) / 60
	seconds := totalSeconds % 60
	
	return fmt.Sprintf("%02d:%02d:%02d,%03d", hours, minutes, seconds, milliseconds)
}
