
import React from 'react';

// Import SVG source code directly via Vite's ?raw suffix
import rawNodeCorner from './icons/node-type-cusp-symbolic.svg?raw';
import rawNodeSmooth from './icons/node-type-smooth-symbolic.svg?raw';
import rawNodeSymmetric from './icons/node-type-symmetric-symbolic.svg?raw';
import rawSegmentLine from './icons/node-segment-line-symbolic.svg?raw';
import rawSegmentCurve from './icons/node-segment-curve-symbolic.svg?raw';
import rawNodeBreak from './icons/node-break-symbolic.svg?raw';
import rawNodeJoin from './icons/node-join-symbolic.svg?raw';
import rawDeleteNode from './icons/node-delete-symbolic.svg?raw';
import rawNodeAdd from './icons/node-add-symbolic.svg?raw';
import rawJoinSegment from './icons/node-join-segment-symbolic.svg?raw';
import rawDeleteSegment from './icons/node-delete-segment-symbolic.svg?raw';

// Common props interface
interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number | string;
    strokeWidth?: number | string;
}

// Generic component to render inline SVG
// This replaces hardcoded colors with 'currentColor' to allow Tailwind styling.
const InlineSvg: React.FC<{ content: string } & IconProps> = ({ content, size = 24, className = '', ...props }) => {
    // Numeric size handling
    const styleSize = typeof size === 'number' ? `${size}px` : size;

    // replace fill="black" or stroke="black" with "currentColor"
    // Also ensure width/height match the container if needed, but usually preserving viewBox is enough.
    // We strip width/height attrs from the root svg to let valid CSS control it.
    const processedContent = content
        .replace(/fill="black"/g, 'fill="currentColor"')
        .replace(/stroke="black"/g, 'stroke="currentColor"')
        .replace(/width="\d+"/, '')
        .replace(/height="\d+"/, '');

    return (
        <div
            {...props}
            className={`inline-flex items-center justify-center shrink-0 ${className}`}
            style={{
                width: styleSize,
                height: styleSize,
                ...props.style
            }}
            dangerouslySetInnerHTML={{ __html: processedContent }}
        />
    );
};

// Exported Components

export const IconNodeCorner: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeCorner} {...props} />
);

export const IconNodeSmooth: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeSmooth} {...props} />
);

export const IconNodeSymmetric: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeSymmetric} {...props} />
);

export const IconSegmentLine: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawSegmentLine} {...props} />
);

export const IconSegmentCurve: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawSegmentCurve} {...props} />
);

export const IconNodeBreak: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeBreak} {...props} />
);

export const IconNodeJoin: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeJoin} {...props} />
);


export const IconDeleteNode: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawDeleteNode} {...props} />
);

export const IconNodeAdd: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawNodeAdd} {...props} />
);

export const IconJoinSegment: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawJoinSegment} {...props} />
);

export const IconDeleteSegment: React.FC<IconProps> = (props) => (
    <InlineSvg content={rawDeleteSegment} {...props} />
);

