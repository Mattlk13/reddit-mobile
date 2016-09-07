import StatsdClient from 'statsd-client';

import config from 'config';
import errorLog from 'lib/errorLog';

let activeRequests = 0;

let statsdConfig;
if (config.statsdHost) {
  statsdConfig = {
    host: config.statsdHost,
    port: config.statsdPort,
    debug: config.statsdDebug,
    prefix: config.statsdPrefix,
    socketTimeout: config.statsdSocketTimeout,
  };
}

const statsd = new StatsdClient(statsdConfig || {
  _socket: { send: ()=>{}, close: ()=>{} },
});

// Check in with the statsd server every 10 seconds with how many
// active requests this instance is handling. If all instances do
// the same in the same time windows, then we'll have the right info.
const logStats = () => {
  setTimeout(() => {
    statsd.increment('activeRequests', activeRequests);
    logStats();
  }, 10000);
}
logStats();

export default router => {
  router.use(async (ctx, next) => {
    statsd.increment('request');
    activeRequests += 1;

    const start = Date.now();
    try {
      await next();
    } catch (e) {
      errorLog({
        error: `${e.name}: ${e.message}`,
        userAgent: 'SERVER',
      }, {
        hivemind: config.statsURL,
      });
    }
    const delta = Math.ceil(Date.now() - start);
    statsd.timing('response_time', delta);

    activeRequests -= 1;
    const status = ctx.response.status;
    statsd.increment(`response.${status}`);
  });
};