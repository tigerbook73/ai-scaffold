export interface Group {
  label: string;
  files: string[];
  designStep?: string;
  done: boolean;
}

export interface Index {
  stateKey: string;
  originalBranch: string;
  target: string;
  baseline: string;
  targetRef: string;
  targetHash: string;
  checkedOut: boolean;
  intent: string;
  created: string;
  totalGroups: number;
  currentGroup: number;
  status: "active" | "completed";
  groups: Group[];
}
