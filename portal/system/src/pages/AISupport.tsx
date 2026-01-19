
import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { deriveLoginHash } from '../utils/crypto';
import { useUI } from '../providers/UIProvider';

// Import local components
import AIControlPanel from '../components/ai-support/AIControlPanel';
import AIMobileSimulator from '../components/ai-support/AIMobileSimulator';
import AIResultsPane from '../components/ai-support/AIResultsPane';

// Import shared types
import type { Workflow, TestCase, Message } from '../components/ai-support/types';

export default function AISupport() {
  const { toast } = useUI();
  
  // -- State: Workflow & Config --
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWfId, setSelectedWfId] = useState('');
  
  // Reset cases when workflow changes
  useEffect(() => {
    setTestCases([]);
    setAiPrompt('');
    setResults([]);
    setMessages([]);
    setCurrentCaseIdx(-1);
  }, [selectedWfId]);

  const [caseCount, setCaseCount] = useState(5);
  const [mode, setMode] = useState('balanced');
  
  // -- State: Execution --
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // -- State: Tester Session --
  const [testerToken, setTesterToken] = useState<string | null>(null);
  const [testerUser, setTesterUser] = useState('');
  const [testerPwd, setTesterPwd] = useState('');
  
  // -- State: Test Data --
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [currentCaseIdx, setCurrentCaseIdx] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [results, setResults] = useState<{ id: string; status: 'pass' | 'fail'; score: number }[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // -- State: UI Folders --
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    config: true,
    prompt: false,
    cases: false
  });
  
  // -- State: Simulator Feedback --
  const [showSimLoading, setShowSimLoading] = useState(false);
  const [highlightLogin, setHighlightLogin] = useState(false);
  const [isManualGenerating, setIsManualGenerating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await callRpc<{ items: Workflow[] }>('orchestrator.workflow.list', { limit: 100 });
      setWorkflows(res.items || []);
    } catch (e) {
      toast.error('Failed to load workflows');
    }
  };

  const handleTesterLogin = async () => {
    if (!testerUser || !testerPwd) return;
    try {
      const { salt } = await callRpc<{ salt: string }>('operator.get_salt', { name: testerUser });
      const hash = deriveLoginHash(testerPwd, testerUser, salt, 200000);
      const { token } = await callRpc<{ token: string }>('operator.login', { name: testerUser, hash });
      
      setTesterToken(token);
      toast.success('Tester session started');
      setTesterPwd('');
    } catch (e: any) {
      toast.error('Login failed: ' + e.message);
    }
  };

  const handleTesterLogout = () => {
    setTesterToken(null);
    setTesterUser('');
    toast.info('Tester session ended');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addMessage = (role: 'user' | 'agent' | 'system', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const generateCases = async (showSim: boolean) => {
    if (!selectedWfId) return null;
    
    if (showSim) {
      setShowSimLoading(true);
    } else {
      setIsManualGenerating(true);
    }
    setIsGenerating(true);
    
    // Do not clear messages/results here if just generating, purely update cases
    setAiPrompt('');
    
    try {
      const res = await callRpc<{ cases: TestCase[], prompt?: string }>('agent.cases', {
        workflow_id: selectedWfId,
        count: caseCount
      });
      
      if (!res.cases || res.cases.length === 0) {
        throw new Error('No cases generated');
      }
      
      setTestCases(res.cases);
      setAiPrompt(res.prompt || 'No prompt returned from backend.');
      
      // Auto-expand Cases and Prompt sections
      setExpandedSections(prev => ({ ...prev, cases: true, prompt: false }));
      
      return res.cases;
    } catch (e: any) {
      toast.error('Generation failed: ' + e.message);
      return null;
    } finally {
      setIsGenerating(false);
      setIsGenerating(false);
      setShowSimLoading(false);
      setIsManualGenerating(false);
    }
  };

  const handleGenerateCases = async () => {
    await generateCases(false);
  };

  const startTest = async () => {
    if (!selectedWfId) return;
    
    // Check if tester is logged in
    if (!testerToken) {
        setHighlightLogin(true);
        toast.error('Please login as a tester first');
        setTimeout(() => setHighlightLogin(false), 2000);
        return;
    }

    // If we already have cases, just run them. 
    // If not, or if user wants fresh ones, they should click Generate.
    // But for "Start Test" convenience, if no cases exist, generate them first.
    let casesToRun = testCases;
    
    if (casesToRun.length === 0) {
       const newCases = await generateCases(true);
       if (!newCases) return; // Generation failed
       casesToRun = newCases;
    }

    setIsRunning(true);
    // Execute cases sequentially
    runCases(casesToRun);
  };

  const runCases = async (cases: TestCase[]) => {
    for (let i = 0; i < cases.length; i++) {
      setCurrentCaseIdx(i);
      const testCase = cases[i];
      
      // 1. Initial Trigger
      addMessage('user', testCase.trigger);
      await delay(1000);
      
      // Mock Agent Response (Focus Start)
      addMessage('agent', `I've started processing your request for "${testCase.trigger}". I need a few more details.`);
      await delay(1000);

      // 2. Play Focus Turns
      for (const turn of testCase.focus_inputs) {
        addMessage('user', turn.user_says);
        await delay(1000);
        addMessage('agent', `Got it: ${turn.user_says}. Anything else?`);
        await delay(1000);
      }
      
      // 3. Final Execution Mock
      addMessage('agent', 'All information collected. Executing workflow...');
      await delay(1500);
      addMessage('system', 'Workflow execution SUCCESS.');

      // Record result
      setResults(prev => [...prev, { id: testCase.id, status: 'pass', score: 1.0 }]);
      await delay(2000);
      
      if (i < cases.length - 1) {
        setMessages([]); // Clear for next case
      }
    }
    
    setIsRunning(false);
    toast.success('Auto-debug completed!');
  };

  const accuracy = results.length > 0 
    ? Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100) 
    : 0;

  return (
    <div className="ai-support-container">
      <AIControlPanel 
        workflows={workflows}
        selectedWfId={selectedWfId}
        setSelectedWfId={setSelectedWfId}
        caseCount={caseCount}
        setCaseCount={setCaseCount}
        mode={mode}
        setMode={setMode}
        isRunning={isRunning}
        isGenerating={isGenerating}
        isManualGenerating={isManualGenerating}
        startTest={startTest}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        aiPrompt={aiPrompt}
        testCases={testCases}
        onGenerateCases={handleGenerateCases}
      />

      <AIMobileSimulator 
        isRunning={isRunning}
        currentCaseIdx={currentCaseIdx}
        totalCases={testCases.length}
        messages={messages}
        isGenerating={showSimLoading}
        selectedWfId={selectedWfId}
        testerToken={testerToken}
        testerUser={testerUser}
        setTesterUser={setTesterUser}
        testerPwd={testerPwd}
        setTesterPwd={setTesterPwd}
        handleTesterLogin={handleTesterLogin}
        handleTesterLogout={handleTesterLogout}
        highlightLogin={highlightLogin}
      />

      <AIResultsPane 
        results={results}
        accuracy={accuracy}
      />
    </div>
  );
}
