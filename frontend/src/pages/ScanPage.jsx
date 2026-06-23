import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload, X, Eye, AlertCircle, CheckCircle2, Download,
  Brain, Activity, FileText, ZoomIn, LayoutDashboard, Home
} from 'lucide-react';
import { predictionAPI } from '../api/client';
import Navbar from '../components/Navbar';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { WordReveal, HighlightReveal } from '../components/AnimatedText';

const DR_STAGE_INDEX = {
  'No DR': 0, 'Mild DR': 1, 'Moderate DR': 2, 'Severe DR': 3, 'Proliferative DR': 4,
};

const RISK_COLORS = {
  Low: 'badge-low',
  Medium: 'badge-medium',
  High: 'badge-high',
  Critical: 'badge-critical',
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

export default function ScanPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isInvalidImage, setIsInvalidImage] = useState(false);
  const [heatmapView, setHeatmapView] = useState('side-by-side'); // 'side-by-side' | 'heatmap' | 'original'
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const BACKEND_URL = 'https://dr-detection-lhhi.onrender.com';

  const handleFileSelect = (selectedFile) => {
    setError('');
    setResult(null);
    setIsInvalidImage(false);
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
    setIsInvalidImage(false);
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await predictionAPI.predict(formData);
      setResult(res.data);
    } catch (err) {
      // Robustly extract the detail string from any error shape
      let detail = err.response?.data?.detail;
      // FastAPI Pydantic 422 errors return detail as an array
      if (Array.isArray(detail)) {
        detail = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
      }
      const msg = typeof detail === 'string' && detail.trim()
        ? detail
        : err.message || 'Analysis failed. Please try again or use a different image.';

      if (msg.toLowerCase().includes('valid retina image')) {
        setIsInvalidImage(true);
      } else {
        setError(msg);
      }
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
    setIsInvalidImage(false);
  };

  const stageIdx = result ? (DR_STAGE_INDEX[result.prediction_class] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-bgColor">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-4">
            <h1 className="font-heading text-3xl font-bold text-slate-800">
              <HighlightReveal color="#14B8A6">
                <WordReveal text="Retinal Scan Analysis" stagger={0.1} />
              </HighlightReveal>
            </h1>
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-slate-500 mt-1"
            >
              Upload a retinal fundus image for AI-powered DR screening
            </motion.p>
          </div>
          <DisclaimerBanner compact />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ── Left: Upload Panel ─────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="card h-full">
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload Retinal Image
              </h2>

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
                    id="file-upload-input"
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

              {/* Invalid Image Banner */}
              <AnimatePresence>
                {isInvalidImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.96, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 rounded-2xl overflow-hidden border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-100/60 border-b border-amber-200">
                      <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="font-semibold text-amber-900 text-sm">Invalid Image Detected</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-amber-800 font-medium text-sm">Please enter valid retina image</p>
                      <p className="text-amber-600 text-xs mt-1">
                        The uploaded file does not appear to be a retinal fundus photograph. Ensure you are uploading a clear, orange-toned fundus image with a dark circular border.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General Error */}
              <AnimatePresence>
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
              </AnimatePresence>

              {/* Analyze Button */}
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

              {/* Image quality checklist */}
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

          {/* ── Right: Results Panel ───────────────────────── */}
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

              {result && (
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
                            <img
                              src={preview}
                              alt="Original scan"
                              className="w-full rounded-xl object-cover"
                            />
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
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
