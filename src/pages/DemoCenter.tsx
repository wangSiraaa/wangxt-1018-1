import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Users,
  ShieldCheck,
  Shuffle,
  PackageX,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Clock,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Alert from '@/components/Alert'
import type { DemoScenarioId, DemoScenario } from '@/types'

const getScenarioIcon = (id: DemoScenarioId) => {
  const icons = {
    overcapacity_waitlist: Users,
    secret_approval: ShieldCheck,
    route_conflict: Shuffle,
    unreturned_material: PackageX,
  }
  return icons[id]
}

const getScenarioColor = (id: DemoScenarioId) => {
  const colors = {
    overcapacity_waitlist: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    },
    secret_approval: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      iconBg: 'bg-purple-500',
      cardBg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    },
    route_conflict: {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      border: 'border-sky-200',
      iconBg: 'bg-sky-500',
      cardBg: 'bg-gradient-to-br from-sky-50 to-cyan-50',
    },
    unreturned_material: {
      bg: 'bg-rose-100',
      text: 'text-rose-700',
      border: 'border-rose-200',
      iconBg: 'bg-rose-500',
      cardBg: 'bg-gradient-to-br from-rose-50 to-pink-50',
    },
  }
  return colors[id]
}

const getPathLabel = (path: string) => {
  const labels: Record<string, string> = {
    '/booking': '预约页面',
    '/secret-approval': '涉密审批页面',
    '/batch-create': '批次创建页面',
    '/checkout': '离场核销页面',
  }
  return labels[path] || path
}

export default function DemoCenter() {
  const navigate = useNavigate()
  const demoScenarios = useAppStore((s) => s.demoScenarios)
  const runDemoScenario = useAppStore((s) => s.runDemoScenario)
  const batches = useAppStore((s) => s.batches)
  const records = useAppStore((s) => s.records)

  const [expandedId, setExpandedId] = useState<DemoScenarioId | null>(null)
  const [demoResult, setDemoResult] = useState<{
    success: boolean
    message: string
    scenarioId: DemoScenarioId
    recordId?: string
    batchId?: string
  } | null>(null)
  const [runningScenario, setRunningScenario] = useState<DemoScenarioId | null>(null)

  const handleRunDemo = async (scenario: DemoScenario) => {
    setRunningScenario(scenario.id)
    setDemoResult(null)

    await new Promise((r) => setTimeout(r, 800))

    const result = runDemoScenario(scenario.id, '演示操作员')

    setDemoResult({
      ...result,
      scenarioId: scenario.id,
    })
    setRunningScenario(null)
    setExpandedId(scenario.id)
  }

  const handleGoToPage = (path: string) => {
    navigate(path)
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <PageTitle>验收演示中心</PageTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                一键生成演示数据，完整展示系统核心业务流程
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              当前数据：{batches.length} 个批次 · {records.length} 条预约
            </span>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="演示场景"
          value={demoScenarios.length.toString()}
          icon={<Play className="w-4 h-4" />}
          tone="brand"
          size="sm"
        />
        <StatCard
          title="已完成演示"
          value="0"
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="emerald"
          size="sm"
        />
        <StatCard
          title="覆盖页面"
          value="4"
          icon={<BookOpen className="w-4 h-4" />}
          tone="sky"
          size="sm"
        />
        <StatCard
          title="涉及角色"
          value="3"
          icon={<Users className="w-4 h-4" />}
          tone="amber"
          size="sm"
        />
      </div>

      <Alert tone="info" dismissible={false}>
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-sky-700">演示说明</div>
            <div className="text-xs text-sky-600 mt-0.5">
              点击"开始演示"按钮将自动生成符合场景的模拟数据，然后跳转到对应页面进行操作演示。
              四个演示场景覆盖了用户验收要求的全部核心功能。
            </div>
          </div>
        </div>
      </Alert>

      {demoResult && (
        <Alert
          tone={demoResult.success ? 'success' : 'error'}
          onDismiss={() => setDemoResult(null)}
        >
          <div className="flex items-center gap-2">
            {demoResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm">{demoResult.message}</span>
            {demoResult.success && (
              <button
                onClick={() => {
                  const scenario = demoScenarios.find((s) => s.id === demoResult.scenarioId)
                  if (scenario) handleGoToPage(scenario.pagePath)
                }}
                className="ml-auto btn-primary !py-1 !px-3 text-xs"
              >
                前往演示页面 <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>
        </Alert>
      )}

      <div className="space-y-3">
        {demoScenarios.map((scenario, index) => {
          const colors = getScenarioColor(scenario.id)
          const Icon = getScenarioIcon(scenario.id)
          const isExpanded = expandedId === scenario.id
          const isRunning = runningScenario === scenario.id
          const thisResult = demoResult?.scenarioId === scenario.id ? demoResult : null

          return (
            <div
              key={scenario.id}
              className={`card overflow-hidden transition-all duration-300 ${
                isExpanded ? 'ring-2 ' + colors.border : ''
              }`}
            >
              <div className={`h-1 ${colors.iconBg}`} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${colors.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}
                  >
                    <span className="text-lg font-bold">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {scenario.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}
                      >
                        {getPathLabel(scenario.pagePath)}
                      </span>
                      {thisResult?.success && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          演示就绪
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{scenario.description}</p>

                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleRunDemo(scenario)}
                        disabled={isRunning}
                        className={`btn-primary !py-1.5 !px-4 text-sm ${
                          isRunning ? 'opacity-70 cursor-wait' : ''
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            生成数据中...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            开始演示
                          </>
                        )}
                      </button>
                      {thisResult?.success && (
                        <button
                          onClick={() => handleGoToPage(scenario.pagePath)}
                          className="btn-secondary !py-1.5 !px-4 text-sm"
                        >
                          前往演示页面
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : scenario.id)
                        }
                        className="btn-ghost !py-1.5 !px-3 text-sm !text-slate-600"
                      >
                        {isExpanded ? (
                          <>
                            收起详情
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </>
                        ) : (
                          <>
                            查看详情
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-7 h-7 ${colors.text}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Play className="w-4 h-4 text-brand-600" />
                          演示步骤
                        </div>
                        <ol className="space-y-2">
                          {scenario.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span
                                className={`w-5 h-5 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}
                              >
                                {i + 1}
                              </span>
                              <span className="text-slate-600">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          预期结果
                        </div>
                        <div className={`p-4 rounded-xl ${colors.bg} ${colors.border} border`}>
                          <p className={`text-sm ${colors.text}`}>
                            {scenario.expectedResult}
                          </p>
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                          <div className="text-xs font-medium text-slate-500 mb-2">
                            涉及角色
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-brand-100 text-brand-700">
                              市场部
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                              接待部
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              安保部
                            </span>
                          </div>
                        </div>

                        {thisResult?.success && (
                          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2 text-sm text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="font-medium">演示数据已生成</span>
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">
                              点击上方"前往演示页面"按钮开始操作演示
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-5 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          验收演示顺序建议
        </div>
        <div className="flex items-center gap-3">
          {demoScenarios.map((s, i) => {
            const colors = getScenarioColor(s.id)
            const Icon = getScenarioIcon(s.id)
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${colors.bg} ${colors.border} border`}
                >
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                  <span className={`text-xs font-medium ${colors.text}`}>{s.title}</span>
                </div>
                {i < demoScenarios.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          建议按照上述顺序进行演示，从预约开始，经过审批、接待，最后离场，完整展示端到端的业务流程。
        </p>
      </div>
    </div>
  )
}
