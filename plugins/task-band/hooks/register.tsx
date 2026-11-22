import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Report, StepStatus, TaskStatus } from '../types'

const PLUGIN = 'task-band'
const TOOL = `mcp__${PLUGIN}__report`
const PLAN_TOOL = 'mcp__ccd_turn__update_plan'
const WRAP_TOOL = 'mcp__ccd_turn__wrap_up'

const last = atom({ plugin: 'task-band', key: 'last' } as const, null)
const steps = atom({ plugin: 'task-band', key: 'steps' } as const, null)
const draft = atom({ plugin: 'task-band', key: 'draft' } as const, null)
// Ids of subagents that have started and not yet reported back.
const running = atom({ plugin: 'task-band', key: 'running' } as const, [])

const agentOf = (e: unknown): string | undefined => (e as { agentId?: string }).agentId

const STATUSES: readonly TaskStatus[] = ['running', 'done', 'blocked', 'failed']

const BADGE: Record<TaskStatus, { icon: string; label: string; color: string }> = {
  running: { icon: '●', label: 'running', color: 'warning' },
  done: { icon: '✓', label: 'done', color: 'success' },
  blocked: { icon: '⏸', label: 'waiting on you', color: 'permission' },
  failed: { icon: '✗', label: 'failed', color: 'error' },
}

const INSTRUCTIONS = `# Task band
The user sees a 3-column status band. Keep it current by calling \`${TOOL}\`:
- Call it as the LAST tool call of every turn that does work (and before any closing text), and whenever you stop to wait on the user.
- \`task\`: the user's latest ask in as few words as possible without losing accuracy (aim for 2–5 words, e.g. "Build task-band mod").
- \`status\`: done | blocked (waiting on the user) | failed | running.
- \`asks\`: what you need from the user, each phrased so it is answered by y, n, or continue (e.g. "Commit the 3 changed files?"). Empty if nothing.
The user may answer asks by number, e.g. "1 y, 2 n". Their message reaches you already expanded with each ask's text.`

const SCHEMA = {
  type: 'object',
  properties: {
    task: { type: 'string', description: 'Ultra-brief description of the user\'s latest ask.' },
    status: { type: 'string', enum: [...STATUSES] },
    asks: { type: 'array', items: { type: 'string' }, description: 'Each answerable by y / n / continue.' },
  },
  required: ['task', 'status', 'asks'],
}

// Mirrors the desktop task list's update_plan calls into step statuses.
function applyPlan(prev: StepStatus[] | null, a: Record<string, unknown>): StepStatus[] | null {
  let next: StepStatus[] = prev ? [...prev] : []
  if (Array.isArray(a.items)) {
    next = a.items.map(it => {
      const s = (it as { status?: unknown }).status
      return s === 'completed' || s === 'in_progress' ? s : 'pending'
    })
  }
  if (a.advance === true) {
    const cur = next.indexOf('in_progress')
    if (cur >= 0) next[cur] = 'completed'
    const nxt = next.indexOf('pending')
    if (nxt >= 0) next[nxt] = 'in_progress'
  }
  if (Array.isArray(a.done)) {
    for (const n of a.done) if (typeof n === 'number' && next[n - 1] !== undefined) next[n - 1] = 'completed'
  }
  if (typeof a.start === 'number' && next[a.start - 1] !== undefined) next[a.start - 1] = 'in_progress'
  return next.length ? next : prev
}

const ANSWER = /^(\d+)\s*(y|yes|n|no|c|cont|continue)$/i

// "1 y, 2 n" → "1 (ask): yes; 2 (ask): no". Null when the text is not shorthand.
function expand(text: string, asks: readonly string[]): string | null {
  const parts = text.trim().split(/\s*[,;]\s*|\s+(?=\d+\s*[a-z])/i).filter(Boolean)
  if (!parts.length) return null
  const out: string[] = []
  for (const p of parts) {
    const m = ANSWER.exec(p)
    if (!m) return null
    const n = Number(m[1])
    const ask = asks[n - 1]
    if (ask === undefined) return null
    const w = m[2]!.toLowerCase()
    const word = w.startsWith('y') ? 'yes' : w.startsWith('n') ? 'no' : 'continue'
    out.push(`${n} (${ask}): ${word}`)
  }
  return `Answers to your asks: ${out.join('; ')}`
}

function brief(text: string): string {
  const words = text.trim().split(/\s+/)
  return words.length > 6 ? `${words.slice(0, 6).join(' ')}…` : text.trim()
}

