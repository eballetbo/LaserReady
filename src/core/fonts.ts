import opentype from 'opentype.js';
import { notify } from './notifications';

const FALLBACK_FONT_PATH = '/fonts/Roboto.ttf';

const fontCache = new Map<string, opentype.Font>();

export const LOCAL_FONT_MAP: Record<string, string> = {
    'Roboto': '/fonts/Roboto.ttf',
    'Open Sans': '/fonts/OpenSans.ttf',
    'Lato': '/fonts/Lato.ttf',
    'Montserrat': '/fonts/Montserrat.ttf',
    'Poppins': '/fonts/Poppins.ttf',
    'Raleway': '/fonts/Raleway.ttf',
    'Nunito': '/fonts/Nunito.ttf',
    'Ubuntu': '/fonts/Ubuntu.ttf',
    'Noto Sans': '/fonts/NotoSans.ttf',
    'Oswald': '/fonts/Oswald.ttf',
    'Bebas Neue': '/fonts/BebasNeue.ttf',
    'Righteous': '/fonts/Righteous.ttf',
    'Black Ops One': '/fonts/BlackOpsOne.ttf',
    'Permanent Marker': '/fonts/PermanentMarker.ttf',
    'Bungee Shade': '/fonts/BungeeShade.ttf',
    'Playfair Display': '/fonts/PlayfairDisplay.ttf',
    'Merriweather': '/fonts/Merriweather.ttf',
    'Dancing Script': '/fonts/DancingScript.ttf',
    'Pacifico': '/fonts/Pacifico.ttf',
    'Great Vibes': '/fonts/GreatVibes.ttf',
    'Sacramento': '/fonts/Sacramento.ttf',
    'Lobster': '/fonts/Lobster.ttf',
    'PT Serif': '/fonts/PTSerif.ttf',
    'Bitter': '/fonts/Bitter.ttf',
    'Libre Baskerville': '/fonts/LibreBaskerville.ttf',
    'Roboto Mono': '/fonts/RobotoMono.ttf',
    'Source Code Pro': '/fonts/SourceCodePro.ttf',
    'Courier Prime': '/fonts/CourierPrime.ttf',
    'Verdana': '/fonts/Roboto.ttf',
};

/**
 * Loads and caches a local font via opentype.js, falling back to Roboto if loading fails.
 */
export async function loadFont(
    fontFamily: string,
    options: { notifyOnError?: boolean } = {}
): Promise<opentype.Font | null> {
    if (fontCache.has(fontFamily)) return fontCache.get(fontFamily)!;

    const url = LOCAL_FONT_MAP[fontFamily] || FALLBACK_FONT_PATH;
    try {
        const font = await opentype.load(url);
        fontCache.set(fontFamily, font);
        return font;
    } catch {
        if (options.notifyOnError) {
            notify(`Failed to load font "${fontFamily}" for conversion. Using fallback.`, 'error');
        }
        if (fontFamily !== 'Roboto') {
            return loadFont('Roboto', options);
        }
        return null;
    }
}
