import type { PackageManagerType, OperationProgress } from '@npvm/shared';
import { create } from 'zustand';

interface AppState {
  currentPm: PackageManagerType;
  projectPath: string;
  currentRegistry: string;
  isDarkMode: boolean;
  isGlobal: boolean;
  currentOperation: OperationProgress | null;
  terminalLogs: string[];
  sidebarCollapsed: boolean;

  setCurrentPm: (pm: PackageManagerType) => void;
  setProjectPath: (path: string) => void;
  setCurrentRegistry: (url: string) => void;
  toggleDarkMode: () => void;
  setIsGlobal: (isGlobal: boolean) => void;
  setCurrentOperation: (op: OperationProgress | null) => void;
  addTerminalLog: (log: string) => void;
  clearTerminalLogs: () => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPm: 'npm',
  projectPath: '.',
  currentRegistry: 'https://registry.npmjs.org/',
  isDarkMode: typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  isGlobal: true,
  currentOperation: null,
  terminalLogs: [],
  sidebarCollapsed: false,

  setCurrentPm: (pm) => set({ currentPm: pm }),
  setProjectPath: (path) => set({ projectPath: path, isGlobal: false }),
  setCurrentRegistry: (url) => set({ currentRegistry: url }),
  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.isDarkMode;
      document.documentElement.classList.toggle('dark', newMode);
      return { isDarkMode: newMode };
    }),
  setIsGlobal: (isGlobal) => set({ isGlobal }),
  setCurrentOperation: (op) => set({ currentOperation: op }),
  addTerminalLog: (log) =>
    set((state) => ({ terminalLogs: [...state.terminalLogs, log] })),
  clearTerminalLogs: () => set({ terminalLogs: [] }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
