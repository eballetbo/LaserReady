import React, { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    Star, Heart, Cloud, Sun, Moon, Zap,
    Music, Camera, Video, Mic,
    Coffee, Utensils, ShoppingCart, Gift,
    Umbrella, Anchor, Flag, MapPin,
    Home, User, Settings, Search,
    ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
    Check, X, Plus, Minus,
    AlertCircle, Info, HelpCircle,
    Facebook, Twitter, Instagram, Linkedin,
    Github, Chrome, Globe, Wifi
} from 'lucide-react';
import { useLanguage } from '../contexts/language';

// Organize icons into categories
const LUCIDE_ICONS = {
    shapes: [
        { icon: Star, name: 'Star' },
        { icon: Heart, name: 'Heart' },
        { icon: Zap, name: 'Zap' },
    ],
    nature: [
        { icon: Cloud, name: 'Cloud' },
        { icon: Sun, name: 'Sun' },
        { icon: Moon, name: 'Moon' },
    ],
    media: [
        { icon: Music, name: 'Music' },
        { icon: Camera, name: 'Camera' },
        { icon: Video, name: 'Video' },
        { icon: Mic, name: 'Mic' },
    ],
    objects: [
        { icon: Coffee, name: 'Coffee' },
        { icon: Utensils, name: 'Utensils' },
        { icon: ShoppingCart, name: 'Cart' },
        { icon: Gift, name: 'Gift' },
        { icon: Umbrella, name: 'Umbrella' },
        { icon: Anchor, name: 'Anchor' },
        { icon: Flag, name: 'Flag' },
        { icon: MapPin, name: 'Pin' },
        { icon: Home, name: 'Home' },
    ],
    ui: [
        { icon: User, name: 'User' },
        { icon: Settings, name: 'Settings' },
        { icon: Search, name: 'Search' },
        { icon: ArrowRight, name: 'Arrow R' },
        { icon: ArrowLeft, name: 'Arrow L' },
        { icon: ArrowUp, name: 'Arrow U' },
        { icon: ArrowDown, name: 'Arrow D' },
        { icon: Check, name: 'Check' },
        { icon: X, name: 'X' },
        { icon: Plus, name: 'Plus' },
        { icon: Minus, name: 'Minus' },
        { icon: AlertCircle, name: 'Alert' },
        { icon: Info, name: 'Info' },
        { icon: HelpCircle, name: 'Help' },
    ],
    brands: [
        { icon: Facebook, name: 'Facebook' },
        { icon: Twitter, name: 'Twitter' },
        { icon: Instagram, name: 'Instagram' },
        { icon: Linkedin, name: 'Linkedin' },
        { icon: Github, name: 'Github' },
        { icon: Chrome, name: 'Chrome' },
        { icon: Globe, name: 'Globe' },
        { icon: Wifi, name: 'Wifi' },
    ]
};

const LIBRARIES = {
    lucide: {
        name: 'Lucide Icons',
        categories: LUCIDE_ICONS
    }
};

export default function AssetLibrary({ theme }) {
    const { t } = useLanguage();
    const [selectedLibrary, setSelectedLibrary] = useState('lucide');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const currentLibrary = LIBRARIES[selectedLibrary];

    const categories = useMemo(() => {
        return ['all', ...Object.keys(currentLibrary.categories)];
    }, [currentLibrary]);

    const displayedIcons = useMemo(() => {
        if (selectedCategory === 'all') {
            return Object.values(currentLibrary.categories).flat();
        }
        return currentLibrary.categories[selectedCategory] || [];
    }, [currentLibrary, selectedCategory]);

    const handleDragStart = (e, IconComponent) => {
        // Render icon to SVG string
        const svgString = renderToStaticMarkup(
            <IconComponent
                size={100} // Default import size
                stroke="black"
                strokeWidth={2}
                fill="none"
            />
        );

        e.dataTransfer.setData('image/svg+xml', svgString);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className={`flex-1 flex flex-col overflow-hidden ${theme.panel}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                <div>
                    <h3 className={`font-bold ${theme.text}`}>{t('library') || 'Library'}</h3>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>
                        {t('dragAndDrop') || 'Drag & Drop icons to canvas'}
                    </p>
                </div>

                {/* Library Selector */}
                <div className="flex flex-col gap-1">
                    <label className={`text-[10px] uppercase font-bold ${theme.textMuted}`}>
                        {t('library') || 'Library'}
                    </label>
                    <select
                        value={selectedLibrary}
                        onChange={(e) => {
                            setSelectedLibrary(e.target.value);
                            setSelectedCategory('all');
                        }}
                        className={`w-full p-2 text-sm rounded border ${theme.border} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500`}
                    >
                        {Object.entries(LIBRARIES).map(([key, lib]) => (
                            <option key={key} value={key}>
                                {lib.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Category Selector */}
                <div className="flex flex-col gap-1">
                    <label className={`text-[10px] uppercase font-bold ${theme.textMuted}`}>
                        {t('category') || 'Category'}
                    </label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`w-full p-2 text-sm rounded border ${theme.border} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500`}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 gap-3">
                    {displayedIcons.map(({ icon: Icon, name }, index) => (
                        <div
                            key={`${selectedLibrary}-${selectedCategory}-${index}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, Icon)}
                            className={`
                                aspect-square flex flex-col items-center justify-center gap-2 
                                rounded-lg border ${theme.border} ${theme.buttonHover} 
                                cursor-grab active:cursor-grabbing transition-colors
                            `}
                            title={name}
                        >
                            <Icon size={24} className={theme.text} />
                            <span className={`text-[10px] ${theme.textMuted} truncate w-full text-center px-1`}>
                                {name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
