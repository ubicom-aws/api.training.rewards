import express from 'express';
import validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import sponsorCtrl from '../controllers/sponsor.controller';

const router = express.Router();

router.route('/')
  .get(sponsorCtrl.list)
  .post(validate(paramValidation.createSponsor), sponsorCtrl.create);

export default router;
