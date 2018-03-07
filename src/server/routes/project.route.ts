import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import projectCtrl from '../controllers/project.controller';

const router = express.Router();

router.route('/')
    .get(projectCtrl.list)
    .post(validate(paramValidation.project.create), projectCtrl.create)
    .put(validate(paramValidation.project.update), projectCtrl.update)
    .delete(validate(paramValidation.project.remove), projectCtrl.remove)
;


export default router;
