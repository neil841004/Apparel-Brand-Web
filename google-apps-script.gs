const SHEET_NAME = 'stores';
const ADMIN_TOKEN_PROPERTY = 'ADMIN_TOKEN';
const HEADERS = ['name', 'url', 'domain', 'stars', 'price', 'cat', 'note', 'enabled'];

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

  if (payload.action !== 'replaceAll') {
    throw new Error('Unsupported action.');
  }

  const stores = Array.isArray(payload.stores) ? payload.stores : [];
  writeStores_(stores);

  return json_({
    ok: true,
    updatedAt: new Date().toISOString(),
    count: stores.length,
  });
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
  };
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