export const register: Register = on => {
  let reported = false

  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'report',
      description: 'Update the task band the user sees: brief task, status, y/n asks.',
      inputSchema: SCHEMA,
      isDeferred: false,
    })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return {
      sections: [...r.sections, { id: `${PLUGIN}:instructions`, text: INSTRUCTIONS, scope: 'session' as const }],
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta) return next(e)
    const prev = await read($, last)
    const expanded = prev && prev.asks.length ? expand(e.text, prev.asks) : null
    reported = false
    await update($, steps, () => null)
    await update($, draft, () => (expanded ? 'Answering your calls' : brief(e.text)))
    return next(expanded ? { ...e, text: expanded } : e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: PLAN_TOOL }, async ($, e, next) => {
    if (!e.agentId) await update($, steps, s => applyPlan(s, e as unknown as Record<string, unknown>))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: WRAP_TOOL }, async ($, e, next) => {
    if (!e.agentId) await update($, steps, s => (s ? s.map(() => 'completed' as const) : s))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    const id = r.agentId
    if (id) await update($, running, ids => (ids.includes(id) ? ids : [...ids, id]))
    return r
  }).catch(($, e, next) => next(e))

  on('agent.report', async ($, e, next) => {
    const r = await next(e)
    await update($, running, ids => ids.filter(id => id !== e.agentId))
    return r
  }).catch(($, e, next) => next(e))

  on('tool.run', { tool: 'mcp__task-band__report' }, async ($, e) => {
    // The band belongs to the main conversation; a subagent's report must not overwrite it.
    if (agentOf(e)) return { result: 'Ignored: the task band only shows the main conversation.' }
    const a = e as unknown as Record<string, unknown>
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const status = STATUSES.includes(a.status as TaskStatus) ? (a.status as TaskStatus) : 'done'
    const report: Report = {
      task: typeof a.task === 'string' && a.task.trim() ? a.task.trim() : 'Task',
      status,
      asks: strs(a.asks),
    }
    reported = true
    await update($, last, () => report)
    await update($, draft, () => null)
    return { result: 'Task band updated.' }
  }).catch(() => ({ deny: 'task-band: could not update the band.' }))

  on('turn.complete', async ($, e, next) => {
    if (!agentOf(e) && !reported) {
      const d = await read($, draft)
      if (d) {
        await update($, last, () => ({ task: d, status: 'done' as const, asks: ['(No report sent for this turn.)'] }))
        await update($, draft, () => null)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const r = await read($, last)
    const d = await read($, draft)
    const s = await read($, steps)
    const agents = (await read($, running)).length
    if (!r && !d) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const working = e.props.isWorking
    const dim = working

    let pct: number | null
    if (working) {
      pct = s && s.length ? Math.round((s.filter(x => x === 'completed').length / s.length) * 100) : null
    } else {
      pct = r && r.status !== 'running' ? 100 : null
    }

    const status: TaskStatus = working ? 'running' : (r?.status ?? 'done')
    const badge = BADGE[status]
    const task = working ? (d ?? r?.task ?? '') : (r?.task ?? d ?? '')
    const asks = r?.asks ?? []
    const narrow = e.props.bodyColumns < 80
    const HEAD = 'suggestion'
    // A thin glyph line as tall as the tallest column; the glyph's own gaps leave it ~90% high.
    const rows = Math.max(3, 1 + asks.length)
    // Stacked: a thin horizontal line the full width of the band. It is drawn
    // longer than any band and clipped at the edge, since cell widths differ
    // per surface and a counted line can overflow and wrap.
    const divider = narrow ? (
      <Box width="100%" overflow="hidden">
        <Text color="subtle" wrap="clip">{'─'.repeat(500)}</Text>
      </Box>
    ) : (
      <Box flexShrink={0}>
        <Text color="subtle">{Array(rows).fill('│').join('\n')}</Text>
      </Box>
    )

    return (
      <Box
        flexDirection={narrow ? 'column' : 'row'}
        columnGap={2}
        paddingX={1}
        paddingY="xs"
      >
        <Box flexDirection="column" flexShrink={0}>
          <Text bold color={HEAD}>Progress</Text>
          <Text size="title" weight="bold" tabular color={working ? 'claude' : 'success'}>
            {pct === null ? '…' : `${pct}%`}
          </Text>
          {agents > 0 ? (
            <Text dimColor>↳ {agents} subagent{agents === 1 ? '' : 's'} running</Text>
          ) : null}
        </Box>
        {divider}
        <Box flexDirection="column" flexShrink={1}>
          <Text bold color={HEAD} dimColor={dim}>Task</Text>
          <Text dimColor={dim} wrap="truncate-end">{task}</Text>
          <Text color={badge.color}>{badge.icon} {badge.label}</Text>
        </Box>
        {divider}
        <Box flexDirection="column" flexShrink={1}>
          <Text bold color={HEAD} dimColor={dim}>Decisions [y/n]</Text>
          {asks.length === 0 ? (
            <Text dimColor>—</Text>
          ) : (
            asks.map((a, i) => (
              <Text key={`a${i}`} dimColor={dim} wrap="wrap">{i + 1}. {a}</Text>
            ))
          )}
        </Box>
      </Box>
    )
  })
}
