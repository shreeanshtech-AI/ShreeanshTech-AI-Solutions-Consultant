
import React, { useState, useEffect, useRef } from 'react';
import { 
  Step, 
  ServiceCategory, 
  LeadData, 
  Message, 
  LeadType 
} from './types';
import { generateInternalSummary } from './geminiService';
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
  ArrowRight
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

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.GREETING);
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [qualProgress, setQualProgress] = useState(0);
  const [finalSummary, setFinalSummary] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial Greeting
    addAssistantMessage("Hello 👋 Welcome to ShreeanshTech.\nI’m your AI Solutions Consultant.\nMay I know your name?");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addAssistantMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: text, timestamp: new Date() }]);
      setIsTyping(false);
    }, 800);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setInputValue('');

    // State Machine Logic
    switch (currentStep) {
      case Step.GREETING:
        setLeadData(prev => ({ ...prev, name: userMsg }));
        setCurrentStep(Step.ID_REQUIREMENT);
        addAssistantMessage(`Nice to meet you, ${userMsg}. What type of solution are you looking for today?`);
        break;

      case Step.QUALIFICATION:
        // In a real app, we'd cycle through the questions. 
        // For this demo, we'll simulate the qualification phase completion based on the category.
        processQualification(userMsg);
        break;

      case Step.CONTACT_COLLECTION:
        // Handled via specialized form
        break;
      
      default:
        addAssistantMessage("I understand. Let's continue with the details.");
    }
  };

  const selectService = (service: ServiceCategory) => {
    setLeadData(prev => ({ ...prev, serviceRequired: service }));
    setCurrentStep(Step.QUALIFICATION);
    setQualProgress(10);
    
    let firstQuestion = "";
    if (service === ServiceCategory.CYBERSECURITY) firstQuestion = "Is this for personal use or business?";
    if (service === ServiceCategory.SOFTWARE_DEV) firstQuestion = "What type of system do you require (ERP, Accounting, Lab, etc.)?";
    if (service === ServiceCategory.AI_AUTOMATION) firstQuestion = "What process are you trying to automate?";
    if (service === ServiceCategory.WEB_DEV) firstQuestion = "What type of website do you need (Informational or Transactional)?";
    if (service === ServiceCategory.CONSULTATION) firstQuestion = "Please describe your current business challenge.";

    addAssistantMessage(`Excellent choice. To provide the best recommendation, I have a few discovery questions.\n\n${firstQuestion}`);
  };

  const processQualification = (answer: string) => {
    // Simulated multi-step qualification
    if (qualProgress < 100) {
      const nextProgress = qualProgress + 30;
      setQualProgress(nextProgress);
      
      if (nextProgress >= 100) {
        setCurrentStep(Step.CONTACT_COLLECTION);
        addAssistantMessage("Thank you for those details. It helps me understand your needs perfectly.\n\nTo proceed further, may I collect your contact details for our technical consultant to connect with you?");
      } else {
        // Just generic follow-up for prototype
        addAssistantMessage("Understood. Could you also share your estimated budget range and expected timeline for deployment?");
      }
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(Step.SUMMARY);
    setIsTyping(true);

    const convoHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const summary = await generateInternalSummary(leadData, convoHistory);
    setFinalSummary(summary);
    setIsTyping(false);
    
    addAssistantMessage("Thank you for connecting with ShreeanshTech. Our team will review your requirements and connect with you shortly.");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop Only */}
      <div className="hidden md:flex w-80 bg-slate-900 text-white flex-col p-8 shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ShreeanshTech</h1>
        </div>
        
        <div className="space-y-6 flex-1">
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Our Expertise</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Cybersecurity Solutions</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Custom Software Dev</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> AI & Business Automation</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Professional Web Design</li>
            </ul>
          </section>

          <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-medium mb-2 text-blue-400">Current Session</h3>
            <div className="space-y-2 text-xs">
              <p className="flex justify-between"><span>Lead Status:</span> <span className="text-slate-100 font-mono uppercase">{currentStep}</span></p>
              <p className="flex justify-between"><span>Qual Progress:</span> <span className="text-slate-100">{qualProgress}%</span></p>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${qualProgress}%` }}></div>
            </div>
          </section>
        </div>

        <div className="mt-auto text-xs text-slate-500">
          © 2024 ShreeanshTech Solutions
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative max-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              ST
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 leading-tight">AI Solutions Consultant</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Active Consultation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600 p-2"><ClipboardList className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm border ${
                msg.role === 'assistant' 
                  ? 'bg-white border-slate-200 text-slate-800 rounded-tl-none' 
                  : 'bg-blue-600 border-blue-700 text-white rounded-tr-none'
              }`}>
                <p className="whitespace-pre-line text-sm md:text-base leading-relaxed">{msg.content}</p>
                <span className={`text-[10px] mt-2 block opacity-60 ${msg.role === 'assistant' ? 'text-slate-500' : 'text-blue-100'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          {/* Service Selection Step */}
          {currentStep === Step.ID_REQUIREMENT && !isTyping && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto py-4">
              {[
                { id: ServiceCategory.CYBERSECURITY, icon: <ShieldCheck className="w-5 h-5" />, desc: "Security auditing & infrastructure" },
                { id: ServiceCategory.SOFTWARE_DEV, icon: <Code className="w-5 h-5" />, desc: "Custom ERPs & business tools" },
                { id: ServiceCategory.AI_AUTOMATION, icon: <Cpu className="w-5 h-5" />, desc: "Chatbots & business automation" },
                { id: ServiceCategory.WEB_DEV, icon: <Globe className="w-5 h-5" />, desc: "Portals & business websites" },
                { id: ServiceCategory.CONSULTATION, icon: <ClipboardList className="w-5 h-5" />, desc: "Not sure what you need" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectService(item.id)}
                  className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-blue-600 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="font-semibold text-slate-800 text-sm">{item.id}</span>
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Contact Collection Form */}
          {currentStep === Step.CONTACT_COLLECTION && !isTyping && (
            <div className="max-w-xl mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-lg animate-in fade-in zoom-in duration-500">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> Professional Details
              </h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Company Name</label>
                    <input 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Acme Corp"
                      value={leadData.companyName}
                      onChange={e => setLeadData({...leadData, companyName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Industry</label>
                    <input 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Healthcare"
                      value={leadData.industry}
                      onChange={e => setLeadData({...leadData, industry: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (555) 000-0000"
                      value={leadData.phone}
                      onChange={e => setLeadData({...leadData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="name@company.com"
                      value={leadData.email}
                      onChange={e => setLeadData({...leadData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Preferred Contact Time</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={leadData.preferredContactTime}
                    onChange={e => setLeadData({...leadData, preferredContactTime: e.target.value})}
                  >
                    <option value="">Select a time...</option>
                    <option value="Morning (9AM - 12PM)">Morning (9AM - 12PM)</option>
                    <option value="Afternoon (12PM - 5PM)">Afternoon (12PM - 5PM)</option>
                    <option value="Evening (5PM - 8PM)">Evening (5PM - 8PM)</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Confirm & Generate Proposal <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Internal Summary Step */}
          {currentStep === Step.SUMMARY && finalSummary && (
            <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      finalSummary.leadType === 'High Intent' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                      {finalSummary.leadType || 'Assessing'}
                    </span>
                    <h2 className="text-2xl font-bold">Internal Lead Report</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-slate-400 flex items-center gap-2 mb-1"><User className="w-3.5 h-3.5" /> Client Name</p>
                      <p className="font-semibold">{leadData.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 flex items-center gap-2 mb-1"><Building2 className="w-3.5 h-3.5" /> Company</p>
                      <p className="font-semibold">{leadData.companyName} ({leadData.industry})</p>
                    </div>
                    <div>
                      <p className="text-slate-400 flex items-center gap-2 mb-1"><Code className="w-3.5 h-3.5" /> Requirement</p>
                      <p className="font-semibold text-blue-400">{leadData.serviceRequired}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 flex items-center gap-2 mb-1"><Calendar className="w-3.5 h-3.5" /> Preferred Time</p>
                      <p className="font-semibold">{leadData.preferredContactTime || 'ASAP'}</p>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-700 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Consultant Notes</h3>
                    <p className="text-slate-200 text-sm italic leading-relaxed">
                      "{finalSummary.technicalNotes || 'Analyzing specific technical requirements for the advisory team...'}"
                    </p>
                  </div>

                  <div className="mt-8 flex justify-between items-center bg-slate-800 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-400">Contact</p>
                      <p className="text-sm font-mono text-blue-300">{leadData.email}</p>
                    </div>
                    <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors">
                      <Send className="w-4 h-4" /> Forward to Team
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Controls */}
        {currentStep !== Step.SUMMARY && currentStep !== Step.CONTACT_COLLECTION && (
          <div className="p-4 md:p-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sticky bottom-0 z-10">
            <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentStep === Step.GREETING ? "Type your name here..." : "Type your message..."}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
