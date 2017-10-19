import mongoose from 'mongoose';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Stats Schema
 */

const StatsSchema = new mongoose.Schema({
  total_paid_rewards: Number,
  total_pending_rewards: Number,
  total_paid_sponsors: Number,
  total_paid_authors: Number,
  total_paid_curators: Number,
});

StatsSchema.method({
});

StatsSchema.statics = {
  get() {
    return this.findOne()
      .exec()
      .then((stats) => {
          if (stats) {
            return stats;
          }
          const err = new APIError('Cannot retrieve stats', httpStatus.NOT_FOUND);
          return Promise.reject(err);
        });
  },
};

export default mongoose.model('Stats', StatsSchema);
