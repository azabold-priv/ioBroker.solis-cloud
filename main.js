"use strict";

const utils = require("@iobroker/adapter-core");
const axios = require("axios");
const crypto = require("crypto");

class SolisCloud extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: "solis-cloud",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    async onReady() {
		
        this.log.info("config apiKey: " + this.config.apiKey);
        this.log.info("config apiSecret: " + this.config.apiSecret);
		this.log.info("config apiUrl: " + this.config.apiUrl);

		await this.setObjectNotExistsAsync("info.connection", {
			type: "state",
			common: {
				name: "Connection Status",
				type: "boolean",
				role: "indicator.connected",
				read: true,
				write: false,
			},
			native: {},
		});
		
		this.setState("info.connection", false, true);


        this.main();
    }

    async main() {
		this.refreshInterval = setInterval(() => this.main(), 5 * 60 * 1000); // Jede 5 Minuten
		var stationId;
		
        try {
			// Liste eingetragene Stations auf
			var body = JSON.stringify({ pageNo: 1, pageSize: 10 });
			var path = '/v1/api/userStationList';
			var response = await this.apiCall(path, body);
			const numberOfRecords = response.data.page.records.length; // Dies gibt die Anzahl der Stations aus

			this.log.info("Anzahl von Stations: " + numberOfRecords);  
			
			stationId = response.data.page.records[0].id;
			this.log.info("Station ID: " + stationId);
			
			await this.setObjectNotExistsAsync(stationId, {
				type: "device",
				common: {
					name: "stationID",
				},
				native: {},
			});
			
		} catch (error) {
            this.log.error(error.toString());
        }
		
		
		try {
			// Hole Daten von Station
			body = JSON.stringify({ id: stationId});
			path = '/v1/api/stationDetail';
			response = await this.apiCall(path, body);
		
		} catch (error) {
            this.log.error(error.toString());
        }	
		
		
		// Definiere Werte die gespeichert werden
		const allowedKeys = ["batteryPower", "batteryPercent", "psum", "totalLoadPower", "power"];
		
		const responseData = response.data;

		for (let key in responseData) {
			if (responseData.hasOwnProperty(key)) {
				
				// Überprüfen, ob der Wert gespeichert werden soll
				if (allowedKeys.includes(key)) {
				
					const statePath = `${stationId}.${key}`;
					const value = responseData[key];

					// Stellen Sie sicher, dass der State existiert, bevor Sie ihn setzen
					await this.setObjectNotExistsAsync(statePath, {
						type: "state",
						common: {
							name: key,
							type: typeof value,  // Der Typ wird automatisch auf Grundlage des Wertes bestimmt
							role: "state",
							read: true,
							write: false,
						},
						native: {},
					});

					// Setzen Sie den Wert des State
					await this.setStateAsync(statePath, { val: value, ack: true });
				}
			}
		}
		this.subscribeStates("*");

    }
	
	async apiCall (apiPath, apiBody) {
		try {
            const apiKey = this.config.apiKey;
            const apiSecret = this.config.apiSecret;
			const apiUrl = this.config.apiUrl
            const contentMd5 = this.getDigest(apiBody);
            const date = this.getGMTTime();
            const param = `POST\n${contentMd5}\napplication/json\n${date}\n${apiPath}`;
            const sign = this.hmacSHA1Encrypt(param, apiSecret);
            const url = apiUrl + apiPath;
            this.log.info("Url-Call: " + url);
            const response = await axios.post(url, apiBody, {
                headers: {
                    'Content-type': 'application/json;charset=UTF-8',
                    'Authorization': `API ${apiKey}:${sign}`,
                    'Content-MD5': contentMd5,
                    'Date': date,
                },
            });
    
            this.log.info("Resonse " + apiPath + ": " + JSON.stringify(response.data));
			this.setState("info.connection", true, true);
			return response.data

        } catch (error) {
			this.setState("info.connection", false, true);
            this.log.error(error.toString());
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
			this.setState("info.connection", false, true);
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