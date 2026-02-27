FROM difyz9/ytb2bili-base:latest

LABEL maintainer="difyz9" \
      image="difyz9/ytb2bili"

WORKDIR /app

# 注入 Asia/Shanghai 时区文件（无需 apt-get tzdata）
RUN mkdir -p /usr/share/zoneinfo/Asia
COPY Shanghai.zone /usr/share/zoneinfo/Asia/Shanghai
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 复制 amd64 可执行文件和配置文件
COPY ytb2bili-linux-amd64 ./ytb2bili
COPY config.toml ./config.toml

# 创建数据目录并赋予执行权限
RUN mkdir -p ./data ./media ./backend \
    && chmod +x ./ytb2bili

EXPOSE 5688

CMD ["./ytb2bili"]
