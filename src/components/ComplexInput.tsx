import React, { useCallback, useState } from 'react';
import { ComplexNumber } from '../types';

interface ComplexInputProps {
  value: ComplexNumber;
  onChange: (value: ComplexNumber) => void;
  placeholder?: string;
  className?: string;
}

export const ComplexInput: React.FC<ComplexInputProps> = ({
  value,
  onChange,
  placeholder = '0 + 0i',
  className = ''
}) => {
  const [text, setText] = useState(() => formatComplex(value));
  
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newText = event.target.value;
    setText(newText);
    
    // Try to parse the complex number
    const parsed = parseComplex(newText);
    if (parsed) {
      onChange(parsed);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // On blur, reformat the input to canonical form
    setText(formatComplex(value));
  }, [value]);

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`complex-input ${className}`}
    />
  );
};

function formatComplex(z: ComplexNumber): string {
  const real = z.real.toFixed(2).replace(/\.?0+$/, '');
  const imag = Math.abs(z.imag).toFixed(2).replace(/\.?0+$/, '');
  const sign = z.imag >= 0 ? '+' : '-';
  
  if (z.imag === 0) return real;
  if (z.real === 0) return `${sign}${imag}i`;
  return `${real} ${sign} ${imag}i`;
}

function parseComplex(text: string): ComplexNumber | null {
  // Remove spaces and make lowercase
  text = text.replace(/\s+/g, '').toLowerCase();
  
  // Try different formats:
  // a+bi, a-bi, bi, -bi, a
  const patterns = [
    /^(-?\d*\.?\d*)([+-])(\d*\.?\d*)i$/, // a+bi or a-bi
    /^([+-]?\d*\.?\d*)i$/, // bi or -bi
    /^(-?\d*\.?\d*)$/ // a
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        // a+bi format
        const real = parseFloat(match[1] || '0');
        const imag = parseFloat((match[2] === '+' ? '' : '-') + (match[3] || '1'));
        return { real, imag };
      } else if (match.length === 2) {
        if (text.endsWith('i')) {
          // bi format
          const imag = parseFloat(match[1] || '1');
          return { real: 0, imag };
        } else {
          // a format
          const real = parseFloat(match[1]);
          return { real, imag: 0 };
        }
      }
    }
  }
  
  return null;
} 