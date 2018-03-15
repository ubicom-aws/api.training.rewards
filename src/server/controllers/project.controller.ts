import Project from '../models/project.model';
import User from '../models/user.model';
import userCtrl from '../controllers/user.controller';
import Sponsor from '../models/sponsor.model';
import * as R from 'ramda';

const steemconnect = require('sc2-sdk');
import steemAPI from '../steemAPI';
import * as request from 'superagent';
import config from '../../config/config';

function list(req, res, next) {

    Project.list()
        .then(projects => res.json({
            "total": projects.length,
            "results": projects
        }))
        .catch(e => next(e));
}

function create(req, res, next) {
    let {repository, platform, owner, allowed_types, notification_types, name, description, introduction, pictures, videos, tags} = req.body;

    let project = new Project({
        creation_date: Date(),
        owner: owner,
        platform: platform,
        repository: repository,
        allowed_types: allowed_types,
        notification_types: notification_types,
        name: name,
        description: description,
        introduction: introduction,
        tags: tags,
        pictures: pictures,
        videos: videos
    });

    project.save().then(() => {
        res.json(project);
    }).catch((e) => {
        res.json(e);
    });
}

function update(req, res, next) {
    let {id, repository, platform, allowed_types, notification_types, name, description, introduction, pictures, videos, tags } = req.body;

    Project.findById(id).then((project) => {
        if (project) {
            project.update({
                creation_date: Date(),
                platform: platform,
                repository: repository,
                allowed_types: allowed_types,
                notification_types: notification_types,
                name: name,
                description: description,
                introduction: introduction,
                tags: tags,
                pictures: pictures,
                videos: videos
            }).then(async (result) => {
                if (result.nModified === 1) {
                    res.json(await Project.findById(id));
                } else {
                    res.json({error:"oups! an error occured while I tried to save the project. such a shame. can you try it again please?"})
                }
            }).catch(() => {
                res.json({error:"error while updating project"});
            });
        } else {
            res.json({error:"not found"});
        }
    }).catch(() => {
        res.json({error:"not found"});
    });
}

function remove(req, res, next) {
    let {id} = req.body;
    Project.findByIdAndRemove(id).then(() => {
        res.json({"status":"ok"});
    }).catch(() => {
        res.json({"error":"failed to remove project"})
    })
}

export default {list, create, update, remove};
