import * as express from 'express';
import postCtrl from '../controllers/post.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .get(postCtrl.listByIssue)

export default router;
