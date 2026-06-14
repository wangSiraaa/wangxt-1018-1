export type ID = string;

export type VisitStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'waiting_list'
  | 'checked_in'
  | 'visiting'
  | 'material_collected'
  | 'checked_out'
  | 'cancelled'
  | 'nda_pending';

export type BatchStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Route {
  id: ID;
  name: string;
  description: string;
  zones: Zone[];
  durationMinutes: number;
  photoAllowed: boolean;
  requiresNda: boolean;
  color: string;
}

export interface Zone {
  id: ID;
  name: string;
  isSecret: boolean;
  capacity: number;
  photoAllowed: boolean;
  description?: string;
}

export interface Guide {
  id: ID;
  name: string;
  phone: string;
  title: string;
  workDays: number[];
}

export interface VisitBatch {
  id: ID;
  code: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  routeId: ID;
  guideId: ID;
  capacity: number;
  status: BatchStatus;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface Visitor {
  id: ID;
  name: string;
  idType: '身份证' | '护照' | '军官证';
  idNumber: string;
  phone: string;
  isPrimary: boolean;
}

export interface Vehicle {
  plateNumber: string;
  vehicleType: string;
  driverName: string;
}

export interface MaterialItem {
  id: ID;
  name: string;
  quantity: number;
  collectedAt?: string;
  collectedBy?: string;
}

export interface NdaRecord {
  id: ID;
  visitorId: ID;
  visitorName: string;
  signedAt?: string;
  signerName?: string;
  approverId?: ID;
  approvedAt?: string;
  approvedByName?: string;
  status: ApprovalStatus;
}

export interface VisitRecord {
  id: ID;
  code: string;
  batchId: ID;
  batchCode?: string;
  companyName: string;
  visitors: Visitor[];
  totalPeople: number;
  vehicle?: Vehicle;
  purpose: string;
  status: VisitStatus;
  hasSecretZone: boolean;
  photoAllowed: boolean;
  appliedAt: string;
  checkInAt?: string;
  checkOutAt?: string;
  materials: MaterialItem[];
  ndaRecords: NdaRecord[];
  ndaCompleted: boolean;
  inWaitingList: boolean;
  waitingRank?: number;
  rejectionReason?: string;
  securityCleared: boolean;
  contactPhone: string;
  contactEmail?: string;
}

export interface BlacklistCompany {
  id: ID;
  companyName: string;
  reason: string;
  addedAt: string;
  addedBy: string;
  expiresAt?: string;
  active: boolean;
}

export interface AuditLog {
  id: ID;
  timestamp: string;
  operator: string;
  action: string;
  targetType: string;
  targetId: ID;
  targetName?: string;
  details: string;
  ip?: string;
}

export interface ConflictInfo {
  type: 'guide' | 'route' | 'zone';
  message: string;
  conflictingBatchId?: ID;
  conflictingBatchName?: string;
  level: 'warning' | 'error';
}
