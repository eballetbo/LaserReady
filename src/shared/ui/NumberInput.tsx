import React from 'react';

interface Theme {
    text: string;
    inputBg?: string;
    inputBorder?: string;
    [key: string]: string | undefined;
}

interface NumberInputProps {
    label: string;
    value: number | string;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    theme: Theme;
    className?: string;
    step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    label,
    value,
    onChange,
    min,
    max,
    theme,
    className = '',
    step
}) => {
    return (
        <div className={className}>
            <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                step={step}
                className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
            />
        </div>
    );
};
