# 多阶段构建 Dockerfile
# Stage 1: 构建 whisper.cpp
FROM alpine:latest AS whisper-builder

RUN apk add --no-cache \
    git \
    build-base \
    cmake

WORKDIR /whisper

# 克隆并编译 whisper.cpp
RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git . && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF && \
    cmake --build build --target whisper

# Stage 2: 构建Go后端
FROM golang:1.24-alpine AS backend-builder

# 安装构建依赖（包括 CGO 和 Whisper 所需的依赖）
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    gcc \
    g++ \
    make \
    musl-dev

WORKDIR /app

# 从 whisper-builder 复制编译好的库和头文件
COPY --from=whisper-builder /whisper/build/src/libwhisper.a /usr/local/lib/
COPY --from=whisper-builder /whisper/build/ggml/src/libggml.a /usr/local/lib/
COPY --from=whisper-builder /whisper/build/ggml/src/libggml-base.a /usr/local/lib/
COPY --from=whisper-builder /whisper/build/ggml/src/libggml-cpu.a /usr/local/lib/
COPY --from=whisper-builder /whisper/include/whisper.h /usr/local/include/
COPY --from=whisper-builder /whisper/ggml/include/*.h /usr/local/include/

# 设置环境变量
ENV CGO_CFLAGS="-I/usr/local/include"
ENV CGO_LDFLAGS="-L/usr/local/lib -lwhisper -lggml -lggml-base -lggml-cpu -lm -lstdc++"

# 复制 Go 模块文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建Go应用（启用 CGO 以支持 Whisper）
ARG VERSION=dev
ARG BUILD_TIME
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME}" \
    -o ytb2bili-server .

# Stage 3: 运行阶段
FROM alpine:latest

# 安装运行时依赖（包括 libstdc++ 和 libgcc 用于 Whisper CGO 支持）
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    python3 \
    py3-pip \
    ffmpeg \
    libstdc++ \
    libgcc \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai

# 创建非特权用户
RUN addgroup -g 1001 -S ytb2bili && \
    adduser -S ytb2bili -u 1001 -G ytb2bili

WORKDIR /app

# 复制构建的二进制文件
COPY --from=backend-builder /app/ytb2bili-server .
COPY --from=backend-builder /app/config.toml.example ./config.toml

# 创建必要的目录
RUN mkdir -p /data/ytb2bili /app/logs && \
    chown -R ytb2bili:ytb2bili /app /data/ytb2bili

# 切换到非特权用户
USER ytb2bili

# 暴露端口
EXPOSE 8096

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8096/health || exit 1

# 启动命令
CMD ["./ytb2bili-server"]