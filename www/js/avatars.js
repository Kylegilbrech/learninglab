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
  const num = readableOn(jersey);
  const uid = "g" + p.id + (opts.tag || "");
  const isDST = p.pos === "DST";

  // DST tokens show a shield instead of a jersey number.
  const centerMark = isDST
    ? `<path d="M60 40 L84 50 L84 74 Q84 92 60 102 Q36 92 36 74 L36 50 Z"
             fill="${shade(jersey, 0.12)}" stroke="${trim}" stroke-width="3"/>
       <text x="60" y="80" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
             font-weight="700" font-size="26" fill="${num}">D</text>`
    : `<text x="60" y="98" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
             font-weight="700" font-size="46" letter-spacing="-1" fill="${num}"
             style="paint-order:stroke;stroke:${jerseyDark};stroke-width:2px">${p.num}</text>`;

  return `
  <svg class="tok-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shade(jersey, 0.18)}"/>
        <stop offset="1" stop-color="${jerseyDark}"/>
      </linearGradient>
      <radialGradient id="${uid}s" cx="0.5" cy="0.28" r="0.9">
        <stop offset="0" stop-color="rgba(255,255,255,0.16)"/>
        <stop offset="1" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#${uid})"/>
    <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#${uid}s)"/>
    <!-- jersey shoulders + V-neck -->
    <path d="M14 120 L14 78 Q14 60 32 53 L46 47 Q52 60 60 60 Q68 60 74 47 L88 53 Q106 60 106 78 L106 120 Z"
          fill="${shade(jersey, 0.06)}" stroke="${trim}" stroke-width="2.5" stroke-opacity="0.85"/>
    <!-- shoulder trim stripes -->
    <path d="M24 66 L24 120 M96 66 L96 120" stroke="${trim}" stroke-width="4" stroke-opacity="0.55" fill="none"/>
    ${centerMark}
    <!-- position tab -->
    <rect x="42" y="8" width="36" height="17" rx="8.5" fill="${posColor}"/>
    <text x="60" y="20.5" text-anchor="middle" font-family="'Saira Condensed',sans-serif"
          font-weight="700" font-size="12" fill="#0a1124">${p.pos}</text>
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
  const ringStyle = opts.ring ? `box-shadow:0 0 0 2px ${opts.ring}` : "";
  return `<span class="tok" style="width:${size}px;height:${size}px;${ringStyle}">${window.jerseySVG(p, opts)}${photo}</span>`;
};

window.avatarInitials = initials;
window.shadeColor = shade;
window.readableOn = readableOn;
