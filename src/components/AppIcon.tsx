import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeIconUrl } from '../utils/themeAssets';

type AppIconProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'>;

const AppIcon: React.FC<AppIconProps> = (props) => {
  const { themeColor } = useTheme();
  return <img {...props} src={getThemeIconUrl(themeColor)} />;
};

export default AppIcon;
