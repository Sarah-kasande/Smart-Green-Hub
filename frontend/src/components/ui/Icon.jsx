// Simple line icons drawn on a 24x24 grid (no icon library).
// Every icon is decorative: the text label next to it carries the meaning (aria-hidden).
// Each entry is a list of SVG path "d" strings, or { c: [cx, cy, r] } for a circle.
const ICONS = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  sprout: ['M12 21v-9', 'M12 12C12 7.5 8.5 4.5 4 4.5c0 4.5 3.5 7.5 8 7.5z', 'M12 14c0-4 3-6.5 8-6.5 0 4-3 6.5-8 6.5z'],
  wallet: ['M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 7l12-4v4', 'M16 14h2'],
  bell: ['M6 9a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8', 'M10 21a2 2 0 0 0 4 0'],
  calendar: ['M4 5h16v16H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  board: ['M3 3h8v8H3z', 'M13 3h8v8h-8z', 'M3 13h8v8H3z', 'M13 13h8v8h-8z'],
  inbox: ['M3 13h5l2 3h4l2-3h5', 'M5.5 5h13L21 13v7H3v-7z'],
  chart: ['M4 20V11', 'M10 20V5', 'M16 20v-7', 'M2 20h20'],
  settings: [{ c: [12, 12, 3] }, 'M12 2v3', 'M12 19v3', 'M4.9 4.9l2.1 2.1', 'M17 17l2.1 2.1', 'M2 12h3', 'M19 12h3', 'M4.9 19.1 7 17', 'M17 7l2.1-2.1'],
  shield: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'M9 12l2 2 4-4'],
  list: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  check: ['M20 6 9 17l-5-5'],
  clock: [{ c: [12, 12, 9] }, 'M12 7v5l3 2'],
  alert: ['M12 3 2 20h20z', 'M12 10v4', 'M12 17h.01'],
  info: [{ c: [12, 12, 9] }, 'M12 11v5', 'M12 8h.01'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  globe: [{ c: [12, 12, 9] }, 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  wifi: ['M2 9a15 15 0 0 1 20 0', 'M5 13a10 10 0 0 1 14 0', 'M8.5 16.5a5 5 0 0 1 7 0', 'M12 20h.01'],
  wifiOff: ['M2 2l20 20', 'M8.5 16.5a5 5 0 0 1 7 0', 'M5 13a10 10 0 0 1 5-2.7', 'M2 9a15 15 0 0 1 4.6-3', 'M12 20h.01'],
  leaf: ['M11 20A7 7 0 0 1 4 13c0-6 6-10 16-10 0 10-4 17-9 17z', 'M4 21c4-6 7-9 12-12'],
  user: [{ c: [12, 8, 4] }, 'M4 21a8 8 0 0 1 16 0'],
  mail: ['M3 5h18v14H3z', 'M3 5l9 8 9-8'],
  building: ['M4 21V3h10v18', 'M14 9h6v12', 'M8 7h2', 'M8 11h2', 'M8 15h2', 'M2 21h20'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  sun: [{ c: [12, 12, 4] }, 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18h2'],
}

export default function Icon({ name, size = 20, className = '' }) {
  const parts = ICONS[name] || []
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {parts.map((part, i) =>
        typeof part === 'string' ? <path key={i} d={part} /> : <circle key={i} cx={part.c[0]} cy={part.c[1]} r={part.c[2]} />
      )}
    </svg>
  )
}
