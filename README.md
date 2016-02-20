# Nuance JavaScript Websocket Sample App

This sample is intended to demonstrate how to use the Nuance Websocket protocol in JavaScript.

You can perform 3 types of transactions with this protocol.
1. Text to Speech (TTS)
2. Automatic Speech Recognition (ASR)
3. Natural Language Processing (NLU)

## Configuration

### Credentials
You will need credentials to connect to perform any of the 3 transiaction types.

You can either enter your Nuance Developer credentials into the Web App everytime the page loads.

Or you may edit the following lines in index.html:

```javascript
var URL = 'wss://httpapi.labs.nuance.com/v1?';
var APP_ID = undefined;  // "NMDPTRIAL_username1234567890"
var APP_KEY = undefined; // "e77b5c751b94dddefc7d34bb5a4c44dc62199b5fd762da761974e36db57acecfcda31c8ad47946ccdca1516fa73476ebb46117c9a7124baeeb6e"
var USER_ID = undefined; // "user.name@company.com"
```

You may find your credentials in the [Nuance Developers Portal](http://dragonmobile.nuancemobiledeveloper.com/), under "My Apps"


### NLU Service Tag
You will need a service tag to perform NLU.

Your tag can be entered in the Web App everytime the page loads.

Or you may edit the following line in index.html:

```javascript
var NLU_TAG = undefined; // "Project123_App456"
```

*Note if you leave the tag empty, ASR will still be performed without NLU.*

You can create versions of your NLU model and associate them to an application in [Bolt](https://bolt.dev.nuance.com), on the "Deploy" tab of your project.
