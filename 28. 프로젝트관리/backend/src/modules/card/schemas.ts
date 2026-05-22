import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  assignee_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().positive(),
});

export const moveCardSchema = z.object({
  target_column_id: z.string().uuid(),
  position: z.number().int().min(0),
  transfer_to: z.string().uuid().optional(),
  resolution: z.object({
    type: z.enum(['approved', 'rejected', 'completed', 'hold']),
    comment: z.string().optional(),
  }).optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
