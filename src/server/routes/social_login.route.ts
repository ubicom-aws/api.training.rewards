import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import socialLoginCtrl from '../controllers/social_login.controller';

const router = express.Router();
const supported_providers = ['github', 'facebook', 'linkedin']

router.route('/:provider')
  .post(validate(paramValidation.socialLogin), socialLoginCtrl.authenticate)

router.route('/email/request')
  .post(validate(paramValidation.emailRequest),socialLoginCtrl.email_request)

router.route('/email/confirm')
  .post(validate(paramValidation.emailConfirm),socialLoginCtrl.email_confirm)

export default router