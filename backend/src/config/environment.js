'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Keep server and seed configuration independent of the terminal directory.
// Deployment variables win, followed by backend/.env, then the root .env.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
