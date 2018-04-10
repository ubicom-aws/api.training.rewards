import * as express from 'express';
import apiKeyCtrl from '../controllers/apikey.controller';

const router = express.Router();

router.route('/')
    .get(apiKeyCtrl.list);

export default router;
