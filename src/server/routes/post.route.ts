import { bypassRateLimit } from '../controllers/post.controller/top';
import paramValidation from '../../config/param-validation';
import { requireAuth, requireMod } from './middleware';
import postCtrl from '../controllers/post.controller';
import * as validate from 'express-validation';
import { rateLimit } from './middleware';
import * as express from 'express';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(requireAuth, validate(paramValidation.createPost), postCtrl.create);

router.route('/top')
  .get(requireAuth, rateLimit(300000, bypassRateLimit), postCtrl.top);

router.route('/byid/:postId')
  .get(postCtrl.getPostById)
  // .put(requireAuth, postCtrl.addPostPrefix)

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(requireAuth, requireMod, postCtrl.update)
  .delete(requireAuth, requireMod, postCtrl.remove);

export default router;
