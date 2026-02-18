
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
  Send,
  User,
  Mic,
  MicOff,
  X,
  Sparkles,
  Lock,
  MoreVertical,
  Settings,
  AlertCircle,
  Wifi,
  Battery,
  Signal,
  ArrowLeft
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
CONSULTATIVE STRATEGY: Use the Consultative Loop. Listen, validate, propose architecture. Move toward qualification.
Keep spoken responses natural, professional, and slightly concise for audio conversations.`;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.GREETING);
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice/Live State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    addAssistantMessage("Hello. Welcome to ShreeanshTech. I am your Strategic AI Solutions Consultant.\n\nTo begin, may I know your name and the organization you represent?");
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
      addAssistantMessage(`Excellent. A pleasure to meet you, ${msgText}. Which technological domain are we prioritizing for your business growth today?`);
    } else if (currentStep === Step.QUALIFICATION) {
      processQualification(msgText);
    } else if (currentStep === Step.CONTACT_COLLECTION) {
      if (msgText.includes('@') || msgText.match(/\d{7,}/)) {
        submitLead(msgText);
      } else {
        addAssistantMessage("Thank you. Please provide your preferred email or phone number so our technical lead can reach out for a deeper consultation.");
      }
    }
  };

  const selectService = (service: ServiceCategory) => {
    setLeadData(prev => ({ ...prev, serviceRequired: service }));
    setCurrentStep(Step.QUALIFICATION);
    const questions: Record<string, string> = {
      [ServiceCategory.CYBERSECURITY]: "Security first. Are you seeking a zero-trust architecture deployment or a full-scale vulnerability audit for your existing infrastructure?",
      [ServiceCategory.SOFTWARE_DEV]: "Software engineering is our core. Is this for a centralized ERP system or a specialized operational tool for your team?",
      [ServiceCategory.AI_AUTOMATION]: "The future of efficiency. Are you looking for customer-facing AI agents or internal process automation using RAG pipelines?",
      [ServiceCategory.WEB_DEV]: "Your digital presence. Do you require a high-authority corporate portal or a functional transactional ecosystem?",
      [ServiceCategory.CONSULTATION]: "Understood. Let's start with your primary operational bottleneck. What challenge are we solving this quarter?"
    };
    addAssistantMessage(questions[service]);
  };

  const processQualification = (answer: string) => {
    setCurrentStep(Step.CONTACT_COLLECTION);
    addAssistantMessage("Your requirements are well-noted. To prepare our initial advisory brief, please provide your professional contact details.");
  };

  const submitLead = async (contactInfo: string) => {
    setLeadData(prev => ({ ...prev, email: contactInfo })); 
    setIsTyping(true);
    const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    await generateInternalSummary(leadData, conversationHistory);
    addAssistantMessage("Strategic request captured successfully. Our Elite Solutions team will review your requirements and reach out within 2 business hours.");
    setIsTyping(false);
    setCurrentStep(Step.SUMMARY);
  };

  const startVoiceMode = async () => {
    try {
      setVoiceError(null);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Hardware not supported");
      
      setIsVoiceMode(true);
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
            sessionPromise.then(s => s.sendRealtimeInput({ text: "Hello! I'm the ShreeanshTech Consultant. How can I assist your business today?" }));
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.outputTranscription) setTranscriptText(m.serverContent.outputTranscription.text);
            if (m.serverContent?.inputTranscription) setTranscriptText(`You: ${m.serverContent.inputTranscription.text}`);
            
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const oCtx = audioContextRef.current?.output;
              if (oCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), oCtx, 24000, 1);
                const source = oCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(oCtx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error(e); setVoiceError("Connection Error"); stopVoiceMode(); },
          onclose: () => stopVoiceMode()
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) { 
      console.error(err);
      setVoiceError("Microphone access denied."); 
      setIsVoiceMode(false); 
    }
  };

  const stopVoiceMode = () => {
    setIsVoiceMode(false); 
    setTranscriptText('');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) { 
      audioContextRef.current.input.close().catch(() => {}); 
      audioContextRef.current.output.close().catch(() => {}); 
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    sessionPromiseRef.current?.then(s => s.close());
  };

  return (
    <div className="app-container">
      {/* Native Status Bar Emulation */}
      <div className="px-8 pt-4 pb-2 flex justify-between items-center text-[10px] font-bold text-slate-500 select-none z-50">
        <span className="bg-slate-800/50 px-2 py-0.5 rounded-full">9:41</span>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <Battery className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* App Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
            <Cpu className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-black tracking-tighter leading-none">Shreeansh<span className="text-indigo-500">Tech</span></h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.1em]">AI Architect</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={startVoiceMode}
            className="p-2.5 hover:bg-white/5 rounded-full transition-all text-indigo-400 active:scale-90"
          >
             <Mic className="w-6 h-6" />
          </button>
          <button className="p-2.5 hover:bg-white/5 rounded-full transition-all text-slate-500">
             <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Modern Progress Line */}
      <div className="w-full flex gap-1 px-6 pt-1 h-[2px] mb-2">
         {Object.values(Step).map((s, i) => (
           <div key={s} className={`flex-1 rounded-full h-full transition-all duration-700 ${
             Object.values(Step).indexOf(currentStep) >= i ? 'bg-indigo-500' : 'bg-white/5'
           }`} />
         ))}
      </div>

      {/* Conversation Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex w-full ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] px-5 py-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              msg.role === 'assistant' 
                ? 'bg-[#12151c] text-slate-200 rounded-[24px] rounded-bl-none border border-white/5' 
                : 'bg-indigo-600 text-white rounded-[24px] rounded-br-none shadow-indigo-500/10'
            }`}>
              <p className="text-[15px] leading-relaxed font-medium tracking-tight whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center justify-between mt-3 opacity-40">
                <span className="text-[8px] font-black tracking-widest uppercase">
                  {msg.role === 'assistant' ? 'Verified Response' : 'User Auth'}
                </span>
                <span className="text-[9px] font-bold">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#12151c] px-5 py-4 rounded-[24px] rounded-bl-none flex gap-2 animate-pulse border border-white/5">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              <div className="w-2 h-2 bg-indigo-500 rounded-full opacity-60" />
              <div className="w-2 h-2 bg-indigo-500 rounded-full opacity-30" />
            </div>
          </div>
        )}

        {currentStep === Step.ID_REQUIREMENT && !isTyping && (
          <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in zoom-in-95 duration-500">
            {[
              { cat: ServiceCategory.CYBERSECURITY, icon: ShieldCheck, color: 'text-rose-400', bg: 'bg-rose-500/10' },
              { cat: ServiceCategory.SOFTWARE_DEV, icon: Code, color: 'text-sky-400', bg: 'bg-sky-500/10' },
              { cat: ServiceCategory.AI_AUTOMATION, icon: Cpu, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { cat: ServiceCategory.WEB_DEV, icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ].map(item => (
              <button
                key={item.cat}
                onClick={() => selectService(item.cat)}
                className="p-5 bg-[#12151c] border border-white/5 rounded-[28px] hover:border-indigo-500/50 hover:bg-[#1a1f29] transition-all text-left flex flex-col gap-4 group active:scale-95 shadow-lg"
              >
                <div className={`p-3 ${item.bg} rounded-2xl w-fit ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[13px] font-extrabold text-slate-200 leading-tight tracking-tight">{item.cat}</span>
              </button>
            ))}
          </div>
        )}

        {currentStep === Step.SUMMARY && (
           <div className="bg-indigo-600/10 border border-indigo-500/30 p-6 rounded-[28px] animate-in zoom-in-90 duration-700">
              <div className="flex items-center gap-2 mb-4">
                 <Sparkles className="w-5 h-5 text-indigo-400" />
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Analysis Complete</h3>
              </div>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                Your strategic session has been recorded. Our Solutions Architect is reviewing your requirements for a deep-dive consultation.
              </p>
           </div>
        )}
      </div>

      {/* Floating Pill Input */}
      <footer className="px-6 py-6 pb-8 bg-[#05070a]/95 backdrop-blur-xl border-t border-white/5">
        <div className="relative flex items-center bg-[#12151c] border border-white/5 rounded-[32px] px-6 py-2 focus-within:border-indigo-500/50 transition-all shadow-2xl">
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={currentStep === Step.CONTACT_COLLECTION ? "Enter Contact Email..." : "Consult AI Architect..."}
            className="flex-1 bg-transparent border-none text-[15px] text-slate-100 placeholder:text-slate-600 focus:outline-none py-3 font-semibold"
            disabled={currentStep === Step.SUMMARY}
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || currentStep === Step.SUMMARY}
            className="ml-2 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-full transition-all shadow-xl active:scale-90"
          >
            <Send className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
        {/* Android Home Bar Indicator */}
        <div className="mt-6 flex justify-center">
           <div className="h-1.5 w-32 bg-white/10 rounded-full" />
        </div>
      </footer>

      {/* Gemini Live Mode Overlay */}
      {isVoiceMode && (
        <div className="absolute inset-0 z-[100] bg-[#000] flex flex-col items-center justify-between p-10 animate-in fade-in slide-in-from-bottom-20 duration-500">
          <div className="w-full flex justify-between items-center">
             <button onClick={stopVoiceMode} className="p-4 bg-white/5 rounded-full text-slate-400 border border-white/10 active:scale-90 transition-all">
                <X className="w-6 h-6" />
             </button>
             <div className="flex items-center gap-2 px-5 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                <Lock className="w-3.5 h-3.5" /> Secure Session
             </div>
             <button className="p-4 bg-white/5 rounded-full text-slate-400 border border-white/10">
                <Settings className="w-6 h-6" />
             </button>
          </div>

          <div className="flex flex-col items-center text-center w-full">
            <div className="relative mb-24">
              {/* Premium Gemini Glowing Orb */}
              <div className="w-64 h-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 rounded-full blur-[100px] absolute inset-0 opacity-40 animate-pulse" />
              <div className={`w-44 h-44 rounded-full border-[3px] border-white/10 flex items-center justify-center relative z-10 transition-all duration-1000 ${!isModelThinking ? 'scale-110 shadow-[0_0_50px_rgba(99,102,241,0.2)]' : 'scale-90'}`}>
                 {isModelThinking ? (
                   <div className="w-full h-full rounded-full border-t-[3px] border-indigo-500 animate-spin" />
                 ) : (
                   <div className="flex gap-3 items-end h-14">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} 
                          className="w-2.5 bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-full animate-[voice_wave_1s_infinite_ease-in-out]" 
                          style={{ height: '100%', animationDelay: `${i * 0.15}s` }} 
                        />
                      ))}
                   </div>
                 )}
              </div>
            </div>
            
            <h2 className="text-3xl font-black mb-6 tracking-tighter text-white">
              {isModelThinking ? 'Establishing Link...' : 'Consultant Live'}
            </h2>
            
            <div className="bg-white/5 border border-white/10 px-8 py-8 rounded-[40px] min-h-[200px] w-full max-w-sm flex items-center justify-center text-center shadow-inner backdrop-blur-2xl">
              <p className="text-indigo-100/90 font-bold text-[18px] leading-snug tracking-tight italic">
                {transcriptText || "Identify your business vision..."}
              </p>
            </div>
          </div>

          <div className="flex flex-col w-full gap-4 pb-4">
             <button onClick={stopVoiceMode} className="w-full py-5.5 bg-white/5 rounded-[28px] text-[16px] font-black text-slate-300 border border-white/10 active:scale-95 transition-all">
                PAUSE CONSULTATION
             </button>
             <button onClick={stopVoiceMode} className="w-full py-5.5 bg-indigo-600 rounded-[28px] text-[16px] font-black text-white shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all">
                END SESSION
             </button>
          </div>

          {voiceError && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-6 py-3.5 rounded-full border border-rose-400/20 text-[12px] font-black animate-bounce mt-4">
              <AlertCircle className="w-4 h-4" /> {voiceError}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes voice_wave {
          0%, 100% { height: 30%; opacity: 0.3; transform: scaleY(1); }
          50% { height: 100%; opacity: 1; transform: scaleY(1.1); }
        }
        input::placeholder { font-weight: 700; color: #334155; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default App;
