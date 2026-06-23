import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Menu, X, LogOut, LayoutDashboard, Settings, Sun, Moon, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Refresh avatar when localStorage changes (after ProfileModal saves)
  useEffect(() => {
    const syncAvatar = () => {
      if (!user?.email) {
        setAvatar(null);
        return;
      }
      try {
        const extra = JSON.parse(localStorage.getItem(`profile_extra_${user.email}`) || '{}');
        setAvatar(extra.avatar || null);
      } catch { setAvatar(null); }
    };
    
    syncAvatar();
    window.addEventListener('storage', syncAvatar);
    if (!profileModalOpen) syncAvatar();
    return () => window.removeEventListener('storage', syncAvatar);
  }, [user?.email, profileModalOpen]);

  // Listen for global open-profile event
  useEffect(() => {
    const handleOpenProfile = () => setProfileModalOpen(true);
    window.addEventListener('open-profile', handleOpenProfile);
    return () => window.removeEventListener('open-profile', handleOpenProfile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navLinks = [
    { label: 'Home', id: 'home' },
    { label: 'About', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Detection', id: 'detection' },
    { label: 'FAQ', id: 'faq' },
  ];

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const isDark = theme === 'dark';

  return (
    <>
      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          user || scrolled
            ? isDark
              ? 'bg-slate-900/95 backdrop-blur-md shadow-md'
              : 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className={`font-heading font-bold text-xl text-primary`}>AcuSight AI</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  user || scrolled
                    ? isDark ? 'text-slate-300' : 'text-slate-600'
                    : 'text-white/90'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Dashboard link */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-secondary transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>

                {/* Profile Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="nav-profile-btn"
                    onClick={() => setProfileDropdownOpen((o) => !o)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:shadow-md ${
                      isDark
                        ? 'border-slate-600 hover:bg-slate-800'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar circle */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow overflow-hidden flex-shrink-0">
                      {avatar
                        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        : initials
                      }
                    </div>
                    <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                  </button>

                  {/* Dropdown Panel */}
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl border z-50 overflow-hidden ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                        }`}
                      >
                        {/* User info header */}
                        <div className={`px-4 pt-4 pb-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 overflow-hidden">
                              {avatar
                                ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                : initials
                              }
                            </div>
                            <div className="min-w-0">
                              <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {user?.name}
                              </p>
                              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {user?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-2">
                          {/* View Profile */}
                          <button
                            onClick={() => { setProfileDropdownOpen(false); setProfileModalOpen(true); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                              isDark
                                ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                            }`}
                          >
                            <User className="w-4 h-4 flex-shrink-0" />
                            View Profile
                          </button>

                          {/* Divider */}
                          <div className={`mx-4 my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />

                          {/* Settings header */}
                          <div className={`px-4 pt-2 pb-1 flex items-center gap-2`}>
                            <Settings className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              Settings
                            </span>
                          </div>

                          {/* Theme toggle */}
                          <div className={`mx-4 my-1 flex items-center justify-between px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                              {isDark ? (
                                <Moon className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Sun className="w-4 h-4 text-amber-500" />
                              )}
                              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {isDark ? 'Dark Mode' : 'Light Mode'}
                              </span>
                            </div>
                            {/* Toggle switch */}
                            <button
                              id="theme-toggle"
                              onClick={toggleTheme}
                              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                                isDark ? 'bg-indigo-500' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                                  isDark ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Divider */}
                          <div className={`mx-4 my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />

                          {/* Logout */}
                          <button
                            id="nav-logout-btn"
                            onClick={() => { logout(); navigate('/'); setProfileDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                              isDark
                                ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                                : 'text-red-500 hover:bg-red-50 hover:text-red-600'
                            }`}
                          >
                            <LogOut className="w-4 h-4 flex-shrink-0" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className={`text-sm font-semibold transition-colors hover:text-secondary ${scrolled ? 'text-primary' : 'text-white'}`}>
                  Login
                </Link>
                <Link to="/register" className="bg-white text-primary px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent transition-all shadow">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen
              ? <X className={`w-6 h-6 ${user || scrolled ? (isDark ? 'text-white' : 'text-slate-800') : 'text-white'}`} />
              : <Menu className={`w-6 h-6 ${user || scrolled ? (isDark ? 'text-white' : 'text-slate-800') : 'text-white'}`} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-t px-6 py-4 flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              {navLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} className={`text-left font-medium hover:text-primary ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {l.label}
                </button>
              ))}
              <div className="border-t pt-4 flex flex-col gap-3">
                {user ? (
                  <>
                    {/* User info row */}
                    <div className="flex items-center gap-3 pb-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {avatar
                          ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                          : initials
                        }
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.name}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                      </div>
                    </div>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="btn-primary text-center">Dashboard</Link>
                    <button
                      onClick={() => { setMobileOpen(false); setProfileModalOpen(true); }}
                      className="btn-secondary text-center"
                    >Profile</button>
                    {/* Theme toggle mobile */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                        <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <button
                      onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                      className="flex items-center justify-center gap-2 text-red-500 border border-red-200 rounded-xl px-4 py-2.5 hover:bg-red-50 transition-colors text-sm font-semibold"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary text-center">Login</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-center">Get Started</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
