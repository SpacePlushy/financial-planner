import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './EditModal.module.css';

export interface EditModalProps {
  isOpen: boolean;
  day: number;
  field: string;
  currentValue: string | number;
  onSave: (value: string | number) => void;
  onCancel: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  day,
  field,
  currentValue,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

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

      if (field === 'notes') {
        // Text validation for notes
        if (inputValue.length > 500) {
          setError('Notes cannot exceed 500 characters');
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

        if (field === 'balance' && numValue < -10000) {
          setError('Balance cannot be less than -$10,000');
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

    setIsLoading(true);
    try {
      // Convert to number for financial fields
      const finalValue = field === 'notes' ? value : parseFloat(value);
      await onSave(finalValue);
    } catch (err) {
      setError('Failed to save. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
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
      case 'earnings':
        return 'Earnings';
      case 'expenses':
        return 'Expenses';
      case 'balance':
        return 'Starting Balance';
      case 'notes':
        return 'Notes';
      default:
        return field.charAt(0).toUpperCase() + field.slice(1);
    }
  };

  // Get input type and attributes
  const getInputAttributes = () => {
    if (field === 'notes') {
      return {
        type: 'text',
        maxLength: 500,
      };
    }
    return {
      type: 'number',
      step: '0.01',
      min: field === 'balance' ? '-10000' : '0',
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
        <div className={styles.header}>
          <h2 id="edit-modal-title">Edit {getFieldLabel()}</h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close modal"
            disabled={isLoading}
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
              {field === 'notes'
                ? 'Enter notes for this day (max 500 characters)'
                : `Enter the ${getFieldLabel().toLowerCase()} amount in dollars`}
            </p>
            <input
              id="edit-input"
              ref={inputRef}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              value={value}
              onChange={handleInputChange}
              disabled={isLoading}
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
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isLoading || !!error}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditModal;
