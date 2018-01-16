import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import socialLoginCtrl from '../controllers/social_login.controller';

const router = express.Router();
const supported_providers = ['github', 'facebook', 'linkedin']

// Will be un-commented as soon as the whole registration process is finished
// to prevent possible errors from happening due to unfinished design
/*router.route('/:provider')
  .post(validate(paramValidation.socialLogin), socialLoginCtrl.authenticate)

router.route('/email/request')
  .post(validate(paramValidation.emailRequest),socialLoginCtrl.email_request)

router.route('/email/confirm')
  .post(validate(paramValidation.emailConfirm),socialLoginCtrl.email_confirm)

router.route('/phone/request')
  .post(validate(paramValidation.phoneRequest), socialLoginCtrl.phone_request)

router.route('/phone/confirm')
  .post(validate(paramValidation.phoneConfirm), socialLoginCtrl.phone_confirm)
*/

export default router