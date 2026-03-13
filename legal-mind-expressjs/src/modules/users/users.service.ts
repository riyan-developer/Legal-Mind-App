import { createUserSchema, updateUserSchema } from './users.schema.js';
import { usersRepo } from './users.repo.js';

export const usersService = {
  async list() {
    return usersRepo.list();
  },

  async create(payload: unknown) {
    const parsed = createUserSchema.parse(payload);
    return usersRepo.create(parsed);
  },

  async update(userId: string, payload: unknown) {
    const parsed = updateUserSchema.parse(payload);
    return usersRepo.update(userId, parsed);
  },

  async remove(userId: string) {
    return usersRepo.remove(userId);
  },
};