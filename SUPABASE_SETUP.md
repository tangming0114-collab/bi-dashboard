# Supabase 配置指南

## 问题说明

当前系统使用浏览器的 `localStorage` 存储数据，导致以下问题：
1. **换设备数据丢失** - localStorage 是设备本地的，不同设备/浏览器数据不共享
2. **管理员看不到所有用户** - 每个用户的 localStorage 完全独立
3. **无法公开注册登录** - 部署后仍然是纯前端，没有后端数据库支持

## 解决方案：使用 Supabase

Supabase 是一个开源的 Firebase 替代品，提供：
- PostgreSQL 数据库
- 用户认证
- 实时数据同步
- 免费额度足够使用

## 配置步骤

### 1. 创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com/)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 填写项目名称和密码，等待项目创建完成

### 2. 获取连接信息

项目创建完成后：

1. 进入项目 Dashboard
2. 点击左侧菜单 "Project Settings" → "API"
3. 复制以下信息：
   - **Project URL** (例如: `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** API Key

### 3. 配置环境变量

1. 将 `.env.example` 复制为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的 Supabase 配置：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. 创建数据库表

1. 在 Supabase Dashboard 中，点击左侧菜单 "SQL Editor"
2. 点击 "New query"
3. 将 `supabase-schema.sql` 文件中的 SQL 代码粘贴进去
4. 点击 "Run" 执行

### 5. 重新构建部署

```bash
npm run build
```

然后部署 `dist` 文件夹。

## 数据迁移（可选）

如果你已经有本地数据需要迁移到 Supabase：

1. 登录系统，导出你的数据
2. 配置好 Supabase 后重新登录
3. 重新上传数据

## 注意事项

1. **密码安全**：当前实现密码是明文存储的，生产环境应该使用加密
2. **免费额度**：Supabase 免费版提供 500MB 数据库空间，足够小型应用使用
3. **备份**：定期备份 Supabase 数据库，防止数据丢失

## 降级方案

如果不配置 Supabase，系统会继续使用 localStorage 作为降级方案，但会有以下限制：
- 数据无法跨设备同步
- 每个设备的数据相互独立
- 管理员无法查看其他用户
