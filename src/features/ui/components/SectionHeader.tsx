import React from 'react';

interface SectionHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ children, className = '' }) => {
    return (
        <div className={`text-xs text-gray-500 uppercase font-bold mb-2 ${className}`}>
            {children}
        </div>
    );
};
