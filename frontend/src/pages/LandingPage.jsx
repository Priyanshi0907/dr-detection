import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import doctorImg from '../assets/doctor.png';
import {
  Brain, Zap, Shield, BarChart3, FileText, Star,
  Upload, Cpu, Eye, Download, ChevronDown, ChevronUp,
  ArrowRight, Activity, Award, Clock, AlertCircle, CheckCircle2, X,
  ZoomIn, LayoutDashboard
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { WordReveal, AnimatedCounter, HighlightReveal, GradientShimmer } from '../components/AnimatedText';
import { useAuth } from '../context/AuthContext';
import { predictionAPI } from '../api/client';

const DR_STAGE_INDEX = {
  'No DR': 0, 'Mild DR': 1, 'Moderate DR': 2, 'Severe DR': 3, 'Proliferative DR': 4,
};
const RISK_COLORS = {
  Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical',
};
const STAGE_COLORS = {
  'No DR': 'text-green-600 bg-green-50',
  'Mild DR': 'text-yellow-600 bg-yellow-50',
  'Moderate DR': 'text-orange-600 bg-orange-50',
  'Severe DR': 'text-red-600 bg-red-50',
  'Proliferative DR': 'text-red-800 bg-red-100',
};
const PROGRESS_WIDTH = { 0: '5%', 1: '25%', 2: '50%', 3: '75%', 4: '98%' };
const PROGRESS_COLOR = ['bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500', 'bg-red-700'];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const FEATURES = [
  { icon: Brain, title: 'AI-Powered Screening', desc: 'Custom ResNet deep learning model trained on retinal fundus images for precise DR staging.' },
  { icon: Zap, title: 'Instant Analysis', desc: 'Results delivered in under 5 seconds — faster than any manual grading workflow.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'Monitor your retinal health over time with longitudinal scan history and trend charts.' },
  { icon: Eye, title: 'Explainable AI', desc: 'Grad-CAM heatmaps highlight the exact retinal regions that influenced the AI decision.' },
  { icon: Shield, title: 'Secure & Private', desc: 'JWT-authenticated sessions, encrypted file storage, and full CORS protection.' },
  { icon: FileText, title: 'Medical Reports', desc: 'Instantly download beautifully formatted PDF reports with images, findings, and recommendations.' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: Upload, title: 'Upload Retinal Scan', desc: 'Drag & drop or browse your fundus image (JPG/PNG, up to 10MB). The system validates quality before analysis.' },
  { step: '02', icon: Cpu, title: 'AI Analysis', desc: 'Our ResNet model analyzes the retinal image, detects lesions and applies Grad-CAM for interpretability.' },
  { step: '03', icon: Activity, title: 'Receive Results', desc: 'Get DR stage, confidence score, risk level, clinical summary, and heatmap visualization instantly.' },
  { step: '04', icon: Download, title: 'Download & Track', desc: 'Download your PDF report and monitor progression trends over time in your personalized dashboard.' },
];

const DR_STAGES_INFO = [
  {
    num: 0, label: 'No DR', cls: 'Class 0',
    color: 'bg-green-100 text-green-700',
    bg: 'bg-green-50 border-green-100',
    bar: 'bg-green-400',
    desc: 'No visible signs of retinopathy. Retinal blood vessels appear normal. Regular annual screening is still recommended for all diabetic patients.',
  },
  {
    num: 1, label: 'Mild DR', cls: 'Class 1',
    color: 'bg-yellow-100 text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-100',
    bar: 'bg-yellow-400',
    desc: 'Microaneurysms (small balloon-like swellings) appear in the tiny blood vessels of the retina. Vision is usually unaffected at this stage.',
  },
  {
    num: 2, label: 'Moderate DR', cls: 'Class 2',
    color: 'bg-orange-100 text-orange-700',
    bg: 'bg-orange-50 border-orange-100',
    bar: 'bg-orange-400',
    desc: 'More blood vessels are blocked. Symptoms include hemorrhages, hard exudates and cotton-wool spots. Referral to an ophthalmologist is advised.',
  },
  {
    num: 3, label: 'Severe DR', cls: 'Class 3',
    color: 'bg-red-100 text-red-600',
    bg: 'bg-red-50 border-red-100',
    bar: 'bg-red-500',
    desc: 'Many blood vessels are blocked, depriving the retina of blood supply. The body signals growth of new fragile vessels — urgent treatment required.',
  },
  {
    num: 4, label: 'Proliferative DR', cls: 'Class 4',
    color: 'bg-red-200 text-red-800',
    bg: 'bg-red-50 border-red-200',
    bar: 'bg-red-700',
    desc: 'Advanced stage with new fragile blood vessel growth (neovascularisation), vitreous haemorrhage and risk of retinal detachment. Immediate intervention required.',
  },
];

const FAQS = [
  {
    q: 'What is Diabetic Retinopathy?',
    a: 'Diabetic Retinopathy (DR) is a diabetes complication that damages blood vessels in the retina. It progresses through 5 stages: No DR, Mild, Moderate, Severe, and Proliferative DR — the leading cause of blindness in working-age adults.',
  },
  {
    q: 'How accurate is the AI model?',
    a: 'Our custom LightResNet achieves ~98% training accuracy on synthetic retinal data. However, since it\'s trained on synthetic images, it should be used as a screening aid — not a definitive clinical diagnosis.',
  },
  {
    q: 'What image formats are supported?',
    a: 'We support JPG, JPEG, and PNG formats. The maximum file size is 10MB. The image must be a clear, well-lit retinal fundus photograph.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. JWT tokens are used for authentication. Files are stored securely on the server and only accessible by the authenticated user.',
  },
  {
    q: 'What happens if the image quality is poor?',
    a: 'The system automatically validates image quality. Blurry, overexposed, underexposed, or non-retinal images are rejected with a descriptive error message so you can retake the scan.',
  },
  {
    q: 'Can I download my reports?',
    a: 'Yes — every analysis generates a downloadable PDF report containing your retinal images, Grad-CAM heatmap, prediction details, recommendations, and a medical disclaimer.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-800">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [heatmapView, setHeatmapView] = useState('side-by-side');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const BACKEND_URL = 'https://dr-detection-lhhi.onrender.com';

  const handleFileSelect = (selectedFile) => {
    setError('');
    setResult(null);
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Unsupported format. Please upload a JPG, JPEG, or PNG image.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please compress or use a smaller image.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await predictionAPI.predict(formData);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again or use a different image.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result?.id) return;
    setDownloadingPdf(true);
    try {
      const res = await predictionAPI.getReport(result.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AcuSight_Report_${result.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not download PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const resetScan = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        id="home"
        className="min-h-screen flex items-center relative overflow-hidden"
      >
        {/* doctor.png as full background */}
        <img
          src={doctorImg}
          alt="Doctor performing eye examination"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Gradient: left clear so retina+doctor show, right semi-opaque for text */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, transparent 40%, rgba(221,232,224,0.45) 52%, rgba(221,232,224,0.82) 62%, rgba(221,232,224,0.92) 75%, rgba(221,232,224,0.95) 100%)',
          }}
        />

        {/* Text block — right side */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-16 flex justify-end">
          <div className="w-full md:w-[44%]">

            {/* Heading — 2 lines */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="font-heading font-bold leading-tight mb-5"
              style={{ fontSize: 'clamp(2.6rem,4.8vw,3.9rem)', color: '#1e2e24' }}
            >
              <WordReveal text="Protecting Vision through" stagger={0.09} />{' '}
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="inline-block"
              >
                <span
                  style={{
                    background: 'linear-gradient(90deg, #0d9e7a 0%, #1aab8a 35%, #6ee7c7 60%, #1aab8a 80%, #0d9e7a 100%)',
                    backgroundSize: '250% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 2.8s linear infinite',
                  }}
                >
                  Early
                </span>
              </motion.span>{' '}
              <motion.span
                initial={{ opacity: 0, y: 14, letterSpacing: '0.4em' }}
                animate={{ opacity: 1, y: 0, letterSpacing: '0em' }}
                transition={{ delay: 0.55, duration: 0.65, ease: 'easeOut' }}
                className="inline-block"
              >
                <span
                  className="glow-text"
                  style={{
                    background: 'linear-gradient(90deg, #b07d10 0%, #c8a020 30%, #f0c84a 55%, #c8a020 75%, #b07d10 100%)',
                    backgroundSize: '250% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 2.2s linear infinite',
                  }}
                >
                  Detection.
                </span>
              </motion.span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55 }}
              className="mb-8 max-w-sm leading-relaxed"
              style={{ color: '#3a4e40', fontSize: '0.975rem' }}
            >
              Instant, AI-Powered Diabetic Retinopathy Analysis for Proactive Eye Care.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.55 }}
              className="flex flex-wrap gap-4 mb-10"
            >
              <button
                onClick={() => document.getElementById('detection')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2.5 font-bold text-sm rounded-xl px-7 py-3.5 transition-all hover:opacity-90 hover:scale-[1.02] shadow-md"
                style={{ background: '#1e2e24', color: '#f0f5f2' }}
              >
                <Zap className="w-4 h-4" />
                Analyze Your Scan Now
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 font-semibold text-sm rounded-xl px-7 py-3.5 transition-all hover:bg-white/60 border"
                style={{ borderColor: 'rgba(30,46,36,0.3)', color: '#1e2e24', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)' }}
              >
                Learn More <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Divider */}
            <div className="border-t mb-8" style={{ borderColor: 'rgba(30,46,36,0.2)' }} />

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-4 max-w-sm"
            >
              {[
                { label: 'Accuracy', value: 98, suffix: '%', icon: Award },
                { label: 'DR Stages', value: 5, suffix: '', icon: Activity },
                { label: 'Avg. Time', rawValue: '<5s', icon: Clock },
              ].map(({ label, value, suffix, rawValue, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: '#1aab8a' }} />
                  <p className="text-2xl font-extrabold" style={{ color: '#1e2e24' }}>
                    {rawValue ?? <AnimatedCounter value={value} suffix={suffix} duration={1.5} />}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#5a7060' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll caret */}
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20"
        >
          <ChevronDown className="w-7 h-7" style={{ color: 'rgba(30,46,36,0.4)' }} />
        </motion.div>
      </section>

      {/* ── About / Understanding DR ──────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">

          {/* ── DR Explainer ── */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
            {/* Left — Text */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.span
                initial={{ opacity: 0, letterSpacing: '0.3em' }}
                whileInView={{ opacity: 1, letterSpacing: '0.2em' }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="text-primary font-semibold text-sm uppercase tracking-widest inline-block"
              >
                About
              </motion.span>
              <h2 className="font-heading text-4xl text-slate-800 mt-3 mb-6 leading-tight">
                <HighlightReveal color="#0B7285">
                  <WordReveal text="Understanding Diabetic Retinopathy" stagger={0.07} />
                </HighlightReveal>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Diabetic retinopathy is a complication of diabetes that damages the blood vessels in the retina
                — the light-sensitive tissue at the back of the eye. It is the <strong className="text-slate-800">leading cause of
                  preventable blindness</strong> among working-age adults worldwide.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Early detection through regular retinal screening can dramatically reduce the risk of severe
                vision loss. AcuSight AI automates grading across five recognised clinical stages — providing a fast,
                accessible second opinion to support clinical decisions.
              </p>
            </motion.div>

            {/* Right — 5 Stages Visual */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Five Clinical Stages</p>

              <div className="space-y-3">
                {DR_STAGES_INFO.map(({ num, label, cls, color, bg, bar, desc }) => (
                  <motion.div
                    key={num}
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${bg} transition-all duration-200`}
                  >
                    {/* Stage number badge */}
                    <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm ${color}`}>
                      <span className="text-lg font-black leading-none">{num}</span>
                    </div>

                    {/* Label + class + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm">{label}</span>
                        <span className="text-xs text-slate-400 font-mono">{cls}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug mb-1.5">{desc}</p>
                      {/* Severity bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${(num + 1) * 20}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-slate-100 mb-20" />

          {/* ── Platform Features ── */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0, letterSpacing: '0.3em' }}
              whileInView={{ opacity: 1, letterSpacing: '0.2em' }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-primary font-semibold text-sm uppercase tracking-widest inline-block"
            >
              Platform Features
            </motion.span>
            <h2 className="font-heading text-4xl text-slate-800 mt-3 mb-4">
              <HighlightReveal color="#14B8A6">
                <WordReveal text="Everything You Need for Smart Eye Care" stagger={0.05} />
              </HighlightReveal>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              A complete AI-powered platform designed with clinical safety, explainability, and simplicity at its core.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="card group hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-secondary transition-all duration-300">
                  <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-bgColor">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, letterSpacing: '0.3em' }}
              whileInView={{ opacity: 1, letterSpacing: '0.2em' }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-primary font-semibold text-sm uppercase tracking-widest inline-block"
            >
              Process
            </motion.span>
            <h2 className="font-heading text-4xl text-slate-800 mt-3 mb-4">
              <WordReveal text="How It Works" stagger={0.12} />
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              From upload to clinical report in four seamless steps — designed for speed and clarity.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* connecting line */}
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20" />

            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div
                key={step}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="card flex flex-col items-center text-center relative hover:shadow-lg transition-all duration-300"
              >
                {/* Step number badge */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="absolute top-4 right-4 text-xs font-black text-slate-200 font-mono">{step}</span>
                <h3 className="font-heading text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Detection / Upload Interface ────────────────────────────────────── */}
      <section id="detection" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          {user ? (
            // Logged-in: Show scan interface
            <div>
              <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="font-heading text-4xl text-slate-800 text-center mb-12">
                Upload Your Retinal Scan
              </motion.h2>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Upload Panel */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <div className="card h-full">
                    {!preview ? (
                      <div
                        onDrop={onDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging
                          ? 'border-primary bg-primary/5 scale-[1.02]'
                          : 'border-slate-200 hover:border-primary hover:bg-primary/5'
                          }`}
                      >
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                          <Eye className="w-8 h-8 text-primary" />
                        </div>
                        <p className="font-semibold text-slate-700 mb-1">Drop your retinal scan here</p>
                        <p className="text-slate-400 text-sm mb-4">or click to browse files</p>
                        <div className="flex gap-2 text-xs text-slate-400">
                          {['JPG', 'JPEG', 'PNG'].map((f) => (
                            <span key={f} className="bg-slate-100 px-2 py-1 rounded-full font-mono">{f}</span>
                          ))}
                          <span className="bg-slate-100 px-2 py-1 rounded-full">Max 10MB</span>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files[0])}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={preview}
                          alt="Uploaded retinal scan"
                          className="w-full rounded-2xl object-cover max-h-72"
                        />
                        <button
                          onClick={resetScan}
                          className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="truncate">{file?.name}</span>
                          <span className="ml-auto text-xs text-slate-400">
                            {(file?.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {error}
                      </motion.div>
                    )}

                    {preview && !result && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="btn-primary w-full mt-6 flex items-center justify-center gap-3 text-base py-4"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analyzing retinal image...
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5" />
                            Analyze with AI
                          </>
                        )}
                      </motion.button>
                    )}

                    {result && (
                      <button
                        onClick={resetScan}
                        className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Analyze Another Scan
                      </button>
                    )}

                    <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Image Quality Requirements</p>
                      <ul className="space-y-1">
                        {[
                          'Clear, well-focused retinal fundus photograph',
                          'Standard orange-red coloration (no filters)',
                          'Not overexposed or underexposed',
                          'JPG / JPEG / PNG, max 10MB',
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Results Panel */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <AnimatePresence mode="wait">
                    {!result && !loading && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="card h-full flex flex-col items-center justify-center text-center py-20"
                      >
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                          <Activity className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-heading text-xl text-slate-400 mb-2">Results appear here</h3>
                        <p className="text-slate-300 text-sm max-w-xs">
                          Upload a retinal fundus image and click "Analyze" to receive your AI-powered DR screening prediction.
                        </p>
                      </motion.div>
                    )}

                    {loading && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="card h-full flex flex-col items-center justify-center py-20"
                      >
                        <div className="relative mb-8">
                          <div className="w-24 h-24 rounded-full border-4 border-slate-100">
                            <div className="w-full h-full rounded-full border-4 border-t-primary border-r-secondary animate-spin" />
                          </div>
                          <Brain className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-heading text-xl text-slate-700 mb-2">AI Processing</h3>
                        <p className="text-slate-400 text-sm max-w-xs text-center">
                          Our ResNet model is analyzing your retinal scan and generating Grad-CAM visualizations...
                        </p>
                        {['Loading model', 'Validating image', 'Applying CLAHE enhancement', 'Running inference', 'Generating heatmap'].map((step, i) => (
                          <motion.p
                            key={step}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.4 }}
                            className="text-xs text-slate-400 mt-1"
                          >
                            ✓ {step}
                          </motion.p>
                        ))}
                      </motion.div>
                    )}

                    {result && (() => {
                      const stageIdx = DR_STAGE_INDEX[result.prediction_class] ?? 0;
                      return (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="card space-y-6"
                        >
                          {/* Result Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h2 className="font-heading text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" /> Analysis Complete
                              </h2>
                              <p className="text-slate-400 text-sm mt-0.5">
                                {new Date(result.scan_date).toLocaleString()}
                              </p>
                            </div>
                            <span className={RISK_COLORS[result.risk_level] || 'badge-medium'}>
                              {result.risk_level ?? 'N/A'} Risk
                            </span>
                          </div>

                          {/* Prediction & Confidence */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl ${STAGE_COLORS[result.prediction_class] || 'bg-slate-50'}`}>
                              <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">DR Stage</p>
                              <p className="font-heading text-lg font-bold">{result.prediction_class}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5">
                              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">Confidence</p>
                              <p className="font-heading text-lg font-bold text-primary">
                                {result.confidence?.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Severity Progression Bar */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                              <span>No DR</span>
                              <span>Mild</span>
                              <span>Moderate</span>
                              <span>Severe</span>
                              <span>Proliferative</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: PROGRESS_WIDTH[stageIdx] }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className={`h-full rounded-full ${PROGRESS_COLOR[stageIdx]}`}
                              />
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              {[0, 1, 2, 3, 4].map((idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full mx-auto ${idx === stageIdx ? PROGRESS_COLOR[stageIdx] : 'bg-slate-200'}`} />
                              ))}
                            </div>
                          </div>

                          {/* Heatmap Comparison */}
                          {result.heatmap_path && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                  <ZoomIn className="w-4 h-4 text-primary" /> Grad-CAM Visualization
                                </h3>
                                <div className="flex gap-1">
                                  {['side-by-side', 'original', 'heatmap'].map((v) => (
                                    <button
                                      key={v}
                                      onClick={() => setHeatmapView(v)}
                                      className={`px-2 py-1 text-xs rounded-lg transition-all ${heatmapView === v
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                      {v === 'side-by-side' ? 'Both' : v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className={`grid gap-2 ${heatmapView === 'side-by-side' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {(heatmapView === 'original' || heatmapView === 'side-by-side') && (
                                  <div>
                                    <img src={preview} alt="Original scan" className="w-full rounded-xl object-cover" />
                                    <p className="text-xs text-center text-slate-400 mt-1">Original</p>
                                  </div>
                                )}
                                {(heatmapView === 'heatmap' || heatmapView === 'side-by-side') && (
                                  <div>
                                    <img
                                      src={`${BACKEND_URL}${result.heatmap_path}`}
                                      alt="Grad-CAM heatmap"
                                      className="w-full rounded-xl object-cover"
                                    />
                                    <p className="text-xs text-center text-slate-400 mt-1">Grad-CAM Heatmap</p>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-2 text-center">
                                Warm-colored regions indicate areas that most influenced the AI prediction.
                              </p>
                            </div>
                          )}

                          {/* Recommendation */}
                          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                              <FileText className="w-4 h-4" /> Clinical Recommendation
                            </h3>
                            <p className="text-blue-700 text-sm leading-relaxed">{result.recommendation}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3">
                            {result.report_path && (
                              <button
                                onClick={handleDownloadPdf}
                                disabled={downloadingPdf}
                                className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center"
                              >
                                {downloadingPdf
                                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <Download className="w-4 h-4" />}
                                {downloadingPdf ? 'Downloading...' : 'Download PDF Report'}
                              </button>
                            )}
                            <button
                              onClick={() => navigate('/dashboard')}
                              className="btn-secondary flex items-center gap-2 text-sm flex-1 justify-center"
                            >
                              <LayoutDashboard className="w-4 h-4" /> View Dashboard
                            </button>
                          </div>

                          {/* Low confidence warning */}
                          {result.confidence < 70 && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-sm">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              Low confidence prediction. Please retake the scan with a clearer image or consult a specialist.
                            </div>
                          )}

                          <DisclaimerBanner compact />
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </motion.div>

              </div>
            </div>
          ) : (
            // Not logged in: Show CTA
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
              <motion.span
                initial={{ opacity: 0, letterSpacing: '0.3em' }}
                whileInView={{ opacity: 1, letterSpacing: '0.2em' }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="text-primary font-semibold text-sm uppercase tracking-widest inline-block"
              >
                Get Started
              </motion.span>
              <h2 className="font-heading text-4xl text-slate-800 mt-3 mb-4">
                <WordReveal text="Ready to Analyze Your Scan?" stagger={0.09} />
              </h2>
              <p className="text-slate-500 mb-8 max-w-lg mx-auto">
                Register for a free account, upload your retinal fundus image, and receive an AI-powered screening report with clinical recommendations.
              </p>
              <DisclaimerBanner />
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="btn-secondary inline-flex items-center gap-2 text-base px-8 py-4">
                  Sign In to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-bgColor">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.span
              initial={{ opacity: 0, letterSpacing: '0.4em' }}
              whileInView={{ opacity: 1, letterSpacing: '0.2em' }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-primary font-semibold text-sm uppercase tracking-widest inline-block"
            >
              FAQ
            </motion.span>
            <h2 className="font-heading text-4xl text-slate-800 mt-3 mb-4">
              <WordReveal text="Frequently Asked Questions" stagger={0.1} />
            </h2>
          </motion.div>
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="flex flex-col gap-3"
          >
            {FAQS.map((item) => <FAQItem key={item.q} {...item} />)}
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading font-bold text-xl">AcuSight AI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                AI-powered diabetic retinopathy screening platform. Built for early detection, designed for clinical safety.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-semibold text-slate-300 mb-4">Quick Links</p>
              <div className="flex flex-col gap-2">
                {['About', 'How It Works', 'FAQ', 'Login', 'Register'].map((l) => (
                  <span key={l} className="text-slate-400 text-sm hover:text-secondary transition-colors cursor-pointer">{l}</span>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="font-semibold text-slate-300 mb-4">Legal & Safety</p>
              <div className="flex flex-col gap-2 text-slate-400 text-sm">
                <span className="hover:text-secondary cursor-pointer">Privacy Policy</span>
                <span className="hover:text-secondary cursor-pointer">Terms of Service</span>
                <span className="hover:text-secondary cursor-pointer">Medical Disclaimer</span>
                <span className="hover:text-secondary cursor-pointer">Contact Support</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            <p className="mb-2 text-amber-400 text-xs">
              ⚠️ This AI tool is for screening assistance only and does not replace professional medical diagnosis.
            </p>
            <p>© {new Date().getFullYear()} AcuSight AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}