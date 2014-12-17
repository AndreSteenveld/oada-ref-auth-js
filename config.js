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

var path = require('path');
var fs = require('fs');

module.exports = {
  server: {
    jsonSpaces: 2,
    sessionSecret: 'Xka*32F@*!15',
    port: 443,
    httpMode: false,
    root: 'https://identity.oada-dev.com',
  },
  endpoints: {
    authorize: '/auth',
    token: '/token',
    decision: '/decision',
    login: '/login',
    logout: '/logout',
    certs: '/certs',
    userinfo: '/userinfo',
    clientDiscovery: '/clientDiscovery',
  },
  oauth2: {
    enable: true,
  },
  oidc: {
    enable: true,
  },
  clientDiscovery: {
    enable: true,
  },
  code: {
    length: 25,
    expiresIn: 10,
  },
  token: {
    length: 40,
    expiresIn: 3600,
  },
  idToken: {
    expiresIn: 3600,
    signKid: 'kjcScjc32dwJXXLJDs3r124sa1',
  },
  certs: {
    key: fs.readFileSync(path.join(__dirname, 'certs/ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/ssl/cert.crt')),
  },
  keys: {
    signPems: path.join(__dirname, 'certs/sign/'),
  }
};
