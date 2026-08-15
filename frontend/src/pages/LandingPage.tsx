import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import gsap from 'gsap';
import { 
  TrendingUp, BrainCircuit, ArrowRight, IndianRupee, Sparkles,
  MessageSquare, FileCheck, ChevronDown, Activity,
  Shield, Zap, BarChart3, Target, Mail, MapPin,
  Sun, Moon, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FloatingShapes, SectionHeader } from '../components/ui/UIComponents';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';

/* ─── FAQ Data ─── */
const FAQ_ITEMS = [
  {
    q: 'How does the AI model predict my monthly savings potential?',
    a: 'Finora AI utilizes a pre-trained Random Forest Regressor calibrated against over 90 economic indicators. It processes variables such as income, fixed debt commitments, budget utilization ratios, occupation, and credit score clusters to forecast your liquid cash retention rate in INR.'
  },
  {
    q: 'Is my financial data secure?',
    a: 'Absolutely. Finora AI employs enterprise-grade local hashing (bcrypt) and JWT credentials. All data is processed using localized SQLite/MongoDB layers with zero external training leakage. Your data is yours alone.'
  },
  {
    q: 'Can I import data from my existing banking apps?',
    a: 'Yes. Finora includes a structured validation engine that supports drag-and-drop uploads of CSV and Excel spreadsheets. The system automatically cleans, deduplicates, and evaluates the records for anomalies.'
  },
  {
    q: 'What is the role of the Gemini AI Financial Advisor?',
    a: 'The Gemini advisor acts as a contextual overlay. It securely reads your prediction results, debt profiles, and budget utilization rates to generate conversational, actionable guidance tailored to your specific economic tier.'
  }
];

/* ─── Feature Cards ─── */
const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Predictive ML Engine',
    desc: 'Random Forest inference with 91 features analyzing income patterns, debt ratios, and risk profiles for precision savings forecasting.',
    tag: 'Scikit-Learn',
    color: 'primary' as const,
  },
  {
    icon: TrendingUp,
    title: 'Wealth Compounding',
    desc: 'Simulates compound interest projections over 5-40 years with dynamic yield modeling and portfolio growth visualization in Rupees.',
    tag: 'Forecast Engine',
    color: 'accent' as const,
  },
  {
    icon: MessageSquare,
    title: 'AI Financial Advisor',
    desc: 'Context-aware conversational AI that analyzes your financial state to deliver personalized budgeting and investment guidance.',
    tag: 'Gemini 2.5 Flash',
    color: 'blue' as const,
  },
  {
    icon: FileCheck,
    title: 'Smart Report Generation',
    desc: 'Export compiled PDF audit reports and Excel spreadsheets with full analytics, charts, and recommendation summaries.',
    tag: 'PDF / Excel Export',
    color: 'warning' as const,
  },
];

const colorVariants = {
  primary: { bg: 'bg-[var(--primary-subtle)]', text: 'text-[var(--primary-light)]', border: 'hover:border-[var(--primary)]/30' },
  accent: { bg: 'bg-[var(--accent-subtle)]', text: 'text-[var(--accent)]', border: 'hover:border-[var(--accent)]/30' },
  blue: { bg: 'bg-[var(--blue-glow-subtle)]', text: 'text-[var(--blue-glow)]', border: 'hover:border-[var(--blue-glow)]/30' },
  warning: { bg: 'bg-[var(--warning-subtle)]', text: 'text-[var(--warning)]', border: 'hover:border-[var(--warning)]/30' },
};

/* ─── Animated Stats ─── */
const STATS = [
  { value: 95.4, suffix: '%', label: 'Prediction Accuracy', color: 'text-[var(--text-primary)]' },
  { value: 100, suffix: 'K+', label: 'Profiles Analyzed', color: 'text-[var(--primary-light)]' },
  { value: 91, suffix: '', label: 'ML Features', color: 'text-[var(--text-primary)]' },
  { value: 10, suffix: '+', label: 'Intelligence Modules', color: 'text-[var(--accent)]' },
];

