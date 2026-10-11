import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function TherapistLayout({ children }) {
  const { therapist, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data?.data?.notifications || []);
      setUnreadCount(res.data?.data?.unreadCount || 0);
    } catch (err) {
      // Silently ignore if unauthenticated or network hiccup
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.patch(`/api/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Practice Profile', path: '/dashboard/profile', icon: '👤' },
    { label: 'Availability', path: '/dashboard/availability', icon: '⏱️' },
    { label: 'Appointments', path: '/dashboard/appointments', icon: '📅' },
    { label: 'Clients & CRM', path: '/dashboard/clients', icon: '👥' },
    { label: 'Billing & Invoices', path: '/dashboard/billing', icon: '💳' },
    { label: 'Subscription & Plans', path: '/dashboard/subscription', icon: '💎' },
    { label: 'Practice Analytics', path: '/dashboard/analytics', icon: '📊' },
    { label: 'Messages', path: '/dashboard/messages', icon: '💬' },
  ];

  const getNotifIcon = (type) => {
    switch (type) {
      case 'session_booked':
        return '📅';
      case 'session_cancelled':
        return '❌';
      case 'intake_submitted':
        return '📝';
      case 'invoice_paid':
        return '💳';
      case 'message_received':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-surface-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-surface-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base">U</span>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-surface-900 block leading-tight">UNFAZED</span>
                <span className="text-[10px] font-semibold text-primary-600 tracking-wider uppercase">Therapist Hub</span>
              </div>
            </Link>

            {/* Notification Bell in Header */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-sm relative transition cursor-pointer"
                title="Notifications"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifMenu && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-surface-200 shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-surface-100 flex items-center justify-between bg-surface-50/60">
                    <span className="text-xs font-bold text-surface-900">
                      Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-surface-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-surface-400">
                        No recent notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                          className={`p-3 text-left transition flex items-start gap-2.5 cursor-pointer ${
                            n.isRead ? 'bg-white opacity-70 hover:opacity-100' : 'bg-primary-50/40 hover:bg-primary-50/70'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{getNotifIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-surface-900 truncate">{n.title}</p>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-surface-600 mt-0.5 break-words">{n.message}</p>
                            <span className="text-[10px] text-surface-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-surface-100 bg-surface-50 text-center">
                    <button
                      onClick={() => setShowNotifMenu(false)}
                      className="text-[11px] font-semibold text-surface-500 hover:text-surface-700 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick link to public website */}
          {therapist?.slug && (
            <div className="px-4 py-3 bg-primary-50/50 m-3 rounded-xl border border-primary-100/60">
              <p className="text-[11px] font-semibold text-primary-800 uppercase tracking-wider mb-1">
                Your Public Website
              </p>
              <a
                href={`/${therapist.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary-700 hover:text-primary-900 flex items-center gap-1 group break-all"
              >
                <span>/{therapist.slug}</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">↗</span>
              </a>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-surface-400 cursor-not-allowed opacity-60"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                        : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User bar & logout */}
        <div className="p-4 border-t border-surface-200 bg-surface-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary-200 text-primary-800 font-bold flex items-center justify-center text-sm shrink-0">
                {therapist?.name ? therapist.name.charAt(0) : 'D'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-surface-900 truncate">{therapist?.name}</p>
                <p className="text-[11px] text-surface-500 truncate">{therapist?.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition text-center cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
