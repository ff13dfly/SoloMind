
export type Workflow = {
  id: string;
  name: string;
  desc: string;
}

export type TestCase = {
  id: string;
  trigger: string;
  expected_params: Record<string, any>;
  focus_inputs: { turn: number; user_says: string }[];
}

export type Message = {
  role: 'user' | 'agent' | 'system';
  content: string;
}
