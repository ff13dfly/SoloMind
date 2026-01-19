
import { useLang } from '../../providers/LanguageProvider';

interface AIResultsPaneProps {
  results: { id: string; status: 'pass' | 'fail'; score: number }[];
  accuracy: number;
}

export default function AIResultsPane({
  results,
  accuracy
}: AIResultsPaneProps) {
  const { t } = useLang();

  return (
    <div className="ai-results-pane">
      {results.length > 0 ? (
        <div className="test-results" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <h3 className="form-label">{t('ai_support.results_title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <div className="accuracy-gauge">
              <span className="accuracy-value">{accuracy}%</span>
              <span className="accuracy-label">{t('ai_support.res_accuracy')}</span>
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{t('ai_support.res_passed')}:</span>
                <span style={{ color: 'var(--success-color)' }}>{results.filter(r => r.status === 'pass').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('ai_support.res_failed')}:</span>
                <span style={{ color: 'var(--error-color)' }}>{results.filter(r => r.status === 'fail').length}</span>
              </div>
            </div>
          </div>

          <div className="case-log" style={{ marginTop: '24px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            {results.map((res, idx) => (
              <div key={idx} className="case-log-item">
                <span style={{ fontSize: '12px' }}>CASE ID: {res.id}</span>
                <span className={`status-badge ${res.status}`}>{res.status === 'pass' ? '✓ PASS' : '✗ FAIL'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.3, fontSize: '12px' }}>
          NO DATA
        </div>
      )}
    </div>
  );
}
