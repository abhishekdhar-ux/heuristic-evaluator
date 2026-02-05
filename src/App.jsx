import React, { useState, useRef, useCallback } from 'react';
import { Upload, ChevronDown, ChevronUp, X, Loader2, Info, ZoomIn, ZoomOut, RotateCcw, Download, HelpCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  'P1': { label: 'Dangerous', color: '#dc2626' },
  'P2': { label: 'Critical', color: '#ea580c' },
  'P3': { label: 'High', color: '#d97706' },
  'P4': { label: 'Medium', color: '#2563eb' },
  'P5': { label: 'Low', color: '#6b7280' }
};

const EVALUATION_PROMPT = `You are the Lead UX Architect performing a rigorous heuristic evaluation using the Tenets & Traps framework.

## CONTEXT PROVIDED
{CONTEXT}

## YOUR EVALUATION PROCESS

1. **Understand the Context**: Analyze the workflow, persona needs/pain points, and use case to establish evaluation criteria
2. **Map Persona to Severity**: 
   - Consumer/Novice users → Stricter evaluation
   - Admin/Expert users → Memory Challenge, Forced Syntax may be acceptable
   - High-stress workflows → Elevate Data Loss, Irreversible Action severity
3. **Scan for All 25 Traps** across 9 Tenets:
   - UNDERSTANDABLE: Distraction, Effectively Invisible Element, Feedback Failure, Forced Syntax, Invisible Element, Memory Challenge, Uncomprehended Element
   - RESPONSIVE: Captive Wait, Slow or No Response
   - COMFORTABLE: Accidental Activation, Physical Challenge
   - FORGIVING: Irreversible Action
   - PROTECTIVE: Data Loss
   - BEAUTIFUL: Unattractive Appearance
   - EFFICIENT: Unnecessary Step, Bad Prediction, Information Overload, System Amnesia
   - DISCREET: Unwanted Disclosure
   - HABITUATING: Gratuitous Redundancy, Variable Outcome, Ambiguous Home, Wandering Element, Inconsistent Appearance, Ambiguous Interactions

4. **Score Each Tenet** (1-5 scale)
5. **Provide Remediation** for each trap found

## SEVERITY SCALE
- P1: Dangerous - Blocks user completely or causes harm
- P2: Critical - Major friction, user may abandon
- P3: High - Significant usability issue
- P4: Medium - Noticeable friction
- P5: Low - Minor issue

## REQUIRED JSON OUTPUT
{
  "summary": {
    "verdict": "Pass|Needs Work|Critical",
    "userIntent": "What user is trying to achieve",
    "emotionalContext": "User's stress level/expectations",
    "health": "Tenet-led or Trap-heavy"
  },
  "traps": [
    {
      "id": 1,
      "name": "Trap Name",
      "tenet": "Tenet Name",
      "severity": "P1-P5",
      "location": {
        "x": 0-100,
        "y": 0-100,
        "description": "Specific location in UI"
      },
      "evidence": "Exactly what triggers this trap",
      "diagnostic": "Psychological impact on user",
      "quickPivot": "Low-effort tactical fix",
      "architecturalSolve": "High-impact redesign option",
      "aiFix": "How AI could automate away friction"
    }
  ],
  "tenetScores": {
    "Understandable": 1-5,
    "Responsive": 1-5,
    "Comfortable": 1-5,
    "Forgiving": 1-5,
    "Protective": 1-5,
    "Beautiful": 1-5,
    "Efficient": 1-5,
    "Discreet": 1-5,
    "Habituating": 1-5
  },
  "tenetWin": "One area where design excels",
  "disarmPriorities": ["Top 3 traps to fix first"],
  "score": 1-10
}

x,y = percentage from top-left corner. Return valid JSON only, no markdown.`;

const compressImage = (base64, maxWidth = 1200) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      resolve({ base64: compressed.split(',')[1], type: 'image/jpeg' });
    };
    img.src = base64;
  });
};

