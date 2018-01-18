import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import userCtrl from '../controllers/user.controller';
import {requireAuth, requireSupervisor} from "./middleware";

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .post(requireAuth, validate(paramValidation.createUser), userCtrl.create);

router.route('/:userId')
  .get(userCtrl.get);

router.route('/:user/avatar')
  .get(validate(paramValidation.avatarUser), userCtrl.avatar);

router.route('/:userId/repos')
  .get(userCtrl.getRepos);

router.route('/:userId/ban')
  .get(userCtrl.getBan)
  .post(requireSupervisor, validate(paramValidation.banUser), userCtrl.ban);

router.route('/:userId/platforms/:platform')
  .get(userCtrl.get)


router.param('userId', (req, res, next, id) => {
  requireAuth(req, res, (e) => {
    if (e) return next(e);
    userCtrl.load(req, res, next, id);
  })
});

export default router;
