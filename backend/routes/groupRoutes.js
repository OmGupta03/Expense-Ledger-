const express = require('express');
const router = express.Router();
const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  getGroupMembers,
  inviteMember,
  removeMember,
  deleteGroup
} = require('../controllers/groupController');

router.post('/', createGroup);
router.get('/user/:userId', getUserGroups);
router.get('/:groupId', getGroupDetails);
router.get('/:groupId/members', getGroupMembers);
router.post('/:groupId/invite', inviteMember);
router.delete('/:groupId/members/:userId', removeMember);
router.delete('/:groupId', deleteGroup);

module.exports = router;
