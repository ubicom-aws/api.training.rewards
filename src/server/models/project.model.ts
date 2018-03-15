import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Sponsor Schema
 */

const ProjectSchema = new mongoose.Schema({
    creation_date: {
        type: Date,
        required: true
    },
    repository: {
        type: Number,
        unique: true,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    introduction: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true
    },
    allowed_types: [],
    notification_types: [],
    pictures: [],
    videos: [],
});

export interface ProjectSchemaDoc extends mongoose.Document {
}

export interface ProjectSchemaModel extends mongoose.Model<ProjectSchemaDoc> {

    list(): any;
}

ProjectSchema.statics = {
    list() {
        return this.find({})
            .exec();
    },
};

export default mongoose.model<ProjectSchemaDoc, ProjectSchemaModel>('Project', ProjectSchema);