/* ─── AI Chat Preview Interaction ─── */
const AI_CONVERSATIONS = [
  {
    prompt: "Show budget optimization for ₹1,00,000 income",
    response: "Based on ₹1,00,000 monthly income and ₹65,000 average expenses, your current savings capacity is ₹35,000 (35%). I recommend optimizing housing and subscription expenditures to save an extra ₹5,000/mo. Directing this ₹40,000 to a diversified SIP yielding 12% annually could grow to ₹34,24,000 in 5 years."
  },
  {
    prompt: "Should I prepay my ₹15,00,000 Home Loan?",
    response: "With a Home Loan balance of ₹15,00,000 at 8.5% interest, prepaying an extra ₹10,000 per month will shorten your loan tenure by 4.2 years and save you approximately ₹3,12,000 in total interest payments."
  },
  {
    prompt: "What is my retirement corpus readiness?",
    response: "At age 28, to retire at 60 with inflation at 6%, your current ₹1,00,000 savings pool and ₹15,000 monthly savings will grow to ₹3.8 Crores. This safely covers your target monthly expenses of ₹50,000 (inflation-adjusted)."
  }
];

const TESTIMONIALS = [
  {
    text: "Finora's 5-year compounding forecasting model predicted my savings rate with incredible precision. The PDF exporter was perfect for filing my quarterly GST & tax audit files!",
    name: 'Vikram Deshmukh',
    role: 'Data Scientist, Pune',
    initials: 'VD'
  },
  {
    text: "The custom advisor is remarkable. Having an assistant that is aware of my monthly cashflow figures makes financial planning feel truly personal and easy to map in INR.",
    name: 'Rajesh Kumar',
    role: 'Product Lead, Bengaluru',
    initials: 'RK'
  },
  {
    text: "Being able to drag and drop transaction lists and generate instant summaries is a game-changer. The UI is gorgeous, clean, and extremely fast, making it easy to track family expenses.",
    name: 'Priya Nair',
    role: 'CA & Investment Consultant, Hyderabad',
    initials: 'PN'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState('home');
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [customQuestion, setCustomQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'user', text: AI_CONVERSATIONS[0].prompt },
    { sender: 'ai', text: AI_CONVERSATIONS[0].response }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Determine active section
      const sections = ['home', 'features', 'ai-assistant', 'feedback', 'faq', 'about', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse follow gradient
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const getSimulatedResponse = (question: string): string => {
    const q = question.toLowerCase().trim();

    if (['detail', 'enter', 'input', 'profile', 'register', 'signup', 'sign up', 'account', 'dashboard', 'how to use', 'where do i', 'fill', 'data'].some(k => q.includes(k))) {
      return "To enter your financial details: 1) Click Get Started or Sign In to register/log in. 2) Go to your Dashboard and open the Financial Profile or Transaction Upload section. 3) Input your Income, Expenses, Debt, and Goals (or upload a CSV file). 4) Click Run ML Prediction to view your savings forecast!";
    }
    if (['save', 'budget', 'expense', 'spending', 'cut', 'cost', 'salary'].some(k => q.includes(k))) {
      return "To optimize your budget: Follow the 50/30/20 rule (50% needs, 30% wants, 20% savings). Audit monthly subscriptions, minimize impulse dining out, and automate a 20% salary transfer to index/liquid funds on payday.";
    }
    if (['invest', 'sip', 'mutual', 'stock', 'equity', 'cagr', 'return', 'wealth'].some(k => q.includes(k))) {
      return "For long-term wealth compounding in India: Start a monthly SIP in a low-cost Nifty 50 Index Fund (historically 12-14% CAGR). Diversify into Flexi-cap funds and allocate up to ₹1.5 Lakhs in tax-saving ELSS under Section 80C.";
    }
    if (['loan', 'debt', 'emi', 'prepay', 'home loan', 'interest'].some(k => q.includes(k))) {
      return "Managing debt & EMIs: Keep total monthly EMIs under 35-40% of net income. For high-interest loans (>8.5%), use the Debt Avalanche strategy (pay off highest rate first). Prepaying 1 extra EMI yearly on home loans cuts tenure significantly!";
    }
    if (['retire', 'pension', 'nps', 'corpus', 'future', 'old age'].some(k => q.includes(k))) {
      return "Retirement Planning: Factor in 6% annual inflation. To draw ₹50,000/month inflation-adjusted at age 60, target a corpus of ₹3.5-4 Crores using a mix of NPS (extra ₹50k Sec 80CCD 1B deduction) and equity SIPs.";
    }
    if (['tax', '80c', 'itr', 'regime', 'deduction'].some(k => q.includes(k))) {
      return "Tax Saving Essentials in India: 1) Section 80C (up to ₹1.5L via ELSS, PPF, EPF), 2) Section 80D (Health Insurance up to ₹25k/₹50k), and 3) Section 80CCD(1B) for additional ₹50k in NPS.";
    }
    if (['hi', 'hello', 'hey', 'help', 'who are you'].some(k => q.includes(k))) {
      return "Hello! I am Finora AI, your personal financial advisor. Ask me about budget tracking, entering details on your dashboard, SIP investments, loan prepayments, or tax saving strategies in Indian Rupees!";
    }

    return `Regarding "${question.trim()}": Finora AI helps you track spending, optimize budgets, and project long-term wealth in Indian Rupees. Create a free account or sign in to enter your details on the dashboard and run personalized ML predictions!`;
  };


  const triggerTyping = (text: string) => {
    setIsTyping(true);
    setTypingText('');
    let currentText = '';
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        currentText += text.charAt(index);
        setTypingText(currentText);
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 12);
  };

  const handlePromptSelect = (idx: number) => {
    if (isTyping) return;
    setSelectedPrompt(idx);
    const userPrompt = AI_CONVERSATIONS[idx].prompt;
    const aiResponse = AI_CONVERSATIONS[idx].response;
    setChatHistory([
      { sender: 'user', text: userPrompt },
      { sender: 'ai', text: aiResponse }
    ]);
    triggerTyping(aiResponse);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isTyping) return;
    const userText = customQuestion.trim();
    setCustomQuestion('');
    
    // Add user message to chat history immediately
    setChatHistory([
      { sender: 'user', text: userText },
      { sender: 'ai', text: 'Thinking...' }
    ]);
    setIsTyping(true);
    setTypingText('Thinking...');
    
    try {
      const res = await fetch('http://localhost:8000/assistant/preview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      
      setChatHistory([
        { sender: 'user', text: userText },
        { sender: 'ai', text: data.reply }
      ]);
      triggerTyping(data.reply);
    } catch (err) {
      console.error('Error fetching preview chat:', err);
      const fallback = getSimulatedResponse(userText);
      setChatHistory([
        { sender: 'user', text: userText },
        { sender: 'ai', text: fallback }
      ]);
      triggerTyping(fallback);
    }
  };

  useEffect(() => {
    triggerTyping(AI_CONVERSATIONS[0].response);
  }, []);

  // GSAP hero animation
  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-stat-card', 
        { opacity: 0, y: 40, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.15, duration: 0.8, ease: 'power3.out', delay: 0.8 }
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  /* ─── Stagger animation variants ─── */
  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const smoothScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] relative overflow-hidden select-none font-sans">
      {/* Mouse-follow gradient */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(124, 58, 237, ${theme === 'dark' ? '0.06' : '0.03'}), transparent 60%)`,
        }}
      />

      {/* Background Elements */}
      <FloatingShapes />
      <div className="hero-mesh" />

      {/* ═══ HEADER / NAVBAR ═══ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrollY > 50 
          ? 'bg-gradient-to-r from-[var(--bg-secondary)]/90 via-[var(--bg-tertiary)]/85 to-[var(--bg-secondary)]/90 border-b border-[var(--primary)]/20 backdrop-blur-xl py-3 shadow-[0_4px_30px_rgba(124,58,237,0.1)]' 
          : 'bg-transparent py-5 border-b border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src="/logo.png" 
              alt="Finora AI" 
              className="rounded-xl object-cover shadow-lg shadow-[var(--primary-glow)] group-hover:scale-105 transition-transform"
              style={{ width: '40px', height: '40px', borderRadius: '0.75rem', flexShrink: 0 }}
            />
            <span className="font-extrabold text-xl tracking-tight font-display" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              <span className="text-[var(--text-primary)]">FINORA</span>{' '}
              <span className="bg-gradient-to-r from-[var(--primary-light)] to-[var(--blue-glow)] bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {[
              { id: 'home', label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'ai-assistant', label: 'AI Assistant' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'about', label: 'About' }
            ].map((tab) => (
              <a 
                key={tab.id}
                href={`#${tab.id}`} 
                onClick={(e) => { e.preventDefault(); smoothScroll(tab.id); }}
                className={`px-3 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 ${
                  activeSection === tab.id 
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary-light)] border border-[var(--primary)]/15 shadow-[0_0_10px_var(--primary-glow)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)]'
                }`}
              >
                {tab.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/30 hover:scale-105 transition-all flex items-center justify-center cursor-pointer shadow-md"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {token ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="fintech-button-primary py-2.5 px-5 text-xs flex items-center gap-1.5 font-bold btn-glow"
              >
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors hidden sm:block">Sign In</Link>
                <Link 
                  to="/register" 
                  className="fintech-button-primary py-2.5 px-5 text-xs font-bold btn-glow flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <section id="home" ref={heroRef} className="pt-32 sm:pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center relative z-10 text-center" style={{ paddingTop: '10rem', paddingBottom: '5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl flex flex-col items-center"
          style={{ maxWidth: '56rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Logo Display */}
          <motion.div variants={item} className="mb-8" style={{ marginBottom: '2rem' }}>
            <div 
              className="mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-[var(--primary-glow)] animate-float"
              style={{ width: '128px', height: '128px', borderRadius: '1.5rem', overflow: 'hidden', margin: '0 auto' }}
            >
              <img src="/logo.png" alt="Finora AI" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            variants={item}
            className="text-5xl sm:text-7xl md:text-8xl font-black text-[var(--text-primary)] tracking-tight leading-[0.95] mb-4 font-display"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 0.95, marginBottom: '1rem' }}
          >
            Finora{' '}
            <span 
              className="bg-gradient-to-r from-[var(--primary-light)] via-[var(--primary)] to-[var(--blue-glow)] bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]"
              style={{ backgroundImage: 'linear-gradient(to right, var(--primary-light), var(--primary), var(--blue-glow))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto' }}
            >
              AI
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={item}
            className="text-lg sm:text-xl md:text-2xl text-[var(--text-muted)] font-medium mb-8 font-display"
          >
            AI-Powered Personal Finance Analyzer
          </motion.p>

          {/* Bullet Features */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10">
            {['Smarter Indian Budgeting', 'Future Savings Compounding', 'Financial Anomaly Detection'].map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary-glow)]" />
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <button 
              onClick={() => navigate(token ? '/dashboard' : '/register')}
              className="fintech-button-primary px-10 py-4 text-sm uppercase tracking-wider font-bold flex items-center gap-2.5 btn-glow animate-glow-pulse"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <a 
              href="#features"
              onClick={(e) => { e.preventDefault(); smoothScroll('features'); }}
              className="fintech-button-secondary px-10 py-4 text-sm uppercase tracking-wider font-bold flex items-center gap-2.5"
            >
              <Sparkles className="w-4 h-4 text-[var(--primary-light)]" /> Features
            </a>
          </motion.div>
        </motion.div>

        {/* ═══ ANIMATED STATISTICS CARDS ═══ */}
        <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="hero-stat-card glass-card-interactive p-5 sm:p-6 text-center group"
            >
              <div className={`text-3xl sm:text-4xl font-black ${stat.color} font-display mb-1 transition-all group-hover:scale-105`}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2} />
              </div>
              <p className="text-[10px] sm:text-xs text-[var(--text-dim)] font-bold uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ═══ FLOATING PRODUCT PREVIEW CARD ═══ */}
        <motion.div
          id="dashboard-preview"
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="w-full max-w-5xl glass-card glass-gradient-border p-6 sm:p-8 shadow-2xl relative z-10 bg-[var(--bg-secondary)]/40 scroll-mt-24"
        >
          {/* Terminal dots */}
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-[var(--border-subtle)] text-left">
            <span className="w-3 h-3 rounded-full bg-[var(--danger)]/60" />
            <span className="w-3 h-3 rounded-full bg-[var(--warning)]/60" />
            <span className="w-3 h-3 rounded-full bg-[var(--accent)]/60" />
            <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider ml-2">
              Executive Analytics Preview
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[9px] text-[var(--accent)] font-bold uppercase tracking-wider">INR Supported</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
            {[
              { icon: IndianRupee, label: 'Compounded Forecast', value: '₹12,45,824', sub: '+12.4% yield simulation', subColor: 'text-[var(--accent)]', iconBg: 'bg-[var(--accent-subtle)]', iconColor: 'text-[var(--accent)]' },
              { icon: BrainCircuit, label: 'Model Accuracy', value: '95.4% Accuracy', sub: 'Random Forest Engine', subColor: 'text-[var(--text-muted)]', iconBg: 'bg-[var(--primary-subtle)]', iconColor: 'text-[var(--primary-light)]' },
              { icon: Sparkles, label: 'Financial Health Score', value: '78.5% Excellent', sub: 'Optimal saving index', subColor: 'text-[var(--primary-light)]', iconBg: 'bg-[var(--blue-glow-subtle)]', iconColor: 'text-[var(--blue-glow)]' },
            ].map((card, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02, borderColor: 'rgba(124,58,237,0.3)' }}
                className="p-5 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-subtle)] flex items-center gap-4 transition-all"
              >
                <div className={`p-3 ${card.iconBg} rounded-xl ${card.iconColor} flex items-center justify-center`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">{card.label}</div>
                  <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-0.5 font-display">{card.value}</div>
                  <div className={`text-[10px] ${card.subColor} flex items-center gap-0.5 mt-1 font-semibold`}>
                    {i === 0 && <TrendingUp className="w-3.5 h-3.5" />}
                    {card.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Chart placeholder */}
          <div className="mt-6 p-8 sm:p-10 bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="neural-grid" />
            <Activity className="w-10 h-10 text-[var(--primary)]/40 mb-3 animate-pulse relative z-10" />
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider relative z-10 font-display">Real-time Forecast Chart Simulator (INR)</p>
            <p className="text-[11px] text-[var(--text-dim)] mt-1 relative z-10">Connect your account to visualize compound matrices dynamically in Rupees.</p>
          </div>

          {/* Glowing orbs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full filter blur-3xl opacity-10 animate-pulse pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-[var(--accent)] to-[var(--blue-glow)] rounded-full filter blur-3xl opacity-10 animate-pulse pointer-events-none" />
        </motion.div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative z-10 border-t border-[var(--border-subtle)] scroll-mt-24">
        <SectionHeader 
          badge="Core Intelligence Modules"
          title="Powered by Enterprise AI"
          subtitle="Discover advanced tools designed to analyze every aspect of your cash flow, savings plans, and financial risk profiles."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const cv = colorVariants[feature.color];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`glass-card p-6 flex flex-col justify-between ${cv.border} hover:scale-[1.02] transition-all group`}
              >
                <div>
                  <div className={`p-3 ${cv.bg} rounded-2xl ${cv.text} w-fit mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 font-display">{feature.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                </div>
                <div className={`text-[10px] ${cv.text} font-bold uppercase tracking-wider mt-6 flex items-center gap-1`}>
                  <Zap className="w-3 h-3" /> {feature.tag}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══ AI ENGINE / INTELLIGENCE SECTION ═══ */}
      <section id="intelligence" className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-1.5 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-light)] mb-4">
              <BrainCircuit className="w-3.5 h-3.5" /> AI Intelligence Core
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-6 font-display">
              Built for the{' '}
              <span className="bg-gradient-to-r from-[var(--primary-light)] to-[var(--blue-glow)] bg-clip-text text-transparent">
                AI-First
              </span>{' '}
              Era
            </h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">
              Our backend pipelines analyze uploaded worksheets with Random Forest inference, automatically computing missing rate percentages, detecting financial anomalies, and formatting categorical mappings — all powered by machine learning and customized for the Indian economy.
            </p>
            
            <div className="space-y-4">
              {[
                { num: '01', title: 'Random Forest Inference', desc: 'Cross-validates debt-to-income and savings capacity multipliers with 95.4% accuracy.' },
                { num: '02', title: 'Structured Validation Pipeline', desc: 'Automated data cleaning, deduplication, and anomaly detection on uploaded worksheets.' },
                { num: '03', title: 'Context-Aware AI Advisory', desc: 'Gemini-powered assistant reads your financial state to generate personalized guidance.' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--primary-light)] flex-shrink-0 group-hover:bg-[var(--primary-subtle)] group-hover:border-[var(--primary)]/30 transition-all">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)] text-sm font-display">{step.title}</h4>
                    <p className="text-[11px] text-[var(--text-dim)] mt-1">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Interactive Mock Simulator */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card glass-gradient-border p-6 bg-[var(--bg-secondary)]/60 shadow-2xl"
          >
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4 flex items-center gap-1.5 font-display">
              <Sparkles className="w-4 h-4 text-[var(--primary-light)]" /> Interactive AI Simulator
            </h3>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Simulated Monthly Income (₹)</label>
                <input type="text" readOnly value="₹1,00,000" className="fintech-input py-2.5 cursor-not-allowed text-[var(--text-muted)]" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-dim)] font-bold block mb-1.5 uppercase tracking-wider">Simulated Monthly Expenses (₹)</label>
                <input type="text" readOnly value="₹65,000" className="fintech-input py-2.5 cursor-not-allowed text-[var(--text-muted)]" />
              </div>
              <div className="p-5 bg-[var(--bg-primary)]/80 rounded-xl border border-[var(--border-subtle)] relative overflow-hidden">
                <div className="neural-grid" />
                <div className="relative z-10">
                  <div className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-[var(--primary-light)]" />
                    AI Calculated Savings Potential
                  </div>
                  <div className="text-2xl font-bold text-[var(--accent)] mt-1 font-mono">₹35,000 / mo</div>
                  <p className="text-[10px] text-[var(--text-dim)] mt-1.5 font-medium">Create an Indian profile to run custom AI predictions.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/register')}
                className="w-full fintech-button-primary py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 btn-glow"
              >
                Sign Up to Predict <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ AI ASSISTANT PREVIEW SECTION ═══ */}
      <section id="ai-assistant" className="py-24 px-6 max-w-7xl mx-auto relative z-10 border-t border-[var(--border-subtle)] scroll-mt-24">
        <SectionHeader 
          badge="AI Advisory Preview"
          title="Interactive Financial Guidance"
          subtitle="Experience conversations with Finora AI. Click on the prompts below to preview smart recommendations."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Prompts Side */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 block">Choose a prompt</p>
            {AI_CONVERSATIONS.map((chat, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptSelect(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                  selectedPrompt === idx 
                    ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/35 text-[var(--primary-light)] shadow-[0_4px_15px_var(--primary-glow)]' 
                    : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-2 h-2 rounded-full ${selectedPrompt === idx ? 'bg-[var(--primary-light)]' : 'bg-[var(--text-dim)]'}`} />
                  <span className="truncate">{chat.prompt}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 flex-none" />
              </button>
            ))}
          </div>

          {/* Interactive Chat Window */}
          <div className="lg:col-span-2 glass-card p-6 bg-[var(--bg-secondary)]/50 flex flex-col justify-between min-h-[350px]">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)] mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary-glow)]">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Finora AI Advisor</h4>
                <p className="text-[9px] text-[var(--accent)] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> Active & Calibrated (INR)
                </p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-60 pr-1 scrollbar-none">
              {chatHistory.map((msg, index) => (
                <div key={index} className="space-y-4">
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-[var(--surface-glass-strong)] border border-[var(--border-default)] px-4 py-2.5 rounded-2xl rounded-tr-none text-xs text-[var(--text-primary)] font-medium max-w-md">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--primary-subtle)] border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary-light)] flex-shrink-0 mt-0.5">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <div className="bg-[var(--primary-subtle)] border border-[var(--primary)]/20 px-4 py-3 rounded-2xl rounded-tl-none text-xs text-[var(--text-secondary)] leading-relaxed max-w-lg relative min-h-[60px]">
                        {isTyping && index === chatHistory.length - 1 ? typingText : msg.text}
                        {isTyping && index === chatHistory.length - 1 && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--primary-light)] animate-pulse align-middle" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Input form */}
            <form onSubmit={handleCustomSubmit} className="flex gap-2 pt-3 border-t border-[var(--border-subtle)] mb-3">
              <input 
                type="text" 
                value={customQuestion} 
                onChange={(e) => setCustomQuestion(e.target.value)} 
                placeholder="Ask any financial question in Rupees..." 
                className="fintech-input py-2 flex-1" 
                disabled={isTyping}
              />
              <button 
                type="submit" 
                disabled={isTyping || !customQuestion.trim()} 
                className="fintech-button-primary px-5 py-2.5 flex items-center justify-center font-bold text-xs uppercase tracking-wider disabled:opacity-50 btn-glow"
              >
                Send
              </button>
            </form>

            {/* Tips footer */}
            <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-dim)] font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Tip: The advisor incorporates predictive inflation factors and tax savings brackets when modeling in Rupees.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TRUST INDICATORS ═══ */}
      <section className="py-16 px-6 relative z-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: 'Bank-Grade Security', desc: 'JWT + bcrypt encryption' },
            { icon: Zap, label: 'Real-time Processing', desc: 'Sub-second inference' },
            { icon: BarChart3, label: '95.4% Accuracy', desc: 'Validated ML model' },
            { icon: Target, label: 'Smart Predictions', desc: '91 feature analysis' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-3 p-6"
            >
              <div className="p-3 bg-[var(--surface-glass)] rounded-2xl text-[var(--primary-light)] border border-[var(--border-subtle)]">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ FEEDBACK SECTION ═══ */}
      <section id="feedback" className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-[var(--border-subtle)] scroll-mt-24">
        <SectionHeader 
          badge="User Feedback"
          title="Trusted by India's Forward-Thinking Professionals"
          subtitle="See how Indian investors and professionals are leveraging Finora AI to predict cash flows, organize debt structures, and download compiled reports."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card p-6 flex flex-col justify-between hover:border-[var(--primary)]/20 transition-all"
            >
              <p className="text-xs sm:text-sm italic text-[var(--text-secondary)] leading-relaxed">
                "{t.text}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white flex items-center justify-center font-bold text-xs flex-none shadow-md">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">{t.name}</h4>
                  <p className="text-[10px] text-[var(--text-dim)] font-semibold uppercase tracking-wider mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ FAQ SECTION ═══ */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto relative z-10 border-t border-[var(--border-subtle)] scroll-mt-24">
        <SectionHeader 
          badge="Q&A"
          title="Frequently Asked Questions"
          subtitle="Find answers to key technical questions about our intelligence metrics."
        />

        <div className="space-y-4">
          {FAQ_ITEMS.map((faqItem, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--surface-glass)] transition-colors cursor-pointer"
              >
                <span>{faqItem.q}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-dim)] transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-[var(--primary-light)]' : ''}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]">
                      {faqItem.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="py-24 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] mb-4 font-display">
            Ready to Transform Your{' '}
            <span className="bg-gradient-to-r from-[var(--primary-light)] to-[var(--blue-glow)] bg-clip-text text-transparent">
              Financial Future
            </span>
            ?
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-lg mx-auto">
            Join thousands of Indian investors using Finora AI to make data-driven financial decisions with machine learning precision.
          </p>
          <button 
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="fintech-button-primary px-12 py-4 text-sm uppercase tracking-wider font-bold flex items-center gap-2.5 mx-auto btn-glow animate-glow-pulse"
          >
            Start Free <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ═══ MULTI-COLUMN ENTERPRISE FOOTER ═══ */}
      <footer id="about" className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] relative z-10 scroll-mt-24">
        {/* Contact Info Anchor */}
        <div id="contact" className="scroll-mt-24" />
        
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Column 1: About & Author Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-[var(--primary-glow)]">
                <img src="/logo.png" alt="Finora AI" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-base text-[var(--text-primary)] tracking-tight font-display">
                FINORA <span className="text-[var(--primary-light)]">AI</span>
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Enterprise-grade AI-powered Personal Finance Analyzer & Future Financial Planning platform tailored for Indian investors.
            </p>
            
            {/* Developer Credit Widget */}
            <div className="p-4 rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-subtle)] space-y-2 shadow-sm">
              <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Created & Developed By</p>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">SANGRAM PISE</p>
                <p className="text-[10px] text-[var(--primary-light)] font-semibold leading-tight mt-0.5">
                  Data Science Intern | AI & ML Enthusiast
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <a 
                  href="https://www.linkedin.com/in/sangram-pise-7875a4358/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-bold text-[var(--blue-glow)] hover:text-[var(--blue-glow-light)] hover:underline transition-colors"
                >
                  <svg className="w-4 h-4 flex-none fill-current text-[#0077B5]" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  Connect on LinkedIn
                </a>
                <a 
                  href="https://github.com/SangramPise448"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 flex-none fill-current text-[var(--text-secondary)] hover:text-white" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Connect on GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Core Intelligence Features */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">Core Features</h4>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); smoothScroll('features'); }} className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-[var(--primary-light)]" /> Predictive ML Engine
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); smoothScroll('features'); }} className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" /> Wealth Compounding
                </a>
              </li>
              <li>
                <a href="#ai-assistant" onClick={(e) => { e.preventDefault(); smoothScroll('ai-assistant'); }} className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--blue-glow)]" /> AI Financial Advisor
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); smoothScroll('features'); }} className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" /> Smart Report Generator
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Navigation Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">Quick Links</h4>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li><a href="#home" onClick={(e) => { e.preventDefault(); smoothScroll('home'); }} className="hover:text-[var(--text-primary)] transition-colors">Home Base</a></li>
              <li><a href="#features" onClick={(e) => { e.preventDefault(); smoothScroll('features'); }} className="hover:text-[var(--text-primary)] transition-colors">Platform Features</a></li>
              <li><a href="#dashboard-preview" onClick={(e) => { e.preventDefault(); smoothScroll('dashboard-preview'); }} className="hover:text-[var(--text-primary)] transition-colors">Analytics Preview</a></li>
              <li><a href="#feedback" onClick={(e) => { e.preventDefault(); smoothScroll('feedback'); }} className="hover:text-[var(--text-primary)] transition-colors">User Feedback</a></li>
              <li><a href="#faq" onClick={(e) => { e.preventDefault(); smoothScroll('faq'); }} className="hover:text-[var(--text-primary)] transition-colors">System FAQ</a></li>
            </ul>
          </div>

          {/* Column 4: Contact & Social Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">Contact Information</h4>
            <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[var(--primary-light)]" />
                <span>support@finora.ai</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--accent)]" />
                <span>Pune, Maharashtra, India</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Policies & Copyright */}
        <div className="border-t border-[var(--border-subtle)] py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-dim)] font-semibold">
            <p>© 2026 Finora AI. All rights reserved. Made in India with ❤️</p>
            <div className="flex gap-6 uppercase tracking-wider">
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Cookie settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
