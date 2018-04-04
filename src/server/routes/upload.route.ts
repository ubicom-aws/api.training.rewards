import * as express from 'express';
import uploadCtrl from '../controllers/upload.controller';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import {requireAuth} from "./middleware";

const router = express.Router();

router.route('/post')
    .post(uploadCtrl.uploadPostImage);

router.route('/user')
    .post(requireAuth, uploadCtrl.uploadUserFile)
    .delete(requireAuth, uploadCtrl.deleteUserFile);

router.route('/project')
    .post(requireAuth, validate(paramValidation.upload.project), uploadCtrl.uploadProjectFile)
    .delete(requireAuth, validate(paramValidation.upload.project_delete), uploadCtrl.deleteProjectFile);



export default router;
