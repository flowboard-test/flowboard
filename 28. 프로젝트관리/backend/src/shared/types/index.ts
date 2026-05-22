// === Enums ===
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type ProjectRole = 'owner' | 'admin' | 'member';
export type ResolutionType = 'approved' | 'rejected' | 'completed' | 'hold';
export type CardStatus = 'todo' | 'in_progress' | 'done';
export type NotificationType =
  | 'transfer_received'
  | 'resolution_recorded'
  | 'transfer_rejected'
  | 'deadline_d3'
  | 'deadline_d1'
  | 'deadline_dday'
  | 'overdue'
  | 'mention';
export type NotificationChannel = 'in_app' | 'email' | 'push';
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select';

// === Request Interfaces ===
export interface MoveCardRequest {
  cardId: string;
  targetColumnId: string;
  position: number;
  transferTo?: string;
  resolution?: {
    type: ResolutionType;
    comment?: string;
    attachments?: string[];
  };
}

export interface TransferRequest {
  toUserId: string;
  resolutionType: ResolutionType;
  comment?: string;
  attachments?: string[];
}

// === WebSocket Events ===
export interface WsEvent {
  type:
    | 'card:moved'
    | 'card:updated'
    | 'card:created'
    | 'card:deleted'
    | 'transfer:created'
    | 'column:updated';
  projectId: string;
  payload: Record<string, unknown>;
  version: number;
  timestamp: string;
}

// === Entity Interfaces ===
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  resolution_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  wip_limit: number | null;
  created_at: string;
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
  status: CardStatus;
  position: number;
  version: number;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  card_id: string;
  from_user_id: string;
  to_user_id: string;
  resolution_type: ResolutionType;
  comment: string | null;
  is_auto: boolean;
  workflow_step_id: string | null;
  created_at: string;
}

export interface Resolution {
  id: string;
  card_id: string;
  transfer_id: string | null;
  type: ResolutionType;
  comment: string | null;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
