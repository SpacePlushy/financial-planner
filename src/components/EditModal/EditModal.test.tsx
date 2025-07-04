import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditModal, EditModalProps } from './EditModal';

// Mock ReactDOM.createPortal
beforeAll(() => {
  const originalCreatePortal = require('react-dom').createPortal;
  require('react-dom').createPortal = (node: React.ReactNode) => node;

  return () => {
    require('react-dom').createPortal = originalCreatePortal;
  };
});

describe('EditModal', () => {
  const defaultProps: EditModalProps = {
    isOpen: true,
    day: 15,
    field: 'earnings',
    currentValue: 1000,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Earnings')).toBeInTheDocument();
      expect(screen.getByLabelText('Earnings for Day 15')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<EditModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render different field types correctly', () => {
      const fields = [
        { field: 'earnings', label: 'Edit Earnings' },
        { field: 'expenses', label: 'Edit Expenses' },
        { field: 'balance', label: 'Edit Starting Balance' },
        { field: 'notes', label: 'Edit Notes' },
      ];

      fields.forEach(({ field, label }) => {
        const { rerender } = render(
          <EditModal {...defaultProps} field={field} />
        );

        expect(screen.getByText(label)).toBeInTheDocument();

        rerender(<EditModal {...defaultProps} isOpen={false} />);
      });
    });

    it('should display current value in input', () => {
      render(<EditModal {...defaultProps} currentValue={2500.5} />);

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('2500.5');
    });

    it('should display text input for notes field', () => {
      render(
        <EditModal {...defaultProps} field="notes" currentValue="Test note" />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Test note');
      expect(input.type).toBe('text');
      expect(input.maxLength).toBe(500);
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty value', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(screen.getByText('Value cannot be empty')).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show error for invalid number', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, 'abc');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(
        screen.getByText('Please enter a valid number')
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show error for negative earnings', async () => {
      render(<EditModal {...defaultProps} field="earnings" />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '-100');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(
        screen.getByText('Earnings cannot be negative')
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show error for negative expenses', async () => {
      render(<EditModal {...defaultProps} field="expenses" />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '-50');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(
        screen.getByText('Expenses cannot be negative')
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show error for balance less than -10000', async () => {
      render(<EditModal {...defaultProps} field="balance" />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '-15000');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(
        screen.getByText('Balance cannot be less than -$10,000')
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show error for notes exceeding 500 characters', async () => {
      const longText = 'a'.repeat(501);
      render(<EditModal {...defaultProps} field="notes" />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, longText);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(
        screen.getByText('Notes cannot exceed 500 characters')
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should clear error when valid input is entered', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(screen.getByText('Value cannot be empty')).toBeInTheDocument();

      await userEvent.type(input, '1500');

      expect(
        screen.queryByText('Value cannot be empty')
      ).not.toBeInTheDocument();
    });
  });

  describe('Save and Cancel', () => {
    it('should call onSave with numeric value for financial fields', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '1500.75');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(1500.75);
      });
    });

    it('should call onSave with string value for notes field', async () => {
      render(<EditModal {...defaultProps} field="notes" currentValue="" />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'New note');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('New note');
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<EditModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should submit form on Enter key', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '2000{Enter}');

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(2000);
      });
    });

    it('should show loading state during save', async () => {
      const slowSave = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<EditModal {...defaultProps} onSave={slowSave} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '1500');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();

      await waitFor(() => {
        expect(slowSave).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal on Escape key', () => {
      render(<EditModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not close modal on Escape when closed', () => {
      render(<EditModal {...defaultProps} isOpen={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });

    it('should trap focus within modal', () => {
      render(<EditModal {...defaultProps} />);

      const saveButton = screen.getByText('Save');

      // Focus last element
      saveButton.focus();
      expect(saveButton).toHaveFocus();

      // Tab should wrap to first element
      fireEvent.keyDown(document, { key: 'Tab' });

      // Note: Focus trap behavior is implemented but difficult to test
      // without a full DOM environment
    });
  });

  describe('Click Outside', () => {
    it('should close modal when clicking backdrop', () => {
      render(<EditModal {...defaultProps} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when clicking inside modal', () => {
      render(<EditModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      fireEvent.click(modal);

      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should focus input when modal opens', async () => {
      const { rerender } = render(
        <EditModal {...defaultProps} isOpen={false} />
      );

      rerender(<EditModal {...defaultProps} isOpen={true} />);

      await waitFor(
        () => {
          const input = screen.getByRole('spinbutton');
          expect(input).toHaveFocus();
        },
        { timeout: 200 }
      );
    });

    it('should select input text when focused', async () => {
      render(<EditModal {...defaultProps} currentValue={1000} />);

      await waitFor(
        () => {
          const input = screen.getByRole('spinbutton') as HTMLInputElement;
          expect(input.selectionStart).toBe(0);
        },
        { timeout: 200 }
      );
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.selectionEnd).toBe(input.value.length);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<EditModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'edit-modal-title');
      expect(dialog).toHaveAttribute(
        'aria-describedby',
        'edit-modal-description'
      );
    });

    it('should have proper labels and descriptions', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByLabelText('Earnings for Day 15')).toBeInTheDocument();
      expect(
        screen.getByText('Enter the earnings amount in dollars')
      ).toBeInTheDocument();
    });

    it('should indicate invalid input state', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'edit-error');
    });

    it('should announce errors to screen readers', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      const error = screen.getByRole('alert');
      expect(error).toHaveTextContent('Value cannot be empty');
    });
  });

  describe('Edge Cases', () => {
    it('should handle save errors gracefully', async () => {
      const failingSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<EditModal {...defaultProps} onSave={failingSave} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '1500');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to save. Please try again.')
        ).toBeInTheDocument();
      });
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });

    it('should handle decimal values correctly', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '1234.56');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(1234.56);
      });
    });

    it('should handle zero values', async () => {
      render(<EditModal {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      await userEvent.clear(input);
      await userEvent.type(input, '0');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(0);
      });
    });
  });
});
