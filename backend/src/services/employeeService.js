'use strict';

/**
 * EmployeeService
 *
 * Implements GET /api/employees and GET /api/employees/:id.
 * Field-level restriction: contactInfo is returned only for Admin role.
 * This is enforced here, not in the controller, so the rule lives in one place.
 */

const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const { errors } = require('../middleware/errorHandler');

// ── Format helpers ────────────────────────────────────────────────────────────

/**
 * Strip contactInfo for non-Admin callers (§3 permission matrix).
 *
 * @param {object} employeeObj  Plain JS object (already through toJSON)
 * @param {string} role         Caller's role from req.user.role
 */
function applyFieldVisibility(employeeObj, role) {
  if (role !== 'Admin') {
    delete employeeObj.contactInfo;
  }
  return employeeObj;
}

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * Paginated, filterable list of employees.
 * contactInfo is ALWAYS omitted from list responses regardless of role (§2.4).
 *
 * @param {string} tenantId
 * @param {object} query
 * @param {string} role  Caller role (unused on list — contactInfo always hidden)
 */
async function listEmployees(tenantId, query) {
  const { page = 1, limit = 20, status, department, search } = query;

  const filter = { tenantId };
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Employee.find(filter)
      .select('-contactInfo') // contactInfo always excluded from list (§2.4)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  const data = docs.map((d) => {
    const obj = { ...d };
    obj.id = d._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.tenantId;
    return obj;
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get single ────────────────────────────────────────────────────────────────

/**
 * Fetch one employee. contactInfo included only for Admin.
 *
 * @param {string} tenantId
 * @param {string} employeeId
 * @param {string} role  Caller's role — determines contactInfo visibility
 */
async function getEmployeeById(tenantId, employeeId, role) {
  if (!mongoose.isValidObjectId(employeeId)) {
    throw errors.notFound('Employee not found.');
  }

  const employee = await Employee.findOne({ _id: employeeId, tenantId });
  if (!employee) throw errors.notFound('Employee not found.');

  const obj = employee.toJSON(); // strips _id → id, removes tenantId
  return applyFieldVisibility(obj, role);
}

module.exports = { listEmployees, getEmployeeById };
