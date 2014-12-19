/* Copyriggtht 2014 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var crypto = require('crypto');

var TokenError = require('oauth2orize').TokenError;
var jwt = require('jsonwebtoken');
require('jws-jwk').shim();
var objectAssign = require('object-assign');

var config = require('./config');
var tokens = require(config.datastores.tokens);
var codes = require(config.datastores.codes);
var keys = require('./keys');

function makeHash(length) {
  return crypto.randomBytes(Math.ceil(length * 3 / 4))
    .toString('base64')
    .slice(0, length)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createIdToken(aud, user, nonce, userinfoScope) {
  userinfoScope = userinfoScope || [];

  var options = {
    algorithm: keys.sign[config.idToken.signKid].alg,
    expiresInMinutes: config.idToken.expiresIn / 60,
    audience: aud,
    subject: user.sub,
    issuer: config.server.root
  };

  var payload = {
    iat: new Date().getTime()
  };

  if (nonce !== undefined) {
    payload.nonce = nonce;
  }

  var userinfo = createUserinfo(user, userinfoScope);

  if (userinfo) {
    objectAssign(payload, userinfo);
  }

  return jwt.sign(payload, keys.sign[config.idToken.signKid], options);
}

function createToken(scope, user, clientId, done) {
  var tok = {
    token: makeHash(config.token.length),
    expiresIn: config.token.expiresIn,
    scope: scope,
    user: user,
    clientId: clientId,
  };

  tokens.save(tok, done);
}

function createUserinfo(user, scopes) {
  var userinfo = {};

  if (scopes.indexOf('profile') != -1) {
    objectAssign(userinfo, {
      'sub': user.id,
      'name': user.name,
      'family_name': user['family_name'],
      'given_name': user['given_name'],
      'middle_name': user['middle_name'],
      'nickname': user.nickname,
      'preferred_username': user.username,
      'profile': user.profile,
      'picture': user.picture,
      'website': user.website,
      'gender': user.gender,
      'birthdate': user.birthdate,
      'zoneinfo': user.zoneinfo,
      'locale': user.locale,
      'updated_at': user['updated_at'],
    });
  }

  if (scopes.indexOf('email') != -1) {
    objectAssign(userinfo, {
      'sub': user.id,
      'email': user.email,
      'email_verified': user['email_verified'],
    });
  }

  if (scopes.indexOf('address') != -1) {
    objectAssign(userinfo, {
      'sub': user.id,
      'address': user.address,
    });
  }

  if (scopes.indexOf('phone') != -1) {
    objectAssign(userinfo, {
      'sub': user.id,
      'phone_number': user['phone_number'],
      'phone_number_verified': user['phone_number_verified'],
    });
  }

  if (userinfo.sub === undefined) {
    return undefined;
  } else {
    return userinfo;
  }
}

function issueToken(client, user, ares, done) {
  createToken(ares.scope, user, client.clientId, function(err, token) {
    if (err) { return done(err); }

    done(null, token.token, {'expires_in': token.expiresIn});
  });
}

function issueIdToken(client, user, ares, done) {
  var userinfoScope = ares.userinfo ? ares.scope : [];

  done(null, createIdToken(client.clientId, user, ares.nonce, userinfoScope));
}

function issueCode(client, redirectUri, user, ares, done) {
  var c = {
    code: makeHash(config.code.length),
    expiresIn: config.code.expiresIn,
    scope: ares.scope,
    user: user,
    clientId: client.clientId,
    redirectUri: redirectUri
  };

  if (ares.nonce) {
    c.nonce = ares.nonce;
  }

  codes.save(c, function(err, code) {
    if (err) { return done(err); }

    done(null, code.code);
  });
}

function issueTokenFromCode(client, c, redirectUri, done) {
  codes.lookup(c, function(err, code) {
    if (err) { return done(err); }

    if (code.isRedeemed()) {
      return done(new TokenError('Code already redeemed',
                                 'invalid_request'));
    }
    if (code.isExpired()) {
      return done(new TokenError('Code expired', 'invalid_request'));
    }
    if (!code.matchesClientId(client.clientId)) {
      return done(new TokenError('Client ID does not match orignal request',
                                 'invalid_client'));
    }
    if (!code.matchesRedirectUri(redirectUri)) {
      return done(new TokenError('Redirect URI does not match orignal request',
                                 'invalid_request'));
    }

    code.redeem();

    createToken(code.scope, code.user, code.clientId, function(err, token) {
      var extras = {
        'expires_in': token.expiresIn
      };

      if (code.scope.indexOf('openid') != -1) {
        extras['id_token'] = createIdToken(code.clientId, code.user,
          code.nonce);
      }

      done(null, token.token, extras);
    });
  });
}

module.exports.issueToken = issueToken;
module.exports.issueCode = issueCode;
module.exports.issueTokenFromCode = issueTokenFromCode;
module.exports.issueIdToken = issueIdToken;
module.exports.createUserinfo = createUserinfo;
