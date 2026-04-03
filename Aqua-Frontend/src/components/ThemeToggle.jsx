import { useTheme } from './ThemeContext';

export default function ThemeToggle({ style = {} }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        position: 'relative',
        width: 48,
        height: 26,
        borderRadius: 13,
        border: '1px solid var(--border)',
        background: isDark
          ? 'linear-gradient(135deg, #0a1830, #163054)'
          : 'linear-gradient(135deg, #87ceeb, #ffd700)',
        cursor: 'pointer',
        padding: 0,
        transition: 'all 0.4s cubic-bezier(.22,1,.36,1)',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: isDark
          ? '0 0 12px rgba(0,168,232,0.15), inset 0 1px 2px rgba(0,0,0,0.3)'
          : '0 0 12px rgba(255,215,0,0.2), inset 0 1px 2px rgba(0,0,0,0.1)',
        ...style,
      }}
    >
      {/* Stars (dark mode) */}
      <div style={{
        position: 'absolute',
        top: 5, left: 8,
        width: 2, height: 2,
        borderRadius: '50%',
        background: '#fff',
        opacity: isDark ? 0.6 : 0,
        transition: 'opacity 0.3s',
        boxShadow: '6px 3px 0 0 rgba(255,255,255,0.4), 12px -1px 0 0 rgba(255,255,255,0.3), 3px 8px 0 0 rgba(255,255,255,0.2)',
      }} />

      {/* Sun rays (light mode) */}
      <div style={{
        position: 'absolute',
        top: '50%', left: 10,
        width: 14, height: 14,
        marginTop: -7,
        borderRadius: '50%',
        background: 'transparent',
        opacity: isDark ? 0 : 0.4,
        transition: 'opacity 0.3s',
        boxShadow: '0 0 6px 2px rgba(255,215,0,0.4)',
      }} />

      {/* Toggle circle */}
      <div style={{
        position: 'absolute',
        top: 2,
        left: isDark ? 2 : 22,
        width: 20,
        height: 20,
        borderRadius: '50%',
        transition: 'all 0.4s cubic-bezier(.68,-0.55,.27,1.55)',
        background: isDark
          ? 'linear-gradient(135deg, #c8d6e5, #dfe6e9)'
          : 'linear-gradient(135deg, #ffd700, #ffaa00)',
        boxShadow: isDark
          ? 'inset -2px -1px 0 1px #a0b0c0, 0 1px 4px rgba(0,0,0,0.3)'
          : '0 0 8px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.15)',
        transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)',
      }}>
        {/* Moon craters (dark) */}
        <div style={{
          position: 'absolute',
          top: 4, left: 4,
          width: 4, height: 4,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.08)',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />
        <div style={{
          position: 'absolute',
          top: 10, left: 9,
          width: 3, height: 3,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.06)',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />
      </div>
    </button>
  );
}
