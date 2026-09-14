// ─────────────────────────────────────────────────────────────────────────────
// WYBE Fitness — Google Apps Script endpoint
// Deploy: Execute as Me | Access: Anyone
//
// Script Properties required (File → Project Settings → Script Properties):
//   TURNSTILE_SECRET  — Cloudflare Turnstile secret key (never in source)
//   EMAIL_TO          — destination address (default: mans_ali@hotmail.com)
//   SPREADSHEET_ID    — Google Sheet ID to write rows into (optional; falls
//                       back to the spreadsheet bound to this script)
// ─────────────────────────────────────────────────────────────────────────────

// Disposable / throwaway email domains.  Add more as new ones appear.
var DISPOSABLE_DOMAINS = [
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamailblock.com','guerrillamail.info','grr.la','sharklasers.com',
  'tempmail.com','10minutemail.com','10minutemail.net','yopmail.com',
  'throwaway.email','dispostable.com','trashmail.com','trashmail.at',
  'trashmail.io','trashmail.me','trashmail.net','trashmail.org',
  'maildrop.cc','spam4.me','spoofmail.de','discard.email','fakeinbox.com',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'spamspot.com','getnada.com','mailnesia.com','tempr.email','discard.email',
];

// Exact set of fields each source is allowed to send.
// Any submission with an unexpected key is silently rejected.
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
  var params = (e && e.parameter) ? e.parameter : {};
  var source = String(params.source || '').toLowerCase();

  // 1. Source must be one of the known forms
  if (!SOURCE_FIELDS[source]) return ok();

  // 2. Field-count guard — reject any unexpected keys (replayed / fuzzed requests)
  var allowed = SOURCE_FIELDS[source];
  var incoming = Object.keys(params);
  for (var i = 0; i < incoming.length; i++) {
    if (allowed.indexOf(incoming[i]) === -1) return ok();
  }

  // 3. Turnstile — verify token before any other work
  var token = String(params.turnstile_token || '');
  if (!verifyTurnstile(token)) return failOk('turnstile');

  // 4. Time-trap — reject submissions faster than a human can complete them
  var elapsed = parseInt(String(params.form_elapsed_ms || '0'), 10);
  if (isNaN(elapsed) || elapsed < 3000) return ok();

  // 5. Name validation — no URLs, no long digit runs, reasonable length
  var name = String(params.name || '').trim();
  if (!isValidName(name)) return ok();

  // 6. Email validation + disposable-domain blocklist
  var email = String(params.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return ok();

  // 7. Rate-limit per email (CacheService, keyed by email address)
  //    Note: GAS has no reliable access to the client IP for anonymous requests,
  //    so IP-based limiting is not applied here. Email is sufficient for the
  //    60 s dedup that stops accidental double-submits and most replay attacks.
  if (isRateLimited(email)) return ok();

  // 8. Source-specific validation
  if (source === 'calculator') {
    if (!isPhysicallyPlausible(params)) return ok();
  }

  // 9. Persist and notify
  try {
    var row = buildRow(source, params, name, email);
    appendToSheet(source, row);
    sendNotification(source, params, name, email);
  } catch (err) {
    Logger.log('WYBE GAS error: ' + err.message);
  }

  return ok();
}

// Allow OPTIONS pre-flight (some browsers send it before no-cors POSTs)
function doGet(e) {
  return ContentService.createTextOutput('OK');
}

// ── TURNSTILE ─────────────────────────────────────────────────────────────────
function verifyTurnstile(token) {
  if (!token) return false;
  var secret = PropertiesService.getScriptProperties()
                 .getProperty('TURNSTILE_SECRET');
  if (!secret) {
    Logger.log('WYBE GAS: TURNSTILE_SECRET not set in Script Properties');
    return false;
  }
  try {
    var res = UrlFetchApp.fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method:            'post',
        payload:           { secret: secret, response: token },
        muteHttpExceptions: true,
      }
    );
    var data = JSON.parse(res.getContentText());
    return data.success === true;
  } catch (err) {
    Logger.log('WYBE GAS: Turnstile fetch error: ' + err.message);
    return false;
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────────
function isValidName(name) {
  if (!name || name.length < 2 || name.length > 120) return false;
  // Reject if the name contains a URL, anchor tag, or 3+ consecutive digits
  if (/https?:\/\/|www\.|<a /i.test(name)) return false;
  if (/\d{3,}/.test(name))                return false;
  return true;
}

function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  var domain = email.split('@')[1] || '';
  if (DISPOSABLE_DOMAINS.indexOf(domain) !== -1) return false;
  return true;
}

