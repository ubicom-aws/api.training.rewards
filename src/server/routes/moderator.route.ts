import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import moderatorCtrl from '../controllers/moderator.controller';

const router = express.Router();

router.route('/')
  .get(moderatorCtrl.list)

router.route('/beneficiaries')
  .get(moderatorCtrl.listBeneficiaries)

export default router;
