# api.utopian.io
This is the **node API for Utopian.io**, built in TypeScript.
Utopian wants to reward Open Source contributors for their hard work.

See our sister project (the frontend of Utopian) built in `REACT.js` [here](https://github.com/utopian-io/utopian.io)!

## Contributing
Get in touch on Discord: https://discord.gg/5qMzAJ

### Run a MongoDB Instance
Create a database named utopian-io

### Clone and Install
git clone https://github.com/utopian-io/api.utopian.io api.utopian.io

cd api.utopian.io

npm install

### Create .env file
UTOPIAN_GITHUB_SECRET=GITHUB_SECRET_HERE
UTOPIAN_GITHUB_CLIENT_ID=GITHUB_CLIENT_ID_HERE
UTOPIAN_GITHUB_REDIRECT_URL=http://localhost:3000/github/callback
UTOPIAN_STEEMCONNECT_SECRET=STEEM_CONNECT_SECRET
MONGO_HOST=mongodb://localhost/utopian-io
You can generate a Steem Connect secret by creating an application on https://v2.steemconnect.com/apps/create.

Replace the Github values by creating a test app for your local environment.

### Generate and Export SSL Certificates
export NODE_TLS_REJECT_UNAUTHORIZED=0

openssl req -x509 -sha512 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

export SERVER_SSL_CERT="/path/cert.pem"

export SERVER_SSL_KEY="/path/key.pem"

Replace path with the path to the generated .pem files.
You may need to authorise your browser in using a self-signed SSL certificate

### Run The Backend
npm run build

npm run dev-server

## License
GNU Public License v3.0. Copyright Utopian.io
