import * as Joi from 'joi';

export default {
  // POST /api/users
  createUser: {
    body: {
      account: Joi.string().required(),
      code: Joi.string(),
      state: Joi.string(),
    }
  },
  confirmExistence: {
    body: {
      account: Joi.string().required(),
    }
  },
  createPost: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
    }
  },
  editPost: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
      title: Joi.string().required(),
      body: Joi.string().required(),
      json_metadata: Joi.object().required()
    }
  },
  createSponsor: {
    body: {
      sponsor: Joi.string().required(),
    }
  },
  createProjectSponsor: {
    body: {
      sponsor: Joi.string().required(),
    }
  },
  voteWithSponsors: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
      vote: Joi.number().required()
    }
  },
  createProject: {
    body: {
      owner: Joi.string().required(),
      platform: Joi.string().required(),
      external_id: Joi.number().required(),
      project_name: Joi.string().required(),
    }
  },
  // UPDATE /api/users/:userId
  updateUser: {
    body: {
      username: Joi.string().required(),
      mobileNumber: Joi.string().regex(/^[1-9][0-9]{9}$/).required()
    },
    params: {
      userId: Joi.string().hex().required()
    }
  },
  banUser: {
    body: {
      account: Joi.string(),
      banned: Joi.number().integer().min(0).max(9),
      bannedBy: Joi.string(),
      banReason: Joi.string(),
    },
    params: {
      userId: Joi.string(),
    }
  },
  createMod: {
    body: {
      account: Joi.string().required(),
      referrer: Joi.string(),
    },
    params: {}
  },
  removeMod: {
    body: {
      account: Joi.string().required(),
    },
    params: {}
  },
  login: {
    body: {
      code: Joi.string().required(),
    },
    params: {}
  }
};
