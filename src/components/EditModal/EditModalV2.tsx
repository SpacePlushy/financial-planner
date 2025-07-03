import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useUI } from '../../context/UIContext';
import { useEdits } from '../../hooks/useEdits';
import { useSchedule } from '../../hooks/useSchedule';
import { Edit } from '../../types';
import styles from './EditModal.module.css';

/**
 * EditModal component that uses hooks directly instead of props
 */
export const EditModal: React.FC = () => {
  const ui = useUI();
  const { addEdit } = useEdits();
  const { currentSchedule } = useSchedule();

  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isOpen =
    ui.activeModal === 'edit' &&
    ui.selectedDay !== null &&
    ui.selectedField !== null;
  const day = ui.selectedDay || 0;
  const field = ui.selectedField || '';

  // Get current value
  const currentValue = React.useMemo(() => {
    if (!isOpen || !currentSchedule) return '';

    const dayData = currentSchedule.find(d => d.day === day);
    if (!dayData) return '';

    switch (field) {
      case 'shifts':
        return Array.isArray(dayData.shifts) ? dayData.shifts.join(', ') : '';
      case 'earnings':
        return dayData.earnings;
      case 'expenses':
        return dayData.expenses;
      case 'deposit':
        return dayData.deposit;
      default:
        return '';
    }
  }, [isOpen, currentSchedule, day, field]);

  // Initialize value when modal opens or currentValue changes
  useEffect(() => {
    if (isOpen) {
      setValue(String(currentValue));
      setError('');
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen, currentValue]);

  // Focus management
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus the input field when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }

    return () => {
      // Restore focus when modal closes
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        ui.closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, ui]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Validate input based on field type
  const validateInput = useCallback(
    (inputValue: string): boolean => {
      if (!inputValue.trim()) {
        setError('Value cannot be empty');
        return false;
      }

      if (field === 'shifts') {
        // Validate shifts format
        const shifts = inputValue
          .split(',')
          .map(s => s.trim())
          .filter(s => s);
        if (shifts.length === 0) {
          setError('Please enter at least one shift');
          return false;
        }
        if (shifts.some(s => s.length > 20)) {
          setError('Shift names cannot exceed 20 characters');
          return false;
        }
      } else {
        // Number validation for financial fields
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue)) {
          setError('Please enter a valid number');
          return false;
        }

        if (field === 'expenses' && numValue < 0) {
          setError('Expenses cannot be negative');
          return false;
        }

        if (field === 'earnings' && numValue < 0) {
          setError('Earnings cannot be negative');
          return false;
        }

        if (field === 'deposit' && numValue < 0) {
          setError('Deposit cannot be negative');
          return false;
        }
      }

      setError('');
      return true;
    },
    [field]
  );

  // Handle save
  const handleSave = async () => {
    if (!validateInput(value)) {
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      try {
        // Convert value based on field type
        let finalValue: any;
        if (field === 'shifts') {
          finalValue = value
            .split(',')
            .map(s => s.trim())
            .filter(s => s);
        } else {
          finalValue = parseFloat(value);
        }

        // Apply the edit
        addEdit({
          day,
          field: field as Edit['field'],
          originalValue: currentValue,
          newValue: finalValue,
        });
        ui.closeModal();
      } catch (err) {
        setError('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, 100);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSaving) {
      ui.closeModal();
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) {
      validateInput(e.target.value);
    }
  };

  // Get field label
  const getFieldLabel = () => {
    switch (field) {
      case 'shifts':
        return 'Shifts';
      case 'earnings':
        return 'Earnings';
      case 'expenses':
        return 'Expenses';
      case 'deposit':
        return 'Deposit';
      default:
        return field.charAt(0).toUpperCase() + field.slice(1);
    }
  };

  // Get input type and attributes
  const getInputAttributes = () => {
    if (field === 'shifts') {
      return {
        type: 'text',
        placeholder: 'e.g., Morning, Afternoon',
      };
    }
    return {
      type: 'number',
      step: '0.01',
      min: '0',
    };
  };

  if (!isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      aria-describedby="edit-modal-description"
    >
      <div className={styles.modal} ref={modalRef}>
        {isSaving && <div className={styles.savingMessage}>Saving...</div>}
        <div className={styles.header}>
          <h2 id="edit-modal-title">Edit {getFieldLabel()}</h2>
          <button
            className={styles.closeButton}
            onClick={() => ui.closeModal()}
            aria-label="Close modal"
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-input" className={styles.label}>
              {getFieldLabel()} for Day {day}
            </label>
            <p id="edit-modal-description" className={styles.description}>
              {field === 'shifts'
                ? 'Enter shifts separated by commas'
                : `Enter the ${getFieldLabel().toLowerCase()} amount in dollars`}
            </p>
            <input
              id="edit-input"
              ref={inputRef}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              value={value}
              onChange={handleInputChange}
              disabled={isSaving}
              aria-invalid={!!error}
              aria-describedby={error ? 'edit-error' : undefined}
              {...getInputAttributes()}
            />
            {error && (
              <div id="edit-error" className={styles.error} role="alert">
                {error}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => ui.closeModal()}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSaving || !!error}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditModal;
