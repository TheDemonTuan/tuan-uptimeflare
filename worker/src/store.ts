import type { Env } from '.'
import type { IncidentRecord, LatencyRecord, MonitorState, MonitorStateCompacted } from '../../types/config'

function decodeHex(hex: string): Uint8Array {
  const fromHex = (Uint8Array as typeof Uint8Array & { fromHex?: (value: string) => Uint8Array }).fromHex
  if (fromHex) return fromHex(hex)
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return bytes
}

function encodeHex(bytes: Uint8Array): string {
  const toHex = (bytes as Uint8Array & { toHex?: () => string }).toHex
  if (toHex) return toHex.call(bytes)
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function validateCompact(data: unknown): asserts data is MonitorStateCompacted {
  if (!isRecord(data) || !isNonNegativeNumber(data.lastUpdate) ||
      !isNonNegativeNumber(data.overallUp) || !isNonNegativeNumber(data.overallDown) ||
      !isRecord(data.incident) || !isRecord(data.latency)) {
    throw new Error('Invalid compact monitor state')
  }

  for (const entry of Object.values(data.incident)) {
    if (!isRecord(entry) || !Array.isArray(entry.start) || !Array.isArray(entry.end) ||
        !Array.isArray(entry.error) || entry.start.length !== entry.end.length ||
        entry.start.length !== entry.error.length) throw new Error('Invalid compact incident columns')
    for (let i = 0; i < entry.start.length; i++) {
      const start = entry.start[i]
      const errors = entry.error[i]
      if (!Array.isArray(start) || !start.length || !start.every(isNonNegativeNumber) ||
          !Array.isArray(errors) || errors.length !== start.length ||
          !errors.every((error) => typeof error === 'string') ||
          !(entry.end[i] === null || isNonNegativeNumber(entry.end[i]))) {
        throw new Error('Invalid compact incident record')
      }
    }
  }

  for (const entry of Object.values(data.latency)) {
    if (!isRecord(entry) || typeof entry.time !== 'string' || typeof entry.ping !== 'string' ||
        entry.time.length % 8 !== 0 || entry.ping.length % 4 !== 0 ||
        entry.time.length / 8 !== entry.ping.length / 4 ||
        !/^[0-9a-f]*$/i.test(entry.time) || !/^[0-9a-f]*$/i.test(entry.ping) ||
        !isRecord(entry.loc) || !Array.isArray(entry.loc.c) || !Array.isArray(entry.loc.v) ||
        entry.loc.c.length !== entry.loc.v.length) throw new Error('Invalid compact latency columns')
    let count = 0
    for (let i = 0; i < entry.loc.c.length; i++) {
      if (!Number.isSafeInteger(entry.loc.c[i]) || entry.loc.c[i] <= 0 ||
          typeof entry.loc.v[i] !== 'string') throw new Error('Invalid compact latency locations')
      count += entry.loc.c[i]
    }
    if (count !== entry.time.length / 8) throw new Error('Invalid compact latency lengths')
  }
}

export async function getFromStore(env: Pick<Env, 'UPTIMEFLARE_D1'>, key: string): Promise<string | null> {
  const stmt = env.UPTIMEFLARE_D1.prepare('SELECT value FROM uptimeflare WHERE key = ?')
  const result = await stmt.bind(key).first<{ value: string }>()
  return result?.value || null
}

export async function setToStore(env: Pick<Env, 'UPTIMEFLARE_D1'>, key: string, value: string): Promise<void> {
  const stmt = env.UPTIMEFLARE_D1.prepare(
    'INSERT INTO uptimeflare (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;'
  )
  await stmt.bind(key, value).run()
}

export class CompactedMonitorStateWrapper {
  data: MonitorStateCompacted

  constructor(compactedStateStr: string | null) {
    if (!compactedStateStr) {
      // Initialize empty state
      this.data = {
        lastUpdate: 0,
        overallUp: 0,
        overallDown: 0,
        incident: {},
        latency: {},
      }
      return
    }
    const parsed: unknown = JSON.parse(compactedStateStr)
    validateCompact(parsed)
    this.data = parsed
  }

  getCompactedStateStr(): string {
    return JSON.stringify(this.data)
  }

  // Don't use this method at server-side
  uncompact(): MonitorState {
    const state: MonitorState = {
      lastUpdate: this.data.lastUpdate,
      overallUp: this.data.overallUp,
      overallDown: this.data.overallDown,
      incident: {},
      latency: {},
    }
    for (const monitorId of Object.keys(this.data.incident)) {
      const incidents = this.data.incident[monitorId]
      state.incident[monitorId] = incidents.start.map((start, index) => ({
        start,
        end: incidents.end[index],
        error: incidents.error[index],
      }))
    }
    for (const monitorId of Object.keys(this.data.latency)) {
      state.latency[monitorId] = this.getLatencyRecords(monitorId)
    }
    return state
  }

  getLatencyRecords(monitorId: string): LatencyRecord[] {
    const latencies = this.data.latency[monitorId]
    if (!latencies) return []
    const times = new Uint32Array(decodeHex(latencies.time).buffer)
    const pings = new Uint16Array(decodeHex(latencies.ping).buffer)
    const records: LatencyRecord[] = new Array(times.length)
    let index = 0
    for (let i = 0; i < latencies.loc.c.length; i++) {
      for (let j = 0; j < latencies.loc.c[i]; j++) {
        records[index] = { time: times[index], ping: pings[index], loc: latencies.loc.v[i] }
        index++
      }
    }
    return records
  }

  incidentLen(monitorId: string): number {
    const incidents = this.data.incident[monitorId]
    if (!incidents) return 0
    return incidents.start.length
  }

  getIncident(monitorId: string, index: number): IncidentRecord {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    return {
      start: incidents.start[index],
      end: incidents.end[index],
      error: incidents.error[index],
    }
  }

  setIncident(monitorId: string, index: number, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    incidents.start[index] = incident.start
    incidents.end[index] = incident.end
    incidents.error[index] = incident.error
  }

  appendIncident(monitorId: string, incident: IncidentRecord) {
    let incidents = this.data.incident[monitorId]
    if (!incidents) {
      // Initialize incident arrays
      this.data.incident[monitorId] = {
        start: [],
        end: [],
        error: [],
      }
      incidents = this.data.incident[monitorId]
    }
    incidents.start.push(incident.start)
    incidents.end.push(incident.end)
    incidents.error.push(incident.error)
  }

  shiftIncident(monitorId: string) {
    const incidents = this.data.incident[monitorId]
    incidents.start.shift()
    incidents.end.shift()
    incidents.error.shift()
  }

  unshiftIncident(monitorId: string, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    incidents.start.unshift(incident.start)
    incidents.end.unshift(incident.end)
    incidents.error.unshift(incident.error)
  }

  latencyLen(monitorId: string): number {
    const latencies = this.data.latency[monitorId]
    if (!latencies) return 0
    return latencies.ping.length / 4 // Uint16Array, 4 characters per entry in hex
  }

  appendLatency(monitorId: string, record: LatencyRecord) {
    let latencies = this.data.latency[monitorId]
    if (!latencies) {
      // Initialize latency arrays
      this.data.latency[monitorId] = {
        time: '',
        ping: '',
        loc: {
          c: [],
          v: [],
        },
      }
      latencies = this.data.latency[monitorId]
    }

    latencies.time += encodeHex(new Uint8Array(new Uint32Array([record.time]).buffer))
    latencies.ping += encodeHex(new Uint8Array(new Uint16Array([record.ping]).buffer))

    if (latencies.loc.v[latencies.loc.v.length - 1] !== record.loc) {
      latencies.loc.c.push(1)
      latencies.loc.v.push(record.loc)
    } else {
      latencies.loc.c[latencies.loc.c.length - 1] += 1
    }
  }

  getFirstLatency(monitorId: string): LatencyRecord {
    const latencies = this.data.latency[monitorId]
    if (!latencies?.time.length) throw new Error('No latency records for monitor')
    return {
      time: new Uint32Array(decodeHex(latencies.time.slice(0, 8)).buffer)[0],
      ping: new Uint16Array(decodeHex(latencies.ping.slice(0, 4)).buffer)[0],
      loc: latencies.loc.v[0],
    }
  }

  getLastLatency(monitorId: string): LatencyRecord {
    const latencies = this.data.latency[monitorId]
    if (!latencies?.time.length) throw new Error('No latency records for monitor')
    return {
      time: new Uint32Array(decodeHex(latencies.time.slice(-8)).buffer)[0],
      ping: new Uint16Array(decodeHex(latencies.ping.slice(-4)).buffer)[0],
      loc: latencies.loc.v[latencies.loc.v.length - 1],
    }
  }

  unshiftLatency(monitorId: string) {
    let latencies = this.data.latency[monitorId]

    latencies.time = latencies.time.slice(8)
    latencies.ping = latencies.ping.slice(4)

    latencies.loc.c[0] -= 1
    if (latencies.loc.c[0] === 0) {
      latencies.loc.c.shift()
      latencies.loc.v.shift()
    }
  }
}
