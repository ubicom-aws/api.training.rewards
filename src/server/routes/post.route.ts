import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';
import { requireAuth } from './middleware';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(requireAuth, validate(paramValidation.createPost), postCtrl.create);

router.route('/byid/:postId')
  .get(postCtrl.getPostById)
  .put(requireAuth, postCtrl.addPostPrefix)

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(requireAuth, postCtrl.update)
  .delete(requireAuth, postCtrl.remove);

export default router;
