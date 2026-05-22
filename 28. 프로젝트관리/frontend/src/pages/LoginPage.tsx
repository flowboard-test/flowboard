import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { email, password, name }
        : { email, password };

      const res = await apiClient<{
        user: { id: string; email: string; name: string; avatar_url: string | null };
        token: string;
      }>(endpoint, { method: 'POST', body: JSON.stringify(body) });

      setAuth(res.user, res.token);
      navigate('/projects');
    } catch (err: any) {
      setError(err.data?.message || '로그인에 실패했습니다');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-center mb-6">
          FlowBoard
        </h1>
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input type="text" placeholder="이름" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          )}
          <input type="email" placeholder="이메일" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
          <input type="password" placeholder="비밀번호" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
          <button type="submit"
            className="w-full bg-blue-500 text-white rounded-md py-2 text-sm
              hover:bg-blue-600 transition-colors">
            {isRegister ? '회원가입' : '로그인'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-4">
          <button onClick={() => setIsRegister(!isRegister)}
            className="text-blue-500 hover:underline">
            {isRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </p>
      </div>
    </div>
  );
}
