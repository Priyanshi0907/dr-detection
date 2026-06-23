import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Activity, Clock, Download, Trash2, TrendingUp,
  TrendingDown, Minus, Zap, User, AlertCircle
} from 'lucide-react';
import { predictionAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { TypeWriter, WordReveal } from '../components/AnimatedText';

const DR_STAGES = ['No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'];
const DR_INDEX = Object.fromEntries(DR_STAGES.map((s, i) => [s, i]));

const RISK_COLORS = {
  Low: 'badge-low', Medium: 'badge-medium',
  High: 'badge-high', Critical: 'badge-critical',
};

const STAGE_DOT_COLORS = [
  'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-red-800',
];
const STAGE_TEXT_COLORS = [
  'text-green-700', 'text-yellow-700', 'text-orange-700', 'text-red-700', 'text-red-900',
];
const STAGE_BG = [
  'bg-green-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50', 'bg-red-100',
];

function ProgressionChart({ history }) {
  if (!history || history.length < 2) return null;

  const sorted = [...history].reverse(); // oldest first
  const W = 600, H = 260, PAD = 40, BOTTOM_PAD = 70;
  const innerW = W - PAD * 2;
  const innerH = H - PAD - BOTTOM_PAD;
  const n = sorted.length;

  const points = sorted.map((p, i) => ({
    x: PAD + (i / Math.max(n - 1, 1)) * innerW,
    y: PAD + (1 - DR_INDEX[p.prediction_class] / 4) * innerH,
    label: p.prediction_class,
    date: new Date(p.scan_date).toLocaleDateString(),
    confidence: p.confidence,
    idx: DR_INDEX[p.prediction_class],
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Trend detection
  const firstIdx = DR_INDEX[sorted[0]?.prediction_class] ?? 0;
  const lastIdx = DR_INDEX[sorted[sorted.length - 1]?.prediction_class] ?? 0;
  const trend = lastIdx > firstIdx ? 'worsening' : lastIdx < firstIdx ? 'improving' : 'stable';
  const TrendIcon = trend === 'worsening' ? TrendingUp : trend === 'improving' ? TrendingDown : Minus;
  const trendColor = trend === 'worsening' ? 'text-red-500' : trend === 'improving' ? 'text-green-500' : 'text-slate-500';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> DR Progression Over Time
        </h3>
        <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
          {/* Grid lines */}
          {DR_STAGES.map((stage, i) => {
            const y = PAD + (1 - i / 4) * innerH;
            return (
              <g key={stage}>
                <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{stage.replace(' DR', '')}</text>
              </g>
            );
          })}

          {/* Gradient fill under line */}
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B7285" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0B7285" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <polygon
            points={`${PAD},${H - BOTTOM_PAD} ${polylinePoints} ${W - PAD},${H - BOTTOM_PAD}`}
            fill="url(#lineGrad)"
          />

          {/* Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#0B7285"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="#0B7285" />
              <circle cx={p.x} cy={p.y} r="3" fill="white" />
              {/* Date label */}
              {/* Only show every Nth label if there are too many to prevent overlap, but always show first and last */}
              {(n <= 12 || i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0) && (
                <text
                  x={p.x}
                  y={H - BOTTOM_PAD + 25}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
                  transform={`rotate(-45, ${p.x}, ${H - BOTTOM_PAD + 25})`}
                >
                  {p.date}
                </text>
              )}
              {/* Confidence tooltip on hover */}
              <title>{p.label} — {p.confidence?.toFixed(1)}% — {p.date}</title>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-xs text-slate-400 mt-2 text-center">
        Each point represents a scan. Y-axis shows DR severity (lower = healthier).
      </p>
    </div>
  );
}

function ScanRow({ scan, onDelete, onDownload }) {
  const idx = DR_INDEX[scan.prediction_class] ?? 0;
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const BACKEND_URL = 'http://localhost:8000';

  const handleDelete = async () => {
    if (!confirm('Delete this scan record and associated files?')) return;
    setDeleting(true);
    try { await onDelete(scan.id); } finally { setDeleting(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try { await onDownload(scan.id); } finally { setDownloading(false); }
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
    >
      {/* Date */}
      <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">
        {new Date(scan.scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        <br />
        <span className="text-xs text-slate-400">
          {new Date(scan.scan_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </td>

      {/* Thumbnail */}
      <td className="py-3 px-4">
        {scan.image_path ? (
          <img
            src={`${BACKEND_URL}${scan.image_path}`}
            alt="scan"
            className="w-12 h-12 rounded-xl object-cover border border-slate-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <Eye className="w-5 h-5 text-slate-300" />
          </div>
        )}
      </td>

      {/* Prediction */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${STAGE_DOT_COLORS[idx]}`} />
          <span className={`font-medium text-sm ${STAGE_TEXT_COLORS[idx]}`}>
            {scan.prediction_class}
          </span>
        </div>
      </td>

      {/* Confidence */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${scan.confidence?.toFixed(0)}%` }}
            />
          </div>
          <span className="text-sm text-slate-700 font-medium">{scan.confidence?.toFixed(1)}%</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {scan.report_path && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download PDF"
              className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all"
            >
              {downloading
                ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete record"
            className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all"
          >
            {deleting
              ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await predictionAPI.getStats();
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleDelete = async (id) => {
    await predictionAPI.deleteRecord(id);
    await fetchStats();
  };

  const handleDownload = async (id) => {
    try {
      const res = await predictionAPI.getReport(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AcuSight_Report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download report.');
    }
  };

  const latest = stats?.latest_prediction;
  const latestIdx = latest ? (DR_INDEX[latest.prediction_class] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-bgColor">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-800">
              <TypeWriter
                text={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'} 👋`}
                speed={45}
                delay={200}
              />
            </h1>
            <p className="text-slate-500 mt-1">
              <WordReveal
                text="Monitor your retinal health and view scan history"
                stagger={0.04}
              />
            </p>
          </div>
          <button
            onClick={() => navigate('/scan')}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" /> New Scan
          </button>
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Scans',
                  value: stats?.total_scans ?? 0,
                  display: <motion.span
                    key={stats?.total_scans}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="text-2xl font-bold text-slate-800 truncate block"
                  >{stats?.total_scans ?? 0}</motion.span>,
                  icon: Eye,
                  color: 'from-primary to-teal-600',
                },
                {
                  label: 'Latest DR Stage',
                  value: latest?.prediction_class ?? '—',
                  icon: Activity,
                  colorRaw: latestIdx >= 3 ? 'from-red-500 to-red-600' : latestIdx >= 2 ? 'from-orange-500 to-orange-600' : 'from-green-500 to-green-600',
                },
                {
                  label: 'Confidence',
                  value: latest ? `${latest.confidence?.toFixed(1)}%` : '—',
                  icon: TrendingUp,
                  color: 'from-blue-500 to-indigo-500',
                },
                {
                  label: 'Last Scan',
                  value: latest
                    ? new Date(latest.scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—',
                  icon: Clock,
                  color: 'from-purple-500 to-violet-600',
                },
              ].map(({ label, value, display, icon: Icon, color, colorRaw }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3 }}
                  className="card"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorRaw || color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {display ?? <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>}
                  <p className="text-sm text-slate-500 mt-0.5">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* Latest Scan Card */}
            {latest && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
              >
                <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Most Recent Prediction</h3>
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  <div className={`rounded-2xl p-5 ${STAGE_BG[latestIdx]}`}>
                    <p className="text-xs uppercase tracking-widest font-semibold opacity-60 mb-2">Diagnosis</p>
                    <p className={`font-heading text-2xl font-bold ${STAGE_TEXT_COLORS[latestIdx]}`}>
                      {latest.prediction_class}
                    </p>
                    <span className={`${RISK_COLORS[latest.risk_level] || 'badge-medium'} mt-2 inline-flex`}>
                      {latest.risk_level} Risk
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Confidence Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full confidence-bar-fill"
                            style={{ width: `${latest.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-primary">{latest.confidence?.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Scan Date</p>
                      <p className="text-sm font-medium text-slate-700">
                        {new Date(latest.scan_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" /> Recommendation
                    </p>
                    <p className="text-blue-600 text-sm leading-relaxed">{latest.recommendation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Progression Chart */}
            {stats?.history?.length >= 2 && <ProgressionChart history={stats.history} />}

            {/* History Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-slate-800">
                  Scan History ({stats?.total_scans ?? 0})
                </h3>
              </div>

              {!stats?.history?.length ? (
                <div className="text-center py-12 text-slate-400">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No scans yet. Upload your first retinal image to get started.</p>
                  <button
                    onClick={() => navigate('/scan')}
                    className="btn-primary mt-4 inline-flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Analyze Now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                        <th className="text-left py-2 px-4">Date</th>
                        <th className="text-left py-2 px-4">Image</th>
                        <th className="text-left py-2 px-4">Prediction</th>
                        <th className="text-left py-2 px-4">Confidence</th>
                        <th className="text-left py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.map((scan) => (
                        <ScanRow
                          key={scan.id}
                          scan={scan}
                          onDelete={handleDelete}
                          onDownload={handleDownload}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            <DisclaimerBanner />
          </div>
        )}
      </div>
    </div>
  );
}
