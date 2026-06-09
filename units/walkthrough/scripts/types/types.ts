/**
 * Persisted walkthrough state schema shared by the walkthrough skill and its CLI helper.
 *
 * Keep this file runtime-free: publish copies type-only files as source so other
 * scripts can import the authoritative schema without bundling extra behavior.
 */
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
  walkIntent?: "learning" | "review";
  references?: string;
  created: string;
  totalGroups: number;
  currentGroup: number;
  status: "active" | "completed";
  groups: Group[];
}