export default function HeuristicEvaluator() {
  const [workflowName, setWorkflowName] = useState('');
  const [epicDetails, setEpicDetails] = useState('');
  const [persona, setPersona] = useState('');
  const [usecaseDescription, setUsecaseDescription] = useState('');
  const [images, setImages] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTrap, setSelectedTrap] = useState(null);
  const [hoveredTrap, setHoveredTrap] = useState(null);
  const [expandedTraps, setExpandedTraps] = useState(true);
  const [expandedTenets, setExpandedTenets] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const containerRef = useRef(null);

  // Export evaluation results as JSON
  const exportResults = useCallback(() => {
    if (!evaluation) return;
    const exportData = {
      workflow: workflowName,
      epicDetails,
      persona,
      usecaseDescription,
      evaluatedAt: new Date().toISOString(),
      ...evaluation
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heuristic-evaluation-${workflowName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [evaluation, workflowName, epicDetails, persona, usecaseDescription]);

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            data: event.target.result
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const removeImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setActiveImageIndex(0);
    setEvaluation(null);
    resetView();
  }, []);

  const cancelEvaluation = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsEvaluating(false);
  };

  // Zoom controls - infinite zoom
  const handleZoomIn = () => setZoom(z => z * 1.25);
  const handleZoomOut = () => setZoom(z => z / 1.25);
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Mouse wheel zoom - infinite, multiplicative for smooth scaling
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => z * factor);
    }
  };

  // Pan handlers - work at any zoom
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  
  // Double-click to zoom in
  const handleDoubleClick = (e) => {
    setZoom(z => z * 2);
  };

  const runEvaluation = async () => {
    if (images.length === 0 || !workflowName.trim()) {
      setError('Please provide a workflow name and upload at least one design.');
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsEvaluating(true);
    setError(null);
    setEvaluation(null);

    try {
      const compressed = await compressImage(images[activeImageIndex].data);
      
      // Build context from all fields
      const contextParts = [`**Workflow:** ${workflowName}`];
      if (epicDetails.trim()) contextParts.push(`**EPIC/Story:** ${epicDetails}`);
      if (persona.trim()) contextParts.push(`**Persona:** ${persona}`);
      if (usecaseDescription.trim()) contextParts.push(`**Use Case Description:** ${usecaseDescription}`);
      const context = contextParts.join('\n');
      
      const prompt = EVALUATION_PROMPT.replace('{CONTEXT}', context);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: compressed.type, data: compressed.base64 } },
              { type: 'text', text: prompt }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) {
        const errorMsg = data.error.message || 'API error';
        if (errorMsg.includes('rate')) throw new Error('Rate limit reached. Please wait a moment and try again.');
        if (errorMsg.includes('invalid')) throw new Error('Invalid request. Please check your inputs.');
        throw new Error(errorMsg);
      }

      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse evaluation results. Please try again.');
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.traps || !parsed.summary) throw new Error('Incomplete evaluation response. Please try again.');
      
      setEvaluation(parsed);
    } catch (err) {
      if (err.name === 'AbortError') setError('Cancelled');
      else setError(err.message || 'Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const TrapMarker = ({ trap, index }) => {
    const isActive = selectedTrap?.id === trap.id || hoveredTrap?.id === trap.id;
    const severity = SEVERITY_CONFIG[trap.severity] || SEVERITY_CONFIG['P3'];
    
    // Calculate inverse scale to keep markers same size regardless of zoom
    const markerScale = 1 / zoom;
    const baseSize = isActive ? 32 : 24;
    
    return (
      <div
        className="absolute cursor-pointer"
        style={{ 
          left: `${trap.location.x}%`, 
          top: `${trap.location.y}%`, 
          zIndex: isActive ? 50 : 10,
          transform: `translate(-50%, -50%) scale(${markerScale})`,
          transformOrigin: 'center center'
        }}
        onClick={(e) => { e.stopPropagation(); setSelectedTrap(selectedTrap?.id === trap.id ? null : trap); }}
        onMouseEnter={() => setHoveredTrap(trap)}
        onMouseLeave={() => setHoveredTrap(null)}
      >
        <div
          className="flex items-center justify-center rounded-full font-bold text-white shadow-lg transition-transform"
          style={{ backgroundColor: severity.color, width: baseSize, height: baseSize, fontSize: isActive ? 14 : 12 }}
        >
          {index + 1}
        </div>
        {isActive && (
          <div 
            className="absolute left-10 top-0 bg-white rounded-lg shadow-xl p-3 border-2 z-50" 
            style={{ borderColor: severity.color, width: 280, minWidth: 280 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: severity.color }}>{trap.severity}</span>
              <span className="font-semibold text-gray-900 text-sm">{trap.name}</span>
            </div>
            {trap.tenet && <p className="text-xs text-indigo-600 mb-1">{trap.tenet}</p>}
            <p className="text-xs text-gray-600 mb-1">{trap.location?.description}</p>
            <p className="text-xs text-gray-700 mb-2">{trap.evidence}</p>
            {trap.diagnostic && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2">⚠️ {trap.diagnostic}</p>}
            {trap.quickPivot && <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-1">🔧 {trap.quickPivot}</p>}
            {trap.aiFix && <p className="text-xs text-green-700 bg-green-50 p-2 rounded">🤖 {trap.aiFix}</p>}
          </div>
        )}
      </div>
    );
  };

  // Tenets and Traps data from skill
  const TENETS_AND_TRAPS = [
    { 
      tenet: 'Understandable', 
      color: '#1e3a5f', 
      description: 'The user can comprehend the interface and how to interact with it.',
      traps: [
        { name: 'Distraction', desc: 'Something in the UI suddenly appears or draws attention, distracting from the goal.' },
        { name: 'Effectively Invisible Element', desc: 'A cue is not noticed because its appearance or location differs from expectations.' },
        { name: 'Feedback Failure', desc: 'System fails to provide noticeable, comprehensible feedback to user actions.' },
        { name: 'Forced Syntax', desc: 'System doesn\'t allow commands in the order or manner most natural to the user.' },
        { name: 'Invisible Element', desc: 'No cue is provided to signal how to achieve a goal.' },
        { name: 'Memory Challenge', desc: 'System requires user to remember information that is easy to forget.' },
        { name: 'Uncomprehended Element', desc: 'A cue is noticed but its meaning or interaction method is unclear.' }
      ]
    },
    { 
      tenet: 'Responsive', 
      color: '#0d7377', 
      description: 'The system responds quickly and provides appropriate feedback.',
      traps: [
        { name: 'Captive Wait', desc: 'User prevented from advancing or backing out of a process.' },
        { name: 'Slow or No Response', desc: 'User prevented from goal due to actual or perceived slow performance.' }
      ]
    },
    { 
      tenet: 'Comfortable', 
      color: '#6b7280', 
      description: 'Interactions require minimal physical effort and avoid strain.',
      traps: [
        { name: 'Accidental Activation', desc: 'System misinterprets physical actions resulting in unintended outcome.' },
        { name: 'Physical Challenge', desc: 'Required effort is physically difficult or impossible.' }
      ]
    },
    { 
      tenet: 'Forgiving', 
      color: '#ea580c', 
      description: 'The system allows users to recover from mistakes easily.',
      traps: [
        { name: 'Irreversible Action', desc: 'System does not allow user to undo an action taken.' }
      ]
    },
    { 
      tenet: 'Protective', 
      color: '#16a34a', 
      description: 'The system safeguards user data and prevents loss.',
      traps: [
        { name: 'Data Loss', desc: 'System can lose user\'s work through action or inaction.' }
      ]
    },
    { 
      tenet: 'Beautiful', 
      color: '#f97316', 
      description: 'The interface is aesthetically pleasing and appropriate.',
      traps: [
        { name: 'Unattractive Appearance', desc: 'UI is aesthetically unpleasing, inconsistent, or inappropriate.' }
      ]
    },
    { 
      tenet: 'Efficient', 
      color: '#1e40af', 
      description: 'Users can accomplish tasks with minimal steps and cognitive load.',
      traps: [
        { name: 'Unnecessary Step', desc: 'Number of steps required to achieve a goal is too high.' },
        { name: 'Bad Prediction', desc: 'System misinterprets user intent or preferences, forcing workarounds.' },
        { name: 'Information Overload', desc: 'Information is comprehensible but there is too much of it.' },
        { name: 'System Amnesia', desc: 'System re-prompts for information it previously gathered.' }
      ]
    },
    { 
      tenet: 'Discreet', 
      color: '#7c3aed', 
      description: 'The system respects user privacy and avoids unwanted exposure.',
      traps: [
        { name: 'Unwanted Disclosure', desc: 'System makes user data or behavior public in harmful ways.' }
      ]
    },
    { 
      tenet: 'Habituating', 
      color: '#374151', 
      description: 'The system behaves consistently, building user confidence through predictability.',
      traps: [
        { name: 'Gratuitous Redundancy', desc: 'System presents duplicate cues for the same action.' },
        { name: 'Variable Outcome', desc: 'System responds differently at different times to the same action.' },
        { name: 'Ambiguous Home', desc: 'UI provides no single place to return to begin a new task.' },
        { name: 'Wandering Element', desc: 'Physical location of a cue varies across the UI.' },
        { name: 'Inconsistent Appearance', desc: 'Visual appearance of a cue varies across the UI.' },
        { name: 'Ambiguous Interactions', desc: 'System doesn\'t provide clear ways to interact with AI.' }
      ]
    }
  ];

  const [expandedTenetIndex, setExpandedTenetIndex] = useState(null);
  const [selectedTrapName, setSelectedTrapName] = useState(null);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowHelp(false); setExpandedTenetIndex(null); setSelectedTrapName(null); }}>
          <div className="bg-white rounded-xl max-w-3xl w-full flex flex-col" style={{ height: '500px' }} onClick={e => e.stopPropagation()}>
            {/* Fixed Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Tenets & Traps Framework</h2>
              <button onClick={() => { setShowHelp(false); setExpandedTenetIndex(null); setSelectedTrapName(null); }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* How to Use Section */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">How to Use</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-2">1</span>
                    <p className="text-slate-700"><strong>Add Context</strong> — Enter workflow name, persona, and use case details</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-2">2</span>
                    <p className="text-slate-700"><strong>Upload Design</strong> — Add screenshots of your UI to evaluate</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-2">3</span>
                    <p className="text-slate-700"><strong>Run & Review</strong> — See traps on your design with fixes</p>
                  </div>
                </div>
              </div>

              {/* Severity Scale */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">Severity Scale</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(SEVERITY_CONFIG).map(([key, { label, color }]) => (
                    <div key={key} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: color }}>{key}</span>
                      <span className="text-sm text-slate-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tenets & Traps Reference */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">9 Tenets & 25 Traps</h3>
                <p className="text-sm text-slate-500 mb-4">Click on a tenet to expand, then click any trap to read more.</p>
                <div className="space-y-3">
                  {TENETS_AND_TRAPS.map((item, tenetIdx) => (
                    <div key={item.tenet} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Tenet Header */}
                      <button 
                        className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-slate-50"
                        style={{ backgroundColor: expandedTenetIndex === tenetIdx ? `${item.color}10` : 'white' }}
                        onClick={() => {
                          setExpandedTenetIndex(expandedTenetIndex === tenetIdx ? null : tenetIdx);
                          setSelectedTrapName(null);
                        }}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900">{item.tenet}</h4>
                          <p className="text-xs text-slate-500 truncate">{item.description}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                          {item.traps.length} trap{item.traps.length !== 1 ? 's' : ''}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${expandedTenetIndex === tenetIdx ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Expanded Traps */}
                      {expandedTenetIndex === tenetIdx && (
                        <div className="border-t border-slate-200 bg-slate-50 p-3">
                          <div className="space-y-2">
                            {item.traps.map((trap) => (
                              <div key={trap.name}>
                                <button
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                    selectedTrapName === trap.name 
                                      ? 'bg-white shadow-sm border border-slate-200' 
                                      : 'hover:bg-white/70'
                                  }`}
                                  onClick={() => setSelectedTrapName(selectedTrapName === trap.name ? null : trap.name)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-800">{trap.name}</span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${selectedTrapName === trap.name ? 'rotate-180' : ''}`} />
                                  </div>
                                  {selectedTrapName === trap.name && (
                                    <p className="mt-2 text-slate-600 text-sm leading-relaxed">{trap.desc}</p>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="px-6 py-6 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-black to-black">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h1 className="text-4xl font-semibold text-white leading-none">
              Heuristic<br/>Evaluator
            </h1>
            <p className="text-sm text-indigo-300 mt-1">Tenets & Traps Framework</p>
          </div>
          <button 
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="How to use"
          >
            <HelpCircle className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/70 hover:text-white">Know more</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Inputs */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Name *</label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g., Asset Onboarding"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              EPIC Details <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={epicDetails}
              onChange={(e) => setEpicDetails(e.target.value)}
              placeholder="Business context, acceptance criteria, or JIRA reference..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Persona <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="User type, needs, pain points, expertise level..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Use Case Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={usecaseDescription}
              onChange={(e) => setUsecaseDescription(e.target.value)}
              placeholder="What the user is trying to accomplish, key scenarios..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="border-t border-slate-200 pt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Design Screenshot *</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-5 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
            >
              <Upload className="w-5 h-5 mx-auto text-slate-400 group-hover:text-indigo-500 mb-1" />
              <span className="text-sm text-slate-500 group-hover:text-indigo-600">Upload design</span>
            </button>
          </div>

          {images.length > 0 && (
            <div className="space-y-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${idx === activeImageIndex ? 'bg-indigo-100 border border-indigo-300' : 'bg-slate-50 hover:bg-slate-100'}`}
                  onClick={() => { setActiveImageIndex(idx); setEvaluation(null); resetView(); }}
                >
                  <img src={img.data} alt="" className="w-10 h-10 object-cover rounded" />
                  <span className="flex-1 text-sm text-slate-700 truncate">{img.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeImage(img.id); }} className="p-1 hover:bg-red-100 rounded">
                    <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isEvaluating ? (
            <div className="space-y-2">
              <div className="w-full py-3 bg-indigo-100 text-indigo-700 rounded-lg font-medium flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </div>
              <button onClick={cancelEvaluation} className="w-full py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">Cancel</button>
            </div>
          ) : (
            <button
              onClick={runEvaluation}
              disabled={images.length === 0 || !workflowName.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Run Evaluation
            </button>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        </div>

        {/* Center - Design Preview with Zoom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Zoom Controls */}
          {images.length > 0 && (
            <div className="flex items-center justify-center gap-1 py-2 bg-white border-b border-slate-200">
              <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Zoom Out">
                <ZoomOut className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(0.5)} className={`px-2 py-1 text-xs rounded ${zoom >= 0.45 && zoom <= 0.55 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>50%</button>
                <button onClick={() => setZoom(1)} className={`px-2 py-1 text-xs rounded ${zoom >= 0.95 && zoom <= 1.05 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>100%</button>
                <button onClick={() => setZoom(2)} className={`px-2 py-1 text-xs rounded ${zoom >= 1.95 && zoom <= 2.05 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>200%</button>
                <button onClick={() => setZoom(4)} className={`px-2 py-1 text-xs rounded ${zoom >= 3.95 && zoom <= 4.05 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>400%</button>
              </div>
              <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Zoom In">
                <ZoomIn className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <span className="text-sm text-slate-700 w-14 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={resetView} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Reset View">
                <RotateCcw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
          
          <div 
            ref={containerRef}
            className="flex-1 p-4 overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {images.length > 0 ? (
              <div 
                className="h-full w-full flex items-center justify-center rounded-xl overflow-hidden"
                style={{
                  backgroundColor: '#e2e8f0',
                  backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                <div 
                  className="relative"
                  style={{ 
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                >
                  <img 
                    src={images[activeImageIndex]?.data} 
                    alt="Design" 
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                    draggable={false}
                  />
                  {evaluation?.traps?.map((trap, idx) => <TrapMarker key={trap.id} trap={trap} index={idx} />)}
                </div>
              </div>
            ) : (
              <div 
                className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300"
                style={{
                  backgroundColor: '#f8fafc',
                  backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                <div className="text-center text-slate-400">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Upload a design to evaluate</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
          {isEvaluating && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-indigo-500 animate-spin" />
                <p className="font-medium text-slate-700">Analyzing design...</p>
                <p className="text-sm text-slate-500 mt-1">Finding UX traps</p>
              </div>
            </div>
          )}

          {evaluation && (
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900">{evaluation.score}/10</span>
                    <button
                      onClick={exportResults}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Export results"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  evaluation.summary?.verdict === 'Pass' ? 'bg-green-100 text-green-700' :
                  evaluation.summary?.verdict === 'Critical' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {evaluation.summary?.verdict}
                </span>
                {evaluation.summary?.health && (
                  <p className="text-xs text-slate-500 mt-2">{evaluation.summary.health}</p>
                )}
              </div>

              {/* Context Summary */}
              {evaluation.summary?.userIntent && (
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">User Intent</p>
                  <p className="text-sm text-slate-700">{evaluation.summary.userIntent}</p>
                  {evaluation.summary?.emotionalContext && (
                    <>
                      <p className="text-xs font-medium text-slate-500 mt-2 mb-1">Emotional Context</p>
                      <p className="text-sm text-slate-700">{evaluation.summary.emotionalContext}</p>
                    </>
                  )}
                </div>
              )}

              {/* Tenet Scores */}
              {evaluation.tenetScores && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedTenets(!expandedTenets)} className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100">
                    <span className="font-semibold text-slate-900">Tenet Scores</span>
                    {expandedTenets ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </button>
                  {expandedTenets && (
                    <div className="p-3 space-y-2">
                      {Object.entries(evaluation.tenetScores).map(([tenet, score]) => (
                        <div key={tenet} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">{tenet}</span>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i <= score ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                            ))}
                            <span className="text-xs text-slate-500 ml-1">{score}/5</span>
                          </div>
                        </div>
                      ))}
                      {evaluation.tenetWin && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg">
                          <p className="text-xs font-medium text-green-700">🏆 Tenet Win</p>
                          <p className="text-xs text-green-800">{evaluation.tenetWin}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Traps */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedTraps(!expandedTraps)} className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Traps Found</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{evaluation.traps?.length || 0}</span>
                  </div>
                  {expandedTraps ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                {expandedTraps && (
                  <div className="divide-y divide-slate-100">
                    {evaluation.traps?.map((trap, idx) => {
                      const severity = SEVERITY_CONFIG[trap.severity] || SEVERITY_CONFIG['P3'];
                      const isExpanded = selectedTrap?.id === trap.id;
                      
                      return (
                        <div key={trap.id} className={`p-3 cursor-pointer transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedTrap(isExpanded ? null : trap)}>
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: severity.color }}>{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900 text-sm">{trap.name}</span>
                              </div>
                              <p className="text-xs text-slate-500">{trap.tenet && `${trap.tenet} · `}{trap.location?.description}</p>
                              
                              {isExpanded && (
                                <div className="mt-3 space-y-2 pt-3 border-t border-slate-200">
                                  <div>
                                    <span className="text-xs font-medium text-slate-500">Evidence</span>
                                    <p className="text-sm text-slate-700">{trap.evidence}</p>
                                  </div>
                                  {trap.diagnostic && (
                                    <div>
                                      <span className="text-xs font-medium text-slate-500">Impact</span>
                                      <p className="text-sm text-slate-700">{trap.diagnostic}</p>
                                    </div>
                                  )}
                                  {trap.quickPivot && (
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <span className="text-xs font-medium text-blue-700">🔧 Quick Pivot</span>
                                      <p className="text-xs text-blue-800 mt-1">{trap.quickPivot}</p>
                                    </div>
                                  )}
                                  {trap.architecturalSolve && (
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                      <span className="text-xs font-medium text-purple-700">🏗️ Architectural Solve</span>
                                      <p className="text-xs text-purple-800 mt-1">{trap.architecturalSolve}</p>
                                    </div>
                                  )}
                                  {trap.aiFix && (
                                    <div className="p-2 bg-green-50 rounded-lg">
                                      <span className="text-xs font-medium text-green-700">🤖 AI-Assisted Fix</span>
                                      <p className="text-xs text-green-800 mt-1">{trap.aiFix}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold text-white flex-shrink-0" style={{ backgroundColor: severity.color }}>{trap.severity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Disarm Priorities */}
              {evaluation.disarmPriorities && evaluation.disarmPriorities.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">🎯 Disarm Priorities</p>
                  <ol className="text-sm text-slate-700 space-y-1">
                    {evaluation.disarmPriorities.map((priority, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-xs bg-slate-200 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                        <span className="text-xs">{priority}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {!evaluation && !isEvaluating && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center text-slate-400">
                <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No evaluation yet</p>
                <p className="text-sm mt-1">Upload a design and run evaluation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
