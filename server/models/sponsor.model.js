import mongoose from 'mongoose';

/**
 * Sponsor Schema
 */
const SponsorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
  },
  json_metadata: {
    type: Object,
    required: true,
  },
  vesting_shares: {
    type: Number,
    required: true,
  },
});

SponsorSchema.method({
});

SponsorSchema.statics = {
  list() {
    return this.find()
      .sort({ vesting_shares: -1 })
      .exec();
  }
};

export default mongoose.model('Sponsor', SponsorSchema);
