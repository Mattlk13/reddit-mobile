import superagent from 'superagent';
import { btoa } from 'Base64';

import ResponseError from 'apiClient/errors/ResponseError';
import ValidationError from 'apiClient/errors/ValidationError';

const fetchLogin = (username, password) => new Promise((resolve, reject) => {
  superagent
    .post('/loginproxy')
    .send({ username, password })
    .end((err, res) => {
      // NOTE: this isn't the best way to handle this but validation errors
      // seem to fail with a response key whereas api failures don't
      if (err && err.response) {
        reject(new ValidationError('/loginproxy', [err.response.body], err.status));
      } else if (err || !res.body) {
        reject(new ResponseError(err, '/loginproxy'));
      } else {
        resolve(res.body);
      }
    });
});

const refreshSession = refreshToken => new Promise((resolve, reject) => {
  superagent
    .post('/refreshproxy')
    .send({ refreshToken })
    .end((err, res) => {
      if (err || !res.body) { return reject(err); }
      resolve(res.body);
    });
});

export default class Session {
  static async fromLogin(username, password) {
    const data = await fetchLogin(username, password);
    return new Session(data.session);
  }

  constructor({ accessToken, tokenType, expires, refreshToken, scope }) {
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;
    this.tokenType = tokenType;
    this.expires = expires;
    this.scope = scope;

    if (Object.freeze) {
      Object.freeze(this);
    }
  }

  get tokenString() {
    return btoa(JSON.stringify(this.toJSON()));
  }

  get isValid() {
    return (new Date()).getTime() < this.expires;
  }

  async refresh() {
    const data = await refreshSession(this.refreshToken);
    return new Session(data.session);
  }

  toJSON() {
    return {
      accessToken: this.accessToken,
      tokenType: this.tokenType,
      expires: (new Date(this.expires)).getTime(),
      refreshToken: this.refreshToken,
      scope: this.scope,
    };
  }
}
