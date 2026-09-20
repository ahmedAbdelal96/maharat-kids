import type { AuditAction, AuditEntityType } from "./constants";

export type AuditValue = string | number | boolean | null | AuditValue[] | { [key: string]: AuditValue };

export type AuditChangeField = {
  field: string;
  before: AuditValue;
  after: AuditValue;
};

export type AuditChanges = { fields: AuditChangeField[] };
export type AuditMetadata = Record<string, AuditValue>;

export type AuditActor = {
  userId: string | null;
  name: string | null;
  email: string | null;
};

export type AuditRecordInput = {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel: string;
  changes?: AuditChanges | null;
  metadata?: AuditMetadata | null;
  requestId?: string | null;
};

export type AuditMutationContext = {
  actor: AuditActor;
  requestId?: string | null;
};

export type AuditLogItem = AuditRecordInput & { id: string; createdAt: string };

export type AuditActorOption = {
  userId: string;
  name: string | null;
  email: string | null;
};

export type AuditLogFilters = {
  search?: string;
  entityType?: AuditEntityType;
  action?: AuditAction;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type AuditLogPage = {
  items: AuditLogItem[];
  actors: AuditActorOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
