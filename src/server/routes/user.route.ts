import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import userCtrl from '../controllers/user.controller';
import {requireAuth, requireSupervisor} from "./middleware";

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .post(requireAuth, validate(paramValidation.createUser), userCtrl.create);

router.route('/:userId')
  .get(requireAuth, userCtrl.get)
  .put(requireAuth, validate(paramValidation.updateUser), userCtrl.update)
  .delete(requireAuth, userCtrl.remove);

router.route('/:user/avatar')
  .get(validate(paramValidation.avatarUser), userCtrl.avatar)

router.route('/:userId/repos')
  .get(requireAuth, userCtrl.getRepos);

router.route('/:userId/ban')
  .get(requireAuth, userCtrl.getBan)
  .post(requireAuth, requireSupervisor, validate(paramValidation.banUser), userCtrl.ban);

router.route('/:userId/platforms/:platform')
  .get(requireAuth, userCtrl.get)


router.param('userId', userCtrl.load);

export default router;
