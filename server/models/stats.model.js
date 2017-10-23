import mongoose from 'mongoose';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Stats Schema
 */

const categoriesStats = {
  total_posts: Number,
  total_likes: Number,
  average_likes_per_post: Number,
  total_paid: Number,
  total_paid_authors: Number,
  average_paid_authors: Number,
  total_paid_curators: Number,
  average_paid_curators: Number,
  total_posts_length: Number,
  average_posts_length: Number,
  total_images: Number,
  average_images_per_post: Number,
  total_links: Number,
  average_links_per_post: Number,
  total_tags: Number,
  average_tags_per_post: Number,
};

const StatsSchema = new mongoose.Schema({
  total_paid_rewards: Number,
  total_pending_rewards: Number,
  total_paid_authors: Number,
  total_paid_curators: Number,
  categories: {
    ideas: categoriesStats,
    development: categoriesStats,
    'bug-hunting': categoriesStats,
    translations: categoriesStats,
    graphics: categoriesStats,
    documentation: categoriesStats,
    analysis: categoriesStats,
    social: categoriesStats,
  },
  utopian_votes: [
    {
      date: String,
      weight: Number,
      permlink: String,
      author: String,
    }
  ]
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
