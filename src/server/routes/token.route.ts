import * as express from 'express';
import userCtrl from '../controllers/user.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .get(userCtrl.createToken)

export default router;
