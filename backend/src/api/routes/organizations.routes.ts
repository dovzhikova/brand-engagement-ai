import { Router } from 'express';
import { OrganizationsController } from '../controllers/organizations.controller';
import { authenticate } from '../middleware/auth';
import { requireOrgContext, requireOrgAdmin, requireOrgOwner } from '../middleware/organization';

const router = Router();
const organizationsController = new OrganizationsController();

// All routes require authentication
router.use(authenticate);

// User's organizations (no org context needed)
// GET /api/organizations - List user's organizations
router.get('/', organizationsController.getMyOrganizations);

// POST /api/organizations - Create new organization
router.post('/', organizationsController.createOrganization);

// Organization-specific routes
// GET /api/organizations/:id - Get organization details (membership checked in controller)
router.get('/:id', organizationsController.getOrganization);

// Routes that require org context and admin/owner role
// PUT /api/organizations/:id - Update organization
router.put('/:id', requireOrgContext, requireOrgAdmin, organizationsController.updateOrganization);

// POST /api/organizations/:id/members - Invite member
router.post('/:id/members', requireOrgContext, requireOrgAdmin, organizationsController.inviteMember);

// DELETE /api/organizations/:id/members/:memberId - Remove member
router.delete('/:id/members/:memberId', requireOrgContext, requireOrgAdmin, organizationsController.removeMember);

// PATCH /api/organizations/:id/members/:memberId/role - Update member role (owner only)
router.patch('/:id/members/:memberId/role', requireOrgContext, requireOrgOwner, organizationsController.updateMemberRole);

// POST /api/organizations/:id/leave - Leave organization
router.post('/:id/leave', organizationsController.leaveOrganization);

// DELETE /api/organizations/:id - Delete organization (owner only)
router.delete('/:id', requireOrgContext, requireOrgOwner, organizationsController.deleteOrganization);

export default router;
