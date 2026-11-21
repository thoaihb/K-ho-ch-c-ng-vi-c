import { SupabaseClient, createClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;

function readEnvValue(key: string): string {
  const metaEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  )?.env;
  if (!metaEnv) return '';
  const raw = metaEnv[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url =
    readEnvValue('VITE_SUPABASE_URL') ||
    readEnvValue('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey =
    readEnvValue('VITE_SUPABASE_ANON_KEY') ||
    readEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return /^https?:\/\//i.test(url) && anonKey.length > 0;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  const { url, anonKey } = getSupabaseConfig();
  if (!/^https?:\/\//i.test(url) || !anonKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

export function formatSupabaseError(err: unknown, context: string): string {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : err instanceof Error
      ? err.message
      : '';
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';

  if (
    code === '42501' ||
    /row-level security|permission denied|violates row-level security/i.test(
      message
    )
  ) {
    return `${context}: Bảng Supabase đang bật RLS chỉ cho phép tài khoản đã đăng nhập (authenticated). Hãy thêm policy cho vai trò anon trên Supabase SQL Editor để đồng bộ trực tiếp từ trình duyệt.`;
  }

  if (
    code === '42P01' ||
    /relation .* does not exist|could not find the table/i.test(message)
  ) {
    return `${context}: Chưa tìm thấy bảng dữ liệu trên Supabase. Vui lòng chạy lại script SQL tạo 7 bảng trong SQL Editor.`;
  }

  return message ? `${context}: ${message}` : context;
}
