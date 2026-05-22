import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, '프로젝트 이름을 입력하세요').max(200),
  description: z.string().max(5000).optional(),
  is_public: z.boolean().optional().default(false),
  resolution_required: z.boolean().optional().default(false),
  member_emails: z.array(z.string().email()).optional().default([]),
  workflow_assignee_ids: z.array(z.string().uuid()).optional().default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  is_public: z.boolean().optional(),
  resolution_required: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  user_id: z.string().uuid('유효한 사용자 ID가 필요합니다'),
  role: z.enum(['admin', 'member']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
