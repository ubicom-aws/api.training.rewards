import mongoose from 'mongoose';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Moderator Schema
 */
const ModeratorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true,
  },
  total_paid_rewards: Number,
  should_receive_rewards: Number,
  total_moderated: Number,
  percentage_total_rewards_moderators: Number,
});

ModeratorSchema.method({});

ModeratorSchema.statics = {
  get(account) {
    return this.findOne({ account })
      .exec()
      .then((moderator) => {
        if (moderator) {
          return moderator;
        }
        return null;
      });
  },
  list() {
    return this.find({
      total_moderated: {
        '$gt': 0
      }
    })
      .sort({ total_moderated: -1 })
      .exec();
  },
  listAll() {
    return this.find()
      .exec();
  },
  listBeneficiaries(exclude = false) {
    let query = {
      total_moderated: {
        '$gt': 0
      }
    };

    if (exclude && exclude.length) {
      query = {
        ...query,
        account: {
          $nin: exclude
        }
      }
    }

    return this.find(query)
      .sort({ should_receive_rewards: -1 })
      .limit(1)
      .exec();
  }
};

export default mongoose.model('Moderator', ModeratorSchema);
