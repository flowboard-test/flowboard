import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';

export interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
}

export class OrganizationService {
  async getDepartments() {
    const db = getDb();
    return await db('departments').orderBy('order', 'asc');
  }

  async getUsersByDepartment(departmentId?: string) {
    const db = getDb();
    let query = db('users')
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select(
        'users.id', 'users.email', 'users.name', 'users.avatar_url',
        'user_profiles.department', 'user_profiles.position',
        'user_profiles.phone'
      );

    if (departmentId) {
      const dept = await db('departments').where('id', departmentId).first();
      if (dept) {
        query = query.where('user_profiles.department', dept.name);
      }
    }

    return await query.orderBy('users.name', 'asc');
  }

  async getOrganizationTree() {
    const db = getDb();
    const departments = await db('departments').orderBy('order', 'asc');
    const users = await db('users')
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select(
        'users.id', 'users.email', 'users.name', 'users.avatar_url',
        'user_profiles.department', 'user_profiles.position'
      )
      .orderBy('users.name', 'asc');

    // 부서별 사용자 그룹화
    const tree = departments.map((dept) => ({
      ...dept,
      users: users.filter((u) => u.department === dept.name),
    }));

    // 부서 미지정 사용자
    const unassigned = users.filter(
      (u) => !u.department || !departments.some((d) => d.name === u.department)
    );

    return { departments: tree, unassigned };
  }

  async createDepartment(name: string, parentId?: string, order?: number) {
    const db = getDb();
    const id = uuid();
    await db('departments').insert({
      id, name, parent_id: parentId || null, order: order || 0,
    });
    return { id, name };
  }

  async searchUsers(query: string) {
    const db = getDb();
    return await db('users')
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select(
        'users.id', 'users.email', 'users.name',
        'user_profiles.department', 'user_profiles.position'
      )
      .where((builder) => {
        builder
          .where('users.name', 'like', `%${query}%`)
          .orWhere('users.email', 'like', `%${query}%`)
          .orWhere('user_profiles.department', 'like', `%${query}%`);
      })
      .limit(20);
  }
}

export const organizationService = new OrganizationService();
