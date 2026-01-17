export interface LaserMode {
    id: string;
    label: string;
    color: string;
    strokeWidth: number;
    fill: string;
}

export interface LaserModes {
    CUT: LaserMode;
    SCORE: LaserMode;
    ENGRAVE: LaserMode;
    [key: string]: LaserMode;
}

export const LASER_MODES: LaserModes = {
    CUT: {
        id: 'cut',
        label: 'Tallar',
        color: '#FF0000',
        strokeWidth: 1, // 1px for visibility
        fill: 'transparent'
    },
    SCORE: {
        id: 'score',
        label: 'Marcar',
        color: '#0000FF',
        strokeWidth: 1, // 1px
        fill: 'transparent'
    },
    ENGRAVE: {
        id: 'engrave',
        label: 'Gravar',
        color: '#000000',
        strokeWidth: 0,
        fill: '#000000'
    }
};
