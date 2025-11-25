# 使用 difyz9/ytb2bili:latest 镜像部署指南

## 概述

`difyz9/ytb2bili:latest` 是一个预构建的 Docker 镜像，包含了完整的 YouTube 视频下载并上传到 Bilibili 的自动化工具。

**镜像信息**:
- 镜像名称: `difyz9/ytb2bili:latest`
- 镜像大小: 约 291MB
- 基础系统: Alpine Linux
- Go 版本: 1.24
- 包含功能: Whisper 语音识别、yt-dlp、FFmpeg

## 快速开始

### 方式一：使用 Docker Run（最简单）

```bash
# 拉取镜像
docker pull difyz9/ytb2bili:latest

# 创建配置文件（如果还没有）
cp config.toml.example config.toml

# 运行容器
docker run -d \
  --name ytb2bili \
  -p 8096:8096 \
  -v $(pwd)/config.toml:/app/config.toml:ro \
  -v ytb2bili_data:/data/ytb2bili \
  -v ytb2bili_logs:/app/logs \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  difyz9/ytb2bili:latest
```

### 方式二：使用 Docker Compose（推荐）

#### 1. 创建 docker-compose.yml

```yaml
services:
  ytb2bili:
    image: difyz9/ytb2bili:latest
    container_name: ytb2bili-app
    ports:
      - "8096:8096"
    environment:
      - CONFIG_FILE=/app/config.toml
      - TZ=Asia/Shanghai
    volumes:
      - ./config.toml:/app/config.toml:ro
      - ytb2bili_data:/data/ytb2bili
      - ytb2bili_logs:/app/logs
    restart: unless-stopped
    networks:
      - ytb2bili-network

  mysql:
    image: mysql:8.0
    container_name: ytb2bili-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-ytb2bili_root_2024}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-ytb2bili}
      MYSQL_USER: ${MYSQL_USER:-ytb2ibili}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-ytb2bili_2024}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3307:3306"
    restart: unless-stopped
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    networks:
      - ytb2bili-network

  redis:
    image: redis:7-alpine
    container_name: ytb2bili-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - ytb2bili-network

volumes:
  ytb2bili_data:
    driver: local
  ytb2bili_logs:
    driver: local
  mysql_data:
    driver: local
  redis_data:
    driver: local

networks:
  ytb2bili-network:
    driver: bridge
```

#### 2. 启动服务

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f ytb2bili
```

## 配置说明

### 1. 准备配置文件

```bash
# 复制示例配置文件
wget https://raw.githubusercontent.com/difyz9/ytb2bili/main/config.toml.example -O config.toml

# 或者从容器中复制
docker run --rm difyz9/ytb2bili:latest cat /app/config.toml > config.toml
```

### 2. 编辑配置文件

主要配置项：

```toml
# 监听地址
listen = ":8096"

# 数据库配置
[database]
type = "mysql"
host = "ytb2bili-mysql"  # Docker Compose 中使用服务名
port = 3306
username = "ytb2bili"
password = "ytb2bili_2024"
database = "ytb2bili"

# 文件上传目录
fileUpDir = "/data/ytb2bili"

# yt-dlp 路径（容器内已安装）
yt_dlp_path = "/usr/local/bin/yt-dlp"

# Whisper 配置（可选）
[WhisperConfig]
enabled = false
model_path = "/data/ytb2bili/models/ggml-base.bin"
language = "en"
threads = 4

# 腾讯云 COS 配置（可选）
[TenCosConfig]
enabled = false
# ... 其他配置
```

## 功能特性

### 1. 双任务链架构

**下载任务链**:
- 自动下载 YouTube 视频
- 提取音频
- 生成字幕（Whisper 或默认方法）
- 翻译字幕
- 生成元数据

**上传任务链**:
- 每小时自动上传一个视频
- 视频上传后 1 小时自动上传字幕
- 避免频率限制

### 2. API 访问

访问地址: `http://localhost:8096`

主要端点:
- `GET /health` - 健康检查
- `GET /api/v1/auth/status` - 登录状态
- `POST /api/v1/videos/add` - 添加视频
- `GET /api/v1/videos/list` - 视频列表

### 3. 前端界面

如果构建了前端，可以通过浏览器访问 `http://localhost:8096` 使用 Web 界面。

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| CONFIG_FILE | 配置文件路径 | /app/config.toml |
| TZ | 时区 | Asia/Shanghai |
| MYSQL_ROOT_PASSWORD | MySQL root 密码 | ytb2bili_root_2024 |
| MYSQL_DATABASE | 数据库名 | ytb2bili |
| MYSQL_USER | 数据库用户 | ytb2bili |
| MYSQL_PASSWORD | 数据库密码 | ytb2bili_2024 |

## 数据持久化

建议挂载以下目录：

