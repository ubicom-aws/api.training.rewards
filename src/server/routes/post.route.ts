import { processQueryParams } from '../controllers/post.controller/top';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';
import * as validate from 'express-validation';
import { requireAuth } from './middleware';
import * as express from 'express';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(requireAuth, validate(paramValidation.createPost), postCtrl.create);

router.route('/top')
  .get(requireAuth, processQueryParams, postCtrl.top);

router.route('/byid/:postId')
  .get(postCtrl.getPostById)
  // .put(requireAuth, postCtrl.addPostPrefix)

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(requireAuth, postCtrl.update)
  .delete(requireAuth, postCtrl.remove);

export default router;
