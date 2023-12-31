'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const crypto = require('crypto');

class SolisCloud extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'solis-cloud',
    });
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.stationIds = [];
  }

  async onReady() {
    this.log.info('config apiKey: ' + this.config.apiKey);
    this.log.info('config apiSecret: ' + this.config.apiSecret);
    this.log.info('config apiUrl: ' + this.config.apiUrl);
    this.log.info('config refreshInterval: ' + this.config.refreshInterval);
    this.log.info('config allowedKeys: ' + this.config.allowedKeys);

    await this.setObjectNotExistsAsync('info.connection', {
      type: 'state',
      common: {
        name: 'Connection Status',
        type: 'boolean',
        role: 'indicator.connected',
        read: true,
        write: false,
      },
      native: {},
    });

    this.setState('info.connection', false, true);
    this.isRateLimited = false;
    this.refreshInterval = setInterval(
        () => this.main(),
        this.config.refreshInterval * 60 * 1000,
    );

    try {
      // Liste eingetragene Stations auf
      const body = JSON.stringify({pageNo: 1, pageSize: 10});
      const path = '/v1/api/userStationList';
      const response = await this.apiCall(path, body);
      if (response && response.success == true) {
        // Gibt die Anzahl der Stations aus
        const numberOfRecords = response.data.page.records.length;

        this.log.info('Anzahl von Stations: ' + numberOfRecords);

        for (const record of response.data.page.records) {
          const stationId = record.id;
          this.stationIds.push(stationId);
          this.log.info('Station ID: ' + stationId);

          await this.setObjectNotExistsAsync(stationId, {
            type: 'device',
            common: {
              name: 'stationID',
            },
            native: {},
          });
        }
      }
    } catch (error) {
      this.log.error(error.toString());
    }

    this.main();
  }

  async main() {
    if (this.isRateLimited) {
      this.log.warn('Skipping due to rate limit. Will retry later.');
      return;
    }

    for (const stationId of this.stationIds) {
      try {
        // Hole Daten von Station
        const body = JSON.stringify({id: stationId});
        const path = '/v1/api/stationDetail';
        const response = await this.apiCall(path, body);

        if (response && response.success == true) {
          const allowedKeys = this.config.allowedKeys;
          const responseData = response.data;

          for (const key in responseData) {
            if (responseData.hasOwnProperty(key)) {
              // Überprüfen, ob der Wert gespeichert werden soll
              if (allowedKeys.includes(key)) {
                const statePath = `${stationId}.${key}`;
                const value = responseData[key];

                // Stellt sicher, dass der State existiert
                await this.setObjectNotExistsAsync(statePath, {
                  type: 'state',
                  common: {
                    name: key,
                    type: typeof value,
                    role: 'state',
                    read: true,
                    write: false,
                  },
                  native: {},
                });

                // Setzen Sie den Wert des State
                await this.setStateAsync(statePath, {val: value, ack: true});
              }
            }
          }
        }
      } catch (error) {
        this.log.error(error.toString());
      }
    }

    this.subscribeStates('*');
  }


  async apiCall(apiPath, apiBody) {
    try {
      const apiKey = this.config.apiKey;
      const apiSecret = this.config.apiSecret;
      const apiUrl = this.config.apiUrl;
      const contentMd5 = this.getDigest(apiBody);
      const date = this.getGMTTime();
      const param =
        'POST\n' +
        `${contentMd5}\n` +
        'application/json\n' +
        `${date}\n` +
        `${apiPath}`;

      const sign = this.hmacSHA1Encrypt(param, apiSecret);
      const url = apiUrl + apiPath;
      this.log.info('Url-Call: ' + url);
      const response = await axios.post(url, apiBody, {
        headers: {
          'Content-type': 'application/json;charset=UTF-8',
          'Authorization': `API ${apiKey}:${sign}`,
          'Content-MD5': contentMd5,
          'Date': date,
        },
      });

      this.log.debug('Resonse ' + apiPath + ': ' +
        JSON.stringify(response.data));
      this.setState('info.connection', true, true);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        this.log.warn('Rate limit reached. Retrying in 5 minutes...');
        this.isRateLimited = true;
        setTimeout(() => {
          this.isRateLimited = false;
        }, 5 * 60 * 1000); // 5 Minuten
      } else {
        // andere Fehlerarten
        this.log.error(error.toString());
      }
      this.setState('info.connection', false, true);
      return null; // Rückgabe von null, wenn ein Fehler auftritt
    }
  }

  hmacSHA1Encrypt(encryptText, apiSecret) {
    const hmac = crypto.createHmac('sha1', apiSecret);
    hmac.update(encryptText, 'utf8');
    return hmac.digest('base64');
  }

  getGMTTime() {
    return new Date().toUTCString();
  }

  getDigest(test) {
    const hash = crypto.createHash('md5');
    hash.update(test);
    return hash.digest('base64');
  }

  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }

  onUnload(callback) {
    try {
      clearInterval(this.refreshInterval);
      this.setState('info.connection', false, true);
    } catch (e) {
      callback();
    }
  }
}

if (require.main !== module) {
  module.exports = (options) => new SolisCloud(options);
} else {
  new SolisCloud();
}
