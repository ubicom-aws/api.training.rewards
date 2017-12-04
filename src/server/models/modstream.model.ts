import * as mongoose from 'mongoose';

const ModStreamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  permlink: {
      type: String,
      required: true,
  },
  moderator: {
    type: String,
    required: true,
  },
  reviewed: {
      type: Boolean,
      required: false,
  },
  flagged: {
      type: Boolean,
      required: false,
  },
  pending: {
      type: Boolean,
      required: false,
  }
});

export interface ModStreamSchemaDoc extends mongoose.Document {
}

export interface ModStreamSchemaModel extends mongoose.Model<ModStreamSchemaDoc> {
  get(modStream: string): any;
}

ModStreamSchema.statics = {
  async get() {

  }
};

export default mongoose.model<SessionSchemaDoc, SessionSchemaModel>('Session', SessionSchema);