// Physical-plausibility check for calculator submissions.
// Any field that is present must fall within realistic human ranges;
// optional fields (waist, neck, hip) are allowed to be empty.
function isPhysicallyPlausible(p) {
  function inRange(val, min, max) {
    if (val === '' || val == null || val === undefined) return true; // optional
    var n = parseFloat(String(val));
    return isFinite(n) && n >= min && n <= max;
  }
  if (!inRange(p.age,    10,  100)) return false;
  if (!inRange(p.height, 100, 250)) return false;
  if (!inRange(p.weight,  30, 300)) return false;
  if (!inRange(p.neck,    20,  70)) return false;
  if (!inRange(p.waist,   40, 200)) return false;
  if (!inRange(p.hip,     40, 200)) return false;
  return true;
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Uses CacheService (shared, survives across requests in the same script execution
// environment). Two windows per email:
//   60 s  — max 1 submission (dedup accidental double-submit)
//   1 h   — max 5 submissions (sustained abuse)
function isRateLimited(email) {
  var cache = CacheService.getScriptCache();
  var now   = Date.now();
  var MINUTE = 60 * 1000;
  var HOUR   = 60 * MINUTE;

  function hitLimit(key, windowMs, max) {
    var stored = cache.get(key);
    var ttlSec = Math.ceil(windowMs / 1000);
    if (!stored) {
      cache.put(key, JSON.stringify({ ts: now, count: 1 }), ttlSec);
      return false;
    }
    var data = JSON.parse(stored);
    if (now - data.ts > windowMs) {
      // Window expired — reset
      cache.put(key, JSON.stringify({ ts: now, count: 1 }), ttlSec);
      return false;
    }
    if (data.count >= max) return true; // over the limit
    data.count++;
    var remaining = Math.max(1, Math.ceil((windowMs - (now - data.ts)) / 1000));
    cache.put(key, JSON.stringify(data), remaining);
    return false;
  }

  // Safe key prefix — cache keys are namespace-isolated per script
  var safeEmail = email.replace(/[^a-z0-9@._-]/g, '_').substring(0, 60);
  if (hitLimit('rl:60:'  + safeEmail, MINUTE, 1)) return true;
  if (hitLimit('rl:1h:'  + safeEmail, HOUR,   5)) return true;
  return false;
}

// ── SHEET WRITE ───────────────────────────────────────────────────────────────
function appendToSheet(source, row) {
  var ssId = PropertiesService.getScriptProperties()
               .getProperty('SPREADSHEET_ID');
  var ss = ssId
    ? SpreadsheetApp.openById(ssId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return; // no spreadsheet bound — skip silently

  var tabName = source === 'waitlist'   ? 'Waitlist'
              : source === 'contact'    ? 'Contact'
                                        : 'Calculator';
  var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  sheet.appendRow(row);
}

// ── ROW BUILDER ───────────────────────────────────────────────────────────────
function buildRow(source, p, name, email) {
  var now = new Date();
  if (source === 'waitlist') {
    return [now, name, email, p.mobile || '', p.country || ''];
  }
  if (source === 'contact') {
    return [now, name, email, p.message || ''];
  }
  // calculator
  return [
    now, name, email,
    p.gender || '', p.age || '', p.height || '', p.weight || '',
    p.neck   || '', p.waist || '', p.hip   || '', p.activity || '',
    p.bmi || '', p.bfp || '', p.ibw || '', p.tdee || '',
  ];
}

// ── EMAIL NOTIFICATION ────────────────────────────────────────────────────────
function sendNotification(source, p, name, email) {
  var emailTo = PropertiesService.getScriptProperties()
                  .getProperty('EMAIL_TO') || 'mans_ali@hotmail.com';
  var subject, body;

  if (source === 'waitlist') {
    subject = '[WYBE] New Waitlist: ' + name;
    body    = 'Name:    ' + name    + '\n'
            + 'Email:   ' + email   + '\n'
            + 'Mobile:  ' + (p.mobile  || '—') + '\n'
            + 'Country: ' + (p.country || '—');
  } else if (source === 'contact') {
    subject = '[WYBE] New Contact: ' + name;
    body    = 'Name:    ' + name  + '\n'
            + 'Email:   ' + email + '\n\n'
            + 'Message:\n' + (p.message || '');
  } else {
    subject = '[WYBE] New Calculator: ' + name;
    body    = 'Name:     ' + name         + '\n'
            + 'Email:    ' + email         + '\n'
            + 'Gender:   ' + (p.gender   || '—') + '\n'
            + 'Age:      ' + (p.age      || '—') + '\n'
            + 'Height:   ' + (p.height   || '—') + ' cm\n'
            + 'Weight:   ' + (p.weight   || '—') + ' kg\n'
            + 'Neck:     ' + (p.neck     || '—') + ' cm\n'
            + 'Waist:    ' + (p.waist    || '—') + ' cm\n'
            + 'Hip:      ' + (p.hip      || '—') + ' cm\n'
            + 'Activity: ' + (p.activity || '—') + '\n\n'
            + 'BMI:  '     + (p.bmi      || '—') + '\n'
            + 'BFP:  '     + (p.bfp      || '—') + '%\n'
            + 'IBW:  '     + (p.ibw      || '—') + ' kg\n'
            + 'TDEE: '     + (p.tdee     || '—') + ' kcal';
  }

  MailApp.sendEmail(emailTo, subject, body);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
// Always return HTTP 200 — bots must learn nothing from the response code.
// The calculator client reads json.success; all other forms use no-cors and
// ignore the body entirely.
function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// For Turnstile failures on the calculator the client reads the response,
// so we surface a user-visible error.
function failOk(reason) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: reason }))
    .setMimeType(ContentService.MimeType.JSON);
}
