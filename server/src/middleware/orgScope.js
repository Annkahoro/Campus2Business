import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from './asyncHandler.js';

/** For org_admin routes: loads the admin's organization into req.org (404 if they have none yet). */
export const loadOrg = asyncHandler(async (req, _res, next) => {
  const org = req.user.organization ? await Organization.findById(req.user.organization) : null;
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'You have not registered an organization yet');
  req.org = org;
  next();
});

/** Invite management only works once C2B has approved the organization (docs/04 §3). */
export const requireApprovedOrg = (req, _res, next) =>
  req.org?.status === 'approved'
    ? next()
    : next(ApiError.forbidden('ORG_NOT_APPROVED', 'Your organization has not been approved by C2B yet'));

/**
 * orgScope — for routes with :employeeId. The org admin may only touch employees of their own organization.
 * Attaches req.employee. Responds 404 (not 403) so other orgs' employee ids are not revealed.
 */
export const orgScope = asyncHandler(async (req, _res, next) => {
  const employee = await User.findOne({
    _id: req.params.employeeId,
    role: ROLES.EMPLOYEE,
    organization: req.org._id,
  });
  if (!employee) throw ApiError.notFound('EMPLOYEE_NOT_FOUND', 'Employee not found');
  req.employee = employee;
  next();
});
