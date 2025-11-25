# Docker 部署成功总结

## 部署完成情况

✅ **Docker 镜像构建成功**
- 镜像名称: `ytb2bili:local`
- 镜像大小: 291MB
- 构建时间: 2025年11月25日

✅ **服务运行状态**

| 服务名称 | 状态 | 端口映射 | 说明 |
|---------|------|---------|------|
| ytb2bili-app | ✅ 运行中 (健康) | 8096:8096 | 主应用服务 |
| ytb2bili-mysql | ✅ 运行中 | 3307:3306 | MySQL 数据库 |
| ytb2bili-redis | ✅ 运行中 | 6379:6379 | Redis 缓存 |
| ytb2bili-nginx | ⚠️ 未启动 | - | Nginx (配置文件缺失) |

## 主要修改

### 1. Dockerfile 更新

**支持 Whisper.cpp**:
- 添加了三阶段构建
- Stage 1: 编译 whisper.cpp 库
- Stage 2: 编译 Go 应用（启用 CGO）
- Stage 3: 运行时环境

**关键技术点**:
- 使用 Go 1.24-alpine 构建
- 启用 CGO 支持 Whisper 绑定
- 复制所需的库文件：
  - libwhisper.a
  - libggml.a
  - libggml-base.a
  - libggml-cpu.a
- 添加运行时依赖：libstdc++, libgcc

### 2. docker-compose.yml 更新

**端口调整**:
- MySQL: 3306 → 3307 (避免与本地 MySQL 冲突)
- Nginx HTTP: 80 → 9026 (避免端口占用)
- Nginx HTTPS: 443 → 9443

**移除 version 字段**: 符合 Docker Compose 最新规范

## 访问地址

- **主应用API**: http://localhost:8096
- **健康检查**: http://localhost:8096/health
- **MySQL数据库**: localhost:3307
  - 用户名: ytb2bili
  - 密码: ytb2bili_2024
  - 数据库: ytb2bili
- **Redis缓存**: localhost:6379

## 任务链架构

系统现在运行双任务链架构：

### 下载任务链 (DownloadChainHandler)
- 每 5 秒检查一次待处理任务
- 负责: 下载视频 → 生成字幕 → 翻译字幕 → 生成元数据
- 状态流转: 001 → 002 → 200

### 上传任务链 (UploadScheduler)
- 每 5 分钟检查一次
- 每小时上传一个视频
- 视频上传后 1 小时自动上传字幕
- 状态流转: 200 → 201 → 300 → 301 → 400

## 常用命令

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看应用日志
docker compose logs ytb2bili -f

# 查看所有服务日志
docker compose logs -f

# 停止所有服务
docker compose down

# 重新构建并启动
docker compose up -d --build

# 进入应用容器
docker exec -it ytb2bili-app sh

# 进入 MySQL 容器
docker exec -it ytb2bili-mysql mysql -uytb2bili -pytb2bili_2024 ytb2bili
```

## 数据持久化

数据卷配置：
- `ytb2bili_data`: 应用数据 (/data/ytb2bili)
- `ytb2bili_logs`: 应用日志 (/app/logs)
- `mysql_data`: MySQL 数据
- `redis_data`: Redis 数据

## 注意事项

1. **Nginx 未启动**: 由于缺少 nginx.conf 配置文件，Nginx 容器未能启动。如果不需要 Nginx 反向代理，可以在 docker-compose.yml 中注释掉 Nginx 服务。

2. **Whisper 模型**: 如果要使用 Whisper 转录功能，需要：
   - 下载 Whisper 模型文件
   - 在 config.toml 中配置 WhisperConfig
   - 将模型文件挂载到容器中

3. **配置文件**: 应用使用 `config.toml` 配置，请确保配置文件存在并正确配置。

4. **端口冲突**: 如果遇到端口占用问题，可以修改 docker-compose.yml 中的端口映射。

## 后续步骤

1. 如需使用 Nginx，创建 `nginx.conf` 配置文件
2. 配置 Whisper 模型（如需使用语音转录功能）
3. 配置 Bilibili 登录信息
4. 添加 YouTube 视频 URL 开始下载

## 验证部署

访问健康检查端点验证服务是否正常：
```bash
curl http://localhost:8096/health
```

预期返回：
```json
{
  "status": "ok",
  "message": "Bili Up Backend API is running",
  "time": "2025-11-25T21:30:00+08:00"
}
```
