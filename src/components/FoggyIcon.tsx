import React from 'react';
import { cn } from '@/lib/utils';

const FoggyIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className)}
    {...props}
  >
    <path d="M2 10q5-3 10 0t10 0" />
    <path d="M2 14q5-3 10 0t10 0" />
    <path d="M2 18q5-3 10 0t10 0" />
  </svg>
);

export default FoggyIcon;
