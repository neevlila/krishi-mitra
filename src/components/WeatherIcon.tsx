import React from 'react';
import {
  SunMedium, Moon, CloudSun, CloudMoon, Cloud, Cloudy,
  CloudRain, CloudDrizzle, CloudLightning, CloudSnow
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FoggyIcon from './FoggyIcon';

interface WeatherIconProps {
  iconCode: string;
  className?: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  '01d': CloudSun,
  '01n': CloudMoon,
  '02d': CloudSun,
  '02n': CloudMoon,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloudy,
  '04n': Cloudy,
  '09d': CloudRain,
  '09n': CloudRain,
  '10d': CloudDrizzle,
  '10n': CloudDrizzle,
  '11d': CloudLightning,
  '11n': CloudLightning,
  '13d': CloudSnow,
  '13n': CloudSnow,
  '50d': FoggyIcon,
  '50n': FoggyIcon,
};

const WeatherIcon = ({ iconCode, className }: WeatherIconProps) => {
  const IconComponent = iconMap[iconCode] || Cloud;

  return <IconComponent className={cn(className)} />;
};

export default WeatherIcon;
