import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Mail, AlertCircle, CheckCircle, KeyRound, Lock } from 'lucide-react';
import { authAPI } from '../api/client';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1 = email, 2 = reset with temp key
  const [email, setEmail] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [success, setSuccess] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setGeneratedKey(res.data.temp_password);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Email not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, temp_password: tempKey, new_password: newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Please check your verification key.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-teal-700 to-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-sm"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-slate-800 mb-2">Password Reset!</h2>
          <p className="text-slate-500 text-sm mb-6">Your password has been successfully updated.</p>
          <Link to="/login" className="btn-primary w-full block text-center">Sign In Now</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-teal-700 to-secondary flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-primary">AcuSight AI</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold text-slate-800">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {step === 1
              ? 'Enter your email to receive a temporary verification key'
              : 'Enter the verification key and choose a new password'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {step === 1 ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Sending...' : 'Get Verification Key'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {/* Show the temp key for dev/demo */}
            {generatedKey && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <p className="text-blue-700 font-semibold mb-1 flex items-center gap-1">
                  <KeyRound className="w-4 h-4" /> Your Verification Key
                </p>
                <code className="text-blue-800 font-mono text-base">{generatedKey}</code>
                <p className="text-blue-500 text-xs mt-1">Copy this key and paste it below</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Verification Key</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="ACUSIGHT-XXXXXXXX"
                  className="input-field pl-10 font-mono"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Remember it?{' '}
          <Link to="/login" className="text-primary font-semibold hover:text-secondary transition-colors">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
