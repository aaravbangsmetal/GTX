export const VICE_CITY_THEME = {
  colors: {
    primary: '#FF6B9D',
    secondary: '#2DD4BF',
    accent: '#FF8C42',
    background: 'rgba(10, 10, 15, 0.85)',
    text: '#FFFFFF',
    textDim: 'rgba(255, 255, 255, 0.6)',
    health: '#FF4444',
    armor: '#4488FF',
    money: '#44FF44',
    danger: '#FF0000',
    gold: '#FFD700',
    water: '#1A5276',
  },
  fonts: {
    hud: "'Orbitron', monospace",
    title: "'Press Start 2P', monospace",
    body: "'Inter', sans-serif",
  },
  borders: {
    hud: '2px solid #FF6B9D',
    glow: '0 0 10px rgba(255, 107, 157, 0.5)',
  },
  sizes: {
    minimap: 150,
    hudPadding: 16,
    barHeight: 12,
    barWidth: 150,
  },
} as const;

export const ROAD_COLORS: Record<string, string> = {
  highway: '#888888',
  boulevard: '#FFFFFF',
  street: '#CCCCCC',
  alley: '#999999',
};

export const BLIP_COLORS: Record<string, string> = {
  mission: '#FFD700',
  vehicle: '#88CCFF',
  police: '#FF4444',
  pickup: '#44FF44',
};

export function loadGoogleFonts(): void {
  if (document.getElementById('gtx-google-fonts')) return;

  const link = document.createElement('link');
  link.id = 'gtx-google-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Press+Start+2P&display=swap';
  document.head.appendChild(link);
}

export function formatMoney(amount: number): string {
  return `$${Math.max(0, Math.floor(amount)).toLocaleString('en-US')}`;
}
