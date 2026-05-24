// lib/simpleAuth.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 动态导入Supabase客户端
async function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    // 客户端环境
    const { createClient } = await import('@/lib/supabaseClient');
    return createClient();
  } else {
    // 服务端环境
    const { createClient } = await import('@supabase/supabase-js');

    // 从环境变量获取Supabase配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate session token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Register new user
export async function registerUser(email: string, password: string, nickname?: string) {
  try {
    const supabase = await getSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashedPassword, nickname }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, user: newUser };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(email: string, password: string) {
  try {
    const supabase = await getSupabaseClient();

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      }]);

    if (sessionError) throw sessionError;

    return { success: true, user, token };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

// Validate session token
export async function validateSession(token: string) {
  try {
    const supabase = await getSupabaseClient();

    // Check if session exists and hasn't expired
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users (*)
      `)
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return { valid: false, user: null };
    }

    return { valid: true, user: session.users };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, user: null };
  }
}

// Logout user
export async function logoutUser(token: string) {
  try {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

// Get user by ID
export async function getUserById(userId: number) {
  try {
    const supabase = await getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}