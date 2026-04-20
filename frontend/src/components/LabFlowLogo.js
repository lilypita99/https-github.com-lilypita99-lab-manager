import React from 'react';

function LabFlowLogo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 300"
      role="img"
      aria-label="LabFlow flask logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lf-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#66ddcc" />
          <stop offset="100%" stopColor="#35c6ba" />
        </linearGradient>
        <linearGradient id="lf-main" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#76e5d9" />
          <stop offset="55%" stopColor="#3db8ea" />
          <stop offset="100%" stopColor="#2f80ed" />
        </linearGradient>
        <linearGradient id="lf-liquid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ce6da" />
          <stop offset="70%" stopColor="#2ea5e7" />
          <stop offset="100%" stopColor="#2d7ee7" />
        </linearGradient>
      </defs>

      <rect x="138" y="28" width="34" height="14" rx="7" fill="url(#lf-teal)" />
      <rect x="248" y="28" width="34" height="14" rx="7" fill="url(#lf-teal)" />

      <path
        d="M155 42 L155 96 L90 190 C68 222 74 264 112 282 H308 C346 264 352 222 330 190 L265 96 L265 42"
        fill="url(#lf-main)"
      />

      <path
        d="M166 108 L109 188 C93 210 98 239 124 250 H296 C322 239 327 210 311 188 L254 108"
        fill="#f4fdff"
        opacity="0.9"
      />

      <path
        d="M110 202 C154 188 203 199 248 190 C275 184 294 181 318 176 L336 204 C352 229 343 261 314 274 H106 C77 261 68 229 84 204 Z"
        fill="url(#lf-liquid)"
      />

      <ellipse cx="187" cy="175" rx="18" ry="13" fill="#8be8db" opacity="0.82" />
      <circle cx="233" cy="139" r="10" fill="#7ce3d7" />
      <circle cx="223" cy="120" r="3" fill="#76dfd2" />
      <circle cx="212" cy="104" r="2" fill="#76dfd2" />
      <circle cx="221" cy="92" r="9" fill="#72ddd2" />

      <path
        d="M192 239 L142 188 C136 182 126 182 120 188 C114 194 114 204 120 210 L176 269 C182 275 192 275 198 269 L301 157 C307 151 307 141 301 135 C295 129 285 129 279 135 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default LabFlowLogo;
