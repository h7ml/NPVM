import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Terminal } from '../terminal/Terminal';
import { useAppStore } from '../../stores/app';
import { clsx } from 'clsx';

export function Layout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        className={clsx(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
        <Terminal />
      </div>
    </div>
  );
}
