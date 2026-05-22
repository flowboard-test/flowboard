import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

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

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 border-b bg-white flex items-center px-4
        justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/projects" className="font-bold text-lg text-blue-600">
            FlowBoard
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`px-3 py-1.5 rounded text-sm
                  ${location.pathname.startsWith(item.path)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* 알림 벨 */}
          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)}
              className="relative p-1.5 rounded hover:bg-gray-100">
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
                {notifications?.slice(0, 20).map((n: any) => (
                  <div key={n.id}
                    onClick={() => !n.is_read && markRead.mutate(n.id)}
                    className={`p-2 border-b cursor-pointer text-xs
                      ${!n.is_read ? 'bg-blue-50' : ''}`}>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-gray-600">{n.body}</p>
                  </div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <p className="p-3 text-gray-500 text-center">알림 없음</p>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-700">
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
