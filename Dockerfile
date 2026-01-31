# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

# 设置 PNPM 环境，强制开发模式以安装所有依赖
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
COPY packages/cli/package.json ./packages/cli/

# 安装所有依赖（NODE_ENV=development 确保 devDependencies 被安装）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages ./packages

# 复制脚本目录
COPY script ./script

# 构建
RUN pnpm build

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 创建非 root 用户和数据目录
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 npvm && \
    mkdir -p /app/data /home/npvm/.npm /home/npvm/.pnpm-store /home/npvm/.yarn /home/npvm/.bun && \
    chown -R npvm:nodejs /app/data /home/npvm

# 复制 workspace 配置
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# 复制 shared 构建产物
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# 复制 server 构建产物
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# 复制 web 构建产物（由 server 静态托管）
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# 复制 cli package.json（workspace 完整性）
COPY --from=builder /app/packages/cli/package.json ./packages/cli/

# web 的 package.json 也需要（pnpm workspace 解析）
COPY --from=builder /app/packages/web/package.json ./packages/web/

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制脚本目录
COPY --from=builder /app/script ./script

# 切换用户
USER npvm

ENV NODE_ENV=production
ENV NPVM_DATA_DIR=/app/data

# 暴露端口
EXPOSE 3456

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3456/api/pm/detect || exit 1

# 启动服务（使用启动脚本）
CMD ["sh", "script/docker-entrypoint.sh"]
