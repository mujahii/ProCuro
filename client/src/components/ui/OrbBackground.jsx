// Animated rising-orb background — the ProCuro homepage hero signature.
// Renders a dark #052532 base with 6 blurred brand-color orbs drifting upward,
// plus a translucent overlay so foreground content stays legible.
// Usage: wrap content in a `relative overflow-hidden` parent, drop <OrbBackground />
// as the first child, then place content with `relative z-10`.

const ORBS = [
  { left: '4%',  size: 176, color: '#A58D66', delay: '0s',   blur: 44 },
  { left: '54%', size: 160, color: '#C0D5D6', delay: '-7s',  blur: 40 },
  { left: '28%', size: 144, color: '#5E96A4', delay: '-14s', blur: 36 },
  { left: '70%', size: 160, color: '#BFA988', delay: '-21s', blur: 40 },
  { left: '40%', size: 128, color: '#B07B8B', delay: '-4s',  blur: 32 },
  { left: '82%', size: 144, color: '#B19CD9', delay: '-11s', blur: 36 },
]

const ORB_STYLES = `
@keyframes pro-rise-mobile {
  0%   { transform: translateY(110vh); opacity: 0; }
  14%  { opacity: 1; }
  86%  { opacity: 0.85; }
  100% { transform: translateY(-55vh); opacity: 0; }
}
@keyframes pro-rise {
  0%   { transform: translateY(680px); opacity: 0; }
  14%  { opacity: 1; }
  86%  { opacity: 0.85; }
  100% { transform: translateY(-680px); opacity: 0; }
}
.pro-orb {
  position: absolute;
  top: 0;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform;
  animation: pro-rise-mobile 28s linear infinite;
}
@media (min-width: 640px) {
  .pro-orb { animation: pro-rise 15s linear infinite; }
  .pro-orb:nth-child(1) { width: 416px !important; height: 416px !important; filter: blur(80px) !important; }
  .pro-orb:nth-child(2) { width: 352px !important; height: 352px !important; filter: blur(72px) !important; }
  .pro-orb:nth-child(3) { width: 320px !important; height: 320px !important; filter: blur(64px) !important; }
  .pro-orb:nth-child(4) { width: 384px !important; height: 384px !important; filter: blur(80px) !important; }
  .pro-orb:nth-child(5) { width: 288px !important; height: 288px !important; filter: blur(60px) !important; }
  .pro-orb:nth-child(6) { width: 352px !important; height: 352px !important; filter: blur(70px) !important; }
}
`

export default function OrbBackground({ overlay = 0.6 }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: '#052532' }}>
      <style>{ORB_STYLES}</style>
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="pro-orb"
          style={{ left: o.left, width: o.size, height: o.size, background: o.color, animationDelay: o.delay, filter: `blur(${o.blur}px)` }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: `rgba(5,37,50,${overlay})` }} />
    </div>
  )
}
