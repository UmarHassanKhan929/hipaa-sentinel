import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.js';

export const IS_PUBLIC = 'sentinel:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'sentinel:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
