// Inline SVG icon set (24x24, stroke based, currentColor). Paths copied from Chalk's icons (D23); folder and file are Atlas's own.
export type IconName =
  | 'chevron' | 'notebook' | 'plus' | 'more' | 'pencil' | 'trash' | 'terminal' | 'minimise' | 'chevronDown' | 'close'
  | 'folder' | 'file' | 'claude' | 'home' | 'calendar' | 'trend' | 'brain' | 'search' | 'chevronLeft' | 'sidebar';

const PATHS: Record<IconName, string> = {
  chevron: 'M9 6l6 6-6 6',
  notebook: 'M7 4h10.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7z M7 4v16 M4.5 8H7 M4.5 12H7 M4.5 16H7',
  plus: 'M12 5v14 M5 12h14',
  more: 'M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M18 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  pencil: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  terminal: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 10l3 2.5L7 15 M12.5 15H17',
  minimise: 'M6 10l6 6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12 M18 6L6 18',
  folder: 'M3.5 6.5a1 1 0 0 1 1-1H10l2 2.5h7.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z',
  file: 'M6 3.5h9l3.5 3.5v13.5H6z M14.5 3.5V7.5H18.5 M9 12h6 M9 15.5h6',
  claude: 'M12 3v18 M3 12h18 M5.6 5.6l12.8 12.8 M18.4 5.6L5.6 18.4',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0z M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  chevronLeft: 'M15 6l-6 6 6 6',
  sidebar: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M9 5v14',
};

export function Icon(props: { name: IconName; size?: number }) {
  const size = props.size ?? 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[props.name]} />
    </svg>
  );
}
