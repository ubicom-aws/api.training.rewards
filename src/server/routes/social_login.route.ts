import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import socialLoginCtrl from '../controllers/social_login.controller';

const router = express.Router();
const supported_providers = ['github', 'facebook', 'linkedin']

router.route('/:provider')
  .post(validate(paramValidation.socialLogin), socialLoginCtrl.authenticate);

export default router;