import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  Wifi,
  WifiOff,
  QrCode,
  RotateCcw,
  UserCircle,
  MessageSquare,
  FolderKanban,
  ListTree,
  FileText
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { connectionState } = useApp();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: ListTree },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Contacts', href: '/contacts', icon: UserCircle },
    { name: 'Context', href: '/context', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const getConnectionIcon = () => {
    switch (connectionState.status) {
      case 'CONNECTED':
        return <Wifi className="h-4 w-4 text-success-600" />;
      case 'QR_REQUIRED':
        return <QrCode className="h-4 w-4 text-warning-600" />;
      case 'CONNECTING':
      case 'RECONNECTING':
        return <RotateCcw className="h-4 w-4 text-primary-600 animate-spin" />;
      case 'BROWSER_MODE':
        return <Wifi className="h-4 w-4 text-blue-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-error-600" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionState.status) {
      case 'CONNECTED':
        return 'Connected';
      case 'QR_REQUIRED':
        return 'QR Required';
      case 'CONNECTING':
        return 'Connecting...';
      case 'RECONNECTING':
        return 'Reconnecting...';
      case 'BROWSER_MODE':
        return 'Browser Mode';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-40 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Statuz</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* WhatsApp Connection Status */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <span className="text-sm font-medium text-gray-700">
                {getConnectionText()}
              </span>
            </div>
            {connectionState.error && (
              <p className="text-xs text-error-600 mt-1">{connectionState.error}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-gray-500">
              Statuz v2.5.9
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b lg:hidden">
          <div className="px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  );
}