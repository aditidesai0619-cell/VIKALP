import type { SVGProps } from "react";

// Task — Evidence workspace visual redesign. A small, hand-rolled
// stroke-icon set (24x24, currentColor, 1.75px stroke — a plain Lucide-
// like line style) instead of adding an icon library dependency
// (project convention: no new dependency unless required) and instead
// of emoji as the primary icon system (brief §15). Only the handful
// this page actually needs.
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function MountainIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 20 L9 7 L13 14 L16 10 L21 20 Z" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ArchiveClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v7a2 2 0 0 0 2 2h4" />
      <circle cx="16.5" cy="16.5" r="4.5" />
      <path d="M16.5 14.5v2l1.3 1.3" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function RoadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3 5 21" />
      <path d="M15 3l4 18" />
      <path d="M12 8v1.5" />
      <path d="M12 14v1.5" />
      <path d="M12 20v1.5" />
    </svg>
  );
}

export function CloudRainIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 16a4 4 0 1 1 1.3-7.8 5 5 0 0 1 9.5 2A3.5 3.5 0 0 1 17 16Z" />
      <path d="M9 19v1" />
      <path d="M13 19v1" />
      <path d="M17 19v1" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function MinusCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 8.2a3 3 0 1 1 0 6" />
      <path d="M15 14.3c2.1.4 3.8 1.9 4.2 4.7" />
    </svg>
  );
}

export function HeartPulseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20.5s-7.5-4.6-9.8-9.1C.6 7.9 2.4 4.5 5.8 4c2.1-.3 3.7.7 4.6 2 .9-1.3 2.5-2.3 4.6-2 3.4.5 5.2 3.9 3.6 7.4C19.5 15.9 12 20.5 12 20.5Z" />
      <path d="M6.5 11.5h2l1.3-2.3 1.8 4.1 1.2-1.8h2.7" />
    </svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 3 8l9 5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

// Decision Workspace redesign — three pathway glyphs, added to the
// existing hand-rolled icon set (same 24x24/currentColor/1.75px-stroke
// convention as every icon above) rather than pulling in a new icon
// library.
export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 5 6.2v5.4c0 4.4 3 7.6 7 9.1 4-1.5 7-4.7 7-9.1V6.2Z" />
      <path d="M9 12l2 2 4-4.2" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h10M17 6h3M4 12h3M10 12h10M4 18h13M20 18h0" />
      <circle cx="17" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}
