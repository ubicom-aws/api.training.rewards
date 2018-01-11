import { processQueryParams } from '../controllers/post.controller/top';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';
import { requireAuth, requireMod } from './middleware';
import * as validate from 'express-validation';
import * as express from 'express';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(validate(paramValidation.createPost), postCtrl.create);

router.route('/top')
  .get(processQueryParams, postCtrl.top);

router.route('/byid/:postId')
  .get(postCtrl.getPostById)
  // .put(requireAuth, postCtrl.addPostPrefix)

router.route('/edit')
  .post(requireAuth,
        validate(paramValidation.editPost),
        postCtrl.edit);

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(requireAuth, postCtrl.update)
  .delete(requireAuth, requireMod, postCtrl.remove);

export default router;
