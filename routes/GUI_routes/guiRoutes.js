import express from 'express';
import { fetchOtpTable, fetchUserTable } from '../../controllers/GUI_controller/guiController.js';
import { validateToken } from '../../controllers/authController.js';

const router = express.Router();

router.get('/table/otp',validateToken,fetchOtpTable)
router.get('/table/userTable',validateToken,fetchUserTable)

export default router;
