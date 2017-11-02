import express from 'express';
import userRoutes from './user.route';
import postRoutes from './post.route';
import sponsorRoutes from './sponsor.route';
import beneficiariesRoutes from './beneficiaries.route';
import tokenRoute from './token.route';
import moderatorRoutes from './moderator.route';
import statsRoutes from './stats.route';
import authRoutes from './auth.route';

const router = express.Router(); // eslint-disable-line new-cap

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) =>
  res.send('OK')
);

// mount user routes at /users
router.use('/users', userRoutes);

router.use('/token', tokenRoute);

router.use('/posts', postRoutes);

router.use('/stats', statsRoutes);

router.use('/beneficiaries', beneficiariesRoutes);

router.use('/sponsors', sponsorRoutes);

router.use('/moderators', moderatorRoutes);

// mount auth routes at /auth
router.use('/auth', authRoutes);

export default router;
