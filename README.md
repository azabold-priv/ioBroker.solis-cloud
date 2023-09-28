![Logo](admin/solis-cloud.png)
# SolisCloud Adapter for ioBroker

This adapter allows for seamless integration between the SolisCloud API and your ioBroker ecosystem, making data retrieval from Solis devices such as solar inverters straightforward and efficient.

## Features

- Automatic detection and creation of Solis stations within ioBroker.
- Periodic data fetch for each station based on user-defined intervals.
- Implemented error-handling mechanism for API rate limits with a built-in retry mechanism.
- HMAC-SHA1 authenticated secure API calls.

## Installation

1. Clone this repository.
2. Navigate to the cloned directory and run `npm install` to pull in necessary dependencies.
3. Within ioBroker, configure the adapter's settings as per your requirements.
4. Activate the adapter.

## API Key & Secret Retrieval

Before accessing the SolisCloud API, an explicit request for access is mandatory:

Apply for API key and secret:

1. Navigate to the [Solis Service Centre](https://solis-service.solisinverters.com/en/support/solutions/articles/44002212561-api-access-soliscloud).
2. Choose to submit an 'API Access Request' ticket.
3. Ensure to fill in the corresponding Solis Cloud email address within the ticket.
4. Wait for approval.

To get your API key and secret:

1. Visit [SolisCloud](https://www.soliscloud.com/).
2. Log in to your SolisCloud account.
3. Navigate to the "User Info" section.
4. Under the "API Access" tab, you'll find your `apiKey` and `apiSecret`.
5. Use these credentials in the configuration settings for the ioBroker adapter.

## Configuration

Following your adapter installation in ioBroker, configuration is necessary. Here's a breakdown of available configurations:

- **apiKey**: Your designated API key for SolisCloud.
- **apiSecret**: Your designated API secret for SolisCloud.
- **apiUrl**: The base URL meant for SolisCloud API interactions (default: `https://api.soliscloud.com`).
- **refreshInterval**: The interval (in minutes) dictating the frequency of data refreshes from SolisCloud.
- **allowedKeys**: A set array of keys determining the data types to be stored in ioBroker. E.g., `["batteryPower", "batteryPercent", "psum", "totalLoadPower", "power"]`.

## Functionality

Once the adapter is activated and transitions to the "ready" phase, it will:

1. Retrieve the station list corresponding to the provided API key.
2. For every station, it will extract the data specified in `allowedKeys`.
3. The extracted data is then stored under the station ID within ioBroker states.
4. Every specified `refreshInterval`, step 2 is executed.

A built-in mechanism ensures that if the SolisCloud API introduces rate limitations, the adapter will detect it and retry after a 5-minute interval.

## Dependencies

- **@iobroker/adapter-core**: A utility set aimed at simplifying the ioBroker adapter development process.
- **axios**: A promise-based HTTP client suitable for browser and node.js operations.
- **crypto**: A Node.js native module catering to varied cryptographic tasks.

## Error Handling

The adapter comes with an inherent error-handling mechanism equipped to tackle API errors, rate limitations, and other unexpected issues. Pertinent error logs will be available within ioBroker.

## API Documentation

For a comprehensive understanding and deeper insights into the SolisCloud API's functionalities, the official documentation is available [here](https://oss.soliscloud.com/templet/SolisCloud%20Platform%20API%20Document%20V2.0.pdf).

## License
MIT License

Copyright (c) 2023 azabold <azabold@web.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**Note**: If the project utilizes an MIT license or any other, ensure that the actual license text is appended. Always credit the original content creator if their work is being utilized. The provided instructions should be adjusted to perfectly align with your setup's requirements.

### **WORK IN PROGRESS**
* (azabold) initial release

