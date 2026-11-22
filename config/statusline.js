// ── True-color helpers ──────────────────────────────────────
const R = '\x1b[0m';
const B = '\x1b[1m';

function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }

const P = {
  modelFg:   fg(80,  160, 255),   // electric blue
  ctxFg:     fg(80,  220, 120),   // green
  tokenFg:   fg(255,  60,  60),   // vivid red
  sevenDayFg: fg(0,   255, 255),   // bright cyan
  effortFg:  fg(255, 215,   0),   // gold
  pipeFg:    fg(255, 255, 255),   // white
};

const PIPE = ' ' + P.pipeFg + '|' + R + ' ';

// ── Read stdin (JSON from Claude Code) ─────────────────────
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch (e) {}

  // ── Model ────────────────────────────────────────────────
  const modelDisplay = (input.model && input.model.display_name) || '';
  const modelId      = (input.model && input.model.id) || '';
  const modelShort   = modelDisplay.replace(/^Claude\s+/i, '') || modelId.replace(/^claude-/, '');

  // ── Rate limits ──────────────────────────────────────────
  const rl        = input.rate_limits || {};
  const fiveHour  = rl.five_hour;
  const sevenDay = rl.seven_day;
  const rl5hPct  = fiveHour && fiveHour.used_percentage != null
    ? Math.round(fiveHour.used_percentage)
    : null;
  const rl7dPct  = sevenDay && sevenDay.used_percentage != null
    ? Math.round(sevenDay.used_percentage)
    : null;
  const rl5hReset = fiveHour && fiveHour.resets_at != null
    ? fiveHour.resets_at
    : null;

  // resets_at is Unix epoch seconds → local HH:MM
  function hhmm(epochSec) {
    const d = new Date(epochSec * 1000);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // ── Context window ───────────────────────────────────────
  const cw      = input.context_window || {};
  const ctxPct  = cw.used_percentage != null
    ? Math.round(cw.used_percentage)
    : null;

  // ── Effort ───────────────────────────────────────────────
  const effort = input.effort && input.effort.level;

  const resolvedModel = modelShort;

  // ── Assemble parts ───────────────────────────────────────
  const parts = [];

  // 1. Model — electric blue
  if (resolvedModel) {
    parts.push(B + P.modelFg + resolvedModel + R);
  }

  // 2. Context window — green
  if (ctxPct !== null) {
    parts.push(P.ctxFg + 'ctx ' + ctxPct + '%' + R);
  }

  // 3. 5h rate limit — vivid red, with reset time
  if (rl5hPct !== null) {
    let s = '5h ' + rl5hPct + '%';
    if (rl5hReset !== null) s += ' ' + hhmm(rl5hReset);
    parts.push(P.tokenFg + s + R);
  }

  // 3. 7d rate limit — bright cyan
  if (rl7dPct !== null) {
    parts.push(P.sevenDayFg + '7d ' + rl7dPct + '%' + R);
  }

  // 5. Effort — gold
  if (effort) {
    parts.push(P.effortFg + effort + R);
  }

  process.stdout.write(parts.join(PIPE));
});
