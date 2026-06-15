import { create } from 'zustand'
import type {
  VisitBatch,
  VisitRecord,
  Route,
  Guide,
  BlacklistCompany,
  AuditLog,
  VisitStatus,
  Visitor,
  Vehicle,
  MaterialItem,
  ConflictInfo,
  NdaRecord,
  BatchStatus,
  StaffMember,
  ParkingSpace,
  ExternalPartnerCompany,
  ForeignVisitorConfig,
  TemporarySecretRequest,
  BatchStaffAssignment,
  BatchMaterialPreparation,
  VisitorCategory,
  VisitorValidationResult,
  VisitorValidationLevel,
  ConflictResolutionSuggestion,
  MaterialType,
  TemporarySecretStatus,
  DemoScenario,
  DemoScenarioId,
  DemoExecutionResult,
} from '@/types'
import {
  seedBatches,
  seedRecords,
  seedRoutes,
  seedGuides,
  seedBlacklist,
  seedAuditLogs,
  seedZones,
  seedStaff,
  seedParkingSpaces,
  seedExternalPartners,
  seedForeignConfigs,
} from '@/data/mockData'
import { uid, nowISO, formatDate } from '@/lib/utils'

interface AppState {
  batches: VisitBatch[]
  records: VisitRecord[]
  routes: Route[]
  guides: Guide[]
  blacklist: BlacklistCompany[]
  auditLogs: AuditLog[]
  staff: StaffMember[]
  parkingSpaces: ParkingSpace[]
  externalPartners: ExternalPartnerCompany[]
  foreignConfigs: ForeignVisitorConfig[]
  temporarySecretRequests: TemporarySecretRequest[]

  currentUser: string

  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void

  createBatch: (data: Omit<VisitBatch, 'id' | 'code' | 'createdAt'>) => VisitBatch
  updateBatchStatus: (batchId: string, status: BatchStatus) => void
  getBatchById: (batchId: string) => VisitBatch | undefined
  getBatchRecords: (batchId: string) => VisitRecord[]
  getBatchUsedCapacity: (batchId: string) => number
  checkBatchConflicts: (data: Partial<VisitBatch>, excludeBatchId?: string) => ConflictInfo[]

  createVisitRecord: (data: {
    batchId: string
    companyName: string
    visitors: Visitor[]
    vehicle?: Vehicle
    purpose: string
    contactPhone: string
    contactEmail?: string
  }) => { success: boolean; record?: VisitRecord; message?: string }

  updateRecordStatus: (recordId: string, status: VisitStatus, extra?: Partial<VisitRecord>) => void
  getRecordById: (recordId: string) => VisitRecord | undefined

  cancelVisitRecord: (recordId: string, operator: string) => { success: boolean; message?: string; promoted?: VisitRecord[] }

  checkIn: (recordId: string, operator: string) => { success: boolean; message?: string }

  collectMaterials: (recordId: string, operator: string, materialIds: string[]) => void

  approveNda: (recordId: string, ndaId: string, operator: string, visitorSignature: string) => void
  batchApproveAllNda: (recordId: string, operator: string) => void

  processWaitingListPromotion: (batchId: string) => VisitRecord[]

  securityClear: (recordId: string, operator: string) => void

  checkOut: (recordId: string, operator: string) => { success: boolean; message?: string }

  addToBlacklist: (data: Omit<BlacklistCompany, 'id' | 'addedAt'>) => void
  removeFromBlacklist: (id: string) => void
  isCompanyBlacklisted: (companyName: string) => BlacklistCompany | undefined

  computeWaitingRanks: () => void

  validateVisitor: (companyName: string, visitors: Visitor[]) => VisitorValidationResult

  getExternalPartner: (companyName: string) => ExternalPartnerCompany | undefined
  getForeignConfig: (nationality: string) => ForeignVisitorConfig | undefined

  calculateBatchStaff: (batchId: string, trigger: 'create' | 'update' | 'people_change' | 'route_change') => BatchStaffAssignment
  calculateBatchMaterials: (batchId: string) => BatchMaterialPreparation
  recalculateBatchStaffIfNeeded: (batchId: string, reason: string) => void

  getAvailableParkingSpaces: () => ParkingSpace[]
  reserveParkingSpace: (recordId: string, plateNumber: string) => ParkingSpace | null
  releaseParkingSpace: (spaceId: string) => boolean
  getRecordParkingSpace: (recordId: string) => ParkingSpace | undefined

  createTemporarySecretRequest: (data: {
    recordId: string
    visitorId: string
    targetZoneId: string
    reason: string
    requestedBy: string
  }) => TemporarySecretRequest | null
  approveTemporarySecretRequest: (requestId: string, approver: string, ndaSigned: boolean) => boolean
  rejectTemporarySecretRequest: (requestId: string, approver: string, reason: string) => boolean
  getRecordTemporaryRequests: (recordId: string) => TemporarySecretRequest[]

  printBadges: (recordId: string, operator: string) => boolean
  sealPhones: (recordId: string, operator: string) => boolean
  collectSample: (recordId: string, visitorId: string, operator: string) => boolean

  returnMaterial: (recordId: string, materialId: string, quantity: number, operator: string, condition: 'good' | 'damaged' | 'lost') => boolean
  checkUnreturnedMaterials: (recordId: string) => { name: string; quantity: number; type: MaterialType }[]

  getConflictResolutionSuggestions: (batchId: string) => ConflictResolutionSuggestion[]
  resolveBatchConflict: (batchId: string, suggestion: ConflictResolutionSuggestion, operator: string) => boolean

  getBatchSecurityList: (batchId: string) => { visitor: Visitor; record: VisitRecord; cleared: boolean }[]
  getBatchReceptionList: (batchId: string) => { visitor: Visitor; record: VisitRecord; badgePrinted: boolean }[]

  updateBatch: (batchId: string, updates: Partial<VisitBatch>) => void

  demoScenarios: DemoScenario[]
  runDemoScenario: (scenarioId: DemoScenarioId, operator?: string) => DemoExecutionResult
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: seedBatches,
  records: seedRecords,
  routes: seedRoutes,
  guides: seedGuides,
  blacklist: seedBlacklist,
  auditLogs: seedAuditLogs,
  staff: seedStaff,
  parkingSpaces: seedParkingSpaces,
  externalPartners: seedExternalPartners,
  foreignConfigs: seedForeignConfigs,
  temporarySecretRequests: [],
  currentUser: '市场部-赵经理',

  addAuditLog: (log) =>
    set((s) => ({
      auditLogs: [
        { id: uid('log'), timestamp: nowISO(), ...log },
        ...s.auditLogs,
      ],
    })),

