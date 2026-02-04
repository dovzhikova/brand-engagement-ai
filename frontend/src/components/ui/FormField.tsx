import { forwardRef, ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

export interface FormFieldBaseProps {
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  id?: string;
  htmlFor?: string; // Alias for id
  children?: ReactNode;
}

// Wrapper component
export function FormField({
  label,
  helpText,
  error,
  required,
  className = '',
  id,
  htmlFor,
  children,
}: FormFieldBaseProps) {
  const forId = htmlFor || id;
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={forId} className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p className="form-help flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          {helpText}
        </p>
      )}
      {error && (
        <p className="form-error flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Input component
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>, Omit<FormFieldBaseProps, 'children'> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helpText, error, required, className = '', id, htmlFor, ...props }, ref) => {
    const inputId = id || htmlFor || props.name;

    return (
      <FormField
        label={label}
        helpText={helpText}
        error={error}
        required={required}
        className={className}
        id={inputId}
      >
        <input
          ref={ref}
          id={inputId}
          className={`input ${error ? 'input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined
          }
          required={required}
          {...props}
        />
      </FormField>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'>, Omit<FormFieldBaseProps, 'children'> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helpText, error, required, className = '', id, htmlFor, ...props }, ref) => {
    const textareaId = id || htmlFor || props.name;

    return (
      <FormField
        label={label}
        helpText={helpText}
        error={error}
        required={required}
        className={className}
        id={textareaId}
      >
        <textarea
          ref={ref}
          id={textareaId}
          className={`input min-h-[100px] ${error ? 'input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined
          }
          required={required}
          {...props}
        />
      </FormField>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select component
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>, Omit<FormFieldBaseProps, 'children'> {
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helpText,
      error,
      required,
      className = '',
      id,
      htmlFor,
      options,
      placeholder,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || htmlFor || props.name;

    return (
      <FormField
        label={label}
        helpText={helpText}
        error={error}
        required={required}
        className={className}
        id={selectId}
      >
        <select
          ref={ref}
          id={selectId}
          className={`input ${error ? 'input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined
          }
          required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  }
);

Select.displayName = 'Select';

// Checkbox component
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  helpText?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helpText, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
          aria-invalid={!!error}
          {...props}
        />
        <div className="flex-1">
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {label}
          </label>
          {helpText && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {helpText}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio Group component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps extends FormFieldBaseProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  label,
  helpText,
  error,
  required,
  className = '',
  name,
  options,
  value,
  onChange,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <FormField
      label={label}
      helpText={helpText}
      error={error}
      required={required}
      className={className}
    >
      <div
        className={`${
          orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'
        } mt-2`}
        role="radiogroup"
        aria-labelledby={label ? `${name}-label` : undefined}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 cursor-pointer ${
              option.disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={option.disabled}
              className="h-4 w-4 mt-0.5 border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
              {option.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
    </FormField>
  );
}
