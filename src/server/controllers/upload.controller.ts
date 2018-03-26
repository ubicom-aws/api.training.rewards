import * as s3 from '../helpers/s3';
import * as path from 'path';
import * as slug from 'unique-slug';
import * as fs from 'fs';

console.log(path.resolve('./uploads'))

const mimeTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'video/mp4'
];

function uploadUserFile(req, res, next) {
    if (!req.files || !req.files.file)
        return res.status(400).json({error: 'No files were uploaded.'});

    if (!mimeTypes.includes(req.files.file.mimetype))
        return res.status(415).json({error: 'Unsupported MimeType', mimetypes: mimeTypes});

    let upload = req.files.file;

    let tmp_file = path.resolve('./uploads/' + slug());
    upload.mv(tmp_file, function (err) {
        if (err)
            return res.status(500).json(err);

        s3.uploadUserFile(tmp_file, upload.name, upload.mimetype, res.locals.user.account).then((data) => {
            fs.unlinkSync(tmp_file);
            res.json(data);
        }).catch((err) => {
            fs.unlinkSync(tmp_file);
            res.status(500).json(err);
        })
    });
}

function deleteUserFile(req, res, next) {
    if (!req.body.filename)
        res.status(500).json({error: "No filename given"});
    s3.deleteUserFile(res.locals.user.account, req.body.filename).then((data) => {
        res.json(data);
    }).catch((err) => {
        res.status(500).json(err);
    })
}


function uploadProjectFile(req, res, next) {
    if (!req.files || !req.files.file)
        return res.status(400).json({error: 'No files were uploaded.'});

    if (!mimeTypes.includes(req.files.file.mimetype))
        return res.status(415).json({error: 'Unsupported MimeType', mimetypes: mimeTypes});

    let upload = req.files.file;
    let {project, type} = req.body;

    let tmp_file = path.resolve('./uploads/' + slug());
    upload.mv(tmp_file, function (err) {
        if (err)
            return res.status(500).json(err);

        s3.uploadProjectFile(tmp_file, upload.name, project, upload.mimetype, type).then((data) => {
            fs.unlinkSync(tmp_file);
            res.json(data);
        }).catch((err) => {
            fs.unlinkSync(tmp_file);
            res.status(500).json(err);
        })
    });
}


function uploadPostImage(req, res) {
    if (!req.files || !req.files.files)
        return res.status(400).json({error: 'No files were uploaded.'});

    if (!mimeTypes.includes(req.files.files.mimetype))
        return res.status(415).json({error: 'Unsupported MimeType', mimetypes: mimeTypes});

    let upload = req.files.files;
    let tmp_file = path.resolve('./uploads/' + slug());

    upload.mv(tmp_file, function (err) {
        if (err)
            return res.status(500).json(err);

        s3.uploadPostImage(tmp_file, upload.name, upload.mimetype).then((data) => {
            fs.unlinkSync(tmp_file);
            res.json(data);
        }).catch((err) => {
            fs.unlinkSync(tmp_file);
            res.status(500).json(err);
        })
    });
}

function deleteProjectFile(req, res, next) {
    let {project, type, filename} = req.body;
    s3.deleteProjectFile(project, type, filename).then((data) => {
        res.json(data);
    }).catch((err) => {
        res.status(500).json(err);
    })
}

export default {uploadUserFile, deleteUserFile, uploadProjectFile, deleteProjectFile, uploadPostImage}