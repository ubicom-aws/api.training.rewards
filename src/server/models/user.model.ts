import * as Promise from 'bluebird';
import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * User Schema
 */
const UserSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true
  },
  schemaVersion: {
    type: Number,
    default: 0,
  },
  github: Object,
  refresh_token: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  banned: {
    type: Number,
    default: 0,
  },
  details: {
    type: Object,
    default: {
      createdBy: 'steem',
      emailVerified: false,
      confirmed: false,
      connectedToSteem: false,
      lastUpdate: Date.now,
      votingForWiteness: false,
    }
  },
  bannedBy: {
    type: String,
    default: "<anonymous mod>",
  },
  bannedUntil: {
    type: Date,
    default: new Date(0),
  },
  banReason: {
    type: String,
    default: "Violation of the Utopian Rules",
  },
  
});

export interface UserModelListOpts {
  skip?: number;
  limit?: number;
}

export interface UserSchemaDoc extends mongoose.Document {
}

export interface UserSchemaModel extends mongoose.Model<UserSchemaDoc> {
  get(account: any): any;
  getByGithub(token: any): any;
  list(opts?: UserModelListOpts): any;
}

/**
 * Statics
 */
UserSchema.statics = {
  /**
   * Get user
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  get(account) {
    return this.findOne({account})
      .exec()
      .then((user) => {
        if (user) {
          return user;
        }
        const err = new APIError('No such user exists!', httpStatus.NOT_FOUND);
        return Promise.reject(err);
      });
  },
  getByGithub(token) {
    return this.findOne({'github.token': token})
      .exec()
      .then((githubUser) => {
        if (!githubUser) {
          const err = new APIError('No such github user exists!', httpStatus.NOT_FOUND);
          return Promise.reject(err);
        }

        if (!githubUser.refresh_token) {
          const err = new APIError('Must authorize', httpStatus.UNAUTHORIZED);
          return Promise.reject(err);
        }

        return githubUser;

      });
  },

  /**
   * List users in descending order of 'createdAt' timestamp.
   * @param {number} skip - Number of users to be skipped.
   * @param {number} limit - Limit number of users to be returned.
   * @returns {Promise<User[]>}
   */
  list({ skip = 0, limit = 50 }: UserModelListOpts = {}) {
    return this.find()
      .sort({ createdAt: -1 })
      .skip(+skip)
      .limit(+limit)
      .exec();
  }
};

/**
 * @typedef User
 */
export default mongoose.model<UserSchemaDoc, UserSchemaModel>('User', UserSchema);
