import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import {AuthResponse, getToken} from '../sc2';
import Session from './session.model';

const pendingUserSchema = new mongoose.Schema({
  wanted_name: String,
  social_name: {
    type: String,
    required: true 
  },
  social_id: String,
  social_verified: { 
    type: Boolean,
    default: false
  },
  social_type: String,
  email: String,
  has_created_acc: {
    type: Boolean,
    default: false
  },
  sms_verified: {
    type: Boolean,
    default: false
  },
  email_verified: {
    type: Boolean,
    default: false
  }
})


export interface UserSchemaDoc extends mongoose.Document {
}
  
export interface UserSchemaModel extends mongoose.Model<UserSchemaDoc> {
    get(id: any): any
}
  
pendingUserSchema.statics = {
  get(social_id) {
    return this.findOne({social_id})
      .exec()
      .then(user => { return user })
  }
};


export default mongoose.model<UserSchemaDoc, UserSchemaModel>('Pending_User', pendingUserSchema);