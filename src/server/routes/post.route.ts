import { processQueryParams } from '../controllers/post.controller/top';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';
import * as validate from 'express-validation';
import { requireAuth, loadMod } from './middleware';
import * as express from 'express';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(validate(paramValidation.createPost), postCtrl.create);

router.route('/top')
  .get(processQueryParams, postCtrl.top);

router.route('/byid/:postId')
  .get(postCtrl.getPostById);

router.route('/edit')
  .post(requireAuth,
        validate(paramValidation.editPost),
        postCtrl.edit);

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(requireAuth, loadMod, postCtrl.update);

export default router;
