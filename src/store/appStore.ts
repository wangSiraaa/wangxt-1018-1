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
} from '@/types'
import {
  seedBatches,
  seedRecords,
  seedRoutes,
  seedGuides,
  seedBlacklist,
  seedAuditLogs,
  seedZones,
} from '@/data/mockData'
import { uid, nowISO, formatDate } from '@/lib/utils'

interface AppState {
  batches: VisitBatch[]
  records: VisitRecord[]
  routes: Route[]
  guides: Guide[]
  blacklist: BlacklistCompany[]
  auditLogs: AuditLog[]

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

  cancelVisitRecord: (recordId: string, operator: string) => { success: boolean; message?: string }

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
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: seedBatches,
  records: seedRecords,
  routes: seedRoutes,
  guides: seedGuides,
  blacklist: seedBlacklist,
  auditLogs: seedAuditLogs,
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
    if (record.inWaitingList) {
      get().computeWaitingRanks()
    } else {
      get().processWaitingListPromotion(record.batchId)
    }
    get().addAuditLog({
      operator,
      action: '取消预约',
      targetType: 'VisitRecord',
      targetId: recordId,
      targetName: record.companyName,
      details: `预约被取消，${record.totalPeople}人释放名额`,
    })
    return { success: true }
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
}))

export const seedZonesExport = seedZones
