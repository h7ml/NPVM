import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal as TerminalIcon, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAppStore } from '../../stores/app';
import { clsx } from 'clsx';

export function Terminal() {
  const { t } = useTranslation();
  const { terminalLogs, currentOperation, clearTerminalLogs } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const hasActivity = currentOperation !== null || terminalLogs.length > 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'fixed bottom-4 right-4 p-3 rounded-full shadow-lg transition-colors z-50',
          hasActivity
            ? 'bg-primary-500 text-white animate-pulse'
            : 'bg-gray-800 text-white hover:bg-gray-700'
        )}
      >
        <TerminalIcon size={20} />
      </button>

      {isOpen && (
        <div
          className={clsx(
            'fixed bg-gray-900 text-gray-100 rounded-t-lg shadow-2xl z-40 transition-all',
            isMaximized
              ? 'inset-x-0 bottom-0 h-96'
              : 'right-4 bottom-16 w-[600px] h-72'
          )}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg">
            <div className="flex items-center gap-2">
              <TerminalIcon size={16} />
              <span className="text-sm font-medium">{t('terminal.title')}</span>
              {currentOperation && (
                <span className="text-xs text-primary-400 ml-2">
                  {currentOperation.message} ({currentOperation.progress}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearTerminalLogs}
                className="p-1 hover:bg-gray-700 rounded text-xs"
              >
                {t('common.clear')}
              </button>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 h-[calc(100%-40px)] overflow-y-auto font-mono text-sm scrollbar-thin">
            {terminalLogs.length === 0 ? (
              <span className="text-gray-500">{t('terminal.noOutput')}</span>
            ) : (
              terminalLogs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}

            {currentOperation && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${currentOperation.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
