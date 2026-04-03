-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户数据表
CREATE TABLE IF NOT EXISTS user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认管理员
INSERT INTO users (username, password, name, role)
VALUES ('admin', 'admin123', '系统管理员', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Allow all" ON users FOR ALL USING (true);
CREATE POLICY "Allow all" ON user_data FOR ALL USING (true);
CREATE POLICY "Allow all" ON user_configs FOR ALL USING (true);
