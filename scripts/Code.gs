// ─────────────────────────────────────────────────────────────────────────────
// WYBE Fitness — Google Apps Script endpoint  (replace ALL existing code)
// Deploy: Execute as Me | Access: Anyone
//
// Script Properties (File → Project Settings → Script Properties):
//   TURNSTILE_SECRET  — Cloudflare Turnstile secret key (never in source)
//   EMAIL_TO          — destination address (default: mans_ali@hotmail.com)
//   SPREADSHEET_ID    — Google Sheet ID; falls back to bound spreadsheet
//
// NOTE: this file replaces any previous doPost. If the old script had other
// functions (report builders, Slides generators, etc.) keep them in a
// separate .gs file — do not add them back to this one.
// ─────────────────────────────────────────────────────────────────────────────

var DISPOSABLE_DOMAINS = [
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamailblock.com','guerrillamail.info','grr.la','sharklasers.com',
  'tempmail.com','10minutemail.com','10minutemail.net','yopmail.com',
  'throwaway.email','dispostable.com','trashmail.com','trashmail.at',
  'trashmail.io','trashmail.me','trashmail.net','trashmail.org',
  'maildrop.cc','spam4.me','spoofmail.de','discard.email','fakeinbox.com',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'spamspot.com','getnada.com','mailnesia.com','tempr.email',
];

var SOURCE_FIELDS = {
  waitlist:   ['source','name','email','mobile','country',
               'form_elapsed_ms','turnstile_token'],
  contact:    ['source','name','email','message',
               'form_elapsed_ms','turnstile_token'],
  calculator: ['source','name','email','age','gender','activity',
               'height','weight','neck','waist','hip',
               'bmi','bfp','ibw','tdee',
               'form_elapsed_ms','turnstile_token'],
};

// ── ENTRY POINT ───────────────────────────────────────────────────────────────
function doPost(e) {
  // Outer try/catch: nothing leaks to the caller, ever.
  try {
    return _handlePost(e);
  } catch (err) {
    Logger.log('WYBE doPost unhandled: ' + err.message);
    return _ok(true); // return success silently — bots learn nothing
  }
}

function _handlePost(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var source = String(params.source || '').toLowerCase();
  var ts     = new Date().toISOString();

  // 1. Unknown source
  if (!SOURCE_FIELDS[source]) {
    Logger.log(ts + ' REJECT unknown_source source=' + source);
    return _ok(true);
  }

  // 2. Extra fields — replay / fuzzing guard
  var allowed  = SOURCE_FIELDS[source];
  var incoming = Object.keys(params);
  for (var i = 0; i < incoming.length; i++) {
    if (allowed.indexOf(incoming[i]) === -1) {
      Logger.log(ts + ' REJECT extra_field field=' + incoming[i] + ' source=' + source);
      return _ok(true);
    }
  }

  // 3. Turnstile
  var token = String(params.turnstile_token || '');
  if (!_verifyTurnstile(token)) {
    Logger.log(ts + ' REJECT turnstile source=' + source);
    // Calculator reads the JSON; return failure so the UI can prompt retry.
    // Waitlist/contact use no-cors and ignore the body — same response is fine.
    return _ok(false, 'turnstile');
  }

  // 4. Time-trap
  var elapsed = parseInt(String(params.form_elapsed_ms || '0'), 10);
  if (isNaN(elapsed) || elapsed < 3000) {
    Logger.log(ts + ' REJECT time_trap elapsed=' + elapsed + ' source=' + source);
    return _ok(true);
  }

  // 5. Name
  var name = String(params.name || '').trim();
  if (!_validName(name)) {
    Logger.log(ts + ' REJECT name source=' + source);
    return _ok(true);
  }

  // 6. Email + disposable-domain
  var email = String(params.email || '').trim().toLowerCase();
  if (!_validEmail(email)) {
    Logger.log(ts + ' REJECT email=' + email + ' source=' + source);
    return _ok(true);
  }

  // 7. Rate limit (per email, two windows)
  var rlReason = _rateLimited(email);
  if (rlReason) {
    Logger.log(ts + ' REJECT rate_limit=' + rlReason + ' email=' + email);
    return _ok(true);
  }

  // 8. Physical plausibility (calculator only)
  if (source === 'calculator' && !_plausible(params)) {
    Logger.log(ts + ' REJECT plausibility source=calculator');
    return _ok(true);
  }

  // 9. Accepted — write row and send notification
  Logger.log(ts + ' ACCEPT source=' + source + ' email=' + email);
  try {
    _appendRow(source, params, name, email);
  } catch (err) {
    Logger.log(ts + ' SHEET_ERROR ' + err.message);
  }
  try {
    _notify(source, params, name, email);
  } catch (err) {
    Logger.log(ts + ' MAIL_ERROR ' + err.message);
  }

  return _ok(true);
}

// OPTIONS pre-flight (some mobile browsers)
function doGet() {
  return ContentService.createTextOutput('OK');
}

