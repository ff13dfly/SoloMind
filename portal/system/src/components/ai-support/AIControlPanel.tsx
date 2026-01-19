

import { useLang } from '../../providers/LanguageProvider';
import type { Workflow, TestCase } from './types';

interface AIControlPanelProps {
  workflows: Workflow[];
  selectedWfId: string;
  setSelectedWfId: (id: string) => void;
  caseCount: number;
  setCaseCount: (count: number) => void;
  mode: string;
  setMode: (mode: string) => void;
  isRunning: boolean;
  isGenerating: boolean;
  startTest: () => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  aiPrompt: string;
  testCases: TestCase[];
  onGenerateCases: () => void;
  isManualGenerating: boolean;
}

export default function AIControlPanel({
  workflows,
  selectedWfId,
  setSelectedWfId,
  caseCount,
  setCaseCount,
  mode,
  setMode,
  isRunning,
  isGenerating,
  startTest,
  expandedSections,
  toggleSection,
  aiPrompt,
  testCases,
  onGenerateCases,
  isManualGenerating
}: AIControlPanelProps) {
  const { t } = useLang();

  const generatedPrompt = aiPrompt || (selectedWfId ? `[WAITING FOR BACKEND PROMPT...]\n\nTarget Workflow: ${selectedWfId}\nCases: ${caseCount}\nMode: ${mode}` : 'No workflow selected.');

  return (
    <div className="ai-controls">
      <div className="controls-scroll">
        
        {/* 1. Test Configuration Card */}
        <div className="control-card">
          <div className="card-header" onClick={() => toggleSection('config')}>
            <span className="card-title">{t('ai_support.section_config')}</span>
            <span className={`card-toggle ${expandedSections.config ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.config && (
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">{t('ai_support.workflow_select')}</label>
                <select 
                  className="service-input" 
                  value={selectedWfId} 
                  onChange={e => setSelectedWfId(e.target.value)}
                  disabled={isRunning || isGenerating}
                  style={{ width: '100%', marginBottom: '16px' }}
                >
                  <option value="">{t('ai_support.workflow_placeholder')}</option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name} ({wf.id})</option>
                  ))}
                </select>
              </div>

              <div className="config-grid">
                <div className="form-group">
                  <label className="form-label">{t('ai_support.count_label')}</label>
                  <input 
                    type="number" 
                    className="service-input" 
                    value={caseCount} 
                    onChange={e => setCaseCount(parseInt(e.target.value))}
                    min="1" max="20"
                    disabled={isRunning || isGenerating}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('ai_support.mode_label')}</label>
                  <select 
                    className="service-input" 
                    value={mode} 
                    onChange={e => setMode(e.target.value)}
                    disabled={isRunning || isGenerating}
                  >
                    <option value="standard">{t('ai_support.mode_standard')}</option>
                    <option value="colloquial">{t('ai_support.mode_colloquial')}</option>
                    <option value="edge">{t('ai_support.mode_edge')}</option>
                    <option value="balanced">{t('ai_support.mode_balanced')}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="service-btn"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={onGenerateCases}
                  disabled={!selectedWfId || isRunning || isGenerating}
                >
                  {isGenerating && isManualGenerating ? t('ai_support.btn_generating') : t('ai_support.btn_generate_cases')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. AI Prompt Preview Card */}
        <div className="control-card">
          <div className="card-header" onClick={() => toggleSection('prompt')}>
            <span className="card-title">{t('ai_support.section_prompt')}</span>
            <span className={`card-toggle ${expandedSections.prompt ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.prompt && (
            <div className="card-body">
              <div className="prompt-preview">{generatedPrompt}</div>
            </div>
          )}
        </div>

        {/* 3. Generated Cases List Card */}
        <div className="control-card">
          <div className="card-header" onClick={() => toggleSection('cases')}>
            <span className="card-title">{t('ai_support.section_cases')}</span>
            <span className={`card-toggle ${expandedSections.cases ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.cases && (
            <div className="card-body" style={{ padding: 0 }}>
              {testCases.length > 0 ? (
                <div className="cases-list">
                  {testCases.map((tc, idx) => (
                    <div key={tc.id} className="case-summary-item">
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#c9d1d9' }}>
                        #{idx + 1} {tc.id}
                      </div>
                      <div style={{ color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tc.trigger}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontStyle: 'italic', fontSize: '12px' }}>
                  No cases generated yet.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Fixed Footer */}
      <div className="controls-footer">
        <button 
          className="service-btn" 
          style={{ width: '100%', height: '40px' }}
          onClick={startTest}
          disabled={!selectedWfId || isRunning || isGenerating}
        >
          {isGenerating && !isManualGenerating ? t('ai_support.btn_generating') : isRunning ? t('ai_support.btn_running') : t('ai_support.btn_start')}
        </button>
      </div>
    </div>
  );
}
