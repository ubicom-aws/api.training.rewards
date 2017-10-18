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
    type: Object,
    required: false,
  },
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
  }
};

export default mongoose.model('Sponsor', SponsorSchema);
