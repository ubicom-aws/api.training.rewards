import express from 'express';
import validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import postCtrl from '../controllers/post.controller';

const router = express.Router();

router.route('/')
  .get(postCtrl.list)
  .post(validate(paramValidation.createPost), postCtrl.create);

router.route('/:permlink')
  .get(postCtrl.get)
  .put(postCtrl.update)
  .delete(postCtrl.remove);

router.param('permlink', postCtrl.load);

export default router;
