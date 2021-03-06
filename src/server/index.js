import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Sequelize from 'sequelize';
import epilogue from 'epilogue';
import OktaJwtVerifier from '@okta/jwt-verifier';
import log from './log';

dotenv.config({
  path: '.env.local',
});

const {
  REACT_APP_OKTA_CLIENT_ID,
  REACT_APP_OKTA_ORG_URL,
  REACT_APP_DATABASE_NAME,
  REACT_APP_DATABASE_USER,
  REACT_APP_DATABASE_PASSWORD,
  REACT_APP_DATABASE_HOST,
  REACT_APP_DATABASE_PORT,
  SERVER_PORT,
} = process.env;

const oktaJwtVerifier = new OktaJwtVerifier({
  clientId: REACT_APP_OKTA_CLIENT_ID,
  issuer: `${REACT_APP_OKTA_ORG_URL}/oauth2/default`,
});

const database = new Sequelize(
  REACT_APP_DATABASE_NAME,
  REACT_APP_DATABASE_USER,
  REACT_APP_DATABASE_PASSWORD,
  {
    host: REACT_APP_DATABASE_HOST,
    port: REACT_APP_DATABASE_PORT || 5432,
    dialect: 'postgres',
  },
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  try {
    if (req.path === '/stepLeaders' || req.path === '/donationLeaders') {
      return next();
    }
    if (!req.headers.authorization)
      throw new Error('Authorization header is required');
    const accessToken = req.headers.authorization.trim().split(' ')[1];
    await oktaJwtVerifier.verifyAccessToken(accessToken);
    return next();
  } catch (error) {
    return next(error.message);
  }
});

app.route('/stepLeaders').get((req, res) => {
  database
    .query(
      'SELECT RANK () OVER(ORDER BY SUM(steps) DESC) as rank, steps.name, charity_name, fundraising_link, SUM(steps) as steps FROM steps LEFT JOIN profiles USING (user_id) GROUP BY steps.name, user_id, charity_name, fundraising_link',
    )
    .then(steps => {
      res.json(steps[0]);
    });
});

app.route('/donationLeaders').get((req, res) => {
  database
    .query(
      'SELECT RANK () OVER(ORDER BY total_donations DESC) as rank, name, charity_name, fundraising_link, total_donations FROM profiles GROUP BY name, user_id, charity_name, fundraising_link',
    )
    .then(steps => {
      res.json(steps[0]);
    });
});

const Step = database.define(
  'steps',
  {
    userId: { type: Sequelize.STRING, field: 'user_id' },
    name: Sequelize.STRING,
    steps: Sequelize.INTEGER,
    stepsDate: { type: Sequelize.DATEONLY, field: 'steps_date' },
  },
  { underscored: true },
);

const Profile = database.define(
  'profiles',
  {
    userId: { type: Sequelize.STRING, field: 'user_id', primaryKey: true },
    name: Sequelize.STRING,
    charityName: { type: Sequelize.STRING, field: 'charity_name' },
    totalDonations: { type: Sequelize.INTEGER, field: 'total_donations' },
    fundraisingLink: { type: Sequelize.STRING, field: 'fundraising_link' },
    region: Sequelize.STRING,
  },
  { underscored: true },
);

epilogue.initialize({ app, sequelize: database });

const stepsResource = epilogue.resource({
  model: Step,
  endpoints: ['/steps', '/steps/:id'],
});

stepsResource.delete.fetch(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

stepsResource.update.write(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

stepsResource.create.write(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

const profileReource = epilogue.resource({
  model: Profile,
  endpoints: ['/profiles', '/profiles/:userId'],
});

profileReource.delete.fetch(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

profileReource.update.write(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

profileReource.create.write(async (req, res, context) => {
  const accessToken = req.headers.authorization.trim().split(' ')[1];
  const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken);
  if (context.instance.dataValues.userId !== jwt.claims.uid) {
    return context.error(403, 'Not your record!');
  }
  return context.continue;
});

const port = SERVER_PORT || 3003;

database.sync().then(() => {
  app.listen(port, () => {
    log(`Listening on port ${port}`);
  });
});
