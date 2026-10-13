import { Request } from 'express';

export enum Role {
  CLINICIAN = 'CLINICIAN',
  RESEARCHER = 'RESEARCHER',
  ADMIN = 'ADMIN',
}

export const isRole = (v: unknown): v is Role =>
  typeof v === 'string' && (Object.values(Role) as string[]).includes(v);

export interface AuthUser {
  userId: string;
  role: Role;
}

export type AuthedRequest = Request & { user?: AuthUser };
