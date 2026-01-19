
export interface WorkflowStep {
  id: string;
  service: string;
  method: string;
  params: Record<string, any>;
}

export interface Resolver {
  source: string;
  method: string;
  params: Record<string, string>;
  extract: string;
}

export interface Keyword {
  word: string;
  source: 'seed' | 'ai';
  count?: number;
}

export interface Workflow {
  id: string;
  name: string;
  desc: string;
  category: Record<string, string> | string;
  priority: number;
  status: string;
  steps: WorkflowStep[];
  resolvers?: Record<string, Resolver>;
  keywords?: Keyword[];
  tags: string[];
  examples?: string[];
  negative?: string[];
  synonyms?: Record<string, string[]>;
  required_inputs?: string[];
  optional_inputs?: string[];
  createdAt: number;
  updatedAt: number;
}
