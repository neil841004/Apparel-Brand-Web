const SHEET_NAME = 'stores';
const ADMIN_TOKEN_PROPERTY = 'ADMIN_TOKEN';
const HEADERS = ['name', 'url', 'domain', 'stars', 'price', 'cat', 'note', 'lastVisitedAt', 'enabled'];

function doGet() {
  const stores = readStores_();
  return json_({
    updatedAt: new Date().toISOString(),
    stores,
  });
}

function doPost(e) {
  const payload = parsePayload_(e);
  verifyToken_(payload.token);

  if (payload.action === 'replaceAll') {
    const stores = Array.isArray(payload.stores) ? payload.stores : [];
    writeStores_(stores);

    return json_({
      ok: true,
      updatedAt: new Date().toISOString(),
      count: stores.length,
    });
  }

  if (payload.action === 'updateVisit') {
    updateVisit_(payload.url, payload.visitedAt);

    return json_({
      ok: true,
      updatedAt: new Date().toISOString(),
    });
  }

  throw new Error('Unsupported action.');
}

function readStores_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(String);
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const item = {};
      headers.forEach((key, i) => {
        item[key] = row[i];
      });

      return {
        name: String(item.name || '').trim(),
        url: String(item.url || '').trim(),
        domain: String(item.domain || '').trim(),
        stars: Number(item.stars || 0),
        price: Number(item.price || 1),
        cat: String(item.cat || '').trim(),
        note: String(item.note || '').trim(),
        lastVisitedAt: formatTimestamp_(item.lastVisitedAt),
        enabled: item.enabled !== false && String(item.enabled).toUpperCase() !== 'FALSE',
      };
    })
    .filter(item => item.name && item.url && item.enabled)
    .map(({ enabled, ...item }) => {
      if (!item.note) delete item.note;
      return item;
    });
}

function writeStores_(stores) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const rows = stores
      .map(normalizeStore_)
      .filter(store => store.name && store.url)
      .map(store => [
        store.name,
        store.url,
        store.domain,
        store.stars,
        store.price,
        store.cat,
        store.note,
        store.lastVisitedAt,
        true,
      ]);

    sheet.clearContents();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }
}

function normalizeStore_(store) {
  return {
    name: String(store.name || '').trim(),
    url: String(store.url || '').trim(),
    domain: String(store.domain || '').trim(),
    stars: Number(store.stars || 0),
    price: Number(store.price || 1),
    cat: String(store.cat || '').trim(),
    note: String(store.note || '').trim(),
    lastVisitedAt: formatTimestamp_(store.lastVisitedAt),
  };
}

function updateVisit_(url, visitedAt) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) throw new Error('Missing url.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const urlCol = headers.indexOf('url') + 1;
    const visitCol = headers.indexOf('lastVisitedAt') + 1;
    if (!urlCol || !visitCol) throw new Error('Missing url or lastVisitedAt column.');

    for (let row = 2; row <= values.length; row++) {
      const rowUrl = String(values[row - 1][urlCol - 1] || '').trim();
      if (rowUrl === targetUrl) {
        sheet.getRange(row, visitCol).setValue(formatTimestamp_(visitedAt || new Date()));
        return;
      }
    }

    throw new Error('Store url not found.');
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0].map(String);
  HEADERS.forEach((header, index) => {
    if (current[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function formatTimestamp_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }
  return JSON.parse(e.postData.contents);
}

function verifyToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_TOKEN_PROPERTY);
  if (!expected) {
    throw new Error(`Missing script property: ${ADMIN_TOKEN_PROPERTY}`);
  }
  if (token !== expected) {
    throw new Error('Unauthorized.');
  }
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet not found: ${SHEET_NAME}`);
  return sheet;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
