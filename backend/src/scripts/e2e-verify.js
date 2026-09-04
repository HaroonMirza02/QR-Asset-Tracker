'use strict';

/**
 * End-to-end verification script.
 * Runs against a live server at APP_BASE_URL.
 * Prints a pass/fail report for every check.
 *
 * Usage:
 *   node src/scripts/e2e-verify.js
 *
 * Requires the server to be running and the DB seeded.
 */

require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const BASE      = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TENANT_ID = process.env.E2E_TENANT_ID || '';

let passed = 0;
let failed = 0;

function ok(label, got, expected) {
  const match = JSON.stringify(got) === JSON.stringify(expected);
  if (match) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       got:      ${JSON.stringify(got)}`);
    failed++;
  }
}

function okTruthy(label, val) {
  if (val) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}  (got: ${JSON.stringify(val)})`);
    failed++;
  }
}

function okFalsy(label, val) {
  if (!val) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}  (should be absent/falsy, got: ${JSON.stringify(val)})`);
    failed++;
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function request(method, url, body, headers = {}) {
  return new Promise((resolve) => {
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || 80,
      path:     parsed.pathname + parsed.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const payload = body ? JSON.stringify(body) : undefined;
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  if (!TENANT_ID) {
    console.error('ERROR: Set E2E_TENANT_ID env var to the seeded tenant _id before running.');
    console.error('       The seed script prints it. Example:');
    console.error('       $env:E2E_TENANT_ID="6a9a5fd1f3a1e19f2739a35c"');
    process.exit(1);
  }

  console.log(`\nE2E Verification — ${BASE}   tenant=${TENANT_ID}\n`);

  // ── 1. Login ────────────────────────────────────────────────────────────────
  console.log('── 1. Auth ─────────────────────────────────────────────────────');

  const login = await request('POST', `${BASE}/api/auth/login`, {
    email: 'admin@meridian-ops.example', password: 'Admin1234!',
  });
  ok('POST /api/auth/login → 200', login.status, 200);
  okTruthy('token returned', login.body.data?.token);
  ok('role is Admin', login.body.data?.user?.role, 'Admin');
  okFalsy('passwordHash absent', login.body.data?.user?.passwordHash);
  okFalsy('tenantId absent from login response', login.body.data?.user?.tenantId);

  const ADMIN_TOKEN = login.body.data.token;
  const AH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

  const vLogin = await request('POST', `${BASE}/api/auth/login`, {
    email: 'viewer@meridian-ops.example', password: 'Viewer1234!',
  });
  ok('Viewer login → 200', vLogin.status, 200);
  ok('Viewer role', vLogin.body.data?.user?.role, 'Viewer');
  const VIEWER_TOKEN = vLogin.body.data.token;
  const VH = { Authorization: `Bearer ${VIEWER_TOKEN}` };

  const badLogin = await request('POST', `${BASE}/api/auth/login`, {
    email: 'admin@meridian-ops.example', password: 'wrongpassword',
  });
  ok('Wrong password → 401', badLogin.status, 401);
  ok('Wrong password code = UNAUTHORIZED', badLogin.body.error?.code, 'UNAUTHORIZED');

  const unknownLogin = await request('POST', `${BASE}/api/auth/login`, {
    email: 'nobody@example.com', password: 'x',
  });
  ok('Unknown email → same 401 (no enumeration)', unknownLogin.body.error?.code, 'UNAUTHORIZED');

  const missingEmail = await request('POST', `${BASE}/api/auth/login`, { password: 'x' });
  ok('Missing email → 422', missingEmail.status, 422);

  // ── 2. Assets — list ────────────────────────────────────────────────────────
  console.log('\n── 2. Asset List ───────────────────────────────────────────────');

  const listResp = await request('GET', `${BASE}/api/assets?limit=25`, null, AH);
  ok('GET /api/assets → 200', listResp.status, 200);
  okTruthy('at least 24 seeded assets (≥24)', listResp.body.meta?.total >= 24);
  okFalsy('qrToken absent from list', listResp.body.data?.[0]?.qrToken);
  okFalsy('tenantId absent from list', listResp.body.data?.[0]?.tenantId);

  const emptySearch = await request('GET', `${BASE}/api/assets?search=zzznomatch`, null, AH);
  ok('EC-10: no-match search → 200 (not 404)', emptySearch.status, 200);
  ok('EC-10: data is empty array', emptySearch.body.data?.length, 0);

  const badStatus = await request('GET', `${BASE}/api/assets?status=Broken`, null, AH);
  ok('Invalid status filter → 422', badStatus.status, 422);

  const noToken = await request('GET', `${BASE}/api/assets`);
  ok('EC-09: no token → 401', noToken.status, 401);
  ok('EC-09: code = UNAUTHORIZED', noToken.body.error?.code, 'UNAUTHORIZED');

  // ── 3. Asset — create ────────────────────────────────────────────────────────
  console.log('\n── 3. Create Asset ─────────────────────────────────────────────');

  const createResp = await request('POST', `${BASE}/api/assets`, {
    name: 'E2E Verification Laptop', category: 'Laptop', description: 'Created by e2e script',
  }, AH);
  ok('POST /api/assets → 201', createResp.status, 201);
  okTruthy('assetCode generated (AST-format)', createResp.body.data?.assetCode?.match(/^AST\d{4}$/));
  ok('status defaults to Available', createResp.body.data?.status, 'Available');
  okTruthy('qrToken is 64-char hex', createResp.body.data?.qrToken?.match(/^[0-9a-f]{64}$/));
  okTruthy('qrCodeUrl contains token', createResp.body.data?.qrCodeUrl?.includes(createResp.body.data?.qrToken));
  okTruthy('qrCodeUrl contains tenantId', createResp.body.data?.qrCodeUrl?.includes(TENANT_ID));
  okFalsy('tenantId absent from create response', createResp.body.data?.tenantId);
  ok('assignedEmployeeId null', createResp.body.data?.assignedEmployeeId, null);
  ok('assignedLocationId null', createResp.body.data?.assignedLocationId, null);

  const E2E_ASSET_ID  = createResp.body.data.id;
  const E2E_QR_TOKEN  = createResp.body.data.qrToken;
  const E2E_QR_URL    = createResp.body.data.qrCodeUrl;

  // EC-01: duplicate assetCode
  const createDup = await request('POST', `${BASE}/api/assets`, {
    name: 'Dup1', category: 'Tool', assetCode: 'E2EDUP',
  }, AH);
  const createDup2 = await request('POST', `${BASE}/api/assets`, {
    name: 'Dup2', category: 'Tool', assetCode: 'E2EDUP',
  }, AH);
  ok('EC-01: duplicate assetCode → 409', createDup2.status, 409);
  ok('EC-01: code = CONFLICT', createDup2.body.error?.code, 'CONFLICT');

  const viewerCreate = await request('POST', `${BASE}/api/assets`, {
    name: 'Blocked', category: 'Laptop',
  }, VH);
  ok('EC-08: Viewer create → 403', viewerCreate.status, 403);
  ok('EC-08: code = FORBIDDEN', viewerCreate.body.error?.code, 'FORBIDDEN');

  const missingName = await request('POST', `${BASE}/api/assets`, { category: 'Laptop' }, AH);
  ok('422 missing name', missingName.status, 422);

  // ── 4. Asset — get single ────────────────────────────────────────────────────
  console.log('\n── 4. Get Single Asset ─────────────────────────────────────────');

  const getResp = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}`, null, AH);
  ok('GET /api/assets/:id → 200', getResp.status, 200);
  okTruthy('qrToken present (authenticated)', getResp.body.data?.qrToken);
  okFalsy('tenantId absent', getResp.body.data?.tenantId);

  const viewerGet = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}`, null, VH);
  ok('Viewer GET /api/assets/:id → 200', viewerGet.status, 200);
  okTruthy('Viewer also receives qrToken', viewerGet.body.data?.qrToken);

  const crossGet = await request('GET', `${BASE}/api/assets/000000000000000000000001`, null, AH);
  ok('GET unknown asset → 404', crossGet.status, 404);

  // ── 5. QR Code image ─────────────────────────────────────────────────────────
  console.log('\n── 5. QR Code Image ─────────────────────────────────────────────');

  const regenResp = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/qr/regenerate`, {}, AH);
  ok('POST /qr/regenerate → 200', regenResp.status, 200);
  const NEW_TOKEN = regenResp.body.data?.qrToken;
  okTruthy('new token differs from old', NEW_TOKEN && NEW_TOKEN !== E2E_QR_TOKEN);
  okTruthy('new token is 64-char hex', NEW_TOKEN?.match(/^[0-9a-f]{64}$/));
  okTruthy('qrCodeImageBase64 present', regenResp.body.data?.qrCodeImageBase64);

  const imgDataUrl = regenResp.body.data?.qrCodeImageBase64 || '';
  ok('image starts with data:image/png;base64,', imgDataUrl.startsWith('data:image/png;base64,'), true);

  // Decode and verify PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
  const b64    = imgDataUrl.replace('data:image/png;base64,', '');
  const bytes  = Buffer.from(b64, 'base64');
  const magic  = bytes.slice(0, 8).toString('hex');
  ok('PNG magic bytes correct (89504e470d0a1a0a)', magic, '89504e470d0a1a0a');
  okTruthy('image size reasonable (>1 KB)', bytes.length > 1024);

  // Save for manual inspection
  const imgOut = path.join(__dirname, '../../qr-e2e-output.png');
  fs.writeFileSync(imgOut, bytes);
  console.log(`  ℹ  QR image saved → ${imgOut}  (${bytes.length} bytes, open to visually confirm)`);

  // Old token must now be invalid
  const oldScan = await request('GET', `${BASE}/api/public/scan/${E2E_QR_TOKEN}?t=${TENANT_ID}`);
  ok('Old token after regen → 404', oldScan.status, 404);

  // New token must resolve
  const newScan = await request('GET', `${BASE}/api/public/scan/${NEW_TOKEN}?t=${TENANT_ID}`);
  ok('New token after regen → 200', newScan.status, 200);

  // Viewer cannot regenerate
  const viewerRegen = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/qr/regenerate`, {}, VH);
  ok('Viewer regen → 403', viewerRegen.status, 403);

  // includeQrImage=true — Admin gets image, Viewer does not
  const adminWithImg = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}?includeQrImage=true`, null, AH);
  okTruthy('Admin ?includeQrImage=true gets qrCodeImageBase64', adminWithImg.body.data?.qrCodeImageBase64?.startsWith('data:image/png'));
  const viewerWithImg = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}?includeQrImage=true`, null, VH);
  okFalsy('Viewer ?includeQrImage=true does NOT get qrCodeImageBase64', viewerWithImg.body.data?.qrCodeImageBase64);

  // ── 6. Public scan edge cases ─────────────────────────────────────────────
  console.log('\n── 6. Public Scan Edge Cases ───────────────────────────────────');

  // EC-02: token not found
  const ec02 = await request('GET', `${BASE}/api/public/scan/${'a'.repeat(64)}?t=${TENANT_ID}`);
  ok('EC-02: unknown token → 404', ec02.status, 404);
  ok('EC-02: code = NOT_FOUND', ec02.body.error?.code, 'NOT_FOUND');

  // EC-03: malformed token (not 64-char hex)
  const ec03a = await request('GET', `${BASE}/api/public/scan/not-a-valid-token?t=${TENANT_ID}`);
  ok('EC-03: malformed token → 404 (not 422)', ec03a.status, 404);
  ok('EC-03: code = NOT_FOUND (not VALIDATION_ERROR)', ec03a.body.error?.code, 'NOT_FOUND');

  const ec03b = await request('GET', `${BASE}/api/public/scan/${'A'.repeat(64)}?t=${TENANT_ID}`);
  ok('EC-03: uppercase hex → 404', ec03b.status, 404);

  const ec03c = await request('GET', `${BASE}/api/public/scan/tooshort?t=${TENANT_ID}`);
  ok('EC-03: short token → 404', ec03c.status, 404);

  // EC-04: isPublicVisible=false — get AST0005 (Retired + hidden)
  const hiddenList = await request('GET', `${BASE}/api/assets?search=AST0005`, null, AH);
  const hiddenId   = hiddenList.body.data?.[0]?.id;
  const hiddenFull = await request('GET', `${BASE}/api/assets/${hiddenId}`, null, AH);
  const hiddenToken = hiddenFull.body.data?.qrToken;
  ok('Hidden asset isPublicVisible = false', hiddenFull.body.data?.isPublicVisible, false);
  const ec04 = await request('GET', `${BASE}/api/public/scan/${hiddenToken}?t=${TENANT_ID}`);
  ok('EC-04: hidden asset → 404', ec04.status, 404);
  ok('EC-04: same 404 shape (not leaking)', ec04.body.error?.code, 'NOT_FOUND');

  // Retired but visible (§4 decision) - get AST0024
  const retiredList = await request('GET', `${BASE}/api/assets?search=Axis+P3`, null, AH);
  const retiredId   = retiredList.body.data?.[0]?.id;
  const retiredFull = await request('GET', `${BASE}/api/assets/${retiredId}`, null, AH);
  const retiredToken = retiredFull.body.data?.qrToken;
  // AST0024 is both Retired AND isPublicVisible=false — should 404
  ok('Retired + hidden (AST0024) → 404', (await request('GET', `${BASE}/api/public/scan/${retiredToken}?t=${TENANT_ID}`)).status, 404);

  // Get a Retired but visible asset for the §4 scan test
  // AST0005 is Retired+hidden, so use one we retire live during this run
  // (The E2E asset was already set to Available, let's scan it — it's alive and visible)
  const liveScan = await request('GET', `${BASE}/api/public/scan/${NEW_TOKEN}?t=${TENANT_ID}`);
  ok('Valid visible asset → 200', liveScan.status, 200);
  okFalsy('Public profile has no id', liveScan.body.data?.id);
  okFalsy('Public profile has no qrToken', liveScan.body.data?.qrToken);
  okFalsy('Public profile has no tenantId', liveScan.body.data?.tenantId);
  okTruthy('Public profile has assetCode', liveScan.body.data?.assetCode);
  okTruthy('Public profile has name', liveScan.body.data?.name);
  okTruthy('Public profile has status', liveScan.body.data?.status);

  // Missing ?t= → 422
  const noTenant = await request('GET', `${BASE}/api/public/scan/${NEW_TOKEN}`);
  ok('Missing ?t= → 422', noTenant.status, 422);

  // ── 7. Assign / Unassign ─────────────────────────────────────────────────────
  console.log('\n── 7. Assign / Unassign ────────────────────────────────────────');

  const empList  = await request('GET', `${BASE}/api/employees?status=active&limit=1`, null, AH);
  const EMP_ID   = empList.body.data?.[0]?.id;
  const locList  = await request('GET', `${BASE}/api/locations?limit=1`, null, AH);
  const LOC_ID   = locList.body.data?.[0]?.id;

  const assignEmp = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, {
    employeeId: EMP_ID, note: 'E2E assign test',
  }, AH);
  ok('Assign to employee → 200', assignEmp.status, 200);
  ok('status → Assigned', assignEmp.body.data?.status, 'Assigned');
  ok('assignedEmployeeId set', assignEmp.body.data?.assignedEmployeeId, EMP_ID);
  ok('assignedLocationId null', assignEmp.body.data?.assignedLocationId, null);

  // EC-05: re-assign without unassign
  const ec05 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { employeeId: EMP_ID }, AH);
  ok('EC-05: already-assigned → 409', ec05.status, 409);
  ok('EC-05: code = CONFLICT', ec05.body.error?.code, 'CONFLICT');

  // EC-06: both employeeId and locationId
  const ec06 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, {
    employeeId: EMP_ID, locationId: LOC_ID,
  }, AH);
  ok('EC-06: both ids → 422', ec06.status, 422);
  ok('EC-06: code = VALIDATION_ERROR', ec06.body.error?.code, 'VALIDATION_ERROR');

  // EC-06: neither
  const ec06b = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { note: 'nothing' }, AH);
  ok('EC-06: neither id → 422', ec06b.status, 422);

  // Unassign
  const unassign = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/unassign`, { note: 'E2E unassign' }, AH);
  ok('Unassign → 200', unassign.status, 200);
  ok('status → Available', unassign.body.data?.status, 'Available');
  ok('assignedEmployeeId null', unassign.body.data?.assignedEmployeeId, null);

  // Idempotent unassign
  const unassign2 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/unassign`, {}, AH);
  ok('Idempotent unassign → 200', unassign2.status, 200);

  // EC-11: assign to inactive employee
  const inactiveEmpList = await request('GET', `${BASE}/api/employees?status=inactive&limit=1`, null, AH);
  const INACTIVE_EMP_ID = inactiveEmpList.body.data?.[0]?.id;
  const ec11 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { employeeId: INACTIVE_EMP_ID }, AH);
  ok('EC-11: inactive employee → 409', ec11.status, 409);
  ok('EC-11: code = CONFLICT', ec11.body.error?.code, 'CONFLICT');

  // Assign to location
  const assignLoc = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { locationId: LOC_ID }, AH);
  ok('Assign to location → 200', assignLoc.status, 200);
  ok('assignedLocationId set', assignLoc.body.data?.assignedLocationId, LOC_ID);
  ok('assignedEmployeeId null', assignLoc.body.data?.assignedEmployeeId, null);

  // Unassign again before status tests
  await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/unassign`, {}, AH);

  // ── 8. Status change ─────────────────────────────────────────────────────────
  console.log('\n── 8. Status Change ────────────────────────────────────────────');

  const statusInRepair = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, {
    status: 'In Repair', note: 'screen cracked',
  }, AH);
  ok('Status → In Repair: 200', statusInRepair.status, 200);
  ok('status field updated', statusInRepair.body.data?.status, 'In Repair');

  const statusLost = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, { status: 'Lost' }, AH);
  ok('Status → Lost: 200', statusLost.status, 200);

  // EC-13: Available while technically checking — re-assign first
  await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, { status: 'Available' }, AH);
  const assignForEc13 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { employeeId: EMP_ID }, AH);
  ok('Re-assign (for EC-13 setup) → 200', assignForEc13.status, 200);

  const ec13 = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, { status: 'Available' }, AH);
  ok('EC-13: Available while assigned → 409', ec13.status, 409);
  ok('EC-13: code = CONFLICT', ec13.body.error?.code, 'CONFLICT');

  await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/unassign`, {}, AH);

  // EC-07: Retire then try to mutate
  await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, { status: 'Retired' }, AH);

  const ec07Status = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/status`, { status: 'Available' }, AH);
  ok('EC-07: status on Retired → 409', ec07Status.status, 409);
  ok('EC-07: code = CONFLICT', ec07Status.body.error?.code, 'CONFLICT');

  const ec07Assign = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/assign`, { employeeId: EMP_ID }, AH);
  ok('EC-07: assign on Retired → 409', ec07Assign.status, 409);

  const ec07Unassign = await request('POST', `${BASE}/api/assets/${E2E_ASSET_ID}/unassign`, {}, AH);
  ok('EC-07: unassign on Retired → 409', ec07Unassign.status, 409);

  // ── 9. History ────────────────────────────────────────────────────────────────
  console.log('\n── 9. History ───────────────────────────────────────────────────');

  const hist = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}/history?limit=50`, null, AH);
  ok('GET /history → 200', hist.status, 200);
  okTruthy('history has records', hist.body.data?.length > 0);
  okFalsy('tenantId absent from history', hist.body.data?.[0]?.tenantId);

  const eventTypes = hist.body.data.map(e => e.eventType);
  okTruthy('Created event present', eventTypes.includes('Created'));
  okTruthy('AssignedToEmployee event present', eventTypes.includes('AssignedToEmployee'));
  okTruthy('Unassigned event present', eventTypes.includes('Unassigned'));
  okTruthy('StatusChange event present', eventTypes.includes('StatusChange'));
  okTruthy('AssignedToLocation event present', eventTypes.includes('AssignedToLocation'));

  const viewerHist = await request('GET', `${BASE}/api/assets/${E2E_ASSET_ID}/history`, null, VH);
  ok('Viewer GET /history → 200', viewerHist.status, 200);

  const notFoundHist = await request('GET', `${BASE}/api/assets/000000000000000000000001/history`, null, AH);
  ok('History for nonexistent asset → 404', notFoundHist.status, 404);

  // ── 10. Employees ─────────────────────────────────────────────────────────────
  console.log('\n── 10. Employees ────────────────────────────────────────────────');

  const empListAll = await request('GET', `${BASE}/api/employees`, null, AH);
  ok('GET /api/employees → 200', empListAll.status, 200);
  okFalsy('contactInfo absent from list (Admin)', empListAll.body.data?.[0]?.contactInfo);

  const viewerEmpList = await request('GET', `${BASE}/api/employees`, null, VH);
  ok('Viewer GET /api/employees → 200', viewerEmpList.status, 200);
  okFalsy('contactInfo absent from list (Viewer)', viewerEmpList.body.data?.[0]?.contactInfo);

  const adminEmpDetail = await request('GET', `${BASE}/api/employees/${EMP_ID}`, null, AH);
  ok('Admin GET /employees/:id → 200', adminEmpDetail.status, 200);
  okTruthy('Admin sees contactInfo', adminEmpDetail.body.data?.contactInfo);

  const viewerEmpDetail = await request('GET', `${BASE}/api/employees/${EMP_ID}`, null, VH);
  ok('Viewer GET /employees/:id → 200', viewerEmpDetail.status, 200);
  okFalsy('Viewer does NOT see contactInfo', viewerEmpDetail.body.data?.contactInfo);

  okFalsy('tenantId absent from employee', adminEmpDetail.body.data?.tenantId);

  // ── 11. Locations ──────────────────────────────────────────────────────────────
  console.log('\n── 11. Locations ─────────────────────────────────────────────────');

  const locListAll = await request('GET', `${BASE}/api/locations`, null, AH);
  ok('GET /api/locations → 200', locListAll.status, 200);
  ok('5 seeded locations', locListAll.body.meta?.total, 5);
  okFalsy('tenantId absent from location', locListAll.body.data?.[0]?.tenantId);

  const locDetail = await request('GET', `${BASE}/api/locations/${LOC_ID}`, null, VH);
  ok('Viewer GET /locations/:id → 200', locDetail.status, 200);

  const locNotFound = await request('GET', `${BASE}/api/locations/000000000000000000000001`, null, AH);
  ok('Unknown location → 404', locNotFound.status, 404);

  // ── 12. Role guard sweep ────────────────────────────────────────────────────
  console.log('\n── 12. Role Guard Sweep (Viewer cannot write) ──────────────────');

  const viewerBlocked = [
    ['POST', `/api/assets`,                                    { name: 'x', category: 'Laptop' }],
    ['PATCH',`/api/assets/${E2E_ASSET_ID}`,                   { name: 'y' }],
    ['POST', `/api/assets/${E2E_ASSET_ID}/assign`,             { employeeId: EMP_ID }],
    ['POST', `/api/assets/${E2E_ASSET_ID}/unassign`,           {}],
    ['POST', `/api/assets/${E2E_ASSET_ID}/status`,             { status: 'In Repair' }],
    ['POST', `/api/assets/${E2E_ASSET_ID}/qr/regenerate`,      {}],
  ];
  for (const [method, path, body] of viewerBlocked) {
    const r = await request(method, `${BASE}${path}`, body, VH);
    ok(`EC-08: Viewer ${method} ${path} → 403`, r.status, 403);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  ALL CHECKS PASSED ✓');
  } else {
    console.log('  SOME CHECKS FAILED ✗ — review output above');
  }
  console.log('══════════════════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
