import * as express from 'express';
import uploadCtrl from '../controllers/upload.controller';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';

const router = express.Router();

router.route('/user')
    .post(uploadCtrl.uploadUserFile)
    .delete(uploadCtrl.deleteUserFile);

router.route('/project')
    .post(validate(paramValidation.upload.project), uploadCtrl.uploadProjectFile)
    .delete(validate(paramValidation.upload.project_delete), uploadCtrl.deleteProjectFile);



export default router;
