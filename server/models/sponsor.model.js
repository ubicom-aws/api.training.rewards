import mongoose from 'mongoose';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Sponsor Schema
 */
const SponsorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true,
  },
  json_metadata: {
    required: false,
  },
  total_paid_rewards: Number,
  should_receive_rewards: Number,
  percentage_total_vesting_shares: Number,
  vesting_shares: {
    type: Number,
    required: true,
  },
});

SponsorSchema.method({
});

SponsorSchema.statics = {
  get(account) {
    return this.findOne({ account })
      .exec()
      .then((sponsor) => {
        if (sponsor) {
          return sponsor;
        }
        return null;
      });
  },
  list() {
    return this.find({
      vesting_shares: {
        '$gt': 0
      }
    })
      .sort({ vesting_shares: -1 })
      .exec();
  },
  listAll() {
    return this.find()
      .exec();
  },
  listBeneficiaries() {
    return this.find({
      vesting_shares: {
        '$gt': 0
      }
    })
      .sort({ should_receive_rewards: -1 })
      .limit(7)
      .exec();
  }
};

export default mongoose.model('Sponsor', SponsorSchema);
