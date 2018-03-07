import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import projectCtrl from '../controllers/project.controller';
import {requireAuth} from "./middleware";

const router = express.Router();

router.route('/')
    .get(projectCtrl.list)
    .post(requireAuth, validate(paramValidation.project.create), projectCtrl.create)
    .put(requireAuth, validate(paramValidation.project.update), projectCtrl.update)
    .delete(requireAuth, validate(paramValidation.project.remove), projectCtrl.remove)
;


export default router;
