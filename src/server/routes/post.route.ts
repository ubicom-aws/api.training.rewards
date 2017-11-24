import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(validate(paramValidation.createPost), postCtrl.create);

router.route('/:author/:permlink')
  .get(postCtrl.get)
  .put(postCtrl.update)
  .delete(postCtrl.remove);

export default router;
