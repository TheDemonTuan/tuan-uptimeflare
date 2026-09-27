import type { MonitorState, PublicMonitor } from '@/types/config'
import type { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { Accordion, Card, Center, Text } from '@mantine/core'
import MonitorDetail from './MonitorDetail'
import { pageConfig } from '@/page.config'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function countDownCount(state: MonitorState, ids: string[]) {
  return ids.filter((id) => state.incident[id]?.length && state.latency[id]?.length && state.incident[id].at(-1)?.end === null).length
}

function getStatusTextColor(state: MonitorState, ids: string[]) {
  const known = ids.filter((id) => state.incident[id]?.length && state.latency[id]?.length)
  if (known.length !== ids.length) return '#6b7280'
  const down = countDownCount(state, ids)
  return down === 0 ? '#059669' : down === ids.length ? '#df484a' : '#f29030'
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
        if (Array.isArray(saved)) setExpandedGroups(saved.filter((name): name is string => typeof name === 'string' && groupNames.includes(name)))
      } catch { /* Storage can be unavailable or contain invalid JSON. */ }
      setGroupsLoaded(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [groupNames])
  useEffect(() => {
    if (!groupsLoaded) return
    try { localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups)) } catch { /* Storage can be unavailable. */ }
  }, [expandedGroups, groupsLoaded])
  let content

  if (groupedMonitor) {
    // Grouped monitors
    content = (
      <Accordion
        multiple
        variant="contained"
        value={expandedGroups}
        onChange={(values) => setExpandedGroups(values)}
      >
        {groupNames.map((groupName) => (
          <Accordion.Item key={groupName} value={groupName}>
            <Accordion.Control>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div>{groupName}</div>
                <Text
                  fw={500}
                  style={{
                    display: 'inline',
                    paddingRight: '5px',
                    color: getStatusTextColor(state, group[groupName].filter((id) => monitors.some((monitor) => monitor.id === id))),
                  }}
                >
                  {group[groupName].filter((id) => monitors.some((monitor) => monitor.id === id && state.incident[id]?.length && state.latency[id]?.length)).length - countDownCount(state, group[groupName].filter((id) => monitors.some((monitor) => monitor.id === id)))}/
                  {group[groupName].filter((id) => monitors.some((monitor) => monitor.id === id)).length} {t('Operational')}
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              {monitors
                .filter((monitor) => group[groupName].includes(monitor.id))
                .sort((a, b) => group[groupName].indexOf(a.id) - group[groupName].indexOf(b.id))
                .map((monitor) => (
                  <div key={monitor.id}>
                    <Card.Section ml="xs" mr="xs">
                      <MonitorDetail monitor={monitor} state={state} compactedState={compactedState} now={now} />
                    </Card.Section>
                  </div>
                ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  } else {
    // Ungrouped monitors
    content = monitors.map((monitor) => (
      <div key={monitor.id}>
        <Card.Section ml="xs" mr="xs">
          <MonitorDetail monitor={monitor} state={state} compactedState={compactedState} now={now} />
        </Card.Section>
      </div>
    ))
  }

  return (
    <Center>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        ml="md"
        mr="md"
        mt="xl"
        withBorder={!groupedMonitor}
        style={{ width: '100%', maxWidth: groupedMonitor ? '897px' : '865px' }}
      >
        {content}
      </Card>
    </Center>
  )
}
