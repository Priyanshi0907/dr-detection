import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Mail, Phone, Calendar, Users, LogOut, Save, CheckCircle, Settings, Sun, Moon, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other'];

export default function ProfileModal({ open, onClose }) {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isDeleting, setIsDeleting] = useState(false);
  const isDark = theme === 'dark';

  // Load profile from localStorage
  const loadProfile = () => {
    if (!user?.email) return {};
    try {
      const raw = localStorage.getItem(`profile_extra_${user.email}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  const [avatar, setAvatar] = useState(null);
  const [form, setForm] = useState({
    age: '',
    gender: 'Prefer not to say',
    phone: '',
  });

  useEffect(() => {
    if (open) {
      const extra = loadProfile();
      setForm({
        age:    extra.age    || '',
        gender: extra.gender || 'Prefer not to say',
        phone:  extra.phone  || '',
      });
      setAvatar(extra.avatar || null);
      setSaved(false);
      setActiveTab('profile');
    }
  }, [open]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: digitsOnly });
  };

  const handleSave = () => {
    const normalizedPhone = form.phone.replace(/\D/g, '').slice(0, 10);
    const extra = {
      age: form.age,
      gender: form.gender,
      phone: normalizedPhone,
      avatar,
    };
    if (user?.email) {
      localStorage.setItem(`profile_extra_${user.email}`, JSON.stringify(extra));
      window.dispatchEvent(new Event('storage'));
    }
    setForm({ ...form, phone: normalizedPhone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action is permanent and will delete all your data.")) {
      setIsDeleting(true);
      try {
        await deleteAccount();
        navigate('/');
        onClose();
      } catch (err) {
        console.error(err);
        alert("Failed to delete account. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b sticky top-0 z-10 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
            }`}>
              <h2 className={`font-heading text-xl font-bold flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <User className="w-5 h-5 text-primary" /> My Profile
              </h2>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex border-b px-6 flex-shrink-0 ${
              isDark ? 'border-slate-700' : 'border-slate-100'
            }`}>
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : isDark
                        ? 'border-transparent text-slate-400 hover:text-slate-200'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <div className="px-6 py-6 space-y-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ring-4 ring-white aspect-square">
                        {avatar ? (
                          <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white text-3xl font-bold font-heading">{initials}</span>
                        )}
                      </div>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-secondary transition-colors border-2 border-white"
                        title="Change photo"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-xs text-slate-400">Click the camera icon to upload a photo</p>
                  </div>

                  <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />

                  {/* Account Info */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      Account Info
                    </h3>

                    <div>
                      <label className={`text-sm font-medium mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <User className="w-3.5 h-3.5" /> Full Name
                      </label>
                      <div className={`input-field cursor-not-allowed flex items-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        {user?.name || '—'}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Mail className="w-3.5 h-3.5" /> Email Address
                      </label>
                      <div className={`input-field cursor-not-allowed flex items-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        {user?.email || '—'}
                      </div>
                    </div>
                  </div>

                  <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />

                  {/* Personal Details */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      Personal Details
                    </h3>

                    {/* Age */}
                    <div>
                      <label htmlFor="profile-age" className={`text-sm font-medium mb-1 block flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Calendar className="w-3.5 h-3.5" /> Age
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="profile-age"
                          type="number"
                          min="1"
                          max="120"
                          placeholder="Your age"
                          value={form.age}
                          onChange={(e) => setForm({ ...form, age: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="profile-gender" className={`text-sm font-medium mb-1 block flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Users className="w-3.5 h-3.5" /> Gender
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          id="profile-gender"
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="input-field appearance-none"
                        >
                          {GENDER_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="profile-phone" className={`text-sm font-medium mb-1 block flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Phone className="w-3.5 h-3.5" /> Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="profile-phone"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="Enter up to 10 digits"
                          value={form.phone}
                          onChange={handlePhoneChange}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === 'settings' && (
                <div className="px-6 py-6 space-y-6">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    Appearance
                  </h3>

                  {/* Theme toggle row */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-indigo-500/20' : 'bg-amber-100'
                      }`}>
                        {isDark
                          ? <Moon className="w-5 h-5 text-indigo-400" />
                          : <Sun className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {isDark ? 'Dark Mode' : 'Light Mode'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        </p>
                      </div>
                    </div>
                    <button
                      id="profile-theme-toggle"
                      onClick={toggleTheme}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                        isDark ? 'bg-indigo-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                          isDark ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Theme swatches */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => isDark && toggleTheme()}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        !isDark
                          ? 'border-primary shadow-md'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="w-full h-10 rounded-xl bg-white border border-slate-200 mb-2" />
                      <p className={`text-xs font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Light</p>
                      {!isDark && (
                        <div className="w-4 h-4 bg-primary rounded-full mx-auto mt-1 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => !isDark && toggleTheme()}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isDark
                          ? 'border-indigo-500 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-full h-10 rounded-xl bg-slate-900 mb-2" />
                      <p className={`text-xs font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Dark</p>
                      {isDark && (
                        <div className="w-4 h-4 bg-indigo-500 rounded-full mx-auto mt-1 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className={`flex-shrink-0 border-t px-6 py-4 flex flex-col gap-3 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
            }`}>
              {activeTab === 'profile' && (
                <motion.button
                  id="profile-save"
                  onClick={handleSave}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <AnimatePresence mode="wait">
                    {saved ? (
                      <motion.span
                        key="saved"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Saved!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="save"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save Changes
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}

              <button
                id="profile-logout"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-slate-700 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm font-semibold dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>

              <button
                id="profile-delete"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 text-white bg-red-600 rounded-xl px-4 py-2.5 hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 mt-1"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
