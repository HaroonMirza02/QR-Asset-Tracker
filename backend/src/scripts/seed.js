'use strict';

/**
 * Seed script — creates a realistic but generic demo dataset.
 *
 * What is created:
 *   - 1 tenant (generic, not tied to any real company)
 *   - 1 Admin user + 1 Viewer user
 *   - 8 employees across several departments
 *   - 5 locations across several types
 *   - 24 assets across all 5 categories, covering every status value, with
 *     a mix of public/private visibility and a mix of assignment states
 *
 * Run:
 *   node src/scripts/seed.js
 *
 * The script is idempotent within a run: it drops and recreates all data for
 * the seeded tenant slug. Re-running it will wipe and recreate that tenant's
 * data. It will NOT touch other tenants.
 *
 * Credentials printed to stdout on completion so they are easy to copy.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const { hashPassword } = require('../services/authService');
const qrService = require('../services/qrService');

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Asset = require('../models/Asset');
const AssetHistory = require('../models/AssetHistory');

// ── Seed data definitions ─────────────────────────────────────────────────────

const TENANT_SLUG = 'meridian-ops';

const ADMIN_EMAIL = 'admin@meridian-ops.example';
const ADMIN_PASSWORD = 'Admin1234!';
const VIEWER_EMAIL = 'viewer@meridian-ops.example';
const VIEWER_PASSWORD = 'Viewer1234!';

const EMPLOYEE_SEED = [
  { name: 'Alice Fernandez',  title: 'Operations Manager',   department: 'Operations', contactInfo: { email: 'alice.f@meridian-ops.example',  phone: '+1-555-0101' }, status: 'active' },
  { name: 'Ben Okafor',       title: 'Field Technician',     department: 'Operations', contactInfo: { email: 'ben.o@meridian-ops.example',     phone: '+1-555-0102' }, status: 'active' },
  { name: 'Clara Petrov',     title: 'Finance Analyst',      department: 'Finance',    contactInfo: { email: 'clara.p@meridian-ops.example',   phone: '+1-555-0103' }, status: 'active' },
  { name: 'David Nguyen',     title: 'IT Systems Engineer',  department: 'IT',         contactInfo: { email: 'david.n@meridian-ops.example',   phone: '+1-555-0104' }, status: 'active' },
  { name: 'Esther Malik',     title: 'Logistics Coordinator',department: 'Logistics',  contactInfo: { email: 'esther.m@meridian-ops.example',  phone: '+1-555-0105' }, status: 'active' },
  { name: 'Frank Torres',     title: 'Warehouse Supervisor', department: 'Logistics',  contactInfo: { email: 'frank.t@meridian-ops.example',   phone: '+1-555-0106' }, status: 'active' },
  { name: 'Grace Kim',        title: 'HR Coordinator',       department: 'HR',         contactInfo: { email: 'grace.k@meridian-ops.example',   phone: '+1-555-0107' }, status: 'active' },
  { name: 'Hassan Al-Rashid', title: 'Junior Technician',    department: 'Operations', contactInfo: { email: 'hassan.a@meridian-ops.example',  phone: '+1-555-0108' }, status: 'inactive' },
];

const LOCATION_SEED = [
  { name: 'HQ Campus',           type: 'site',     address: '100 Corporate Drive, Metro City, MC 10001' },
  { name: 'Building A — East',   type: 'building', address: '100 Corporate Drive, Wing A, Metro City'  },
  { name: 'Warehouse District',  type: 'site',     address: '45 Industrial Parkway, Metro City, MC 10005' },
  { name: 'Warehouse B',         type: 'building', address: '45 Industrial Parkway, Unit B, Metro City' },
  { name: 'Server Room 1',       type: 'room',     address: 'Building A — Basement, Metro City' },
];

// Asset definitions. assignTo resolved to actual IDs after employees/locations
// are inserted. Indexes into EMPLOYEE_SEED / LOCATION_SEED arrays (0-based).
const ASSET_SEED = [
  // ── Laptops ──────────────────────────────────────────────────────────────
  { name: 'Dell Latitude 5540',      category: 'Laptop',    serialNumber: 'SN-DL5540-001', description: 'Standard employee laptop',          status: 'Assigned',   assignType: 'employee', assignIdx: 0, isPublicVisible: true  },
  { name: 'Dell Latitude 5540',      category: 'Laptop',    serialNumber: 'SN-DL5540-002', description: 'Standard employee laptop',          status: 'Assigned',   assignType: 'employee', assignIdx: 3, isPublicVisible: true  },
  { name: 'MacBook Pro 14" M3',      category: 'Laptop',    serialNumber: 'SN-MBP14-001',  description: 'Engineering workstation',           status: 'Available',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Lenovo ThinkPad X1',      category: 'Laptop',    serialNumber: 'SN-TPX1-001',   description: 'Finance team laptop',               status: 'In Repair',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'HP EliteBook 840',        category: 'Laptop',    serialNumber: 'SN-HP840-001',  description: 'Retired — end of life',             status: 'Retired',    assignType: null,       assignIdx: null, isPublicVisible: false },

  // ── Vehicles ─────────────────────────────────────────────────────────────
  { name: 'Ford Transit Cargo Van',  category: 'Vehicle',   serialNumber: 'VIN-FT2024-001', description: 'Field operations transport',       status: 'Assigned',   assignType: 'employee', assignIdx: 1, isPublicVisible: true  },
  { name: 'Toyota HiLux Pickup',     category: 'Vehicle',   serialNumber: 'VIN-THL2023-001',description: 'Warehouse delivery vehicle',       status: 'Available',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Electric Forklift FL-20', category: 'Vehicle',   serialNumber: 'SN-EFL20-001',  description: 'Warehouse pallet mover',            status: 'Assigned',   assignType: 'location', assignIdx: 3, isPublicVisible: true  },

  // ── Tools ─────────────────────────────────────────────────────────────────
  { name: 'Fluke 117 Multimeter',    category: 'Tool',      serialNumber: 'SN-FL117-001',  description: 'Electrical diagnostic tool',        status: 'Assigned',   assignType: 'employee', assignIdx: 1, isPublicVisible: true  },
  { name: 'Bosch GSB18V Drill Kit',  category: 'Tool',      serialNumber: 'SN-BSH18-001',  description: 'Cordless drill — operations kit 1', status: 'Available',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Bosch GSB18V Drill Kit',  category: 'Tool',      serialNumber: 'SN-BSH18-002',  description: 'Cordless drill — operations kit 2', status: 'Lost',       assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Label Printer ZD420',     category: 'Tool',      serialNumber: 'SN-ZD420-001',  description: 'Asset label printer',               status: 'Assigned',   assignType: 'location', assignIdx: 4, isPublicVisible: true  },

  // ── Furniture ─────────────────────────────────────────────────────────────
  { name: 'Ergonomic Desk Chair A',  category: 'Furniture', serialNumber: null,            description: 'Height-adjustable — floor 2 pool', status: 'Assigned',   assignType: 'location', assignIdx: 1, isPublicVisible: true  },
  { name: 'Ergonomic Desk Chair B',  category: 'Furniture', serialNumber: null,            description: 'Height-adjustable — floor 2 pool', status: 'Assigned',   assignType: 'employee', assignIdx: 2, isPublicVisible: true  },
  { name: 'Standing Desk Unit 04',   category: 'Furniture', serialNumber: 'SN-STD-004',    description: 'Motorised sit-stand desk',          status: 'Available',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Conference Table CT-12',  category: 'Furniture', serialNumber: 'SN-CT12-001',   description: '12-seat boardroom table',           status: 'Assigned',   assignType: 'location', assignIdx: 1, isPublicVisible: false },

  // ── Equipment ─────────────────────────────────────────────────────────────
  { name: 'Cisco Catalyst 9200 SW',  category: 'Equipment', serialNumber: 'SN-CC9200-001', description: '24-port managed switch — rack 3',  status: 'Assigned',   assignType: 'location', assignIdx: 4, isPublicVisible: true  },
  { name: 'APC Smart-UPS 1500',      category: 'Equipment', serialNumber: 'SN-UPS1500-001',description: 'Server room UPS unit 1',            status: 'Assigned',   assignType: 'location', assignIdx: 4, isPublicVisible: true  },
  { name: 'Epson WorkForce Printer', category: 'Equipment', serialNumber: 'SN-EWF-001',    description: 'Finance floor printer',             status: 'Assigned',   assignType: 'employee', assignIdx: 2, isPublicVisible: true  },
  { name: 'Projector Epson EB-L200', category: 'Equipment', serialNumber: 'SN-EPBL200-001',description: 'Boardroom ceiling projector',       status: 'In Repair',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'iPad Pro 12.9" (5th gen)',category: 'Equipment', serialNumber: 'SN-IPAD12-001', description: 'Field inspection tablet',           status: 'Assigned',   assignType: 'employee', assignIdx: 4, isPublicVisible: true  },
  { name: 'iPad Pro 12.9" (5th gen)',category: 'Equipment', serialNumber: 'SN-IPAD12-002', description: 'Field inspection tablet 2',         status: 'Available',  assignType: null,       assignIdx: null, isPublicVisible: true  },
  { name: 'Barcode Scanner HS-3',    category: 'Equipment', serialNumber: 'SN-HS3-001',    description: 'Warehouse intake scanner',          status: 'Assigned',   assignType: 'location', assignIdx: 3, isPublicVisible: true  },
  { name: 'Security Camera Axis P3', category: 'Equipment', serialNumber: 'SN-AXP3-001',   description: 'Entrance CCTV — retired unit',      status: 'Retired',    assignType: null,       assignIdx: null, isPublicVisible: false },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();
  console.log('\n[seed] Connected to database.\n');

  // ── 1. Upsert tenant ──────────────────────────────────────────────────────
  let tenant = await Tenant.findOne({ slug: TENANT_SLUG });
  if (tenant) {
    console.log(`[seed] Existing tenant found (${tenant._id}). Clearing its data…`);
    const tid = tenant._id;
    await Promise.all([
      Asset.deleteMany({ tenantId: tid }),
      AssetHistory.deleteMany({ tenantId: tid }),
      Employee.deleteMany({ tenantId: tid }),
      Location.deleteMany({ tenantId: tid }),
      User.deleteMany({ tenantId: tid }),
    ]);
  } else {
    tenant = await Tenant.create({
      name: 'Meridian Operational Services',
      slug: TENANT_SLUG,
      isActive: true,
    });
    console.log(`[seed] Tenant created: ${tenant.name} (${tenant._id})`);
  }
  const tenantId = tenant._id;

  // ── 2. Users ──────────────────────────────────────────────────────────────
  const [adminHash, viewerHash] = await Promise.all([
    hashPassword(ADMIN_PASSWORD),
    hashPassword(VIEWER_PASSWORD),
  ]);

  const [adminUser] = await User.insertMany([
    { tenantId, name: 'Admin User',  email: ADMIN_EMAIL,  passwordHash: adminHash,  role: 'Admin'  },
    { tenantId, name: 'Viewer User', email: VIEWER_EMAIL, passwordHash: viewerHash, role: 'Viewer' },
  ]);
  console.log(`[seed] Users created: ${ADMIN_EMAIL} (Admin), ${VIEWER_EMAIL} (Viewer)`);

  const systemUserId = adminUser._id; // history records attributed to admin

  // ── 3. Employees ──────────────────────────────────────────────────────────
  const employeeDocs = await Employee.insertMany(
    EMPLOYEE_SEED.map((e) => ({ ...e, tenantId }))
  );
  console.log(`[seed] ${employeeDocs.length} employees created.`);

  // ── 4. Locations ──────────────────────────────────────────────────────────
  const locationDocs = await Location.insertMany(
    LOCATION_SEED.map((l) => ({ ...l, tenantId }))
  );
  console.log(`[seed] ${locationDocs.length} locations created.`);

  // ── 5. Assets ─────────────────────────────────────────────────────────────
  let assetCount = 0;
  const assetHistoryRecords = [];

  for (const def of ASSET_SEED) {
    assetCount++;
    const assetCode = `AST${String(assetCount).padStart(4, '0')}`;
    const { qrToken, qrCodeUrl } = await qrService.createTokenPair(tenantId.toString());

    let assignedEmployeeId = null;
    let assignedLocationId = null;

    if (def.assignType === 'employee' && def.assignIdx !== null) {
      assignedEmployeeId = employeeDocs[def.assignIdx]._id;
    } else if (def.assignType === 'location' && def.assignIdx !== null) {
      assignedLocationId = locationDocs[def.assignIdx]._id;
    }

    const asset = await Asset.create({
      tenantId,
      qrToken,
      assetCode,
      name: def.name,
      category: def.category,
      description: def.description || null,
      serialNumber: def.serialNumber || null,
      status: def.status,
      assignedEmployeeId,
      assignedLocationId,
      isPublicVisible: def.isPublicVisible,
    });

    // Created history record
    assetHistoryRecords.push({
      tenantId,
      assetId: asset._id,
      eventType: 'Created',
      previousValue: {},
      newValue: { assetCode, name: def.name, status: def.status },
      performedBy: systemUserId,
      note: 'Initial seed',
    });

    // Assignment history record (if assigned)
    if (assignedEmployeeId) {
      assetHistoryRecords.push({
        tenantId,
        assetId: asset._id,
        eventType: 'AssignedToEmployee',
        previousValue: { assignedEmployeeId: null, assignedLocationId: null },
        newValue: { assignedEmployeeId: assignedEmployeeId.toString(), assignedLocationId: null },
        performedBy: systemUserId,
        note: 'Assigned during initial seed',
      });
    } else if (assignedLocationId) {
      assetHistoryRecords.push({
        tenantId,
        assetId: asset._id,
        eventType: 'AssignedToLocation',
        previousValue: { assignedEmployeeId: null, assignedLocationId: null },
        newValue: { assignedEmployeeId: null, assignedLocationId: assignedLocationId.toString() },
        performedBy: systemUserId,
        note: 'Assigned during initial seed',
      });
    }

    // Status history for non-Available assets
    if (def.status !== 'Available') {
      assetHistoryRecords.push({
        tenantId,
        assetId: asset._id,
        eventType: 'StatusChange',
        previousValue: { status: 'Available' },
        newValue: { status: def.status },
        performedBy: systemUserId,
        note: 'Status set during initial seed',
      });
    }
  }

  await AssetHistory.insertMany(assetHistoryRecords);
  console.log(`[seed] ${assetCount} assets created with ${assetHistoryRecords.length} history records.`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('  SEED COMPLETE');
  console.log('─────────────────────────────────────────────');
  console.log(`  Tenant:      ${tenant.name}`);
  console.log(`  Tenant ID:   ${tenantId}  (use as ?t= on public scan URLs)`);
  console.log('');
  console.log(`  Admin login`);
  console.log(`    Email:     ${ADMIN_EMAIL}`);
  console.log(`    Password:  ${ADMIN_PASSWORD}`);
  console.log('');
  console.log(`  Viewer login`);
  console.log(`    Email:     ${VIEWER_EMAIL}`);
  console.log(`    Password:  ${VIEWER_PASSWORD}`);
  console.log('');
  console.log('  Demo edge cases:');
  console.log('    isPublicVisible:false assets  → AST0005, AST0016, AST0024');
  console.log('    Retired assets               → AST0005, AST0024');
  console.log('    Lost asset                   → AST0011');
  console.log('    In Repair assets             → AST0004, AST0020');
  console.log('    Inactive employee            → Hassan Al-Rashid (index 7)');
  console.log('─────────────────────────────────────────────\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
