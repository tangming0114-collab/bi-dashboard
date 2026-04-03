-- Supabase 数据库表结构
-- 在 Supabase SQL 编辑器中执行以下 SQL 来创建所需的表

-- 1. 用户表 (使用 Supabase Auth，这里存储额外的用户信息)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- 注意：生产环境应该使用加密密码
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户名索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. 用户数据表（存储用户上传的排期数据）
CREATE TABLE IF NOT EXISTS user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_data JSONB NOT NULL DEFAULT '[]',
  file_name TEXT,
  filters JSONB DEFAULT '{}',
  filter_choices JSONB DEFAULT '{}',
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户ID索引
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- 3. 用户配置表（存储核心机构、行业政策等配置）
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- 创建用户ID和配置key的联合索引
CREATE INDEX IF NOT EXISTS idx_user_configs_user_key ON user_configs(user_id, config_key);

-- 4. 插入默认管理员账号
-- 注意：密码是明文存储的，生产环境应该加密
INSERT INTO users (username, password, name, role)
VALUES ('admin', 'admin123', '系统管理员', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 启用 RLS (Row Level Security) 行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can only access their own data" ON user_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own configs" ON user_configs
  FOR ALL USING (auth.uid() = user_id);

-- 注意：管理员可以查看所有用户的策略需要在应用层实现
-- 或者使用 Supabase 的 service_role_key 在服务端绕过 RLS
