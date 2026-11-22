export type TaskStatus = 'running' | 'done' | 'blocked' | 'failed'

export type Report = {
  task: string
  status: TaskStatus
  asks: string[]
  /** A dim line under the task, e.g. when the band was not updated this turn. */
  note?: string
}

export type StepStatus = 'pending' | 'in_progress' | 'completed'

declare module 'claude-code' {
  interface PluginState {
    'task-band': {
      last: Report | null
      steps: StepStatus[] | null
      draft: string | null
      running: string[]
    }
  }
}
