'use client';

import React from 'react';

type CustomInputProps = {
  label: string;
  error?: string;
} & React.ComponentPropsWithRef<'input'>;

function CustomInput({ label, error, id, className = '', ...props }: CustomInputProps) {
  const inputId = id ?? props.name;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default CustomInput;
