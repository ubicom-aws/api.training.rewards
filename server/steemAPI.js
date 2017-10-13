import steem from 'steem';
import config from '../config/config';

steem.api.setOptions({ url: config.steemNode });

export default steem.api;
