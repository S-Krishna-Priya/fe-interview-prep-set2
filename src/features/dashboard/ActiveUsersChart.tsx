import { memo } from 'react'

export type ActiveUsersChartProps = {
  activeUsers: number[]
}

const CHART_WIDTH = 200
const CHART_HEIGHT = 60

function ActiveUsersChartComponent({ activeUsers }: ActiveUsersChartProps) {
  const max = activeUsers.length > 0 ? Math.max(...activeUsers) : 0
  const barWidth = activeUsers.length > 0 ? CHART_WIDTH / activeUsers.length : CHART_WIDTH
  const latest = activeUsers[activeUsers.length - 1] ?? 0

  return (
    <section
      aria-label="Active users"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-slate-500">Active Users</h2>
      {activeUsers.length === 0 ? (
        <p className="mt-2 text-slate-400">No data yet.</p>
      ) : (
        <>
          <svg
            role="img"
            aria-label={`Active users over the last ${String(activeUsers.length)} samples: ${activeUsers.join(', ')}`}
            viewBox={`0 0 ${String(CHART_WIDTH)} ${String(CHART_HEIGHT)}`}
            className="mt-2 h-16 w-full"
          >
            {activeUsers.map((value, index) => {
              const barHeight = max > 0 ? (value / max) * CHART_HEIGHT : 0
              return (
                <rect
                  key={index}
                  x={index * barWidth}
                  y={CHART_HEIGHT - barHeight}
                  width={Math.max(barWidth - 2, 1)}
                  height={barHeight}
                  className="fill-sky-500"
                />
              )
            })}
          </svg>
          <p className="mt-1 text-xs text-slate-400">Latest: {latest}</p>
        </>
      )}
    </section>
  )
}

export const ActiveUsersChart = memo(ActiveUsersChartComponent)
