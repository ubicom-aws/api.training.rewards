import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import userCtrl from '../controllers/user.controller';
import {requireAuth, requireSupervisor} from "./middleware";

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .post(validate(paramValidation.createUser), userCtrl.create);

router.route('/:userId')
  .get(userCtrl.get)
  .put(validate(paramValidation.updateUser), userCtrl.update)
  .delete(userCtrl.remove);

router.route('/:userId/repos')
  .get(userCtrl.getRepos);

router.route('/:userId/ban')
  .get(userCtrl.getBan)
  .post(requireAuth, requireSupervisor,validate(paramValidation.banUser), userCtrl.ban)

router.route('/:userId/platforms/:platform')
  .get(userCtrl.get)


router.param('userId', userCtrl.load);

export default router;
