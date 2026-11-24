// ──────────────────────────────────────────────────────────────────────────────
// WYBE — Google Apps Script endpoint for all three homepage forms
// (book waitlist, quick contact, body-composition calculator).
//
// Paste this over EVERYTHING in the Apps Script editor, then
// Deploy → Manage deployments → Edit → Version: New version → Deploy.
// Editing the existing deployment keeps the SAME /exec URL, which is what
// index.html and js/main.js post to.
//
// Deploy settings: Execute as = Me, Who has access = Anyone.
//
// Script Properties (Project Settings → Script Properties):
//   TURNSTILE_SECRET  — REQUIRED. Cloudflare dashboard → Turnstile → the
//                       wybe.fit widget → Secret key. Set this BEFORE you
//                       deploy: with no secret every submission is rejected,
//                       by design, so a missing property can never become an
//                       open door.
//   EMAIL_TO          — optional, where the owner notification goes.
//   SPREADSHEET_ID    — optional, falls back to the bound spreadsheet.
//
// Response shape is { ok: true } / { ok: false, error: "..." }, which is what
// postToGas() in js/main.js and the calculator handler in index.html read.
// ──────────────────────────────────────────────────────────────────────────────

// Hostnames the Turnstile token may have been solved on. The token carries the
// page's hostname and Cloudflare echoes it back, so a token farmed on some
// other site cannot be replayed here. Add "www.wybe.fit" or a Vercel preview
// domain to this list if those ever serve the forms.
var ALLOWED_HOSTNAMES = ['wybe.fit'];

var MIN_ELAPSED_MS = 3000;

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

// Exactly the keys each form sends. Anything else is a hand-rolled POST, so
// the request is dropped. Verified against the live payloads, which is why the
// calculator list is long: it posts its computed results so the sheet and the
// notification email do not have to recompute them.
var SOURCE_FIELDS = {
  waitlist: ['source', 'name', 'email', 'mobile', 'country',
             'form_elapsed_ms', 'cf-turnstile-response'],
  contact:  ['source', 'name', 'email', 'message',
             'form_elapsed_ms', 'cf-turnstile-response'],
  calculator: ['source', 'consent', 'name', 'email', 'age', 'gender', 'activity',
               'height', 'weight', 'neck', 'waist', 'hip',
               'bmi', 'bmiCategory', 'bmiNote',
               'ibw', 'ibwLow', 'ibwHigh',
               'bfp', 'bfpCategory', 'bfpNote',
               'tdee', 'tdeeCategory',
               'cutCalories', 'maintainCalories', 'leanBulkCalories',
               'form_elapsed_ms', 'cf-turnstile-response'],
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

  // ── GATE A: HONEYPOT ──────────────────────────────────────────
  // "botcheck" is a hidden checkbox no human can see or tick. Browsers omit
  // unchecked boxes entirely, so any value at all means a bot filled the form.
  // Answer with the normal success JSON and save nothing: a bot that is told
  // "ok" stops, where one told "rejected" retries with the field cleared.
  if (params.botcheck) {
    Logger.log(ts + ' REJECT honeypot source=' + source);
    return _ok(true);
  }

  // ── GATE B: TIME-TRAP ────────────────────────────────────────
  // Nobody reads and fills one of these forms in under three seconds. A
  // missing or unparseable value counts as a failure, so stripping the field
  // is not a way around this. Saves nothing; also silent.
  var elapsed = parseInt(String(params.form_elapsed_ms || '0'), 10);
  if (isNaN(elapsed) || elapsed < MIN_ELAPSED_MS) {
    Logger.log(ts + ' REJECT time_trap elapsed=' + elapsed + ' source=' + source);
    return _ok(true);
  }

  // ── GATE C: TURNSTILE ────────────────────────────────────────
  // Verified server-side against Cloudflare. This is the check a POST sent
  // straight at this URL cannot forge. ok:false here, not ok:true, so the
  // front end can tell the user to complete the check and try again.
  if (!_verifyTurnstile(String(params['cf-turnstile-response'] || ''), ts)) {
    Logger.log(ts + ' REJECT turnstile source=' + source);
    return _ok(false, 'turnstile');
  }

  // Everything from here on runs only for a request that cleared all three.

  // Unknown source
  if (!SOURCE_FIELDS[source]) {
    Logger.log(ts + ' REJECT unknown_source source=' + source);
    return _ok(true);
  }

  // Unexpected fields — replay / fuzzing guard
  var allowed  = SOURCE_FIELDS[source];
  var incoming = Object.keys(params);
  for (var i = 0; i < incoming.length; i++) {
    if (allowed.indexOf(incoming[i]) === -1) {
      Logger.log(ts + ' REJECT extra_field field=' + incoming[i] + ' source=' + source);
      return _ok(true);
    }
  }

  // Name
  var name = String(params.name || '').trim();
  if (!_validName(name)) {
    Logger.log(ts + ' REJECT name source=' + source);
    return _ok(true);
  }

  // Email + disposable-domain
  var email = String(params.email || '').trim().toLowerCase();
  if (!_validEmail(email)) {
    Logger.log(ts + ' REJECT email=' + email + ' source=' + source);
    return _ok(true);
  }

  // Rate limit (per email, two windows)
  var rlReason = _rateLimited(email);
  if (rlReason) {
    Logger.log(ts + ' REJECT rate_limit=' + rlReason + ' email=' + email);
    return _ok(true);
  }

  // Physical plausibility (calculator only)
  if (source === 'calculator' && !_plausible(params)) {
    Logger.log(ts + ' REJECT plausibility source=calculator');
    return _ok(true);
  }

  // Accepted — write the row, then notify
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
function _verifyTurnstile(token, ts) {
  if (!token) return false;
  var secret = PropertiesService.getScriptProperties()
                 .getProperty('TURNSTILE_SECRET');
  if (!secret) {
    // Deliberately a hard failure. An earlier draft of this file let
    // submissions through when the property was unset "so the site is not
    // broken during setup", which is an open door that survives setup.
    Logger.log(ts + ' TURNSTILE_SECRET missing from Script Properties — rejecting');
    return false;
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
    if (data.success !== true) {
      Logger.log(ts + ' turnstile failed codes=' + JSON.stringify(data['error-codes'] || []));
      return false;
    }
    // A valid token still has to have been solved on our own site.
    if (ALLOWED_HOSTNAMES.indexOf(String(data.hostname || '')) === -1) {
      Logger.log(ts + ' turnstile wrong hostname=' + data.hostname);
      return false;
    }
    return true;
  } catch (err) {
    Logger.log(ts + ' turnstile fetch error: ' + err.message);
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

// ── RESPONSE HELPERS ────────────────────────────────────────────────
// The key is "ok", not "success": postToGas() in js/main.js returns
// json.ok === true, and the calculator handler throws on !json.ok. An earlier
// draft of this file answered { success: true }, which both would have read
// as a failure — every submission would have shown the connection error even
// though the row had been written.
//
// Always HTTP 200, so a bot learns nothing from the status code.
function _ok(ok, errorCode) {
  var payload = ok ? { ok: true } : { ok: false, error: errorCode || 'error' };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
