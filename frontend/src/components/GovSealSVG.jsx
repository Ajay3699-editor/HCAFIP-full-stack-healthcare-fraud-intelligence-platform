export const GovSealSVG = ({ style, className }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="var(--bg-secondary)" stroke="var(--accent)" strokeWidth="3"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeDasharray="3 3"/>
    <path d="M50 22L30 32C30 50 42 68 50 78C58 68 70 50 70 32L50 22Z" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="2"/>
    <path d="M42 42V56" stroke="#d32f2f" strokeWidth="2"/>
    <path d="M46 42V58" stroke="#ffffff" strokeWidth="2"/>
    <path d="M50 42V60" stroke="#d32f2f" strokeWidth="2"/>
    <path d="M54 42V58" stroke="#ffffff" strokeWidth="2"/>
    <path d="M58 42V56" stroke="#d32f2f" strokeWidth="2"/>
    <path d="M34 34L50 26L66 34C64 38 60 41 50 41C40 41 36 38 34 34Z" fill="#0071bc"/>
    <circle cx="50" cy="33" r="1.5" fill="#fdbb30"/>
    <circle cx="44" cy="35" r="1.5" fill="#fdbb30"/>
    <circle cx="56" cy="35" r="1.5" fill="#fdbb30"/>
    <path d="M22 65C25 72 32 76 40 78" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M78 65C75 72 68 76 60 78" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default GovSealSVG;
