export interface Group {
  label: string
  done: boolean
}

export interface State {
  target: string
  created: string
  source: string
  totalGroups: number
  currentGroup: number
  status: 'active' | 'completed'
  groups: Group[]
}

export type StateFile = Record<string, State>
