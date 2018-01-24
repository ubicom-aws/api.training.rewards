import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import faqCtrl from '../controllers/faq.controller';
import {requireMod} from "./middleware";

const router = express.Router();

router.route('/')
    .post(requireMod, validate(paramValidation.createFaq), faqCtrl.create)
    .get(validate(paramValidation.listFaq), faqCtrl.list);

export default router;
