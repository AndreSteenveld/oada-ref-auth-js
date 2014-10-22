/* Copyright 2014 Open Ag Data Alliance
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

var passport = require('passport');
var LocalStrategy = require('passport-local');
var ClientPassword = require('passport-oauth2-client-password');
var BearerStrategy = require('passport-http-bearer').Strategy;

var clientSecret = require('oada-client-secret');

var config = require('./config');

var users = require('./db/users');
var codes = require('./db/codes');
var clients = require('./db/clients');
var tokens = require('./db/tokens');

// LocalStrategy is used for the /login screen
passport.use(new LocalStrategy.Strategy(function(username, password, done) {
  users.findByUsername(username, function(err, user) {
    if(err) { return done(err); }
    if(!user) { return done(null, false); }
    if(user.password != password) { return done(null, false); }

    return done(null, user);
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  users.findById(id, function(err, user) {
    done(err, user);
  });
});

// ClientPassword used to verify client secret in Authroization flow
passport.use(new ClientPassword.Strategy({
    passReqToCallback: true
  },
  function(req, cId, cSecret, done) {
    codes.lookup(req.body.code, function(err, code) {
      if(err) { return done(err); }

      if(code.isRedeemed()) {
        return done(null, false);
      }

      clientSecret.verify(cId, cSecret, code,
        config.server.root + config.endpoints.token,
        function(err, valid) {
          if(err) { return done(err); }

          if(!valid) {
            return done(null, valid);
          }

          clients.lookup(code.clientId, function(err, client) {
            if (err) { return done(err); }

            done(null, client);
          });
        });
    });
  }));

// BearerStrategy used to protect userinfo endpoint
passport.use(new BearerStrategy(function(token, done) {
  tokens.lookup(token, function(err, t) {
    if(err) { return done(err); }
    if(!t) { return done(null, false); }

    done(null, t.user, {scope: t.scope});
  });
}));