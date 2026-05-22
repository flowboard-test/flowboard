interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

export function NotificationPanel({
  notifications,
  onMarkRead,
}: NotificationPanelProps) {
  return (
    <div className="w-80 bg-white border rounded-lg shadow-lg max-h-96
      overflow-y-auto">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm">알림</h3>
        <span className="text-xs text-gray-500">
          {notifications.filter((n) => !n.is_read).length}건 미읽음
        </span>
      </div>
      <div className="divide-y">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && onMarkRead(n.id)}
            className={`p-3 cursor-pointer hover:bg-gray-50
              ${!n.is_read ? 'bg-blue-50' : ''}`}
          >
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
            <p className="text-xs text-gray-400 mt-1">{n.created_at}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
