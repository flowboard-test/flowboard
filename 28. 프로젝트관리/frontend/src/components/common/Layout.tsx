import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SearchBar } from './SearchBar';

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient('/notifications'),
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/notifications/${id}/read`, { method: 'PUT' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const navItems = [
    { path: '/projects', label: '프로젝트' },
    { path: '/my-tasks', label: '내 업무' },
    { path: '/account', label: '계정' },
  ];

  // admin 계정이면 관리자 메뉴 추가
  const isAdmin = user?.email === 'admin@flowboard.dev';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600
        flex items-center px-4 justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <Link to="/projects" className="font-bold text-base text-white">
            FlowBoard
          </Link>
          <nav className="hidden sm:flex gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`px-3 py-1 rounded text-sm
                  ${location.pathname.startsWith(item.path)
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin"
                className={`px-3 py-1 rounded text-sm
                  ${location.pathname === '/admin'
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-yellow-200 hover:bg-white/10'}`}>
                ⚙ 관리자
              </Link>
            )}
          </nav>
          <div className="hidden md:block">
            <SearchBar />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 알림 벨 */}
          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)}
              className="relative p-1.5 rounded hover:bg-white/10 text-white">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500
                  text-white text-xs rounded-full w-4 h-4 flex items-center
                  justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-80 bg-white border
                rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                <div className="p-2 border-b text-xs font-medium">
                  알림 ({unreadCount}건 미읽음)
                </div>
                {notifications?.slice(0, 20).map((n: any) => {
                  const meta = (() => {
                    try { return typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata; }
                    catch { return {}; }
                  })();
                  return (
                    <div key={n.id}
                      onClick={() => {
                        if (!n.is_read) markRead.mutate(n.id);
                        if (n.type === 'recurring_due' && meta?.recurringId) {
                          window.location.href =
                            `/projects/${meta.projectId}?recurring=${meta.recurringId}`;
                        } else if (meta?.projectId) {
                          window.location.href = `/projects/${meta.projectId}`;
                        }
                      }}
                      className={`p-2 border-b cursor-pointer text-xs
                        ${!n.is_read ? 'bg-blue-50' : ''}`}>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-gray-600">{n.body}</p>
                    </div>
                  );
                })}
                {(!notifications || notifications.length === 0) && (
                  <p className="p-3 text-gray-500 text-center">알림 없음</p>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-white/80">{user?.name}</span>
          <button onClick={logout}
            className="text-xs text-white/60 hover:text-white">
            로그아웃
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
