'use strict';

const ASSET_STATUSES = ['Available', 'Assigned', 'In Repair', 'Retired', 'Lost'];
const ASSET_CATEGORIES = ['Laptop', 'Vehicle', 'Tool', 'Furniture', 'Equipment'];
const LOCATION_TYPES = ['site', 'building', 'zone', 'room', 'other'];
const EMPLOYEE_STATUSES = ['active', 'inactive'];
const USER_ROLES = ['Admin', 'Viewer'];
const HISTORY_EVENT_TYPES = [
  'Created',
  'StatusChange',
  'AssignedToEmployee',
  'AssignedToLocation',
  'Unassigned',
  'Updated',
];

const QR_TOKEN_REGEX = /^[0-9a-f]{64}$/;

module.exports = {
  ASSET_STATUSES,
  ASSET_CATEGORIES,
  LOCATION_TYPES,
  EMPLOYEE_STATUSES,
  USER_ROLES,
  HISTORY_EVENT_TYPES,
  QR_TOKEN_REGEX,
};
