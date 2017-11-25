import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import projectCtrl from '../controllers/project.controller';

const router = express.Router();

router.route('/')
  .post(validate(paramValidation.createProject), projectCtrl.create);

export default router;
