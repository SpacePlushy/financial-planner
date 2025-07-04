import { useEffect } from 'react';
import { useUI } from '../context/UIContext';
import { usePersistence } from './usePersistence';

interface KeyboardShortcuts {
  'ctrl+s': () => void;
  'ctrl+e': () => void;
  'ctrl+i': () => void;
  'ctrl+p': () => void;
  'ctrl+/': () => void;
  escape: () => void;
}

export const useKeyboardShortcuts = () => {
  const ui = useUI();
  const persistence = usePersistence();

  useEffect(() => {
    const shortcuts: KeyboardShortcuts = {
      'ctrl+s': () => {
        if (persistence.hasUnsavedChanges && !persistence.isSaving) {
          persistence.save();
        }
      },
      'ctrl+e': () => {
        if (!persistence.isExporting) {
          persistence.exportToFile();
        }
      },
      'ctrl+i': () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            persistence.importFromFile(file);
          }
        };
        input.click();
      },
      'ctrl+p': () => {
        window.print();
      },
      'ctrl+/': () => {
        window.open(
          'https://github.com/anthropics/financial-schedule-optimizer/wiki',
          '_blank'
        );
      },
      escape: () => {
        if (ui.activeModal) {
          ui.closeModal();
        }
      },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.key.toLowerCase()}`;

      if (key in shortcuts) {
        e.preventDefault();
        shortcuts[key as keyof KeyboardShortcuts]();
      }

      // Toggle theme with Alt+T
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        ui.toggleTheme();
      }

      // Toggle debug mode with Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ui.toggleDebugMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui, persistence]);
};
