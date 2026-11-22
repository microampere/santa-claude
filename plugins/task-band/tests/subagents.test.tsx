import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'task-band',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const REPORT = 'mcp__task-band__report'

test('a subagent report does not overwrite the band', async ($, on) => {
  on('tool.register', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.tool.call({ tool: REPORT, task: 'Main task', status: 'done', asks: ['Main ask?'] })
  await $.tool.call({ tool: REPORT, task: 'Sub task', status: 'blocked', asks: ['Sub ask?'], agentId: 'a1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /Main task/ }))?.text).toBe('Main task')
    expect(await ui.find({ type: 'Text', text: /Sub task/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Sub ask/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('the subagent line shows only while one is running', async ($, on) => {
  on('tool.register', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'test-model', agentId: 'a1' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: REPORT, task: 'Main task', status: 'done', asks: [] })

  let ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /subagent/ })).toBeUndefined()
  await ui.unmount()

  await $.agent.spawn({ prompt: 'Read README.md.', description: 'Read readme' })

  ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /subagent/ }))?.text).toBe('↳ 1 subagent running')
  await ui.unmount()
})
