'use strict';

const employeeService = require('../services/employeeService');

// ── GET /api/employees ────────────────────────────────────────────────────────
async function listEmployees(req, res) {
  const { tenantId } = req.user;
  const result = await employeeService.listEmployees(tenantId, req.query);
  res.status(200).json(result); // { data, meta }
}

// ── GET /api/employees/:id ────────────────────────────────────────────────────
async function getEmployee(req, res) {
  const { tenantId, role } = req.user;
  const { id } = req.params;
  // role is passed so the service can apply field-level visibility (contactInfo)
  const employee = await employeeService.getEmployeeById(tenantId, id, role);
  res.status(200).json({ data: employee });
}

module.exports = { listEmployees, getEmployee };
