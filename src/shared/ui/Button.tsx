import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Theme {
    iconColor: string;
    buttonHover: string;
    border: string;
    panel: string;
    text?: string;
    inputBg?: string;
    inputBorder?: string;
    [key: string]: string | undefined;
}

interface ButtonProps {
    variant?: 'icon' | 'iconText' | 'primary';
    active?: boolean;
    icon?: LucideIcon;
    label: string;
    onClick: (e?: React.MouseEvent) => void;
    theme: Theme;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    title?: string;
    hasSubmenu?: boolean;
    submenuContent?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'icon',
    active = false,
    icon: Icon,
    label,
    onClick,
    theme,
    size = 'md',
    className = '',
    title,
    hasSubmenu = false,
    submenuContent
}) => {
    // Size classes
    const sizeClasses = {
        sm: 'w-8 h-8 p-1.5',
        md: 'w-12 h-12 p-2',
        lg: 'w-16 h-16 p-4'
    };

    // Variant-specific rendering
    if (variant === 'icon') {
        return (
            <div className="relative group/btn">
                <button
                    onClick={onClick}
                    title={title || label}
                    className={`${sizeClasses[size]} mb-2 rounded-lg transition-all flex justify-center items-center relative
                        ${active
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                            : `${theme.iconColor} ${theme.buttonHover} hover:text-red-500`
                        } ${className}`}
                >
                    {Icon && <Icon size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} />}
                    {hasSubmenu && (
                        <div className="absolute bottom-1 right-1">
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-t-[4px] border-t-current border-r-[4px] border-r-transparent transform rotate-[-45deg]" />
                        </div>
                    )}
                </button>
                {hasSubmenu && submenuContent && (
                    <div className="absolute left-full top-0 pl-2 hidden group-hover/btn:flex z-50">
                        <div className={`p-2 rounded-lg shadow-xl border ${theme.border} ${theme.panel} flex flex-col gap-2 min-w-[60px]`}>
                            {submenuContent}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (variant === 'iconText') {
        return (
            <button
                onClick={onClick}
                title={title || label}
                className={`p-2 rounded border ${theme.border} ${theme.buttonHover} flex flex-col items-center gap-1 ${className}`}
            >
                {Icon && <Icon size={20} />}
                <span className="text-xs">{label}</span>
            </button>
        );
    }

    if (variant === 'primary') {
        return (
            <button
                onClick={onClick}
                title={title || label}
                className={`w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors ${className}`}
            >
                {Icon && <Icon size={16} className="inline mr-2" />}
                {label}
            </button>
        );
    }

    return null;
};
