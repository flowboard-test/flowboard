export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type ProjectRole = 'owner' | 'admin' | 'member';
export type ResolutionType = 'approved' | 'rejected' | 'completed' | 'hold';
export type ViewMode = 'board' | 'list' | 'gantt' | 'calendar';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  resolution_required: boolean;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  wip_limit: number | null;
}

export interface Card {
  id: string;
  column_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  status: string;
  position: number;
  version: number;
  tags: string[];
  created_by: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  card_id: string;
  from_user_id: string;
  to_user_id: string;
  resolution_type: ResolutionType;
  comment: string | null;
  is_auto: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}
