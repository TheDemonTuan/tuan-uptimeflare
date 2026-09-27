import type { MonitorState, PublicMonitor } from '@/types/config'
import type { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { IconChevronDown, IconChevronUp, IconCircleCheck, IconLayersLinked } from '@tabler/icons-react'
import MonitorDetail from './MonitorDetail'
import { pageConfig } from '@/page.config'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'

function countDownCount(state: MonitorState, ids: string[]) {
  return ids.filter(
    (id) =>
      state.incident[id]?.length &&
      state.latency[id]?.length &&
      state.incident[id].at(-1)?.end === null
  ).length
}

export default function MonitorList({
  monitors,
  state,
  compactedState,
  now,
}: {
  monitors: PublicMonitor[]
  state: MonitorState
  compactedState: CompactedMonitorStateWrapper
  now: number
}) {
  const { t } = useTranslation('common')
  const group = pageConfig.group
  const groupedMonitor = group && Object.keys(group).length > 0
  const groupNames = useMemo(() => Object.keys(group || {}), [group])
  const [expandedGroups, setExpandedGroups] = useState<string[]>(groupNames)
  const [groupsLoaded, setGroupsLoaded] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('expandedGroups') || 'null')
        if (Array.isArray(saved)) {
          setExpandedGroups(
            saved.filter((name): name is string => typeof name === 'string' && groupNames.includes(name))
          )
        }
      } catch {
        /* Storage can be unavailable */
      }
      setGroupsLoaded(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [groupNames])

  useEffect(() => {
    if (!groupsLoaded) return
    try {
      localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups))
    } catch {
      /* Storage can be unavailable */
    }
  }, [expandedGroups, groupsLoaded])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName) ? prev.filter((g) => g !== groupName) : [...prev, groupName]
    )
  }

  if (groupedMonitor) {
    return (
      <div className={classes.groupSection}>
        {groupNames.map((groupName) => {
          const groupMonitorIds = group[groupName].filter((id) =>
            monitors.some((monitor) => monitor.id === id)
          )
          const groupMonitors = groupMonitorIds
            .map((id) => monitors.find((m) => m.id === id))
            .filter((m): m is PublicMonitor => m !== undefined)

          const downCount = countDownCount(state, groupMonitorIds)
          const isExpanded = expandedGroups.includes(groupName)
          const isHealthy = downCount === 0

          return (
            <div key={groupName} className={classes.groupCard} style={{ marginBottom: 20 }}>
              <div
                className={classes.groupHeader}
                onClick={() => toggleGroup(groupName)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleGroup(groupName)
                  }
                }}
                aria-expanded={isExpanded}
              >
                <div className={classes.groupTitleWrapper}>
                  <IconLayersLinked size={18} style={{ color: '#64748b' }} />
                  <h2 className={classes.groupTitle}>{groupName}</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className={classes.groupCountBadge}
                    style={{
                      background: isHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isHealthy ? '#10b981' : '#ef4444',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: isHealthy ? '#10b981' : '#ef4444',
                      }}
                    />
                    {groupMonitors.length - downCount}/{groupMonitors.length} {t('Operational')}
                  </span>

                  {isExpanded ? (
                    <IconChevronUp size={18} style={{ color: '#94a3b8' }} />
                  ) : (
                    <IconChevronDown size={18} style={{ color: '#94a3b8' }} />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className={classes.monitorList}>
                  {groupMonitors.map((monitor) => (
                    <div key={monitor.id} className={classes.monitorItem}>
                      <MonitorDetail
                        monitor={monitor}
                        state={state}
                        compactedState={compactedState}
                        now={now}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={classes.groupCard}>
      <div className={classes.monitorList}>
        {monitors.map((monitor) => (
          <div key={monitor.id} className={classes.monitorItem}>
            <MonitorDetail
              monitor={monitor}
              state={state}
              compactedState={compactedState}
              now={now}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
