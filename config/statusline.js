// ── True-color helpers ──────────────────────────────────────
const R = '\x1b[0m';
const B = '\x1b[1m';

function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }

const P = {
  modelFg:   fg(80,  160, 255),   // electric blue
  ctxFg:     fg(80,  220, 120),   // green
  ctxUnitFg: fg(140, 180, 150),   // desaturated green (K / M suffix)
  tokenFg:   fg(190, 130, 255),   // violet (5h rate limit)
  warnFg:    fg(255,  70,  70),   // warning red (ctx tokens ≥ 100K)
  warnUnitFg: fg(200, 130, 130),  // desaturated red (K / M suffix when warning)
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

  // Tokens currently in context: prefer current_usage, else derive from pct × size
  const cu = cw.current_usage;
  let ctxTokens = null;
  if (cu) {
    ctxTokens = (cu.input_tokens || 0) + (cu.cache_creation_input_tokens || 0) +
                (cu.cache_read_input_tokens || 0);
  } else if (cw.used_percentage != null && cw.context_window_size) {
    ctxTokens = cw.used_percentage / 100 * cw.context_window_size;
  }

  // 0–999 → 1K; <1M → nearest K; ≥1M → nearest 0.1M
  function fmtTokens(n) {
    if (n < 1000) return { num: '1', unit: 'K' };
    const k = Math.round(n / 1000);
    if (k < 1000) return { num: String(k), unit: 'K' };
    return { num: (Math.round(n / 100000) / 10).toFixed(1), unit: 'M' };
  }

  // ── Effort ───────────────────────────────────────────────
  const effort = input.effort && input.effort.level;

  const resolvedModel = modelShort;

  // ── Assemble parts ───────────────────────────────────────
  const parts = [];

  // 1. Model — electric blue
  if (resolvedModel) {
    parts.push(B + P.modelFg + resolvedModel + R);
  }

  // 2. Effort — gold
  if (effort) {
    parts.push(P.effortFg + effort + R);
  }

  // 3. Context window — green
  if (ctxPct !== null) {
    let s = P.ctxFg + 'ctx ' + ctxPct + '%';
    if (ctxTokens !== null) {
      const t = fmtTokens(ctxTokens);
      const warn = t.unit === 'M' || Number(t.num) >= 100;  // based on displayed value
      s += ' ' + (warn ? B + P.warnFg : '') + t.num + R +
           (warn ? P.warnUnitFg : P.ctxUnitFg) + t.unit;
    }
    parts.push(s + R);
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

  process.stdout.write(parts.join(PIPE));
});
