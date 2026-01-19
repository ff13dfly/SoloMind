/**
 * Memory Protocol Test Component
 * 
 * Usage: Import this component in App.tsx to test memory persistence
 * <MemoryTest />
 */

import { useEffect } from 'react';
import { useMemory } from '../hooks/useMemory';

export function MemoryTest() {
  const memory = useMemory();

  useEffect(() => {
    console.log('[MemoryTest] Component mounted, testing memory...');
    
    // Test 1: Add operational context
    memory.addOperational('warehouse', 'TEST_001', '云顶仓库');
    memory.addOperational('warehouse', 'TEST_002', '东方明珠仓库');
    
    // Test 2: Add conversation
    memory.addConversation(
      '有叫云顶的仓库吗？',
      '已提取仓库名称为"云顶"。请问还有其他需要查询的仓库信息吗？'
    );
    
    // Test 3: Add correction context
    memory.setCorrection({
      workflowId: 'asset.section.add',
      missingFields: ['warehouseId', 'name'],
      partialParams: {},
    });
    
    // Log formatted memory
    const formatted = memory.formatMemoryString();
    console.log('[MemoryTest] Formatted memory string:\n', formatted);
    
    // Log current state
    console.log('[MemoryTest] Current memory state:', {
      operational: memory.operational,
      conversation: memory.conversation,
      correction: memory.correction,
    });
    
    console.log('[MemoryTest] ✅ Check localStorage now!');
    console.log('[MemoryTest] Keys to look for:');
    console.log('  - solomind:memory:operational');
    console.log('  - solomind:memory:conversation');
    console.log('  - solomind:memory:correction');
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: '#ffeb3b', 
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
    }}>
      <strong>Memory Test Active</strong>
      <br />
      Check DevTools Console & localStorage
      <br />
      <button onClick={() => memory.clearAll()}>Clear All Memory</button>
    </div>
  );
}
