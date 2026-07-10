/* ============================================================================
 * avatars.js — stylized player imagery.
 *
 * Every player gets a team-colored "jersey token" rendered as inline SVG, so it
 * scales crisply, works fully offline, and carries no licensing risk.
 *
 * PHOTO HOOK: if you later obtain rights to real headshots, implement
 * window.getPhotoUrl(player) to return an image URL. The token stays underneath
 * as an automatic fallback if the photo is missing or fails to load.
 *   e.g. window.getPhotoUrl = p => `https://your-cdn.example/headshots/${p.id}.png`;
 * ==========================================================================*/

// Position identity (color + long label), shared across the app.
window.POS_META = {
  QB:  { color: "#ff7a59", label: "Quarterback"    },
  RB:  { color: "#5ad28a", label: "Running Back"    },
  WR:  { color: "#48d6ff", label: "Wide Receiver"   },
  TE:  { color: "#c89bff", label: "Tight End"       },
  K:   { color: "#ffd152", label: "Kicker"          },
  DST: { color: "#ff8fc4", label: "Defense / ST"    },
};

// Default: no real photos wired up. Return a URL string to enable them.
window.getPhotoUrl = window.getPhotoUrl || function () { return null; };

/* ---- color helpers ---- */
function _clamp(n) { return Math.max(0, Math.min(255, n)); }
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const f = (c) => _clamp(Math.round(c + (amt < 0 ? c : 255 - c) * amt));
  return "#" + [f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("");
}
function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function readableOn(hex) { return luminance(hex) > 0.55 ? "#0a1124" : "#ffffff"; }

function initials(name) {
  const clean = name.replace(/ D\/ST$/, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---- the jersey token (inline SVG string) ---- */
window.jerseySVG = function (p, opts) {
  opts = opts || {};
  const t = window.teamOf(p.team);
  const posColor = (window.POS_META[p.pos] || {}).color || "#94a3b8";
  const jersey = t.primary;
  const jerseyDark = shade(jersey, -0.45);
  const trim = t.secondary;
  const ink = readableOn(jersey);
  const uid = "g" + p.id + (opts.tag || "");
  const isDST = p.pos === "DST";
  // Prefer a real jersey number for key players; fall back to the stylized one.
  const jnum = (window.JERSEY_NUMBERS && window.JERSEY_NUMBERS[p.id]) || p.num;
  const digits = String(jnum).length;
  const numSize = digits >= 2 ? 40 : 46;
  const jerseyLite = shade(jersey, 0.16);

  // The whole token IS the jersey shape (short sleeves, V-neck, tapered body).
  const JERSEY = "M6 44 L42 22 Q48 17 53 26 L60 34 L67 26 Q72 17 78 22 L114 44 " +
                 "L114 62 L92 62 L98 116 L22 116 L28 62 L6 62 Z";

  const centerMark = isDST
    ? `<path d="M60 60 L80 68 L80 88 Q80 101 60 108 Q40 101 40 88 L40 68 Z"
             fill="${jerseyLite}" stroke="${trim}" stroke-width="3"/>
       <text x="60" y="94" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
             font-weight="700" font-size="22" fill="${ink}">D</text>`
    : `<text x="60" y="100" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
             font-weight="700" font-size="${numSize}" letter-spacing="-1" fill="${ink}"
             style="paint-order:stroke;stroke:${jerseyDark};stroke-width:2px">${jnum}</text>`;

  return `
  <svg class="tok-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${jerseyLite}"/>
        <stop offset="1" stop-color="${jerseyDark}"/>
      </linearGradient>
      <linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.22)"/>
        <stop offset="0.5" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
    </defs>
    <path d="${JERSEY}" fill="url(#${uid})" stroke="${trim}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="${JERSEY}" fill="url(#${uid}s)"/>
    <!-- sleeve cuff trim -->
    <path d="M9 51 L27 60 M111 51 L93 60" stroke="${trim}" stroke-width="4" stroke-linecap="round"/>
    <!-- V-neck collar trim -->
    <path d="M53 26 L60 34 L67 26" fill="none" stroke="${trim}" stroke-width="4.5"
          stroke-linejoin="round" stroke-linecap="round"/>
    ${centerMark}
    <!-- position tab under collar -->
    <rect x="45" y="39" width="30" height="15" rx="7.5" fill="${posColor}"/>
    <text x="60" y="50.5" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
          font-weight="700" font-size="11" fill="#0a1124">${p.pos}</text>
  </svg>`;
};

/* ---- full avatar markup: photo (if any) layered over the token ---- */
window.avatar = function (p, opts) {
  opts = opts || {};
  const size = opts.size || 44;
  const url = window.getPhotoUrl(p);
  const photo = url
    ? `<img class="tok-img" src="${url}" alt="" loading="lazy" onerror="this.remove()">`
    : "";
  return `<span class="tok" style="width:${size}px;height:${size}px">${window.jerseySVG(p, opts)}${photo}</span>`;
};

window.avatarInitials = initials;
window.shadeColor = shade;
window.readableOn = readableOn;
