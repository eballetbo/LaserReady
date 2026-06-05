export interface ThemeColors {
    bg: string;
    panel: string;
    border: string;
    text: string;
    textMuted: string;
    canvasWrapper: string;
    inputBg: string;
    inputBorder: string;
    buttonHover: string;
    iconColor: string;
    [key: string]: string;
}

export const THEMES: { dark: ThemeColors; light: ThemeColors } = {
    dark: {
        bg: 'bg-[#1a1a1a]',
        panel: 'bg-[#252525]',
        border: 'border-[#333]',
        text: 'text-gray-200',
        textMuted: 'text-gray-500',
        canvasWrapper: '#111111',
        inputBg: 'bg-gray-900',
        inputBorder: 'border-gray-700',
        buttonHover: 'hover:bg-gray-700',
        iconColor: 'text-gray-400',
    },
    light: {
        bg: 'bg-[#f3f4f6]',
        panel: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-800',
        textMuted: 'text-gray-400',
        canvasWrapper: '#e5e5e5',
        inputBg: 'bg-gray-50',
        inputBorder: 'border-gray-300',
        buttonHover: 'hover:bg-gray-100',
        iconColor: 'text-gray-600',
    }
};
