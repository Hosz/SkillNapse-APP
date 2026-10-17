import { useContext } from 'react';
import { ThemeContext } from './theme-context-def';

export const useTheme = () => useContext(ThemeContext);
