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
  | 'nda_pending'
  | 'additional_approval_required';

export type BatchStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type VisitorCategory = 'internal' | 'external_partner' | 'foreign' | 'blacklist' | 'vip';

export type VisitorValidationLevel = 'allow' | 'require_approval' | 'block';

export type MaterialType = 'brochure' | 'badge' | 'bag' | 'phone_bag' | 'sample' | 'safety_vest';

export type ParkingStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export type StaffRole = 'reception' | 'security' | 'guide' | 'manager';

export type TemporarySecretStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface VisitorValidationResult {
  level: VisitorValidationLevel;
  category: VisitorCategory;
  message: string;
  requiredApprovalRole?: string;
  blockedReason?: string;
}

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

export interface StaffMember {
  id: ID;
  name: string;
  phone: string;
  role: StaffRole;
  title: string;
  workDays: number[];
  isOnDuty: boolean;
  assignedBatchIds?: ID[];
}

export interface ParkingSpace {
  id: ID;
  code: string;
  location: string;
  status: ParkingStatus;
  reservedForRecordId?: ID;
  reservedForCompany?: string;
  plateNumber?: string;
  reservedAt?: string;
  occupiedAt?: string;
  releasedAt?: string;
}

export interface MaterialReturnRecord {
  id: ID;
  materialItemId: ID;
  materialName: string;
  quantity: number;
  returnedAt: string;
  returnedBy: string;
  receivedBy: string;
  condition: 'good' | 'damaged' | 'lost';
  notes?: string;
}

export interface TemporarySecretRequest {
  id: ID;
  recordId: ID;
  visitorId: ID;
  visitorName: string;
  companyName: string;
  targetZoneId: ID;
  targetZoneName: string;
  reason: string;
  status: TemporarySecretStatus;
  requestedAt: string;
  requestedBy: string;
  approverId?: ID;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  ndaRequired: boolean;
  ndaSigned?: boolean;
  ndaSignedAt?: string;
  expiresAt: string;
}

export interface BatchStaffAssignment {
  batchId: ID;
  receptionStaffIds: ID[];
  securityStaffIds: ID[];
  guideId?: ID;
  calculatedAt: string;
  calculatedBy: string;
  reason?: string;
}

export interface BatchMaterialPreparation {
  batchId: ID;
  badgeCount: number;
  brochureCount: number;
  bagCount: number;
  sampleCount: number;
  safetyVestCount: number;
  phoneBagCount: number;
  preparedAt?: string;
  preparedBy?: string;
  notes?: string;
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
  staffAssignment?: BatchStaffAssignment;
  materialPreparation?: BatchMaterialPreparation;
  autoCalculatedStaff?: boolean;
  autoCalculatedMaterials?: boolean;
  lastStaffCalculationAt?: string;
  lastMaterialCalculationAt?: string;
  conflictResolution?: {
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
    originalRouteId?: ID;
    originalStartTime?: string;
    originalEndTime?: string;
    resolutionNotes?: string;
  };
}

export interface ExternalPartnerCompany {
  id: ID;
  companyName: string;
  cooperationLevel: 'strategic' | 'important' | 'general';
  approvalRequirement: 'none' | 'manager' | 'director' | 'ceo';
  allowedZones?: ID[];
  restrictedZones?: ID[];
  contactPerson?: string;
  contactPhone?: string;
  contractExpiryDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface ForeignVisitorConfig {
  id: ID;
  country: string;
  nationality: string;
  approvalRequirement: 'none' | 'manager' | 'director' | 'ceo' | 'ministry';
  allowedZones?: ID[];
  restrictedZones?: ID[];
  requiresBackgroundCheck: boolean;
  requiresNotification: boolean;
  notificationDepartment?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface ConflictResolutionSuggestion {
  type: 'time' | 'route' | 'guide' | 'zone';
  suggestion: string;
  originalValue: string;
  suggestedValue: string;
  impactLevel: 'low' | 'medium' | 'high';
  affectedBatches?: ID[];
}

export interface Visitor {
  id: ID;
  name: string;
  idType: '身份证' | '护照' | '军官证';
  idNumber: string;
  phone: string;
  isPrimary: boolean;
  nationality?: string;
  isForeign?: boolean;
  category?: VisitorCategory;
  phoneSealed?: boolean;
  phoneSealedAt?: string;
  phoneSealBagCode?: string;
  badgePrinted?: boolean;
  badgePrintedAt?: string;
  badgeCode?: string;
  sampleCollected?: boolean;
  sampleCollectedAt?: string;
  safetyVestCollected?: boolean;
  safetyVestCollectedAt?: string;
}

export interface Vehicle {
  plateNumber: string;
  vehicleType: string;
  driverName: string;
}

export interface MaterialItem {
  id: ID;
  name: string;
  type: MaterialType;
  quantity: number;
  collectedAt?: string;
  collectedBy?: string;
  returnedAt?: string;
  returnedBy?: string;
  returnReceivedBy?: string;
  returnCondition?: 'good' | 'damaged' | 'lost';
  barcode?: string;
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
  visitorCategory?: VisitorCategory;
  validationResult?: VisitorValidationResult;
  additionalApprovalRequired?: boolean;
  additionalApprovalStatus?: ApprovalStatus;
  additionalApprover?: string;
  additionalApprovalAt?: string;
  additionalApprovalReason?: string;
  parkingSpaceId?: ID;
  parkingSpaceCode?: string;
  materialsReturned?: boolean;
  materialsReturnedAt?: string;
  materialsReturnedBy?: string;
  unreturnedMaterials?: { name: string; quantity: number; type: MaterialType }[];
  temporarySecretRequests?: TemporarySecretRequest[];
  badgeBatchPrinted?: boolean;
  badgeBatchPrintedAt?: string;
  phoneBatchSealed?: boolean;
  phoneBatchSealedAt?: string;
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

export type DemoScenarioId =
  | 'overcapacity_waitlist'
  | 'secret_approval'
  | 'route_conflict'
  | 'unreturned_material'

export interface DemoScenario {
  id: DemoScenarioId
  title: string
  description: string
  steps: string[]
  expectedResult: string
  pagePath: string
}

export interface DemoExecutionResult {
  success: boolean
  message: string
  recordId?: string
  batchId?: string
}
