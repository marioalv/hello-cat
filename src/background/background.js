if (typeof msBrowser !== 'undefined') {
  chrome = msBrowser;
}
else if (typeof browser != 'undefined')
{
  chrome = browser;
}

chrome.browserAction.onClicked.addListener(function (activeTab) {
  chrome.tabs.create({ url: 'background/helloCat.html' }, null);
  google.payments.inapp.getPurchases({
    'parameters': {'env': 'prod'},
    'success': getPurchasesSuccess,
    'failure': getPurchasesError
  });
  //getLicense();

  var sku = "cat_whiskers";
  google.payments.inapp.buy({
    'parameters': {'env': 'prod'},
    'sku': sku,
    'success': onPurchase,
    'failure': onPurchaseFail
  });
});

console.log("Hello Cat");

//In App purchases
google.payments.inapp.getPurchases({
  'parameters': {'env': 'prod'},
  'success': getPurchasesSuccess,
  'failure': getPurchasesError
});

function getPurchasesSuccess(aResponse) {
  console.log(" +++ getPurchases SUCCESS +++ ");
  console.log(aResponse);
  if(0 < aResponse.length) {
    extensionIconSettings({color:[0, 0, 0, 0]}, "P", "You have paid for the extension");
    console.log("You have paid for the extension");
    alert("You have paid for the extension");
  } else {
    extensionIconSettings({color:[255, 0, 0, 230]}, "!", "You have not paid for the extension.");
    console.log("You have NOT paid for the extension");
    alert("You have NOT paid for the extension");
  }
}

function getPurchasesError(aResponse) {
  console.log(" +++ getPurchases FAILURE +++ ");
  console.log(aResponse);
  extensionIconSettings({color:[255, 0, 0, 230]}, "?", "You have not paid for the extension.");
}

function onPurchase(aResponse) {
  console.log(" +++ onPurchase SUCCESS +++ ");
  console.log(aResponse);
  extensionIconSettings({color:[0, 0, 0, 0]}, "P", "You have paid for the extension");
  console.log("Your payment has been completed. Thank you");
  alert("Your payment has been completed. Thank you");
}

function onPurchaseFail(aResponse) {
  console.log(" +++ onPurchaseFail FAILURE +++ ");
  console.log(aResponse);
}

function extensionIconSettings(badgeColorObject, badgeText, extensionTitle ){
  chrome.browserAction.setBadgeBackgroundColor(badgeColorObject);
  chrome.browserAction.setBadgeText({text:badgeText});
  chrome.browserAction.setTitle({ title: extensionTitle });
}

//License API
function getLicense() {
  var CWS_LICENSE_API_URL = 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/';
  xhrWithAuth('GET', CWS_LICENSE_API_URL + chrome.runtime.id, true, onLicenseFetched);
}

function onLicenseFetched(error, status, response) {
  function extensionIconSettings(badgeColorObject, badgeText, extensionTitle ){
    chrome.browserAction.setBadgeBackgroundColor(badgeColorObject);
    chrome.browserAction.setBadgeText({text:badgeText});
    chrome.browserAction.setTitle({ title: extensionTitle });
  }
  var licenseStatus = "";
  if (status === 200 && response) {
    response = JSON.parse(response);
    licenseStatus = parseLicense(response);
  } else {
    console.log("FAILED to get license. Free trial granted.");
    licenseStatus = "unknown";
  }
  if(licenseStatus){
    if(licenseStatus === "Full"){
      window.localStorage.setItem('ChromeGuardislicensed', 'true');
      extensionIconSettings({color:[0, 0, 0, 0]}, "", "appname is enabled.");
    }else if(licenseStatus === "None"){
      //chrome.browserAction.setIcon({path: icon}); to disabled - grayed out?
      extensionIconSettings({color:[255, 0, 0, 230]}, "?", "appnameis disabled.");
      //redirect to a page about paying as well?
    }else if(licenseStatus === "Free"){
      window.localStorage.setItem('appnameislicensed', 'true');
      extensionIconSettings({color:[255, 0, 0, 0]}, "", window.localStorage.getItem('daysLeftInappnameTrial') + " days left in free trial.");
    }else if(licenseStatus === "unknown"){
      //this does mean that if they don't approve the permissions,
      //it works free forever. This might not be ideal
      //however, if the licensing server isn't working, I would prefer it to work.
      window.localStorage.setItem('appnameislicensed', 'true');
      extensionIconSettings({color:[200, 200, 0, 100]}, "?", "appnameis enabled, but was unable to check license status.");
    }
  }
  window.localStorage.setItem('appnameLicenseCheckComplete', 'true');
}

/*****************************************************************************
* Parse the license and determine if the user should get a free trial
*  - if license.accessLevel == "FULL", they've paid for the app
*  - if license.accessLevel == "FREE_TRIAL" they haven't paid
*    - If they've used the app for less than TRIAL_PERIOD_DAYS days, free trial
*    - Otherwise, the free trial has expired
*****************************************************************************/

function parseLicense(license) {
  var TRIAL_PERIOD_DAYS = 1;
  var licenseStatusText;
  var licenceStatus;
  if (license.result && license.accessLevel == "FULL") {
    console.log("Fully paid & properly licensed.");
    LicenseStatus = "Full";
  } else if (license.result && license.accessLevel == "FREE_TRIAL") {
    var daysAgoLicenseIssued = Date.now() - parseInt(license.createdTime, 10);
    daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
    if (daysAgoLicenseIssued <= TRIAL_PERIOD_DAYS) {
      window.localStorage.setItem('daysLeftInCGTrial', TRIAL_PERIOD_DAYS - daysAgoLicenseIssued);
      console.log("Free trial, still within trial period");
      LicenseStatus = "Free";
    } else {
      console.log("Free trial, trial period expired.");
      LicenseStatus = "None";
      //open a page telling them it is not working since they didn't pay?
    }
  } else {
    console.log("No license ever issued.");
    LicenseStatus = "None";
    //open a page telling them it is not working since they didn't pay?
  }
  return LicenseStatus;
}

/*****************************************************************************
* Helper method for making authenticated requests
*****************************************************************************/

// Helper Util for making authenticated XHRs
function xhrWithAuth(method, url, interactive, callback) {
  console.log(url);
  var retry = true;
  var access_token;
  getToken();

  function getToken() {
    console.log("Calling chrome.identity.getAuthToken", interactive);
    chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
      }
      console.log("chrome.identity.getAuthToken returned a token", token);
      access_token = token;
      requestStart();
    });
  }

  function requestStart() {
    console.log("Starting authenticated XHR...");
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.onreadystatechange = function (oEvent) {
      console.log("oEvent", oEvent);
      if (xhr.readyState === 4) {
        if (xhr.status === 401 && retry) {
          retry = false;
          chrome.identity.removeCachedAuthToken({ 'token': access_token },
                                                getToken);
        } else if(xhr.status === 200) {
          console.log("xhr.response", xhr.response);
          console.log("Authenticated XHR completed.");
          callback(null, xhr.status, xhr.response);
        }
      } else {
        console.log("Error - " + xhr);
      }
    };
    try {
      xhr.send();
    } catch(e) {
      console.log("Error in xhr - " + e);
    }
  }
}
