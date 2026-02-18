
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { 
  Step, 
  ServiceCategory, 
  LeadData, 
  Message 
} from './types';
import { generateInternalSummary } from './geminiService';
import { decode, decodeAudioData, createBlob } from './audioUtils';
import { 
  ShieldCheck, 
  Code, 
  Cpu, 
  Globe, 
  ClipboardList, 
  Send,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Mic,
  MicOff,
  X,
  PhoneCall,
  ChevronDown,
  Sparkles,
  Waves,
  AlertCircle,
  LayoutDashboard,
  Zap,
  Lock,
  MessageSquare,
  BarChart3,
  ExternalLink
} from 'lucide-react';

const INITIAL_LEAD_DATA: LeadData = {
  name: '',
  companyName: '',
  industry: '',
  serviceRequired: null,
  keyRequirements: '',
  employees: '',
  budgetRange: '',
  timeline: '',
  phone: '',
  email: '',
  preferredContactTime: '',
};

const SYSTEM_INSTRUCTION = `You are the ShreeanshTech Elite IT Solutions Architect & Consultant. 
Your persona is high-authority, technically profound, and strategically focused. You speak with precision and clarity.

KNOWLEDGE DOMAINS:
1. CYBERSECURITY: Advanced threat detection, SOC-as-a-Service, Zero Trust Architecture, Palo Alto/Fortinet integrations, and Ransomware remediation.
2. SOFTWARE ENGINEERING: Scalable MERN/Python stacks, High-concurrency ERP systems, Microservices architecture, and legacy system modernization.
3. AI & AUTOMATION: Custom LLM fine-tuning, RAG (Retrieval-Augmented Generation) pipelines, multi-agent WhatsApp automation, and RPA.
4. WEB ECOSYSTEMS: Enterprise-grade transactional portals, SEO-driven corporate branding, and high-performance React deployments.

CONSULTATIVE STRATEGY:
- Use the "Consultative Loop": Listen deeply to the client's business challenge, validate their specific requirements, and then propose a high-level solution architecture.
- Address nuance: If a user asks for a website, probe if they need a "marketing brochure" or a "conversion engine with API integrations."
- Handle complex queries: Provide specific tech recommendations (e.g., suggesting PostgreSQL for data integrity or Redis for low-latency caching) when appropriate.
- Goal: Qualify the prospect's intent and move them toward a scheduled technical consultation. Be polite but maintain an executive-level professionalism. 

Never provide generic answers. Always tailor your response to highlight potential business value and technical superiority.`;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.GREETING);
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [qualProgress, setQualProgress] = useState(0);
  const [finalSummary, setFinalSummary] = useState<any>(null);
  
  // Voice/Live State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    addAssistantMessage("Welcome to ShreeanshTech. I am your Strategic Solutions Advisor.\n\nTo begin our high-level discovery, may I know your name and the organization you represent?");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const addAssistantMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content, timestamp: new Date() }]);
      setIsTyping(false);
    }, 800);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const msgText = textOverride || inputValue.trim();
    if (!msgText) return;

    setMessages(prev => [...prev, { role: 'user', content: msgText, timestamp: new Date() }]);
    if (!textOverride) setInputValue('');

    if (currentStep === Step.GREETING) {
      setLeadData(prev => ({ ...prev, name: msgText }));
      setCurrentStep(Step.ID_REQUIREMENT);
      addAssistantMessage(`A pleasure to connect with you, ${msgText}. Which technological domain are we prioritizing for your business today?`);
    } else if (currentStep === Step.QUALIFICATION) {
      processQualification(msgText);
    } else if (currentStep === Step.CONTACT_COLLECTION) {
      // Basic heuristic: check for email/phone patterns
      if (msgText.includes('@') || msgText.match(/\d{7,}/)) {
        submitLead(msgText);
      } else {
        addAssistantMessage("Thank you. Could you also provide a preferred email address and phone number for our engineering lead to reach out?");
      }
    }
  };

  const selectService = (service: ServiceCategory) => {
    setLeadData(prev => ({ ...prev, serviceRequired: service }));
    setCurrentStep(Step.QUALIFICATION);
    setQualProgress(20);
    
    const questions: Record<string, string> = {
      [ServiceCategory.CYBERSECURITY]: "Strategic choice. Are you looking to fortify existing network architecture or seeking a comprehensive audit for compliance standards?",
      [ServiceCategory.SOFTWARE_DEV]: "Efficiency is key. Is your requirement centered around a centralized ERP system or specialized operational software?",
      [ServiceCategory.AI_AUTOMATION]: "The competitive edge. Are you exploring customer-facing AI agents or back-office process optimization?",
      [ServiceCategory.WEB_DEV]: "Your digital storefront. Do you require a high-authority corporate site or a functional transactional ecosystem?",
      [ServiceCategory.CONSULTATION]: "Understood. Let's explore your current operational bottlenecks. What is the primary objective for this quarter?"
    };

    addAssistantMessage(questions[service] || "Please describe the scope of the digital transformation you are envisioning.");
  };

  const processQualification = (answer: string) => {
    if (qualProgress < 100) {
      const nextProgress = Math.min(100, qualProgress + 20);
      setQualProgress(nextProgress);
      
      if (nextProgress >= 100) {
        setCurrentStep(Step.CONTACT_COLLECTION);
        addAssistantMessage("Your requirements are well-defined. To compile our formal advisory specification and schedule a strategic consultation, please provide your professional contact details.");
      } else {
        const followUps = [
          "What is the projected scale of this implementation in terms of user volume or endpoints?",
          "Regarding the fiscal roadmap, have you allocated a specific budget range for this infrastructure project?",
          "Excellent insights. Does your current technical stack require legacy integration or a fresh deployment?"
        ];
        addAssistantMessage(followUps[Math.floor(Math.random() * followUps.length)]);
      }
    }
  };

  const submitLead = async (contactInfo: string) => {
    setLeadData(prev => ({ ...prev, email: contactInfo })); // Simplified
    setIsTyping(true);
    
    // Generate AI Summary using existing service
    const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const summary = await generateInternalSummary(leadData, conversationHistory);
    
    setFinalSummary(summary);
    setCurrentStep(Step.SUMMARY);
    setIsTyping(false);
  };

  /**
   * Voice Mode / Live API Implementation
   */
  const startVoiceMode = async () => {
    try {
      setVoiceError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("HardwareSupportError");
      }

      setIsVoiceMode(true);
      setIsLiveActive(true);
      setIsModelThinking(true);
      
      // Initialize API client inside the function to ensure fresh context
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      
      audioContextRef.current = { input: inputCtx, output: outputCtx };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsModelThinking(false);
            // Stream audio from mic
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // Send only when resolved
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle output transcription
            if (message.serverContent?.outputTranscription) {
              setTranscriptText(prev => prev + message.serverContent!.outputTranscription!.text);
            }

            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const oCtx = audioContextRef.current?.output;
              if (oCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), oCtx, 24000, 1);
                const source = oCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }

            // Interrupt handling
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live session error:", e);
            setVoiceError("Connection disrupted. Reverting to text mode.");
            stopVoiceMode();
          },
          onclose: () => {
            stopVoiceMode();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error("Voice start failed:", err);
      setVoiceError("Microphone access denied or hardware error.");
      setIsVoiceMode(false);
    }
  };

  const stopVoiceMode = () => {
    setIsLiveActive(false);
    setIsVoiceMode(false);
    setTranscriptText('');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
    }
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    sessionPromiseRef.current?.then(s => s.close());
    sessionPromiseRef.current = null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Shreeansh<span className="text-blue-500">Tech</span></h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Strategic Lead Intelligence</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Consultant Online</span>
          </div>
          <button 
            onClick={isVoiceMode ? stopVoiceMode : startVoiceMode}
            className={`p-2.5 rounded-full transition-all ${isVoiceMode ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {isVoiceMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Progress Sidebar */}
        <aside className="w-full md:w-80 border-r border-slate-800 p-6 flex flex-col gap-8 bg-slate-900/20">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Discovery Phase</h2>
            <div className="space-y-4">
              {[
                { step: Step.GREETING, label: 'Identity Discovery', icon: User },
                { step: Step.ID_REQUIREMENT, label: 'Domain Mapping', icon: LayoutDashboard },
                { step: Step.QUALIFICATION, label: 'Technical Qualification', icon: Zap },
                { step: Step.CONTACT_COLLECTION, label: 'Strategic Alignment', icon: PhoneCall },
                { step: Step.SUMMARY, label: 'Executive Brief', icon: BarChart3 },
              ].map((item, idx) => {
                const isActive = currentStep === item.step;
                const isPast = Object.values(Step).indexOf(currentStep) > idx;
                return (
                  <div key={item.step} className={`flex items-center gap-3 transition-colors ${isActive ? 'text-blue-400' : isPast ? 'text-emerald-400' : 'text-slate-600'}`}>
                    <div className={`p-2 rounded-lg border ${isActive ? 'bg-blue-500/10 border-blue-500/50' : isPast ? 'bg-emerald-500/10 border-emerald-500/50' : 'border-slate-800'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {isPast && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Technical Capabilities</h3>
            <ul className="text-[11px] text-slate-400 space-y-2">
              <li className="flex items-center gap-2"><Lock className="w-3 h-3" /> Zero Trust Security</li>
              <li className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Custom RAG Pipelines</li>
              <li className="flex items-center gap-2"><Globe className="w-3 h-3" /> Enterprise SaaS</li>
            </ul>
          </div>
        </aside>

        {/* Chat Interface */}
        <section className="flex-1 flex flex-col relative bg-slate-950">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'assistant' 
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none' 
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-bold uppercase tracking-tighter">
                    {msg.role === 'assistant' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {msg.role} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            {currentStep === Step.ID_REQUIREMENT && !isTyping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                  { 
                    cat: ServiceCategory.CYBERSECURITY, 
                    icon: ShieldCheck, 
                    desc: 'Advanced network hardening, zero-trust security architecture, and proactive threat detection to safeguard your enterprise.' 
                  },
                  { 
                    cat: ServiceCategory.SOFTWARE_DEV, 
                    icon: Code, 
                    desc: 'Custom-engineered ERP systems and scalable software solutions designed to unify complex business workflows.' 
                  },
                  { 
                    cat: ServiceCategory.AI_AUTOMATION, 
                    icon: Cpu, 
                    desc: 'Intelligent AI agents, WhatsApp automation, and custom RAG pipelines to revolutionize operational efficiency.' 
                  },
                  { 
                    cat: ServiceCategory.WEB_DEV, 
                    icon: Globe, 
                    desc: 'High-performance corporate portals and high-authority transactional platforms optimized for growth and engagement.' 
                  },
                ].map(item => (
                  <button
                    key={item.cat}
                    onClick={() => selectService(item.cat)}
                    className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all text-left group"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 shrink-0">
                      <item.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{item.cat}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentStep === Step.SUMMARY && finalSummary && (
              <div className="mt-6 bg-slate-900 border border-blue-500/30 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-blue-500/10 p-4 border-b border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-sm tracking-tight uppercase">Strategic Executive Summary</h3>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    {finalSummary.leadType || 'Analysis Pending'}
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <ClipboardList className="w-3 h-3" /> Overview
                    </h4>
                    <p className="text-sm text-slate-300 italic">{finalSummary.executiveSummary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">Technical Recommendations</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{finalSummary.technicalNotes}</p>
                    </div>
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Next Strategic Steps</h4>
                      <ul className="text-xs text-slate-400 space-y-2">
                        <li className="flex items-start gap-2">• NDA Execution</li>
                        <li className="flex items-start gap-2">• Architecture Deep-Dive</li>
                        <li className="flex items-start gap-2">• Resource Scoping</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="max-w-4xl mx-auto relative">
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentStep === Step.CONTACT_COLLECTION ? "Enter email/phone..." : "Consult with our AI Architect..."}
                disabled={currentStep === Step.SUMMARY}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={currentStep === Step.SUMMARY || !inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice UI Overlay */}
          {isVoiceMode && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
              <button 
                onClick={stopVoiceMode}
                className="absolute top-8 right-8 p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="relative mb-12">
                <div className={`w-32 h-32 bg-blue-500 rounded-full blur-2xl absolute inset-0 opacity-20 ${isLiveActive ? 'animate-pulse' : ''}`} />
                <div className={`w-32 h-32 border-4 border-blue-500/30 rounded-full flex items-center justify-center relative z-10 ${isLiveActive ? 'scale-110 transition-transform duration-300' : ''}`}>
                  {isModelThinking ? (
                    <Sparkles className="w-12 h-12 text-blue-400 animate-spin" />
                  ) : (
                    <Waves className={`w-12 h-12 text-blue-400 ${isLiveActive ? 'animate-bounce' : ''}`} />
                  )}
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 tracking-tight">Consulting Session Active</h2>
              <p className="text-slate-400 text-sm max-w-md mb-8">
                {isModelThinking ? "Establishing secure link..." : "Our Strategic Architect is listening to your requirements."}
              </p>

              <div className="w-full max-w-lg bg-slate-900/50 border border-slate-800 p-6 rounded-2xl min-h-[100px] flex items-center justify-center italic text-slate-500 text-sm">
                {transcriptText || "Awaiting transcription..."}
              </div>

              {voiceError && (
                <div className="mt-8 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  {voiceError}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
