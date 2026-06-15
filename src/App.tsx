import { Routes, Route, useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import Dashboard from '@/pages/Dashboard'
import BatchList from '@/pages/BatchList'
import BatchCreate from '@/pages/BatchCreate'
import VisitorBooking from '@/pages/VisitorBooking'
import ReceptionDesk from '@/pages/ReceptionDesk'
import ReceptionWorkbench from '@/pages/ReceptionWorkbench'
import SecretApproval from '@/pages/SecretApproval'
import WaitingList from '@/pages/WaitingList'
import RouteSchedule from '@/pages/RouteSchedule'
import SecurityList from '@/pages/SecurityList'
import CheckOut from '@/pages/CheckOut'
import AuditLogs from '@/pages/AuditLogs'
import DemoCenter from '@/pages/DemoCenter'
import { useAppStore } from '@/store/appStore'

export default function App() {
  const loc = useLocation()
  const computeRanks = useAppStore((s) => s.computeWaitingRanks)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    computeRanks()
  }, [computeRanks])

  if (loc.pathname.startsWith('/book')) {
    return (
      <Routes>
        <Route path="/book/:batchId" element={<VisitorBooking />} />
      </Routes>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleSidebar={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/batches" element={<BatchList />} />
            <Route path="/batches/new" element={<BatchCreate />} />
            <Route path="/batches/edit/:id" element={<BatchCreate />} />
            <Route path="/reception" element={<ReceptionDesk />} />
            <Route path="/workbench" element={<ReceptionWorkbench />} />
            <Route path="/secret" element={<SecretApproval />} />
            <Route path="/waiting" element={<WaitingList />} />
            <Route path="/routes" element={<RouteSchedule />} />
            <Route path="/security" element={<SecurityList />} />
            <Route path="/checkout" element={<CheckOut />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/demo" element={<DemoCenter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-6xl font-bold text-slate-300">404</div>
      <div className="text-slate-500">页面不存在</div>
      <Link to="/" className="btn-primary">返回首页</Link>
    </div>
  )
}
