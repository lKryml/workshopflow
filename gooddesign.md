This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
workshopClient-main/
  src/
    App.tsx
    index.css
    main.tsx
  .gitignore
  firestore.rules
  index.html
  package.json
  postcss.config.js
  tailwind.config.js
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="workshopClient-main/src/App.tsx">
import { useState } from 'react';
import { 
  CalendarClock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Check, 
  Download, 
  Code2, 
  Github, 
  AlertTriangle,
  Loader2,
  Terminal,
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
// 1. Go to console.firebase.google.com
// 2. Create a new project
// 3. Add a Web App and copy the config object below
import { initializeApp } from 'firebase/app';
import { collection, addDoc, initializeFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCzaGlVwHSRt0ph1XZy9lxON0C1wJuy0ew",
  authDomain: "workshopadmin-b13c2.firebaseapp.com",
  projectId: "workshopadmin-b13c2",
  storageBucket: "workshopadmin-b13c2.firebasestorage.app",
  messagingSenderId: "649560200366",
  appId: "1:649560200366:web:d97c05abb91c0db8e5093f"
};

// Initialize Firebase (Try/Catch to handle re-initialization in dev environments)
let db: Firestore | undefined;
try {
  const app = initializeApp(firebaseConfig);
  // Use initializeFirestore to force long polling which can sometimes bypass strict network filters
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (error) {
  // Fallback or handle if app already initialized
  console.log("Firebase already initialized or config missing");
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  status: string[];
  customStatus: string;
  englishLevel: string;
  gitLevel: string;
  goals: string[];
  customGoal: string;
  notes: string;
  laptopConfirmed: boolean | null;
  finalConfirmed: string;
}

// --- MAIN WIZARD COMPONENT ---
export default function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    status: [],
    customStatus: '',
    englishLevel: '',
    gitLevel: '',
    goals: [],
    customGoal: '',
    notes: '',
    laptopConfirmed: null,
    finalConfirmed: ''
  });

  const totalSteps = 5;

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'phone') {
        let numbersOnly = value.replace(/[^0-9]/g, '');
        
        // Smart handling for copy-paste (00218, 218, 091...)
        if (numbersOnly.startsWith('00218')) numbersOnly = numbersOnly.substring(5);
        else if (numbersOnly.startsWith('218')) numbersOnly = numbersOnly.substring(3);
        else if (numbersOnly.startsWith('0')) numbersOnly = numbersOnly.substring(1);

        setFormData(prev => ({ ...prev, [name]: numbersOnly }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelection = (field: keyof FormData, value: any) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStatus = (status: string) => {
    if (fieldErrors['status']) {
      setFieldErrors(prev => ({ ...prev, ['status']: '' }));
    }
    setFormData(prev => {
      const statuses = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      return { ...prev, status: statuses };
    });
  };

  const toggleGoal = (goal: string) => {
    if (fieldErrors['goals']) {
      setFieldErrors(prev => ({ ...prev, ['goals']: '' }));
    }
    setFormData(prev => {
      const goals = prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal];
      return { ...prev, goals };
    });
  };

  const validateStep = (step: number) => {
    let isValid = true;
    let fieldToShake = null;
    let newErrors: Record<string, string> = {};

    if (step === 1) {
      // Name: Arabic/English letters only, at least 2 words, min 6 chars total
      const nameClean = formData.name.trim();
      const nameParts = nameClean.split(/\s+/);
      const isNameValid = 
        nameParts.length >= 2 && 
        nameClean.length >= 6 &&
        /^[\u0600-\u06FFa-zA-Z\s]+$/.test(nameClean);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      
      // Phone: Must start with 91, 92, 93, 94 and be 9 digits total
      const phoneRegex = /^(91|92|93|94)\d{7}$/;

      if (!isNameValid) { 
        isValid = false; 
        fieldToShake = 'name'; 
        newErrors.name = 'Please enter your full name (at least 2 words, letters only).';
      }
      else if (!formData.email || !emailRegex.test(formData.email)) { 
        isValid = false; 
        fieldToShake = 'email'; 
        newErrors.email = 'Please enter a valid email address.';
      }
      else if (!formData.phone || !phoneRegex.test(formData.phone)) { 
        isValid = false; 
        fieldToShake = 'phone'; 
        newErrors.phone = 'Must start with 91, 92, 93, or 94 and be 9 digits.';
      }
      else if (formData.status.length === 0 && !formData.customStatus.trim()) { 
        isValid = false; 
        fieldToShake = 'status'; 
        newErrors.status = 'Please select your current status.';
      }
    }
    
    if (step === 2) {
      if (!formData.englishLevel) { isValid = false; fieldToShake = 'englishLevel'; newErrors.englishLevel = 'Required'; }
      else if (!formData.gitLevel) { isValid = false; fieldToShake = 'gitLevel'; newErrors.gitLevel = 'Required'; }
    }

    if (step === 3) {
      if (formData.goals.length === 0) { isValid = false; fieldToShake = 'goals'; newErrors.goals = 'Please select at least one goal.'; }
    }

    if (step === 4) {
      if (formData.laptopConfirmed === null) { isValid = false; fieldToShake = 'laptopConfirmed'; newErrors.laptopConfirmed = 'Please confirm laptop availability.'; }
    }

    if (step === 5) {
      if (!formData.finalConfirmed) { isValid = false; fieldToShake = 'finalConfirmed'; newErrors.finalConfirmed = 'Please confirm your attendance.'; }
    }

    setFieldErrors(newErrors);

    if (!isValid && fieldToShake) {
      setShakeField(fieldToShake);
      setTimeout(() => setShakeField(null), 500);
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // --- SUBMIT ENDPOINT ---
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (!db) throw new Error("Database not connected. Check Firebase Config.");

      // Add a new document with a generated id.
      const docRef = await addDoc(collection(db, "registrations"), {
        ...formData,
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      console.log("Document written with ID: ", docRef.id);
      setIsSubmitting(false);
      setShowSuccess(true);

    } catch (e: any) {
      console.error("Error adding document: ", e);
      if (e.code === 'permission-denied') {
        // In production, this usually means server-side validation failed
        setErrorMsg("Submission rejected. Please ensure all details are correct.");
      } else {
        setErrorMsg("Connection Error. Please disable AdBlocker/VPN.");
      }
      setIsSubmitting(false);
    }
  };

  // --- Styles ---
  const getInputClass = (fieldName: string) => `
    w-full rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 
    bg-neutral-900 border transition-all duration-200
    ${shakeField === fieldName 
      ? 'border-red-500 animate-shake' 
      : 'border-neutral-800 focus:border-orange-500 focus:bg-neutral-900/80 focus:ring-1 focus:ring-orange-500/20 outline-none hover:border-neutral-700'}
  `;

  const getOptionClass = (isSelected: boolean, fieldName: string) => `
    cursor-pointer transition-all duration-200 border rounded-md p-3 text-center text-sm
    ${isSelected 
      ? 'border-orange-500/50 bg-orange-500/5 text-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
      : `border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 ${shakeField === fieldName ? 'border-red-500 animate-shake' : ''}`
    }
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] font-sans text-neutral-200 overflow-hidden relative" dir="rtl">
      
      {/* Font Imports & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        :root { font-family: 'IBM Plex Sans Arabic', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #262626; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #404040; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
      `}</style>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-neutral-800/20 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 mix-blend-overlay"></div>
      </div>

      <main className="relative w-full max-w-3xl z-10">
        
        {/* Header & Progress */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 rounded text-[10px] tracking-wider font-mono font-bold bg-neutral-900 text-orange-500 border border-orange-900/30 uppercase">
                Dev_Ops_Series_01
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Git <span className="text-orange-500">Zero To Hero</span>
            </h1>
          </div>
          
          {currentStep > 1 && !showSuccess && (
            <div className="w-full md:w-auto text-left md:text-right">
              <span className="text-[10px] text-neutral-500 font-mono tracking-widest block mb-2 uppercase">Step 0{currentStep} / 0{totalSteps}</span>
              <div className="w-full md:w-48 h-[2px] bg-neutral-800 rounded-full overflow-hidden" dir="ltr">
                <div 
                  className="h-full bg-orange-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(234,88,12,0.5)]"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 md:p-12 relative overflow-hidden min-h-[500px] shadow-2xl shadow-black/50">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>

          {/* Step Content */}
          <div className="transition-all duration-500 ease-in-out">
            
            {/* STEP 1: Personal Data */}
            {currentStep === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-8 flex items-center gap-3">
                  <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">البيانات الشخصية</h2>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-wide mt-1">Identification Protocol</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">الاسم الثلاثي <span className="text-orange-500">*</span></label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={getInputClass('name')}
                      placeholder="Ahmed Octocat"
                    />
                    {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">البريد الإلكتروني <span className="text-orange-500">*</span></label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={getInputClass('email')}
                      placeholder="email@domain.com"
                    />
                    {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                    <p className="text-[10px] text-neutral-600 mt-2 font-mono flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> System will send credentials to this address
                    </p>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">رقم الهاتف <span className="text-orange-500">*</span></label>
                    
                    <div dir="rtl" className={`flex w-full ${shakeField === 'phone' ? 'animate-shake' : ''}`}>
                         <input 
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            dir="ltr"
                            className={`
                                flex-1 rounded-r-md px-4 py-3 text-neutral-200 placeholder-neutral-700 text-left
                                bg-neutral-900 border border-l-0 border-neutral-800 transition-all duration-200 font-mono
                                focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none hover:border-neutral-700
                                ${shakeField === 'phone' ? 'border-red-500' : ''}
                            `}
                            placeholder="91, 92, 94..."
                            maxLength={9}
                        />
                         <span className={`
                            flex items-center justify-center px-3 bg-neutral-900 border border-neutral-800 border-r-0 rounded-l-md text-neutral-500 font-mono text-sm
                            ${shakeField === 'phone' ? 'border-red-500' : ''}
                         `}>
                             +218
                         </span>
                    </div>
                    {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">الصفة الحالية <span className="text-orange-500">*</span></label>
                    <div className={`grid grid-cols-2 gap-3 ${shakeField === 'status' ? 'animate-shake' : ''}`}>
                      {['طالب (Student)', 'خريج (Graduate)', 'موظف (Employee)', 'مستقل (Freelancer)'].map((status) => (
                        <div 
                          key={status}
                          onClick={() => toggleStatus(status)}
                          className={getOptionClass(formData.status.includes(status), 'status')}
                        >
                          {status}
                        </div>
                      ))}
                      <div 
                        className={`col-span-2 ${getOptionClass(formData.customStatus !== '', 'status')}`}
                      >
                        <input 
                          type="text"
                          name="customStatus"
                          placeholder="أخرى (Other) - يرجى التحديد..."
                          value={formData.customStatus}
                          onChange={(e) => {
                            if (fieldErrors['status']) {
                              setFieldErrors(prev => ({ ...prev, ['status']: '' }));
                            }
                            handleInputChange(e);
                          }}
                          className="bg-transparent w-full text-center outline-none placeholder-neutral-600 text-sm text-neutral-200"
                        />
                      </div>
                    </div>
                    {fieldErrors.status && <p className="text-red-500 text-xs mt-1">{fieldErrors.status}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Technical Background */}
            {currentStep === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-8 flex items-center gap-3">
                  <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">الخلفية التقنية</h2>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-wide mt-1">Technical Proficiency</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">مستوى اللغة الإنجليزية <span className="text-orange-500">*</span></label>
                    <div className={`space-y-3 ${shakeField === 'englishLevel' ? 'animate-shake' : ''}`}>
                      {[
                        { val: 'excellent', label: 'ممتاز', sub: 'Native / Professional' },
                        { val: 'medium', label: 'متوسط', sub: 'Technical Understanding' },
                        { val: 'weak', label: 'ضعيف', sub: 'Needs Assistance' }
                      ].map((opt) => (
                        <div 
                          key={opt.val}
                          onClick={() => handleSelection('englishLevel', opt.val)}
                          className={`
                            cursor-pointer border rounded-md p-4 flex items-center gap-4 transition-all duration-200
                            ${formData.englishLevel === opt.val 
                              ? 'border-orange-500/50 bg-orange-500/5' 
                              : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                            }
                          `}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${formData.englishLevel === opt.val ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-neutral-700'}`}></div>
                          <div>
                            <span className={`text-sm font-medium ${formData.englishLevel === opt.val ? 'text-white' : 'text-neutral-300'}`}>{opt.label}</span>
                            <span className="block text-[10px] text-neutral-500 font-mono mt-0.5">{opt.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {fieldErrors.englishLevel && <p className="text-red-500 text-xs mt-1">{fieldErrors.englishLevel}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">الخبرة في Git <span className="text-orange-500">*</span></label>
                    <div className={`grid grid-cols-1 gap-3 ${shakeField === 'gitLevel' ? 'animate-shake' : ''}`}>
                      {[
                        { val: 'level0', level: 'Lvl.0', label: 'New User (No Experience)' },
                        { val: 'level1', level: 'Lvl.1', label: 'Basic (Add, Commit, Push)' },
                        { val: 'level2', level: 'Lvl.2', label: 'Intermediate (Branching, Merging)' }
                      ].map((opt) => (
                        <div 
                          key={opt.val}
                          onClick={() => handleSelection('gitLevel', opt.val)}
                          className={`
                            cursor-pointer border rounded-md p-4 flex items-center justify-between transition-all duration-200
                            ${formData.gitLevel === opt.val 
                              ? 'border-orange-500/50 bg-orange-500/5' 
                              : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                            }
                          `}
                        >
                          <span className="text-sm text-neutral-200">{opt.label}</span>
                          <span className={`text-[10px] font-mono px-2 py-1 rounded bg-neutral-950 border border-neutral-800 ${formData.gitLevel === opt.val ? 'text-orange-500 border-orange-900/50' : 'text-neutral-500'}`}>{opt.level}</span>
                        </div>
                      ))}
                    </div>
                    {fieldErrors.gitLevel && <p className="text-red-500 text-xs mt-1">{fieldErrors.gitLevel}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Goals */}
            {currentStep === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-8 flex items-center gap-3">
                  <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">الأهداف</h2>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-wide mt-1">Target Objectives</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-4 uppercase tracking-wider">الهدف الأساسي <span className="text-orange-500">*</span></label>
                    <div className={`grid grid-cols-2 gap-3 ${shakeField === 'goals' ? 'animate-shake' : ''}`}>
                      {['فهم الأساسيات', 'Advanced Git', 'الحصول على وظيفة', 'التعرف على Open Source'].map((goal) => (
                        <button 
                          key={goal}
                          type="button" 
                          onClick={() => toggleGoal(goal)}
                          className={`
                            px-5 py-2.5 border rounded-sm text-sm transition-all duration-200
                            ${formData.goals.includes(goal)
                              ? 'bg-neutral-100 text-black border-neutral-100 font-medium' 
                              : 'bg-transparent border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                            }
                          `}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.goals && <p className="text-red-500 text-xs mt-1">{fieldErrors.goals}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">هل هناك شيء محدد تود التركيز عليه؟</label>
                    <textarea 
                      name="customGoal"
                      value={formData.customGoal}
                      onChange={handleInputChange}
                      className="w-full rounded-md px-4 py-3 text-neutral-200 bg-neutral-900 border border-neutral-800 focus:border-orange-500 outline-none h-24 resize-none placeholder-neutral-700 text-sm mb-4" 
                      placeholder="مواضيع محددة تود من المدرب التركيز عليها..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">أي ملاحظات تود اخبارنا بها قبل التدريب؟</label>
                    <textarea 
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full rounded-md px-4 py-3 text-neutral-200 bg-neutral-900 border border-neutral-800 focus:border-orange-500 outline-none h-24 resize-none placeholder-neutral-700 text-sm" 
                      placeholder="ملاحظات عامة، مشاكل صحية، أو أي شيء آخر..."
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Hardware */}
            {currentStep === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-8 flex items-center gap-3">
                  <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">التجهيزات</h2>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-wide mt-1">System Requirements</p>
                  </div>
                </div>

                <div className="bg-orange-500/5 border-l-2 border-orange-500 p-5 mb-8">
                  <div className="flex gap-4">
                    <AlertTriangle className="text-orange-500 flex-shrink-0 w-5 h-5" />
                    <div>
                      <h3 className="text-orange-100 font-semibold text-sm mb-1">متطلبات الأجهزة</h3>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        لضمان سير الورشة بسلاسة وتوفير الوقت للتطبيق العملي، يرجى تجهيز لابتوب بصلاحيات مسؤول (Administrator)، تثبيت البرامج أدناه، وإنشاء حساب GitHub مسبقاً.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Download, title: 'Git SCM', sub: 'CLI Tool', link: 'https://git-scm.com/downloads' },
                    { icon: Code2, title: 'VS Code', sub: 'IDE / Editor', link: 'https://code.visualstudio.com/download' },
                    { icon: Github, title: 'GitHub', sub: 'Cloud Profile', link: 'https://github.com/join' },
                  ].map((item) => (
                    <a key={item.title} href={item.link} target="_blank" rel="noopener noreferrer" className="block group">
                      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-md transition-all duration-300 hover:border-orange-500/30 hover:bg-neutral-800">
                        <div className="flex justify-between items-start mb-4">
                          <item.icon className="w-5 h-5 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                          <ArrowRight className="-rotate-45 w-3 h-3 text-neutral-700 group-hover:text-neutral-300 transition-colors" />
                        </div>
                        <div className="font-bold text-white text-sm">{item.title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono uppercase mt-1">{item.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>

                <div className={`space-y-3 ${shakeField === 'laptopConfirmed' ? 'animate-shake' : ''}`}>
                  <div 
                    onClick={() => handleSelection('laptopConfirmed', true)}
                    className={`
                      cursor-pointer border rounded-md p-4 flex items-center gap-4 transition-all duration-200
                      ${formData.laptopConfirmed === true
                        ? 'border-orange-500/50 bg-orange-500/5' 
                        : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                      }
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.laptopConfirmed === true ? 'border-orange-500' : 'border-neutral-600'}`}>
                      {formData.laptopConfirmed === true && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${formData.laptopConfirmed === true ? 'text-white' : 'text-neutral-300'}`}>أؤكد أنني سأحضر جهاز اللابتوب الخاص بي</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleSelection('laptopConfirmed', false)}
                    className={`
                      cursor-pointer border rounded-md p-4 flex items-center gap-4 transition-all duration-200
                      ${formData.laptopConfirmed === false
                        ? 'border-red-500/50 bg-red-500/5' 
                        : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                      }
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.laptopConfirmed === false ? 'border-red-500' : 'border-neutral-600'}`}>
                      {formData.laptopConfirmed === false && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${formData.laptopConfirmed === false ? 'text-white' : 'text-neutral-300'}`}>لا أملك جهاز لابتوب حالياً</span>
                    </div>
                  </div>
                  {fieldErrors.laptopConfirmed && <p className="text-red-500 text-xs mt-1">{fieldErrors.laptopConfirmed}</p>}
                </div>
              </div>
            )}

            {/* STEP 5: Final Confirmation */}
            {currentStep === 5 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-full mb-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <CalendarClock className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">تأكيد الحجز</h2>
                  <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">Reservation Details</p>
                </div>

                <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-0 mb-8 overflow-hidden">
                  <div className="grid grid-cols-1 divide-y md:divide-y-0 md:grid-cols-3 md:divide-x md:divide-x-reverse divide-neutral-800">
                    <div className="p-6 text-center hover:bg-neutral-900/50 transition-colors">
                      <div className="text-[10px] text-neutral-500 font-mono mb-2 uppercase tracking-widest">Date</div>
                      <div className="text-white font-bold text-lg">Feb 23</div>
                      <div className="text-xs text-neutral-400">Saturday</div>
                    </div>
                    <div className="p-6 text-center hover:bg-neutral-900/50 transition-colors">
                      <div className="text-[10px] text-neutral-500 font-mono mb-2 uppercase tracking-widest">Time</div>
                      <div className="text-white font-bold text-lg">14:00</div>
                      <div className="text-xs text-neutral-400">Until 17:00</div>
                    </div>
                    <div className="p-6 text-center hover:bg-neutral-900/50 transition-colors">
                      <div className="text-[10px] text-neutral-500 font-mono mb-2 uppercase tracking-widest">Zone</div>
                      <div className="text-white font-bold text-lg">قاعة المؤتمرات </div>
                      <div className="text-xs text-neutral-400">Secondary Building, Floor 1</div>
                    </div>
                  </div>
                </div>

                <div className={`space-y-3 ${shakeField === 'finalConfirmed' ? 'animate-shake' : ''}`}>
                  <div 
                    onClick={() => handleSelection('finalConfirmed', 'confirmed')}
                    className={`
                      cursor-pointer border rounded-md p-4 flex items-center gap-4 transition-all duration-200
                      ${formData.finalConfirmed === 'confirmed'
                        ? 'border-green-600/50 bg-green-600/5' 
                        : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                      }
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.finalConfirmed === 'confirmed' ? 'border-green-600' : 'border-neutral-600'}`}>
                      {formData.finalConfirmed === 'confirmed' && <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${formData.finalConfirmed === 'confirmed' ? 'text-white' : 'text-neutral-300'}`}>أؤكد الحضور 100% (المقاعد محدودة)</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleSelection('finalConfirmed', 'tentative')}
                    className={`
                      cursor-pointer border rounded-md p-4 flex items-center gap-4 transition-all duration-200
                      ${formData.finalConfirmed === 'tentative'
                        ? 'border-yellow-500/50 bg-yellow-500/5' 
                        : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700'
                      }
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.finalConfirmed === 'tentative' ? 'border-yellow-500' : 'border-neutral-600'}`}>
                      {formData.finalConfirmed === 'tentative' && <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${formData.finalConfirmed === 'tentative' ? 'text-white' : 'text-neutral-300'}`}>أرغب بالحضور بشدة، لكن قد يطرأ ظرف (70%)</span>
                    </div>
                  </div>
                  {fieldErrors.finalConfirmed && <p className="text-red-500 text-xs mt-1">{fieldErrors.finalConfirmed}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-12 flex justify-between items-center pt-8 border-t border-neutral-900">
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="bg-neutral-100 hover:bg-white text-black px-8 py-3 rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-bold text-sm flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-sm shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-bold text-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <><span>Processing</span><Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <><span>Confirm Registration</span><CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            )}

            <button 
              type="button" 
              onClick={handlePrev}
              className={`
                px-4 py-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors text-xs font-mono uppercase tracking-wider flex items-center gap-2
                ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </div>
          
           {/* Error Message */}
           {errorMsg && (
            <div className="mt-4 text-center text-red-500 text-sm font-mono bg-red-900/10 p-2 rounded border border-red-900/30">
              {errorMsg}
            </div>
           )}
        </div>
      </main>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-neutral-800 p-10 rounded-xl max-w-sm text-center shadow-2xl transform animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Confirmed</h3>
            <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Your seat has been reserved<br/>!Looking forward to see you</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-sm text-sm font-medium transition-colors border border-neutral-700"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
</file>

<file path="workshopClient-main/src/index.css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</file>

<file path="workshopClient-main/src/main.tsx">
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
</file>

<file path="workshopClient-main/.gitignore">
node_modules
</file>

<file path="workshopClient-main/firestore.rules">
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Match the registrations collection
    match /registrations/{registrationId} {
      
      // ALLOW create ONLY if the data is valid
      allow create: if isValidRegistration();
      
      // DENY all other access (read, update, delete)
      // This ensures users cannot see other registrations or modify them
      allow read, update, delete: if false;
    }

    // Validation Function
    function isValidRegistration() {
      let data = request.resource.data;
      
      let requiredFields = [
        'name', 'email', 'phone', 'status', 
        'englishLevel', 'gitLevel', 'goals', 
        'laptopConfirmed', 'finalConfirmed', 
        'submittedAt', 'userAgent'
      ];
      
      let optionalFields = ['customGoal', 'notes', 'customStatus'];
      
      let allAllowedFields = requiredFields.concat(optionalFields);

      return 
        // 1. Schema Integrity
        // Ensure all required fields are present
        data.keys().hasAll(requiredFields) &&
        // Ensure NO unknown fields are present (Strict Schema)
        data.keys().hasOnly(allAllowedFields) &&
        
        // 2. Field Type & Content Validation
        
        // Optional fields limits (prevent massive payloads)
        (!('customGoal' in data) || (data.customGoal is string && data.customGoal.size() < 1000)) &&
        (!('notes' in data) || (data.notes is string && data.notes.size() < 1000)) &&
        (!('customStatus' in data) || (data.customStatus is string && data.customStatus.size() < 100)) &&
        (data.userAgent is string && data.userAgent.size() < 500) &&

        // 3. Validate Name (String, at least 6 chars, letters/spaces only, at least one space)
        data.name is string && data.name.size() >= 6 && data.name.size() < 100 &&
        data.name.matches('^[\u0600-\u06FFa-zA-Z\\s]+$') && 
        data.name.matches('^.* .*$') &&
        
        // 4. Validate Email (Stricter format check)
        data.email is string && data.email.size() < 100 &&
        data.email.matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$') &&
        
        // 5. Validate Phone (Must start with 91, 92, 93, 94 and be 9 digits)
        data.phone is string && data.phone.matches('^(91|92|93|94)[0-9]{7}$') &&
        
        // 6. Validate Status (Must be a list)
        data.status is list && data.status.size() <= 5 &&
        data.status.hasOnly(['طالب (Student)', 'خريج (Graduate)', 'موظف (Employee)', 'مستقل (Freelancer)']) &&
        (data.status.size() > 0 || ('customStatus' in data && data.customStatus.size() > 0)) &&
        
        // 7. Validate English Level
        data.englishLevel in ['excellent', 'medium', 'weak'] &&
        
        // 8. Validate Git Level
        data.gitLevel in ['level0', 'level1', 'level2'] &&
        
        // 9. Validate Goals (Must be a non-empty list)
        data.goals is list && data.goals.size() > 0 && data.goals.size() <= 10 &&
        
        // 10. Validate Confirmations
        data.laptopConfirmed is bool &&
        data.finalConfirmed in ['confirmed', 'tentative'] &&
        
        // 11. Validate Timestamp
        data.submittedAt is string;
    }
  }
}
</file>

<file path="workshopClient-main/index.html">
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Workshop Registration</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</file>

<file path="workshopClient-main/package.json">
{
  "name": "workshop-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.7.1",
    "lucide-react": "^0.303.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
</file>

<file path="workshopClient-main/postcss.config.js">
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
</file>

<file path="workshopClient-main/tailwind.config.js">
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./client.tsx"
  ],
  theme: {
    extend: {
      animation: {
        shake: 'shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        }
      }
    },
  },
  plugins: [],
}
</file>

<file path="workshopClient-main/tsconfig.json">
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
</file>

<file path="workshopClient-main/tsconfig.node.json">
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
</file>

<file path="workshopClient-main/vite.config.ts">
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
</file>

</files>