// ── TURNSTILE ─────────────────────────────────────────────────────────────────
function _verifyTurnstile(token) {
  if (!token) return false;
  var secret = PropertiesService.getScriptProperties()
                 .getProperty('TURNSTILE_SECRET');
  if (!secret) {
    Logger.log('WYBE: TURNSTILE_SECRET not configured in Script Properties');
    // If the secret hasn't been set yet, let submissions through so the site
    // isn't broken during setup — remove this line once TURNSTILE_SECRET is set.
    return true;
  }
  try {
    var res = UrlFetchApp.fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method:             'post',
        payload:            { secret: secret, response: token },
        muteHttpExceptions: true,
      }
    );
    var data = JSON.parse(res.getContentText());
    if (!data.success) {
      Logger.log('WYBE: Turnstile rejected, codes=' + JSON.stringify(data['error-codes'] || []));
    }
    return data.success === true;
  } catch (err) {
    Logger.log('WYBE: Turnstile fetch error: ' + err.message);
    return false;
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────────
function _validName(name) {
  if (!name || name.length < 2 || name.length > 120) return false;
  if (/https?:\/\/|www\.|<a /i.test(name))          return false;
  if (/\d{3,}/.test(name))                           return false;
  return true;
}

function _validEmail(email) {
  if (!email || email.length > 254)              return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  var domain = email.split('@')[1] || '';
  return DISPOSABLE_DOMAINS.indexOf(domain) === -1;
}

function _plausible(p) {
  function ok(val, lo, hi) {
    if (val === '' || val == null) return true;
    var n = parseFloat(String(val));
    return isFinite(n) && n >= lo && n <= hi;
  }
  return ok(p.age, 10, 100) && ok(p.height, 100, 250) && ok(p.weight, 30, 300)
      && ok(p.neck, 20, 70) && ok(p.waist, 40, 200) && ok(p.hip, 40, 200);
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
function _rateLimited(email) {
  var cache = CacheService.getScriptCache();
  var now   = Date.now();
  var M60   = 60000;
  var H1    = 3600000;
  var safe  = email.replace(/[^a-z0-9@._-]/g, '_').substring(0, 60);

  function check(key, windowMs, max) {
    var raw = cache.get(key);
    var ttl = Math.ceil(windowMs / 1000);
    if (!raw) { cache.put(key, JSON.stringify({ ts: now, n: 1 }), ttl); return false; }
    var d = JSON.parse(raw);
    if (now - d.ts > windowMs) { cache.put(key, JSON.stringify({ ts: now, n: 1 }), ttl); return false; }
    if (d.n >= max) return true;
    d.n++;
    cache.put(key, JSON.stringify(d), Math.max(1, Math.ceil((windowMs - (now - d.ts)) / 1000)));
    return false;
  }

  if (check('rl60:' + safe, M60, 1)) return '60s';
  if (check('rl1h:' + safe, H1,  5)) return '1h';
  return null;
}

// ── SHEET ─────────────────────────────────────────────────────────────────────
function _appendRow(source, p, name, email) {
  var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss   = ssId ? SpreadsheetApp.openById(ssId)
                  : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var tab  = source === 'waitlist'   ? 'Waitlist'
           : source === 'contact'    ? 'Contact'
                                     : 'Calculator';
  var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
  var row   = source === 'waitlist'
    ? [new Date(), name, email, p.mobile || '', p.country || '']
    : source === 'contact'
    ? [new Date(), name, email, p.message || '']
    : [new Date(), name, email, p.gender || '', p.age || '',
       p.height || '', p.weight || '', p.neck || '', p.waist || '', p.hip || '',
       p.activity || '', p.bmi || '', p.bfp || '', p.ibw || '', p.tdee || ''];
  sheet.appendRow(row);
}

// ── NOTIFICATION EMAIL ────────────────────────────────────────────────────────
function _notify(source, p, name, email) {
  var to = PropertiesService.getScriptProperties().getProperty('EMAIL_TO')
         || 'mans_ali@hotmail.com';
  var subj, body;
  if (source === 'waitlist') {
    subj = '[WYBE] Waitlist: ' + name;
    body = 'Name: '    + name         + '\nEmail: '   + email
         + '\nMobile: ' + (p.mobile  || '—') + '\nCountry: ' + (p.country || '—');
  } else if (source === 'contact') {
    subj = '[WYBE] Contact: ' + name;
    body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + (p.message || '');
  } else {
    subj = '[WYBE] Calculator: ' + name;
    body = 'Name: ' + name + '\nEmail: ' + email
         + '\nGender: ' + (p.gender || '—') + '  Age: ' + (p.age || '—')
         + '\nHeight: ' + (p.height || '—') + ' cm  Weight: ' + (p.weight || '—') + ' kg'
         + '\nNeck: '   + (p.neck   || '—') + ' cm  Waist: '  + (p.waist  || '—') + ' cm'
         + '  Hip: '   + (p.hip    || '—') + ' cm'
         + '\nActivity: ' + (p.activity || '—')
         + '\n\nBMI: '   + (p.bmi  || '—')
         + '   BFP: '   + (p.bfp  || '—') + '%'
         + '   IBW: '   + (p.ibw  || '—') + ' kg'
         + '   TDEE: '  + (p.tdee || '—') + ' kcal';
  }
  MailApp.sendEmail(to, subj, body);
}

// ── RESPONSE HELPERS ──────────────────────────────────────────────────────────
// Always HTTP 200 — bots learn nothing from the status code.
// success=false on Turnstile failure only: the calculator client reads the body
// and prompts the user to retry the widget. All other rejections return true
// so the form confirms silently (avoiding UX confusion for edge-case users).
function _ok(success, errorCode) {
  var payload = success ? { success: true }
                        : { success: false, error: errorCode || 'error' };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