```bash
volumes:
  - ./config.toml:/app/config.toml:ro        # 配置文件
  - ytb2bili_data:/data/ytb2bili             # 数据目录（视频、模型等）
  - ytb2bili_logs:/app/logs                  # 日志目录
```

## 常用操作

### 查看日志

```bash
# 实时查看日志
docker logs -f ytb2bili

# 或使用 Docker Compose
docker compose logs -f ytb2bili
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it ytb2bili sh

# 查看配置
docker exec ytb2bili cat /app/config.toml

# 查看进程
docker exec ytb2bili ps aux
```

### 重启服务

```bash
# Docker Run 方式
docker restart ytb2bili

# Docker Compose 方式
docker compose restart ytb2bili
```

### 更新镜像

```bash
# 拉取最新镜像
docker pull difyz9/ytb2bili:latest

# 重新创建容器
docker compose up -d --force-recreate ytb2bili
```

## 使用 Whisper 语音识别

### 1. 下载 Whisper 模型

```bash
# 进入容器
docker exec -it ytb2bili sh

# 创建模型目录
mkdir -p /data/ytb2bili/models

# 下载模型（示例：base 模型）
cd /data/ytb2bili/models
wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

### 2. 配置 Whisper

编辑 `config.toml`:

```toml
[WhisperConfig]
enabled = true
model_path = "/data/ytb2bili/models/ggml-base.bin"
language = "en"  # 或 "zh" 中文，"auto" 自动检测
threads = 4
```

### 3. 重启服务

```bash
docker compose restart ytb2bili
```

## 网络配置

### 自定义端口

修改 docker-compose.yml 中的端口映射：

```yaml
ports:
  - "8080:8096"  # 将 8096 改为 8080
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 故障排查

### 1. 容器无法启动

```bash
# 查看详细日志
docker logs ytb2bili

# 检查配置文件
docker run --rm -v $(pwd)/config.toml:/app/config.toml difyz9/ytb2bili:latest cat /app/config.toml
```

### 2. 数据库连接失败

```bash
# 检查数据库是否运行
docker compose ps mysql

# 测试数据库连接
docker exec ytb2bili-mysql mysql -uytb2bili -pytb2bili_2024 -e "SELECT 1"
```

### 3. 端口被占用

```bash
# 查看端口占用
lsof -i :8096

# 修改 docker-compose.yml 中的端口
ports:
  - "8097:8096"  # 改用 8097 端口
```

### 4. 视频下载失败

```bash
# 检查 yt-dlp 版本
docker exec ytb2bili yt-dlp --version

# 更新 yt-dlp
docker exec ytb2bili pip3 install --upgrade yt-dlp
```

## 性能优化

### 1. 调整资源限制

```yaml
services:
  ytb2bili:
    image: difyz9/ytb2bili:latest
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### 2. 使用 Redis 缓存

Redis 已包含在 docker-compose.yml 中，应用会自动使用。

### 3. 优化数据库

```bash
# 调整 MySQL 配置
docker exec ytb2bili-mysql mysql -uroot -p -e "
  SET GLOBAL innodb_buffer_pool_size = 256M;
  SET GLOBAL max_connections = 200;
"
```

## 备份与恢复

### 备份数据

```bash
# 备份数据库
docker exec ytb2bili-mysql mysqldump -uytb2bili -pytb2bili_2024 ytb2bili > backup.sql

# 备份数据卷
docker run --rm -v ytb2bili_data:/data -v $(pwd):/backup alpine tar czf /backup/ytb2bili_data_backup.tar.gz -C /data .
```

### 恢复数据

```bash
# 恢复数据库
docker exec -i ytb2bili-mysql mysql -uytb2bili -pytb2bili_2024 ytb2bili < backup.sql

# 恢复数据卷
docker run --rm -v ytb2bili_data:/data -v $(pwd):/backup alpine tar xzf /backup/ytb2bili_data_backup.tar.gz -C /data
```

## 安全建议

1. **修改默认密码**: 更改 MySQL 和应用的默认密码
2. **使用环境变量**: 不要在 docker-compose.yml 中硬编码密码
3. **限制网络访问**: 使用防火墙限制端口访问
4. **定期更新**: 定期更新镜像和依赖
5. **备份数据**: 定期备份重要数据

## 获取帮助

- GitHub Issues: https://github.com/difyz9/ytb2bili/issues
- Docker Hub: https://hub.docker.com/r/difyz9/ytb2bili
- 文档: https://github.com/difyz9/ytb2bili/tree/main/docs

## 更新日志

查看最新的更新和变更：
```bash
docker pull difyz9/ytb2bili:latest
docker image inspect difyz9/ytb2bili:latest | grep Created
```

## 许可证

请参考项目的 LICENSE 文件。
