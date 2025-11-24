import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { basePalette } from './global';
import { hexToRgba, mixColors } from './colorUtils';

export type ThemeMode = 'dark';

export interface ThemeColors {
	primary: string;
	primarySoft: string;
	primaryMuted: string;
	primaryContrast: string;
	secondary: string;
	accent: string;
	background: string;
	backgroundSecondary: string;
	surface: string;
	surfaceElevated: string;
	overlay: string;
	text: string;
	textSecondary: string;
	textMuted: string;
	border: string;
	borderStrong: string;
	success: string;
	warning: string;
	error: string;
	info: string;
	shadow: string;
	focus: string;
	chip: string;
	chipDisabled: string;
	inputBackground: string;
}

export interface AppTheme {
	name: 'LUCA';
	mode: ThemeMode;
	colors: ThemeColors;
}

interface ThemeContextValue {
	theme: AppTheme;
}

const buildDarkColors = (): ThemeColors => {
	const shared = {
		primary: basePalette.primary,
		primarySoft: basePalette.primarySoft,
		primaryMuted: basePalette.primaryMuted,
		primaryContrast: basePalette.primaryContrast,
		secondary: basePalette.secondary,
		accent: basePalette.accentBlue,
		success: basePalette.success,
		warning: basePalette.warning,
		error: basePalette.error,
		info: basePalette.info,
	};

	return {
		...shared,
		background: basePalette.backgroundDark,
		backgroundSecondary: basePalette.backgroundMuted,
		surface: basePalette.surfaceDark,
		surfaceElevated: basePalette.surfaceSemiDark,
		overlay: hexToRgba('#000000', 0.5),
		text: basePalette.textOnDark,
		textSecondary: basePalette.textSecondaryOnDark,
		textMuted: hexToRgba(basePalette.textSecondaryOnDark, 0.65),
		border: basePalette.borderDark,
		borderStrong: mixColors(basePalette.borderDark, basePalette.primary, 0.4),
		shadow: basePalette.shadowDark,
		focus: hexToRgba(basePalette.secondary, 0.35),
		chip: hexToRgba(basePalette.primarySoft, 0.18),
		chipDisabled: hexToRgba(basePalette.textSecondaryOnDark, 0.25),
		inputBackground: basePalette.surfaceDark,
	};
};

const defaultTheme: AppTheme = {
	name: 'LUCA',
	mode: 'dark',
	colors: buildDarkColors(),
};

const ThemeContext = createContext<ThemeContextValue>({
	theme: defaultTheme,
});

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
	return React.createElement(ThemeContext.Provider, { value: { theme: defaultTheme } }, children);
};

export const useAppTheme = (): ThemeContextValue => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useAppTheme must be used within AppThemeProvider');
	}
	return context;
};
