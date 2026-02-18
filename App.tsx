
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
  CheckCircle2,
  Mic,
  MicOff,
  X,
  Sparkles,
  Zap,
  Lock,
  BarChart3,
  MoreVertical,
  ArrowLeft,
  Settings,
  AlertCircle
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
Your persona is high-authority, technically profound, and strategically focused.

KNOWLEDGE DOMAINS: Cybersecurity, Software Engineering, AI Automation, Web Ecosystems.
CONSULTATIVE STRATEGY: Use the Consultative Loop. Listen, validate, propose architecture. Move toward qualification.`;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.GREETING);
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
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
    addAssistantMessage("Hello. Welcome to ShreeanshTech. I am your AI Solutions Consultant.\n\nTo begin our discovery, may I know your name and organization?");
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
    }, 600);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const msgText = textOverride || inputValue.trim();
    if (!msgText) return;

    setMessages(prev => [...prev, { role: 'user', content: msgText, timestamp: new Date() }]);
    if (!textOverride) setInputValue('');

    if (currentStep === Step.GREETING) {
      setLeadData(prev => ({ ...prev, name: msgText }));
      setCurrentStep(Step.ID_REQUIREMENT);
      addAssistantMessage(`Excellent. ${msgText}, which domain are we prioritizing for your organization today?`);
    } else if (currentStep === Step.QUALIFICATION) {
      processQualification(msgText);
    } else if (currentStep === Step.CONTACT_COLLECTION) {
      if (msgText.includes('@') || msgText.match(/\d{7,}/)) {
        submitLead(msgText);
      } else {
        addAssistantMessage("Understood. Please provide your professional email and contact number to finalize the consultation request.");
      }
    }
  };

  const selectService = (service: ServiceCategory) => {
    setLeadData(prev => ({ ...prev, serviceRequired: service }));
    setCurrentStep(Step.QUALIFICATION);
    const questions: Record<string, string> = {
      [ServiceCategory.CYBERSECURITY]: "Regarding Cybersecurity: Are you seeking a zero-trust architecture deployment or a full-scale vulnerability audit?",
      [ServiceCategory.SOFTWARE_DEV]: "For Software: Is this for a multi-tenant ERP system or a specific operational management tool?",
      [ServiceCategory.AI_AUTOMATION]: "AI & Automation: Are we looking at customer-facing conversational agents or internal RAG-based automation?",
      [ServiceCategory.WEB_DEV]: "Web: Do you require a corporate portal or a transactional e-commerce ecosystem?",
      [ServiceCategory.CONSULTATION]: "Let's start with your core challenge. What specific bottleneck are you looking to resolve this quarter?"
    };
    addAssistantMessage(questions[service]);
  };

  const processQualification = (answer: string) => {
    setCurrentStep(Step.CONTACT_COLLECTION);
    addAssistantMessage("Thank you for those details. To schedule a technical deep-dive with our engineering lead, please share your contact information.");
  };

  const submitLead = async (contactInfo: string) => {
    setLeadData(prev => ({ ...prev, email: contactInfo })); 
    setIsTyping(true);
    const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const summary = await generateInternalSummary(leadData, conversationHistory);
    // Logic to show summary...
    addAssistantMessage("Request logged successfully. Our Strategic Team will contact you within 2 business hours.");
    setIsTyping(false);
  };

  const startVoiceMode = async () => {
    try {
      setVoiceError(null);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("HardwareSupportError");
      setIsVoiceMode(true);
      setIsLiveActive(true);
      setIsModelThinking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      audioContextRef.current = { input: inputCtx, output: outputCtx };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsModelThinking(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            sessionPromise.then(s => s.sendRealtimeInput({ text: "Introduce yourself as the ShreeanshTech Consultant." }));
          },
          onmessage: async (m) => {
            if (m.serverContent?.outputTranscription) setTranscriptText(prev => prev + m.serverContent!.outputTranscription!.text);
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const oCtx = audioContextRef.current?.output;
              if (oCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), oCtx, 24000, 1);
                const source = oCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(oCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
              }
            }
          },
          onerror: () => { setVoiceError("Link disrupted."); stopVoiceMode(); },
          onclose: () => stopVoiceMode()
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) { setVoiceError("Mic Access Denied."); setIsVoiceMode(false); }
  };

  const stopVoiceMode = () => {
    setIsLiveActive(false); setIsVoiceMode(false); setTranscriptText('');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) { audioContextRef.current.input.close(); audioContextRef.current.output.close(); }
    sessionPromiseRef.current?.then(s => s.close());
  };

  return (
    <div className="flex justify-center min-h-screen bg-slate-950 sm:py-8 font-sans selection:bg-indigo-500/30">
      {/* App Container - Mimics high-end Android frame on desktop */}
      <div className="relative w-full max-w-lg bg-slate-900 sm:rounded-[3rem] sm:border-8 border-slate-800 flex flex-col overflow-hidden shadow-2xl h-[100dvh] sm:h-[850px]">
        
        {/* Android-style Top Bar */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Shreeansh<span className="text-indigo-500">Tech</span></h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Consultant</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startVoiceMode} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
               <Mic className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
               <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Progress Indicator */}
        <div className="w-full flex gap-1 px-6 pt-2 h-1 mb-2">
           {Object.values(Step).map((s, i) => (
             <div key={s} className={`flex-1 rounded-full h-full transition-all duration-500 ${
               Object.values(Step).indexOf(currentStep) >= i ? 'bg-indigo-500' : 'bg-slate-800'
             }`} />
           ))}
        </div>

        {/* Chat Canvas */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] px-4 py-3 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                msg.role === 'assistant' 
                  ? 'bg-slate-800/50 border border-slate-700 text-slate-200 rounded-2xl rounded-bl-none' 
                  : 'bg-indigo-600 text-white rounded-2xl rounded-br-none'
              }`}>
                <p className="text-[14px] leading-relaxed font-medium">{msg.content}</p>
                <span className="text-[9px] mt-2 block opacity-40 font-bold tracking-tighter uppercase">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 p-3 rounded-2xl rounded-bl-none flex gap-1 animate-pulse">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-60" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-30" />
              </div>
            </div>
          )}

          {currentStep === Step.ID_REQUIREMENT && !isTyping && (
            <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in zoom-in-95 duration-500">
              {[
                { cat: ServiceCategory.CYBERSECURITY, icon: ShieldCheck, color: 'text-rose-400' },
                { cat: ServiceCategory.SOFTWARE_DEV, icon: Code, color: 'text-sky-400' },
                { cat: ServiceCategory.AI_AUTOMATION, icon: Cpu, color: 'text-indigo-400' },
                { cat: ServiceCategory.WEB_DEV, icon: Globe, color: 'text-emerald-400' },
              ].map(item => (
                <button
                  key={item.cat}
                  onClick={() => selectService(item.cat)}
                  className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-3xl hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-left flex flex-col gap-3 group active:scale-95"
                >
                  <div className={`p-2 bg-slate-900 rounded-xl w-fit ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 leading-tight">{item.cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pill Input Bar */}
        <footer className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
          <div className="relative flex items-center bg-slate-800/50 border border-slate-700/50 rounded-full px-5 py-2 group focus-within:border-indigo-500/50 transition-all shadow-inner">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Message Consultant..."
              className="flex-1 bg-transparent border-none text-sm placeholder:text-slate-600 focus:outline-none py-2"
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="ml-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-full transition-all shadow-lg active:scale-90"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </footer>

        {/* Android Voice Overlay */}
        {isVoiceMode && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-between p-10 animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="w-full flex justify-between items-center">
               <button onClick={stopVoiceMode} className="p-3 bg-slate-800/50 rounded-full text-slate-400 border border-slate-700">
                  <X className="w-6 h-6" />
               </button>
               <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  <Lock className="w-3 h-3" /> Secure AI Session
               </div>
               <button className="p-3 bg-slate-800/50 rounded-full text-slate-400 border border-slate-700">
                  <Settings className="w-6 h-6" />
               </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-16">
                {/* Organic Glowing Orb */}
                <div className="w-48 h-48 bg-indigo-600 rounded-full blur-[80px] absolute inset-0 opacity-40 animate-pulse" />
                <div className={`w-32 h-32 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative z-10 transition-transform duration-700 ${!isModelThinking ? 'scale-110' : 'scale-90'}`}>
                   {isModelThinking ? (
                     <div className="w-16 h-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                   ) : (
                     <div className="flex gap-2 items-end h-10">
                        {[0,1,2,3,4].map(i => (
                          <div key={i} 
                            className="w-1.5 bg-indigo-400 rounded-full animate-[vibe_0.8s_infinite_ease-in-out]" 
                            style={{ height: '100%', animationDelay: `${i * 0.1}s` }} 
                          />
                        ))}
                     </div>
                   )}
                </div>
              </div>
              <h2 className="text-xl font-bold mb-3 tracking-tight">Listening...</h2>
              <div className="bg-slate-900/50 border border-slate-800 px-8 py-6 rounded-[2rem] min-h-[140px] w-full max-w-sm flex items-center justify-center italic text-slate-400 text-sm leading-relaxed">
                {transcriptText || "Describe your business challenge..."}
              </div>
            </div>

            <div className="flex gap-4">
               <button onClick={stopVoiceMode} className="px-8 py-4 bg-slate-800 rounded-full text-sm font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all">
                  Switch to Text
               </button>
               <button onClick={stopVoiceMode} className="px-8 py-4 bg-indigo-600 rounded-full text-sm font-bold text-white shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                  End Consultation
               </button>
            </div>

            {voiceError && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-4 py-2 rounded-full border border-rose-400/20 text-xs font-bold animate-bounce">
                <AlertCircle className="w-4 h-4" /> {voiceError}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes vibe {
          0%, 100% { height: 30%; opacity: 0.4; }
          50% { height: 100%; opacity: 1; }
        }
        input::placeholder { font-weight: 500; }
        .rounded-2xl { border-radius: 1.5rem; }
        .rounded-3xl { border-radius: 2rem; }
      `}</style>
    </div>
  );
};

export default App;