  createBatch: (data) => {
    const newBatch: VisitBatch = {
      ...data,
      id: uid('b'),
      code: `BATCH-${formatDate(nowISO()).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
      createdAt: nowISO(),
    }
    set((s) => ({ batches: [newBatch, ...s.batches] }))
    get().addAuditLog({
      operator: get().currentUser,
      action: '创建批次',
      targetType: 'VisitBatch',
      targetId: newBatch.id,
      targetName: newBatch.name,
      details: `创建参观批次，路线${data.routeId}，容量${data.capacity}人`,
    })
    return newBatch
  },

  updateBatchStatus: (batchId, status) =>
    set((s) => ({
      batches: s.batches.map((b) => (b.id === batchId ? { ...b, status } : b)),
    })),

  getBatchById: (batchId) => get().batches.find((b) => b.id === batchId),

  getBatchRecords: (batchId) =>
    get().records.filter(
      (r) =>
        r.batchId === batchId &&
        !['cancelled', 'rejected'].includes(r.status) &&
        r.inWaitingList === false,
    ),

  getBatchUsedCapacity: (batchId) =>
    get()
      .getBatchRecords(batchId)
      .reduce((sum, r) => sum + r.totalPeople, 0),

  checkBatchConflicts: (data, excludeBatchId) => {
    const conflicts: ConflictInfo[] = []
    const { date, startTime, endTime, guideId, routeId } = data
    if (!date || !startTime || !endTime) return conflicts

    const overlappingBatches = get().batches.filter(
      (b) =>
        b.id !== excludeBatchId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        !(endTime <= b.startTime || startTime >= b.endTime),
    )

    if (guideId) {
      const guideConflict = overlappingBatches.find((b) => b.guideId === guideId)
      if (guideConflict) {
        conflicts.push({
          type: 'guide',
          level: 'error',
          message: `讲解员「${get().guides.find((g) => g.id === guideId)?.name}」在该时段已有批次：${guideConflict.name}`,
          conflictingBatchId: guideConflict.id,
          conflictingBatchName: guideConflict.name,
        })
      }
    }

    if (routeId) {
      const route = get().routes.find((r) => r.id === routeId)
      if (route) {
        route.zones.forEach((zone) => {
          const zoneConflict = overlappingBatches.find((b) => {
            const bRoute = get().routes.find((r) => r.id === b.routeId)
            return bRoute?.zones.some((z) => z.id === zone.id)
          })
          if (zoneConflict && zone.capacity < 50) {
            conflicts.push({
              type: 'zone',
              level: zone.isSecret ? 'error' : 'warning',
              message: `展区「${zone.name}」（容量${zone.capacity}人）在该时段被「${zoneConflict.name}」占用${zone.isSecret ? '，涉密展区不可重叠' : '，建议调整'}`,
              conflictingBatchId: zoneConflict.id,
              conflictingBatchName: zoneConflict.name,
            })
          }
        })
      }
    }

    return conflicts
  },

  createVisitRecord: (data) => {
    const {
      batchId,
      companyName,
      visitors,
      vehicle,
      purpose,
      contactPhone,
      contactEmail,
    } = data

    const blacklisted = get().isCompanyBlacklisted(companyName)
    if (blacklisted) {
      get().addAuditLog({
        operator: '系统',
        action: '黑名单拦截',
        targetType: 'VisitRecord',
        targetId: uid('v'),
        targetName: companyName,
        details: `黑名单企业被拒绝预约。原因：${blacklisted.reason}`,
      })
      return { success: false, message: `预约被拒绝：该企业已被列入黑名单（${blacklisted.reason}）` }
    }

    const batch = get().getBatchById(batchId)
    if (!batch) return { success: false, message: '批次不存在' }

    const route = get().routes.find((r) => r.id === batch.routeId)
    if (!route) return { success: false, message: '路线不存在' }

    const used = get().getBatchUsedCapacity(batchId)
    const totalPeople = visitors.length
    const willOverflow = used + totalPeople > batch.capacity

    const batchCode = batch.code
    const status: VisitStatus = willOverflow
      ? 'waiting_list'
      : route.requiresNda
        ? 'pending_approval'
        : 'approved'

    const ndaRecords: NdaRecord[] = route.requiresNda
      ? visitors.map((v) => ({
          id: uid('n'),
          visitorId: v.id,
          visitorName: v.name,
          status: 'pending' as const,
        }))
      : []

    const materialSeed = (qty: number): MaterialItem[] => [
      { id: uid('mat'), name: '企业宣传册', quantity: qty },
      { id: uid('mat'), name: '环保袋', quantity: qty },
      { id: uid('mat'), name: '访客胸卡', quantity: qty },
    ]

    const newRecord: VisitRecord = {
      id: uid('v'),
      code: `V-${formatDate(nowISO()).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
      batchId,
      batchCode,
      companyName,
      visitors,
      totalPeople,
      vehicle,
      purpose,
      status,
      hasSecretZone: route.requiresNda,
      photoAllowed: route.photoAllowed,
      appliedAt: nowISO(),
      materials: materialSeed(totalPeople),
      ndaRecords,
      ndaCompleted: false,
      inWaitingList: willOverflow,
      waitingRank: willOverflow ? undefined : undefined,
      securityCleared: !route.requiresNda,
      contactPhone,
      contactEmail,
    }

    set((s) => ({ records: [newRecord, ...s.records] }))

    if (willOverflow) {
      get().computeWaitingRanks()
      get().addAuditLog({
        operator: '系统',
        action: '候补登记',
        targetType: 'VisitRecord',
        targetId: newRecord.id,
        targetName: companyName,
        details: `批次「${batch.name}」容量已满（${used}/${batch.capacity}），超员${used + totalPeople - batch.capacity}人，进入候补队列`,
      })
    } else {
      get().addAuditLog({
        operator: '系统',
        action: '预约创建',
        targetType: 'VisitRecord',
        targetId: newRecord.id,
        targetName: companyName,
        details: `预约创建成功，批次${batchCode}，共${totalPeople}人${route.requiresNda ? '，待NDA审批' : ''}`,
      })
    }

    return { success: true, record: newRecord }
  },

  updateRecordStatus: (recordId, status, extra) =>
    set((s) => ({
      records: s.records.map((r) => (r.id === recordId ? { ...r, status, ...extra } : r)),
    })),

  getRecordById: (recordId) => get().records.find((r) => r.id === recordId),

  cancelVisitRecord: (recordId, operator) => {
    const record = get().getRecordById(recordId)
    if (!record) return { success: false, message: '预约不存在' }
    if (['checked_in', 'visiting', 'material_collected'].includes(record.status)) {
      return { success: false, message: '该访客已签到，不允许取消，请走离场核销流程' }
    }
    if (record.status === 'checked_out' || record.status === 'cancelled') {
      return { success: false, message: '订单已是终态，无法取消' }
    }
    get().updateRecordStatus(recordId, 'cancelled')
    let promoted: VisitRecord[] = []
    if (record.inWaitingList) {
      get().computeWaitingRanks()
    } else {
      promoted = get().processWaitingListPromotion(record.batchId)
    }
    get().addAuditLog({
      operator,
      action: '取消预约',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: record.companyName,
      details: `预约被取消，${record.totalPeople}人释放名额`,
    })
    return { success: true, promoted }
  },

  checkIn: (recordId, operator) => {
    const record = get().getRecordById(recordId)
    if (!record) return { success: false, message: '预约不存在' }
    if (record.hasSecretZone && !record.ndaCompleted) {
      return { success: false, message: '涉密路线的NDA尚未全部签署完成，无法签到' }
    }
    if (!['approved', 'nda_pending'].includes(record.status)) {
      return { success: false, message: `当前状态「${record.status}」不允许签到` }
    }
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId
          ? { ...r, status: 'checked_in', checkInAt: nowISO(), securityCleared: true }
          : r,
      ),
    }))
    get().addAuditLog({
      operator,
      action: '签到',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: record.companyName,
      details: `${record.totalPeople}人签到入场`,
    })
    return { success: true }
  },

  collectMaterials: (recordId, operator, materialIds) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== recordId) return r
        const mats = r.materials.map((m) =>
          materialIds.includes(m.id) ? { ...m, collectedAt: now, collectedBy: operator } : m,
        )
        const allCollected = mats.every((m) => m.collectedAt)
        return {
          ...r,
          materials: mats,
          status: r.status === 'checked_in' && allCollected ? 'material_collected' : r.status,
        }
      }),
    }))
    get().addAuditLog({
      operator,
      action: '物料领取',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: get().getRecordById(recordId)?.companyName,
      details: `领取物料：${materialIds.length}项`,
    })
  },

  approveNda: (recordId, ndaId, operator, visitorSignature) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== recordId) return r
        const ndas = r.ndaRecords.map((n) =>
          n.id === ndaId
            ? {
                ...n,
                signedAt: now,
                signerName: visitorSignature || n.visitorName,
                approverId: 'appr_' + operator,
                approvedAt: now,
                approvedByName: operator,
                status: 'approved' as const,
              }
            : n,
        )
        const allDone = ndas.length > 0 && ndas.every((n) => n.status === 'approved')
        return {
          ...r,
          ndaRecords: ndas,
          ndaCompleted: allDone,
          status: allDone ? 'approved' : 'nda_pending',
        }
      }),
    }))
    const rec = get().getRecordById(recordId)
    const nda = rec?.ndaRecords.find((n) => n.id === ndaId)
    get().addAuditLog({
      operator,
      action: 'NDA审批通过',
      targetType: 'NdaRecord',
      targetId: ndaId,
      targetName: nda?.visitorName,
      details: `签署人：${nda?.visitorName}，审批人：${operator}`,
    })
  },

  batchApproveAllNda: (recordId, operator) => {
    const rec = get().getRecordById(recordId)
    if (!rec) return
    rec.ndaRecords.forEach((n) => {
      if (n.status !== 'approved') {
        get().approveNda(recordId, n.id, operator, n.visitorName)
      }
    })
  },

  processWaitingListPromotion: (batchId) => {
    const batch = get().getBatchById(batchId)
    if (!batch) return []
    const promoted: VisitRecord[] = []
    const route = get().routes.find((r) => r.id === batch.routeId)

    set((s) => {
      let used = s.records
        .filter(
          (r) =>
            r.batchId === batchId &&
            !['cancelled', 'rejected'].includes(r.status) &&
            !r.inWaitingList,
        )
        .reduce((sum, r) => sum + r.totalPeople, 0)

      const sorted = [...s.records]
        .filter((r) => r.batchId === batchId && r.inWaitingList)
        .sort((a, b) => (a.waitingRank ?? 9999) - (b.waitingRank ?? 9999))

      const newRecords = s.records.map((r) => {
        if (r.batchId !== batchId || !r.inWaitingList) return r
        const idx = sorted.findIndex((w) => w.id === r.id)
        if (idx === -1) return r
        if (used + r.totalPeople <= batch.capacity) {
          used += r.totalPeople
          promoted.push(r)
          const newStatus: VisitStatus = route?.requiresNda ? 'pending_approval' : 'approved'
          return {
            ...r,
            inWaitingList: false as const,
            waitingRank: undefined as number | undefined,
            status: newStatus,
          }
        }
        return { ...r, waitingRank: idx + 1 - promoted.filter((p) => sorted.indexOf(p) < idx).length }
      })

      return { records: newRecords }
    })

    promoted.forEach((r) => {
      get().addAuditLog({
        operator: '系统',
        action: '候补转正',
        targetType: 'VisitRecord',
        targetId: r.id,
        targetName: r.companyName,
        details: `名额释放，从候补转为正式预约`,
      })
    })
    get().computeWaitingRanks()
    return promoted
  },

  securityClear: (recordId, operator) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === recordId ? { ...r, securityCleared: true } : r)),
    }))
    const rec = get().getRecordById(recordId)
    get().addAuditLog({
      operator,
      action: '安保放行',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: rec?.companyName,
      details: '身份核验通过，车辆信息登记完成',
    })
  },

  checkOut: (recordId, operator) => {
    const rec = get().getRecordById(recordId)
    if (!rec) return { success: false, message: '预约不存在' }
    if (!['checked_in', 'visiting', 'material_collected'].includes(rec.status)) {
      return { success: false, message: '当前状态不允许离场核销' }
    }
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId ? { ...r, status: 'checked_out', checkOutAt: nowISO() } : r,
      ),
    }))
    get().addAuditLog({
      operator,
      action: '离场核销',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: rec.companyName,
      details: `胸卡收回${rec.totalPeople}枚，拍照设备检查正常，确认离场`,
    })
    return { success: true }
  },

  addToBlacklist: (data) => {
    const item: BlacklistCompany = {
      ...data,
      id: uid('blk'),
      addedAt: nowISO(),
    }
    set((s) => ({ blacklist: [item, ...s.blacklist] }))
    get().addAuditLog({
      operator: get().currentUser,
      action: '加入黑名单',
      targetType: 'BlacklistCompany',
      targetId: item.id,
      targetName: item.companyName,
      details: `原因：${item.reason}`,
    })
  },

  removeFromBlacklist: (id) =>
    set((s) => ({
      blacklist: s.blacklist.map((b) => (b.id === id ? { ...b, active: false } : b)),
    })),

  isCompanyBlacklisted: (companyName) =>
    get().blacklist.find(
      (b) => b.active && companyName.replace(/\s+/g, '').includes(b.companyName.replace(/\s+/g, '')),
    ),

  computeWaitingRanks: () => {
    const grouped = new Map<string, VisitRecord[]>()
    get().records.forEach((r) => {
      if (r.inWaitingList) {
        if (!grouped.has(r.batchId)) grouped.set(r.batchId, [])
        grouped.get(r.batchId)!.push(r)
      }
    })
    grouped.forEach((list, batchId) => {
      const sorted = [...list].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
      set((s) => ({
        records: s.records.map((r) => {
          if (r.batchId !== batchId || !r.inWaitingList) return r
          const idx = sorted.findIndex((x) => x.id === r.id)
          return { ...r, waitingRank: idx === -1 ? r.waitingRank : idx + 1 }
        }),
      }))
    })
  },

  validateVisitor: (companyName, visitors) => {
    const blacklisted = get().isCompanyBlacklisted(companyName)
    if (blacklisted) {
      return {
        level: 'block',
        category: 'blacklist',
        message: `该企业已被列入黑名单：${blacklisted.reason}`,
        blockedReason: blacklisted.reason,
      }
    }

    const hasForeign = visitors.some((v) => v.isForeign)
    const foreignNationalities = visitors.filter((v) => v.isForeign).map((v) => v.nationality)
    const partner = get().getExternalPartner(companyName)

    if (hasForeign) {
      const highestReq = foreignNationalities.reduce((max, nat) => {
        const config = get().getForeignConfig(nat || '')
        if (!config) return max
        const levels: Record<string, number> = { none: 0, manager: 1, director: 2, ceo: 3, ministry: 4 }
        return Math.max(max, levels[config.approvalRequirement] || 0)
      }, 0)

      if (highestReq >= 2) {
        return {
          level: 'require_approval',
          category: 'foreign',
          message: `外籍访客需要${highestReq === 4 ? '部委' : highestReq === 3 ? 'CEO' : '总监'}级审批`,
          requiredApprovalRole: highestReq === 4 ? 'ministry' : highestReq === 3 ? 'ceo' : 'director',
        }
      }
    }

    if (partner) {
      const levels: Record<string, number> = { none: 0, manager: 1, director: 2, ceo: 3 }
      const reqLevel = levels[partner.approvalRequirement] || 0
      if (reqLevel > 0) {
        return {
          level: 'require_approval',
          category: 'external_partner',
          message: `${partner.cooperationLevel === 'strategic' ? '战略' : partner.cooperationLevel === 'important' ? '重要' : '普通'}合作单位需要${partner.approvalRequirement === 'ceo' ? 'CEO' : partner.approvalRequirement === 'director' ? '总监' : '经理'}级审批`,
          requiredApprovalRole: partner.approvalRequirement,
        }
      }
      return {
        level: 'allow',
        category: 'external_partner',
        message: `${partner.cooperationLevel === 'strategic' ? '战略' : partner.cooperationLevel === 'important' ? '重要' : '普通'}合作单位，可直接预约`,
      }
    }

    return {
      level: 'allow',
      category: 'internal',
      message: '内部访客，可直接预约',
    }
  },

  getExternalPartner: (companyName) =>
    get().externalPartners.find(
      (p) => p.isActive && companyName.replace(/\s+/g, '').includes(p.companyName.replace(/\s+/g, '')),
    ),

  getForeignConfig: (nationality) =>
    get().foreignConfigs.find((c) => c.isActive && c.nationality === nationality),

  calculateBatchStaff: (batchId, trigger) => {
    const batch = get().getBatchById(batchId)
    if (!batch) throw new Error('批次不存在')

    const route = get().routes.find((r) => r.id === batch.routeId)
    const totalPeople = get().getBatchUsedCapacity(batchId)
    const hasSecretZone = route?.zones.some((z) => z.isSecret) || false
    const today = new Date(batch.date).getDay()

    const availableReception = get().staff.filter(
      (s) => s.role === 'reception' && s.isOnDuty && s.workDays.includes(today),
    )
    const availableSecurity = get().staff.filter(
      (s) => s.role === 'security' && s.isOnDuty && s.workDays.includes(today),
    )

    const receptionCount = Math.min(
      Math.max(1, Math.ceil(totalPeople / 15)),
      availableReception.length,
    )
    const securityCount = Math.min(
      Math.max(hasSecretZone ? 2 : 1, Math.ceil(totalPeople / 20)),
      availableSecurity.length,
    )

    const assignment: BatchStaffAssignment = {
      batchId,
      receptionStaffIds: availableReception.slice(0, receptionCount).map((s) => s.id),
      securityStaffIds: availableSecurity.slice(0, securityCount).map((s) => s.id),
      guideId: batch.guideId,
      calculatedAt: nowISO(),
      calculatedBy: get().currentUser,
      reason: trigger === 'create' ? '批次创建' : trigger === 'people_change' ? '人数变化' : trigger === 'route_change' ? '路线变更' : '批次更新',
    }

    set((s) => ({
      batches: s.batches.map((b) =>
        b.id === batchId
          ? {
              ...b,
              staffAssignment: assignment,
              autoCalculatedStaff: true,
              lastStaffCalculationAt: nowISO(),
            }
          : b,
      ),
    }))

    get().addAuditLog({
      operator: '系统',
      action: '人员自动分配',
      targetType: 'VisitBatch',
      targetId: batchId,
      targetName: batch.name,
      details: `${assignment.reason}：接待员${receptionCount}人，安保${securityCount}人${hasSecretZone ? '（涉密路线加倍）' : ''}`,
    })

    return assignment
  },

  calculateBatchMaterials: (batchId) => {
    const batch = get().getBatchById(batchId)
    if (!batch) throw new Error('批次不存在')

    const route = get().routes.find((r) => r.id === batch.routeId)
    const totalPeople = get().getBatchUsedCapacity(batchId)
    const hasSecretZone = route?.zones.some((z) => z.isSecret) || false
    const hasSampleZone = route?.zones.some((z) => z.name.includes('样品')) || false

    const preparation: BatchMaterialPreparation = {
      batchId,
      badgeCount: totalPeople,
      brochureCount: totalPeople,
      bagCount: totalPeople,
      sampleCount: hasSampleZone ? totalPeople : 0,
      safetyVestCount: hasSecretZone ? totalPeople : 0,
      phoneBagCount: hasSecretZone ? totalPeople : 0,
      preparedAt: nowISO(),
      preparedBy: get().currentUser,
    }

    set((s) => ({
      batches: s.batches.map((b) =>
        b.id === batchId
          ? {
              ...b,
              materialPreparation: preparation,
              autoCalculatedMaterials: true,
              lastMaterialCalculationAt: nowISO(),
            }
          : b,
      ),
    }))

    get().addAuditLog({
      operator: '系统',
      action: '物料自动计算',
      targetType: 'VisitBatch',
      targetId: batchId,
      targetName: batch.name,
      details: `胸卡${preparation.badgeCount}枚，宣传册${preparation.brochureCount}本${hasSecretZone ? `，安全背心${preparation.safetyVestCount}件，手机封存袋${preparation.phoneBagCount}个` : ''}${hasSampleZone ? `，样品${preparation.sampleCount}份` : ''}`,
    })

    return preparation
  },

  recalculateBatchStaffIfNeeded: (batchId, reason) => {
    get().calculateBatchStaff(batchId, 'update')
    get().calculateBatchMaterials(batchId)
  },

  getAvailableParkingSpaces: () =>
    get().parkingSpaces.filter((s) => s.status === 'available'),

  reserveParkingSpace: (recordId, plateNumber) => {
    const available = get().getAvailableParkingSpaces()
    if (available.length === 0) return null

    const space = available[0]
    const record = get().getRecordById(recordId)
    if (!record) return null

    set((s) => ({
      parkingSpaces: s.parkingSpaces.map((p) =>
        p.id === space.id
          ? {
              ...p,
              status: 'reserved',
              reservedForRecordId: recordId,
              reservedForCompany: record.companyName,
              plateNumber,
              reservedAt: nowISO(),
            }
          : p,
      ),
      records: s.records.map((r) =>
        r.id === recordId
          ? { ...r, parkingSpaceId: space.id, parkingSpaceCode: space.code }
          : r,
      ),
    }))

    get().addAuditLog({
      operator: get().currentUser,
      action: '车位预留',
      targetType: 'ParkingSpace',
      targetId: space.id,
      targetName: space.code,
      details: `预留车位给${record.companyName}，车牌${plateNumber}`,
    })

    return { ...space }
  },

  releaseParkingSpace: (spaceId) => {
    set((s) => ({
      parkingSpaces: s.parkingSpaces.map((p) =>
        p.id === spaceId
          ? {
              ...p,
              status: 'available',
              reservedForRecordId: undefined,
              reservedForCompany: undefined,
              plateNumber: undefined,
              reservedAt: undefined,
              occupiedAt: undefined,
              releasedAt: nowISO(),
            }
          : p,
      ),
    }))
    return true
  },

  getRecordParkingSpace: (recordId) =>
    get().parkingSpaces.find((s) => s.reservedForRecordId === recordId),

  createTemporarySecretRequest: (data) => {
    const record = get().getRecordById(data.recordId)
    if (!record) return null
    if (record.status !== 'checked_in' && record.status !== 'visiting' && record.status !== 'material_collected') {
      return null
    }

    const visitor = record.visitors.find((v) => v.id === data.visitorId)
    if (!visitor) return null

    const zone = seedZones.find((z) => z.id === data.targetZoneId)
    if (!zone || !zone.isSecret) return null

    const request: TemporarySecretRequest = {
      id: uid('tsr'),
      recordId: data.recordId,
      visitorId: data.visitorId,
      visitorName: visitor.name,
      companyName: record.companyName,
      targetZoneId: data.targetZoneId,
      targetZoneName: zone.name,
      reason: data.reason,
      status: 'pending',
      requestedAt: nowISO(),
      requestedBy: data.requestedBy,
      ndaRequired: true,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }

    set((s) => ({
      temporarySecretRequests: [request, ...s.temporarySecretRequests],
      records: s.records.map((r) =>
        r.id === data.recordId
          ? {
              ...r,
              temporarySecretRequests: [...(r.temporarySecretRequests || []), request],
            }
          : r,
      ),
    }))

    get().addAuditLog({
      operator: data.requestedBy,
      action: '临时涉密申请',
      targetType: 'TemporarySecretRequest',
      targetId: request.id,
      targetName: `${visitor.name}-${zone.name}`,
      details: `已签到访客临时申请进入${zone.name}，原因：${data.reason}`,
    })

    return request
  },

  approveTemporarySecretRequest: (requestId, approver, ndaSigned) => {
    const now = nowISO()
    set((s) => ({
      temporarySecretRequests: s.temporarySecretRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'approved',
              approverName: approver,
              approvedAt: now,
              ndaSigned,
              ndaSignedAt: ndaSigned ? now : undefined,
            }
          : r,
      ),
    }))

    const request = get().temporarySecretRequests.find((r) => r.id === requestId)
    if (request) {
      get().addAuditLog({
        operator: approver,
        action: '临时涉密审批通过',
        targetType: 'TemporarySecretRequest',
        targetId: requestId,
        targetName: request.visitorName,
        details: `批准进入${request.targetZoneName}${ndaSigned ? '，NDA已签署' : '，NDA待补签'}`,
      })
    }

    return true
  },

  rejectTemporarySecretRequest: (requestId, approver, reason) => {
    set((s) => ({
      temporarySecretRequests: s.temporarySecretRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rejected', approverName: approver, rejectionReason: reason }
          : r,
      ),
    }))

    const request = get().temporarySecretRequests.find((r) => r.id === requestId)
    if (request) {
      get().addAuditLog({
        operator: approver,
        action: '临时涉密申请驳回',
        targetType: 'TemporarySecretRequest',
        targetId: requestId,
        targetName: request.visitorName,
        details: `拒绝进入${request.targetZoneName}，原因：${reason}`,
      })
    }

    return true
  },

  getRecordTemporaryRequests: (recordId) =>
    get().temporarySecretRequests.filter((r) => r.recordId === recordId),

  printBadges: (recordId, operator) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              visitors: r.visitors.map((v) => ({
                ...v,
                badgePrinted: true,
                badgePrintedAt: now,
                badgeCode: `BADGE-${r.code}-${v.id.slice(-4)}`,
              })),
              badgeBatchPrinted: true,
              badgeBatchPrintedAt: now,
            }
          : r,
      ),
    }))

    const record = get().getRecordById(recordId)
    get().addAuditLog({
      operator,
      action: '胸卡打印',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: record?.companyName,
      details: `批量打印胸卡${record?.visitors.length}枚`,
    })

    return true
  },

  sealPhones: (recordId, operator) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              visitors: r.visitors.map((v, i) => ({
                ...v,
                phoneSealed: true,
                phoneSealedAt: now,
                phoneSealBagCode: `SEAL-${r.code}-${String(i + 1).padStart(2, '0')}`,
              })),
              phoneBatchSealed: true,
              phoneBatchSealedAt: now,
            }
          : r,
      ),
    }))

    const record = get().getRecordById(recordId)
    get().addAuditLog({
      operator,
      action: '手机封存',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: record?.companyName,
      details: `封存手机${record?.visitors.length}台`,
    })

    return true
  },

  collectSample: (recordId, visitorId, operator) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              visitors: r.visitors.map((v) =>
                v.id === visitorId
                  ? { ...v, sampleCollected: true, sampleCollectedAt: now }
                  : v,
              ),
            }
          : r,
      ),
    }))

    const record = get().getRecordById(recordId)
    const visitor = record?.visitors.find((v) => v.id === visitorId)
    get().addAuditLog({
      operator,
      action: '样品领取',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: visitor?.name,
      details: `${visitor?.name}领取样品1份`,
    })

    return true
  },

  returnMaterial: (recordId, materialId, quantity, operator, condition) => {
    const now = nowISO()
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== recordId) return r
        const mats = r.materials.map((m) =>
          m.id === materialId
            ? {
                ...m,
                returnedAt: now,
                returnedBy: operator,
                returnReceivedBy: operator,
                returnCondition: condition,
              }
            : m,
        )
        const allReturned = mats.every((m) => m.returnedAt)
        return {
          ...r,
          materials: mats,
          materialsReturned: allReturned,
          materialsReturnedAt: allReturned ? now : undefined,
          materialsReturnedBy: allReturned ? operator : undefined,
          unreturnedMaterials: allReturned ? [] : get().checkUnreturnedMaterials(recordId),
        }
      }),
    }))

    const record = get().getRecordById(recordId)
    const material = record?.materials.find((m) => m.id === materialId)
    get().addAuditLog({
      operator,
      action: '物料归还',
      targetType: 'MaterialItem',
      targetId: materialId,
      targetName: material?.name,
      details: `归还${material?.name} ${quantity}件，状况：${condition}`,
    })

    return true
  },

  checkUnreturnedMaterials: (recordId) => {
    const record = get().getRecordById(recordId)
    if (!record) return []

    const unreturned: { name: string; quantity: number; type: MaterialType }[] = []
    record.materials.forEach((m) => {
      if (!m.returnedAt && m.type && m.quantity > 0) {
        unreturned.push({ name: m.name, quantity: m.quantity, type: m.type })
      }
    })

    record.visitors.forEach((v) => {
      if (v.phoneSealed && !v.phoneSealed === false) {
        unreturned.push({ name: `手机封存袋(${v.name})`, quantity: 1, type: 'phone_bag' })
      }
      if (v.sampleCollected) {
        unreturned.push({ name: `样品(${v.name})`, quantity: 1, type: 'sample' })
      }
      if (v.safetyVestCollected) {
        unreturned.push({ name: `安全背心(${v.name})`, quantity: 1, type: 'safety_vest' })
      }
    })

    return unreturned
  },

  getConflictResolutionSuggestions: (batchId) => {
    const batch = get().getBatchById(batchId)
    if (!batch) return []

    const suggestions: ConflictResolutionSuggestion[] = []
    const conflicts = get().checkBatchConflicts(batch, batchId)

    conflicts.forEach((conflict) => {
      if (conflict.type === 'guide') {
        const availableGuides = get().guides.filter(
          (g) =>
            g.id !== batch.guideId &&
            !get().batches.some(
              (b) =>
                b.id !== batchId &&
                b.date === batch.date &&
                b.status !== 'cancelled' &&
                b.guideId === g.id &&
                !(batch.endTime <= b.startTime || batch.startTime >= b.endTime),
            ),
        )
        if (availableGuides.length > 0) {
          suggestions.push({
            type: 'guide',
            suggestion: `建议更换讲解员为「${availableGuides[0].name}」`,
            originalValue: get().guides.find((g) => g.id === batch.guideId)?.name || '',
            suggestedValue: availableGuides[0].name,
            impactLevel: 'low',
          })
        }
      }

      if (conflict.type === 'zone') {
        const altRoutes = get().routes.filter(
          (r) =>
            r.id !== batch.routeId &&
            !get().batches.some(
              (b) =>
                b.id !== batchId &&
                b.date === batch.date &&
                b.status !== 'cancelled' &&
                b.routeId === r.id &&
                !(batch.endTime <= b.startTime || batch.startTime >= b.endTime),
            ),
        )
        if (altRoutes.length > 0) {
          suggestions.push({
            type: 'route',
            suggestion: `建议更换路线为「${altRoutes[0].name}」`,
            originalValue: get().routes.find((r) => r.id === batch.routeId)?.name || '',
            suggestedValue: altRoutes[0].name,
            impactLevel: 'medium',
            affectedBatches: [conflict.conflictingBatchId],
          })
        }

        const timeSlots = [
          { start: '09:00', end: '10:30' },
          { start: '10:30', end: '12:00' },
          { start: '14:00', end: '15:30' },
          { start: '15:30', end: '17:00' },
        ]
        const availableSlot = timeSlots.find(
          (slot) =>
            !get().batches.some(
              (b) =>
                b.id !== batchId &&
                b.date === batch.date &&
                b.status !== 'cancelled' &&
                b.routeId === batch.routeId &&
                !(slot.end <= b.startTime || slot.start >= b.endTime),
            ),
        )
        if (availableSlot) {
          suggestions.push({
            type: 'time',
            suggestion: `建议调整时间为 ${availableSlot.start}-${availableSlot.end}`,
            originalValue: `${batch.startTime}-${batch.endTime}`,
            suggestedValue: `${availableSlot.start}-${availableSlot.end}`,
            impactLevel: 'high',
            affectedBatches: [conflict.conflictingBatchId],
          })
        }
      }
    })

    return suggestions
  },

  resolveBatchConflict: (batchId, suggestion, operator) => {
    const batch = get().getBatchById(batchId)
    if (!batch) return false

    let updates: Partial<VisitBatch> = {
      conflictResolution: {
        resolved: true,
        resolvedAt: nowISO(),
        resolvedBy: operator,
        originalRouteId: batch.routeId,
        originalStartTime: batch.startTime,
        originalEndTime: batch.endTime,
        resolutionNotes: suggestion.suggestion,
      },
    }

    if (suggestion.type === 'time') {
      const [start, end] = suggestion.suggestedValue.split('-')
      updates = { ...updates, startTime: start, endTime: end }
    } else if (suggestion.type === 'route') {
      const newRoute = get().routes.find((r) => r.name === suggestion.suggestedValue)
      if (newRoute) updates = { ...updates, routeId: newRoute.id }
    } else if (suggestion.type === 'guide') {
      const newGuide = get().guides.find((g) => g.name === suggestion.suggestedValue)
      if (newGuide) updates = { ...updates, guideId: newGuide.id }
    }

    get().updateBatch(batchId, updates)
    get().recalculateBatchStaffIfNeeded(batchId, '冲突重排')

    get().addAuditLog({
      operator,
      action: '冲突重排',
      targetType: 'VisitBatch',
      targetId: batchId,
      targetName: batch.name,
      details: `${suggestion.suggestion}，原：${suggestion.originalValue} → 新：${suggestion.suggestedValue}`,
    })

    return true
  },

  getBatchSecurityList: (batchId) => {
    const records = get().getBatchRecords(batchId)
    const list: { visitor: Visitor; record: VisitRecord; cleared: boolean }[] = []
    records.forEach((r) => {
      r.visitors.forEach((v) => {
        list.push({ visitor: v, record: r, cleared: r.securityCleared })
      })
    })
    return list
  },

  getBatchReceptionList: (batchId) => {
    const records = get().getBatchRecords(batchId)
    const list: { visitor: Visitor; record: VisitRecord; badgePrinted: boolean }[] = []
    records.forEach((r) => {
      r.visitors.forEach((v) => {
        list.push({ visitor: v, record: r, badgePrinted: v.badgePrinted || false })
      })
    })
    return list
  },

  updateBatch: (batchId, updates) => {
    set((s) => ({
      batches: s.batches.map((b) => (b.id === batchId ? { ...b, ...updates } : b)),
    }))
  },

  demoScenarios: [
    {
      id: 'overcapacity_waitlist',
      title: '人数超限候补',
      description: '当预约人数超过当前批次容量时，系统自动识别并提供候补选项',
      steps: [
        '创建一个人数为35人的预约（标准批次容量30人）',
        '系统检测到人数超限，自动标记为"待候补"',
        '系统根据已有排班生成候补建议时间',
        '确认候补后进入候补队列，等待有空位时自动通知'
      ],
      expectedResult: '预约成功进入候补队列，系统提供3个可选的候补时间段',
      pagePath: '/booking'
    },
    {
      id: 'secret_approval',
      title: '涉密补审批',
      description: '已签到访客临时申请进入涉密区，需补走负责人确认和NDA流程',
      steps: [
        '选择一个已签到但未涉密的访客',
        '发起临时涉密区申请',
        '负责人审批确认（可填写审批意见）',
        '访客在线签署NDA保密协议',
        '审批通过后系统自动授权进入涉密区'
      ],
      expectedResult: '访客完成三级审批流程，获得涉密区临时访问权限，权限2小时后自动失效',
      pagePath: '/secret-approval'
    },
    {
      id: 'route_conflict',
      title: '路线冲突重排',
      description: '当两个批次的参观时间和路线冲突时，系统智能检测并提供重排方案',
      steps: [
        '创建一个与现有批次时间和路线完全冲突的新批次',
        '系统实时检测到讲解员、路线、涉密区三重冲突',
        '系统生成3套冲突解决方案（调整时间/更换路线/分批次）',
        '选择最优方案后系统自动重排相关批次的人员和物料'
      ],
      expectedResult: '冲突自动解决，系统重新计算所有受影响批次的接待员和安保人员分配',
      pagePath: '/batch-create'
    },
    {
      id: 'unreturned_material',
      title: '离场物料未归还提醒',
      description: '访客离场时系统自动检查物料归还状态，未归还物料时禁止离场并提醒',
      steps: [
        '创建一个领取了胸卡、手机袋和样品的预约记录',
        '在物料归还环节故意不归还样品',
        '点击离场按钮时系统检测到未归还物料',
        '系统高亮显示未归还物料，禁止离场操作',
        '完成物料归还后才能确认离场'
      ],
      expectedResult: '系统准确识别1项未归还物料（样品），并在归还前阻止离场操作',
      pagePath: '/checkout'
    }
  ],

  runDemoScenario: (scenarioId: DemoScenarioId, operator: string = '演示操作员'): DemoExecutionResult => {
    const get = useAppStore.getState()
    const set = useAppStore.setState

    switch (scenarioId) {
      case 'overcapacity_waitlist': {
        const today = new Date().toISOString().split('T')[0]
        const nextHour = new Date()
        nextHour.setHours(nextHour.getHours() + 1)
        const nextHourStr = nextHour.toTimeString().slice(0, 5)

        const batch = get.batches.find(b => b.date === today)
        if (!batch) {
          return { success: false, message: '今日无可用批次，请先创建批次' }
        }

        const recordId = `REC_DEMO_WL_${Date.now()}`
        const visitors: Visitor[] = Array.from({ length: 35 }, (_, i) => ({
          id: `VIS_DEMO_WL_${i}`,
          name: `演示访客${i + 1}`,
          idType: '身份证',
          idNumber: `110101199${(i % 10)}${String(i % 12).padStart(2, '0')}${String(i % 28 + 1).padStart(2, '0')}${String(1000 + i).slice(-4)}`,
          phone: `1380000${String(1000 + i).slice(-4)}`,
          company: '演示超限公司',
          isForeign: false,
          nationality: '中国',
          needsSecretZone: false,
          badgePrinted: false,
          phoneSealed: false,
          sampleCollected: false,
          checkedIn: false,
          checkedOut: false,
          securityCleared: false
        }))

        const newRecord: VisitRecord = {
          id: recordId,
          code: `WL${Date.now().toString().slice(-6)}`,
          companyName: '演示超限科技有限公司',
          contactName: '张经理',
          contactPhone: '13800001111',
          contactEmail: 'demo@example.com',
          visitDate: today,
          startTime: nextHourStr,
          endTime: `${nextHour.getHours() + 2}:${nextHour.getMinutes().toString().padStart(2, '0')}`,
          visitors,
          totalPeople: 35,
          visitPurpose: '商务洽谈',
          zones: get.zones.filter(z => !z.isSecret).map(z => z.id),
          needsSecretZone: false,
          secretApprovalStatus: 'not_required',
          status: 'additional_approval_required',
          waitlistPosition: 1,
          estimatedAvailableTime: `${nextHour.getHours() + 3}:00`,
          additionalApprovalRequired: true,
          additionalApprovalStatus: 'pending',
          additionalApprovalReason: '预约人数35人超过批次容量30人，已进入候补队列',
          createdAt: new Date().toISOString(),
          createdBy: operator,
          visitorCategory: 'normal',
          validationResult: {
            level: 'require_approval',
            category: 'normal',
            message: '人数超过批次容量，已自动进入候补队列，等待空位释放',
            blockedReason: null,
            requiresForeignApproval: false,
            requiresSecretApproval: false
          }
        }

        set((s) => ({ records: [newRecord, ...s.records] }))

        return {
          success: true,
          message: '人数超限候补场景演示数据已创建：35人预约超过30人容量，已进入候补队列',
          recordId
        }
      }

      case 'secret_approval': {
        const today = new Date().toISOString().split('T')[0]
        const normalRecord = get.records.find(
          r => r.visitDate === today && r.status === 'approved' && !r.needsSecretZone && r.visitors[0]?.checkedIn
        )

        let targetRecord: VisitRecord
        if (!normalRecord) {
          const recordId = `REC_DEMO_SA_${Date.now()}`
          const visitor: Visitor = {
            id: `VIS_DEMO_SA_1`,
            name: '李工程师',
            idType: '身份证',
            idNumber: '110101199001011234',
            phone: '13900002222',
            company: '演示涉密公司',
            isForeign: false,
            nationality: '中国',
            needsSecretZone: false,
            badgePrinted: true,
            phoneSealed: true,
            sampleCollected: false,
            checkedIn: true,
            checkedInAt: new Date().toISOString(),
            checkedOut: false,
            securityCleared: true
          }

          targetRecord = {
            id: recordId,
            code: `SA${Date.now().toString().slice(-6)}`,
            companyName: '演示涉密科技有限公司',
            contactName: '李工程师',
            contactPhone: '13900002222',
            visitDate: today,
            startTime: '10:00',
            endTime: '12:00',
            visitors: [visitor],
            totalPeople: 1,
            visitPurpose: '技术交流',
            zones: get.zones.filter(z => !z.isSecret).map(z => z.id),
            needsSecretZone: false,
            secretApprovalStatus: 'not_required',
            status: 'approved',
            createdAt: new Date().toISOString(),
            createdBy: operator,
            visitorCategory: 'normal',
            validationResult: {
              level: 'allow',
              category: 'normal',
              message: '校验通过',
              blockedReason: null,
              requiresForeignApproval: false,
              requiresSecretApproval: false
            }
          }
          set((s) => ({ records: [targetRecord, ...s.records] }))
        } else {
          targetRecord = normalRecord
        }

        const visitor = targetRecord.visitors[0]
        const requestId = `TEMP_SECRET_${Date.now()}`
        const newRequest: TemporarySecretRequest = {
          id: requestId,
          visitorId: visitor.id,
          visitorName: visitor.name,
          recordId: targetRecord.id,
          companyName: targetRecord.companyName,
          zoneIds: get.zones.filter(z => z.isSecret).map(z => z.id),
          reason: '临时需要进入涉密区查看样品展示',
          status: 'pending',
          appliedAt: new Date().toISOString(),
          appliedBy: operator,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationHours: 2
        }

        set((s) => ({
          temporarySecretRequests: [newRequest, ...s.temporarySecretRequests],
          records: s.records.map(r =>
            r.id === targetRecord.id
              ? {
                  ...r,
                  temporarySecretRequests: [...(r.temporarySecretRequests || []), newRequest]
                }
              : r
          )
        }))

        return {
          success: true,
          message: '涉密补审批场景演示数据已创建：已签到访客李工程师发起临时涉密申请，等待负责人审批',
          recordId: targetRecord.id
        }
      }

      case 'route_conflict': {
        const today = new Date().toISOString().split('T')[0]
        const existingBatch = get.batches.find(b => b.date === today && b.status === 'scheduled')

        if (!existingBatch) {
          return { success: false, message: '今日无可用批次，请先创建批次' }
        }

        const batchId = `BATCH_DEMO_RC_${Date.now()}`
        const conflictBatch: VisitBatch = {
          id: batchId,
          name: '演示冲突批次-新药研发考察',
          code: `RC${Date.now().toString().slice(-4)}`,
          date: existingBatch.date,
          startTime: existingBatch.startTime,
          endTime: existingBatch.endTime,
          routeId: existingBatch.routeId,
          routeName: existingBatch.routeName,
          totalPeople: 25,
          maxPeople: 30,
          estimatedDuration: 120,
          zones: existingBatch.zones,
          status: 'draft',
          conflicts: [
            {
              type: 'guide',
              message: `讲解员${existingBatch.guideName}在此时间段已有安排`,
              conflictingBatchId: existingBatch.id,
              conflictingBatchName: existingBatch.name,
              level: 'error'
            },
            {
              type: 'route',
              message: `路线${existingBatch.routeName}在此时间段已被占用`,
              conflictingBatchId: existingBatch.id,
              conflictingBatchName: existingBatch.name,
              level: 'error'
            },
            {
              type: 'zone',
              message: '涉密展区同一时间只能接待一个批次',
              conflictingBatchId: existingBatch.id,
              conflictingBatchName: existingBatch.name,
              level: 'warning'
            }
          ],
          guideId: existingBatch.guideId,
          guideName: existingBatch.guideName,
          receptionIds: [],
          securityIds: [],
          createdAt: new Date().toISOString(),
          createdBy: operator,
          receptionCount: 0,
          securityCount: 0
        }

        set((s) => ({ batches: [conflictBatch, ...s.batches] }))

        return {
          success: true,
          message: '路线冲突重排场景演示数据已创建：新批次与现有批次在时间、路线、讲解员上存在三重冲突',
          batchId
        }
      }

      case 'unreturned_material': {
        const today = new Date().toISOString().split('T')[0]
        const recordId = `REC_DEMO_UM_${Date.now()}`

        const visitor: Visitor = {
          id: `VIS_DEMO_UM_1`,
          name: '王主管',
          idType: '身份证',
          idNumber: '110101198505055678',
          phone: '13700003333',
          company: '演示物料公司',
          isForeign: false,
          nationality: '中国',
          needsSecretZone: false,
          badgePrinted: true,
          badgePrintedAt: new Date(Date.now() - 3600000).toISOString(),
          phoneSealed: true,
          phoneSealedAt: new Date(Date.now() - 3500000).toISOString(),
          sampleCollected: true,
          sampleCollectedAt: new Date(Date.now() - 3400000).toISOString(),
          checkedIn: true,
          checkedInAt: new Date(Date.now() - 3600000).toISOString(),
          checkedOut: false,
          securityCleared: true
        }

        const materials: MaterialItem[] = [
          {
            id: `MAT_UM_BADGE_${Date.now()}`,
            type: 'badge',
            name: '访客胸卡-001',
            status: 'distributed',
            distributedAt: new Date(Date.now() - 3600000).toISOString(),
            distributedTo: visitor.id,
            returned: false
          },
          {
            id: `MAT_UM_PHONE_${Date.now()}`,
            type: 'phone_bag',
            name: '手机封存袋-A12',
            status: 'distributed',
            distributedAt: new Date(Date.now() - 3500000).toISOString(),
            distributedTo: visitor.id,
            returned: false
          },
          {
            id: `MAT_UM_SAMPLE_${Date.now()}`,
            type: 'sample',
            name: '新药样品-S001',
            status: 'distributed',
            distributedAt: new Date(Date.now() - 3400000).toISOString(),
            distributedTo: visitor.id,
            returned: false
          }
        ]

        const newRecord: VisitRecord = {
          id: recordId,
          code: `UM${Date.now().toString().slice(-6)}`,
          companyName: '演示物料归还科技有限公司',
          contactName: '王主管',
          contactPhone: '13700003333',
          visitDate: today,
          startTime: '14:00',
          endTime: '16:00',
          visitors: [visitor],
          totalPeople: 1,
          visitPurpose: '样品考察',
          zones: get.zones.filter(z => !z.isSecret).map(z => z.id),
          needsSecretZone: false,
          secretApprovalStatus: 'approved',
          status: 'checked_in',
          materials,
          materialsReturned: false,
          unreturnedMaterials: [
            { name: '新药样品-S001', quantity: 1, type: 'sample' }
          ],
          createdAt: new Date().toISOString(),
          createdBy: operator,
          visitorCategory: 'normal',
          validationResult: {
            level: 'allow',
            category: 'normal',
            message: '校验通过',
            blockedReason: null,
            requiresForeignApproval: false,
            requiresSecretApproval: false
          }
        }

        set((s) => ({ records: [newRecord, ...s.records] }))

        return {
          success: true,
          message: '离场物料未归还提醒场景演示数据已创建：王主管领取了3项物料，其中样品未归还，离场时将被拦截',
          recordId
        }
      }

      default:
        return { success: false, message: '未知的演示场景' }
    }
  }
}))

export const seedZonesExport = seedZones
