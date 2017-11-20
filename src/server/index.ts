import * as mongoose from 'mongoose';
import * as util from 'util';

// config should be imported before importing any other file
import config from '../config/config';
import app from '../config/express';

const https = require('https');
const fs = require('fs');

const debug = require('debug')('api.utopian.io:index');

// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign

// plugin bluebird promise in mongoose
mongoose.Promise = Promise;

// connect to mongo db
const mongoUri = config.mongo.host;
mongoose.connect(mongoUri, { server: { socketOptions: { keepAlive: 1 } } });
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${mongoUri}`);
});

// print mongoose logs in dev env
if (config.mongooseDebug) {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    debug(`${collectionName}.${method}`, util.inspect(query, false, 20), doc);
  });
}

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  // listen on port config.port

  if (config.env === 'production') {
    const options = {
      cert: fs.readFileSync('/etc/letsencrypt/live/api.utopian.io/fullchain.pem'),
      key: fs.readFileSync('/etc/letsencrypt/live/api.utopian.io/privkey.pem')
    };

    https.createServer(options, app).listen(config.port, () => {
      console.info(`server started on port ${config.port} (${config.env})`); // eslint-disable-line no-console
    });

  } else {
    app.listen(config.port, () => {
      console.info(`server started on port ${config.port} (${config.env})`); // eslint-disable-line no-console
    });
  }
}

export default app;
