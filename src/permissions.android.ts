import { Trace, Utils } from '@nativescript/core';
import { AndroidActivityRequestPermissionsEventData, AndroidApplication, android as androidApp } from '@nativescript/core/application';
import { getBoolean, setBoolean } from '@nativescript/core/application-settings';
import { CheckOptions, Permissions as PermissionsType, Rationale, RequestOptions, Status } from './permissions';
import { CLog, CLogTypes } from './permissions.common';

export * from './permissions.common';

let ANDROID_SDK = -1;
function getAndroidSDK() {
    if (ANDROID_SDK === -1) {
        ANDROID_SDK = android.os.Build.VERSION.SDK_INT;
    }
    return ANDROID_SDK;
}

const JELLY_BEAN = 18;
const MARSHMALLOW = 23;
const ANDROIDQ = 29;
const ANDROIDS = 31;

const NativePermissionsTypes: PermissionsType[] = ['location', 'camera', 'mediaLocation', 'microphone', 'contacts', 'event', 'storage', 'photo', 'callPhone', 'readSms', 'receiveSms', 'bluetoothScan', 'bluetoothConnect', 'bluetooth'];
type NativePermissionsNames = typeof NativePermissionsTypes; // type Names = readonly ['Mike', 'Jeff', 'Ben']
type NativePermissions = NativePermissionsNames[number];
function getNativePermissions(permission: NativePermissions, options?) {
    switch(permission) {
        case 'location': {
            const result = [];
            const coarse = options && options.coarse;
            const precise = options && options.precise;
            if (coarse !== false) {
                result.push(android.Manifest.permission.ACCESS_COARSE_LOCATION);
            }
            if (precise !== false) {
                result.push(android.Manifest.permission.ACCESS_FINE_LOCATION);
            }
            if (getAndroidSDK() >= ANDROIDQ) {
                const type = typeof options === 'string' ? options : options && options.type;
                if (type === 'always') {
                    result.push(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION);
                }
            }
            return result;
        }
        case 'camera': {
            return [android.Manifest.permission.CAMERA];
        }
        case 'mediaLocation': {
            if (getAndroidSDK() >= ANDROIDQ) {
                return [android.Manifest.permission.ACCESS_MEDIA_LOCATION];
            }
            break;
        }
        case 'microphone': {
            return [android.Manifest.permission.RECORD_AUDIO];
        }
        case 'contacts': {
            return [android.Manifest.permission.READ_CONTACTS];
        }
        case 'event': {
            return [android.Manifest.permission.READ_CALENDAR];
        }
        case 'storage': {
            const result = [];
            const read = options && options.read;
            const write = options && options.write;
            if (read !== false) {
                result.push(android.Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            if (write !== false) {
                result.push(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
            return result;
        }
        case 'photo': {
            return [android.Manifest.permission.WRITE_EXTERNAL_STORAGE];
        }
        case 'callPhone': {
            return [android.Manifest.permission.CALL_PHONE];
        }
        case 'readSms': {
            return [android.Manifest.permission.READ_SMS];
        }
        case 'receiveSms': {
            return [android.Manifest.permission.RECEIVE_SMS];
        }
        case 'bluetoothScan': {
            if (getAndroidSDK() >= ANDROIDS) {
                return [android.Manifest.permission.BLUETOOTH_SCAN];
            }
            break;
        }
        case 'bluetoothConnect': {
            if (getAndroidSDK() >= ANDROIDS) {
                return [android.Manifest.permission.BLUETOOTH_CONNECT];
            }
            break;
        }
        case 'bluetooth': {
            if (getAndroidSDK() >= ANDROIDS) {
                return [android.Manifest.permission.BLUETOOTH_ADVERTISE];
            }
            break;
        }
    }
    return [];
}


const STORAGE_KEY = '@NSPermissions:didAskPermission:';

const setDidAskOnce = (permission: string) => Promise.resolve().then(() => setBoolean(STORAGE_KEY + permission, true));

const getDidAskOnce = (permission: string) => Promise.resolve(!!getBoolean(STORAGE_KEY + permission));

export enum PermissionStatus {
    GRANTED = 'authorized',
    DENIED = 'denied',
    NEVER_ASK_AGAIN = 'never_ask_again'
}

namespace PermissionsAndroid {
    /**
     * A list of specified "dangerous" permissions that require prompting the user
     */
    // export const PERMISSIONS = {
    //     READ_CALENDAR: 'android.permission.READ_CALENDAR',
    //     WRITE_CALENDAR: 'android.permission.WRITE_CALENDAR',
    //     CAMERA: 'android.permission.CAMERA',
    //     READ_CONTACTS: 'android.permission.READ_CONTACTS',
    //     WRITE_CONTACTS: 'android.permission.WRITE_CONTACTS',
    //     GET_ACCOUNTS: 'android.permission.GET_ACCOUNTS',
    //     ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    //     ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    //     RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    //     READ_PHONE_STATE: 'android.permission.READ_PHONE_STATE',
    //     CALL_PHONE: 'android.permission.CALL_PHONE',
    //     READ_CALL_LOG: 'android.permission.READ_CALL_LOG',
    //     WRITE_CALL_LOG: 'android.permission.WRITE_CALL_LOG',
    //     ADD_VOICEMAIL: 'com.android.voicemail.permission.ADD_VOICEMAIL',
    //     USE_SIP: 'android.permission.USE_SIP',
    //     PROCESS_OUTGOING_CALLS: 'android.permission.PROCESS_OUTGOING_CALLS',
    //     BODY_SENSORS: 'android.permission.BODY_SENSORS',
    //     SEND_SMS: 'android.permission.SEND_SMS',
    //     RECEIVE_SMS: 'android.permission.RECEIVE_SMS',
    //     READ_SMS: 'android.permission.READ_SMS',
    //     RECEIVE_WAP_PUSH: 'android.permission.RECEIVE_WAP_PUSH',
    //     RECEIVE_MMS: 'android.permission.RECEIVE_MMS',
    //     READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    //     WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE'
    // };

    export const RESULTS = {
        GRANTED: 'authorized',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again'
    };

    /**
     * Returns a promise resolving to a boolean value as to whether the specified
     * permissions has been granted
     *
     * See https://facebook.github.io/react-native/docs/permissionsandroid.html#check
     */
    export async function check(permission: string | string[]) {
        const context = Utils.android.getApplicationContext();
        let result =true;
        const granted = android.content.pm.PackageManager.PERMISSION_GRANTED;
        if (!Array.isArray(permission)) {
            permission = [permission];
        }
        if (getAndroidSDK() < MARSHMALLOW) {
            permission.forEach(p=>result = result && context.checkPermission(p, android.os.Process.myPid(), android.os.Process.myUid()) === granted);
        } else {
            permission.forEach(p=>result = result && context.checkSelfPermission(p) === granted);
        }
        return (result);
    }

    /**
     * Prompts the user to enable a permission and returns a promise resolving to a
     * string value indicating whether the user allowed or denied the request
     *
     * See https://facebook.github.io/react-native/docs/permissionsandroid.html#request
     */
    export async function request(permission: string, rationale?: Rationale): Promise<PermissionStatus> {
        // if (rationale) {
        //     const shouldShowRationale = await shouldShowRequestPermissionRationale(permission);

        //     if (shouldShowRationale) {
        //         return new Promise((resolve, reject) => {

        //             NativeModules.DialogManagerAndroid.showAlert(rationale, () => reject(new Error('Error showing rationale')), () => resolve(requestPermission(permission)));
        //         });
        //     }
        // }
        return requestPermission(permission);
    }

    /**
     * Prompts the user to enable multiple permissions in the same dialog and
     * returns an object with the permissions as keys and strings as values
     * indicating whether the user allowed or denied the request
     *
     * See https://facebook.github.io/react-native/docs/permissionsandroid.html#requestmultiple
     */
    export function requestMultiple(permissions: string[]): Promise<{ [permission: string]: Status }> {
        return requestMultiplePermissions(permissions);
    }
}

// PermissionsAndroid = new PermissionsAndroid();

let mRequestCode = 0;
function requestPermission(permission: string): Promise<PermissionStatus> {
    const activity: android.app.Activity = androidApp.foregroundActivity || androidApp.startActivity;
    if (getAndroidSDK() < MARSHMALLOW) {
        return Promise.resolve(
            activity.checkPermission(permission, android.os.Process.myPid(), android.os.Process.myUid()) === android.content.pm.PackageManager.PERMISSION_GRANTED
                ? PermissionStatus.GRANTED
                : PermissionStatus.DENIED
        );
    }
    if (activity.checkSelfPermission(permission) === android.content.pm.PackageManager.PERMISSION_GRANTED) {
        return Promise.resolve(PermissionStatus.GRANTED);
    }

    return new Promise((resolve, reject) => {
        try {
            const requestCode = mRequestCode++;
            activity.requestPermissions([permission], requestCode);
            androidApp.on(AndroidApplication.activityRequestPermissionsEvent, (args: AndroidActivityRequestPermissionsEventData) => {
                if (args.requestCode === requestCode) {
                    if (args.grantResults.length > 0) {
                        if (args.grantResults.length > 0 && args.grantResults[0] === android.content.pm.PackageManager.PERMISSION_GRANTED) {
                            resolve(PermissionStatus.GRANTED);
                        } else {
                            if (activity.shouldShowRequestPermissionRationale(permission)) {
                                resolve(PermissionStatus.DENIED);
                            } else {
                                resolve(PermissionStatus.NEVER_ASK_AGAIN);
                            }
                        }
                    } else {
                        // it is possible that the permissions request interaction with the user is interrupted. In this case you will receive empty permissions and results arrays which should be treated as a cancellation.
                        reject();
                    }
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function requestMultiplePermissions(permissions: string[]): Promise<{ [permission: string]: Status }> {
    const grantedPermissions = {};
    const permissionsToCheck = [];
    let checkedPermissionsCount = 0;
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'requestMultiplePermissions', permissions);
    }
    const context = Utils.android.getApplicationContext();

    for (let i = 0; i < permissions.length; i++) {
        const perm = permissions[i];

        if (getAndroidSDK() < MARSHMALLOW) {
            grantedPermissions[perm] =
                context.checkPermission(perm, android.os.Process.myPid(), android.os.Process.myUid()) === android.content.pm.PackageManager.PERMISSION_GRANTED
                    ? PermissionStatus.GRANTED
                    : PermissionStatus.DENIED;
            checkedPermissionsCount++;
        } else if (context.checkSelfPermission(perm) === android.content.pm.PackageManager.PERMISSION_GRANTED) {
            grantedPermissions[perm] = PermissionStatus.GRANTED;
            checkedPermissionsCount++;
        } else {
            permissionsToCheck.push(perm);
        }
    }
    if (permissions.length === checkedPermissionsCount) {
        return (grantedPermissions);
    }
    const activity: android.app.Activity = androidApp.foregroundActivity || androidApp.startActivity;
    return new Promise((resolve, reject) => {
        try {
            const requestCode = mRequestCode++;

            activity.requestPermissions(permissionsToCheck, requestCode);
            androidApp.on(AndroidApplication.activityRequestPermissionsEvent, (args: AndroidActivityRequestPermissionsEventData) => {
                if (args.requestCode === requestCode) {
                    const results = args.grantResults;
                    for (let j = 0; j < permissionsToCheck.length; j++) {
                        const permission = permissionsToCheck[j];
                        if (results.length > j && results[j] === android.content.pm.PackageManager.PERMISSION_GRANTED) {
                            grantedPermissions[permission] = PermissionStatus.GRANTED;
                        } else {
                            if (activity.shouldShowRequestPermissionRationale(permission)) {
                                grantedPermissions[permission] = PermissionStatus.DENIED;
                            } else {
                                grantedPermissions[permission] = PermissionStatus.NEVER_ASK_AGAIN;
                            }
                        }
                    }
                    resolve(grantedPermissions);
                }

                // if (args.grantResults.length > 0 && args.grantResults[0] === android.content.pm.PackageManager.PERMISSION_GRANTED) {
                //     resolve(PermissionStatus.GRANTED);
                // } else {
                //     if (activity.shouldShowRequestPermissionRationale(permission)) {
                //         resolve(PermissionStatus.DENIED);
                //     } else {
                //         resolve(PermissionStatus.NEVER_ASK_AGAIN);
                //     }
                // }
            });
        } catch (e) {
            reject(e);
        }
    });
}

function shouldShowRequestPermissionRationale(permission: string | string[]) {
    if (getAndroidSDK() < MARSHMALLOW) {
        return Promise.resolve(false);
    }
    const activity: android.app.Activity = androidApp.foregroundActivity || androidApp.startActivity;
    try {
        if (Array.isArray(permission )) {
            return Promise.resolve(permission.reduce((accu, p)=> accu && activity.shouldShowRequestPermissionRationale(p), true));
        }
        return Promise.resolve(activity.shouldShowRequestPermissionRationale(permission));
    } catch (e) {
        return Promise.reject(e);
    }
}

export function canOpenSettings() {
    return Promise.resolve(true);
}

export function openSettings() {
    const activity = androidApp.foregroundActivity || androidApp.startActivity;
    return new Promise<void>((resolve, reject) => {
        const onActivityResultHandler = (data) => {
            if (data.requestCode === 5140) {
                androidApp.off(AndroidApplication.activityResultEvent, onActivityResultHandler);
                resolve();
            }
        };
        androidApp.on(AndroidApplication.activityResultEvent, onActivityResultHandler);
        const intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(android.net.Uri.parse('package:' + activity.getPackageName()));
        activity.startActivityForResult(intent, 5140);
    });
}

export function getTypes() {
    return NativePermissionsTypes;
}

export async function check(permission: PermissionsType, options?: CheckOptions): Promise<[Status, boolean]> {
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'check', permission, options);
    }
    const perms: string | string[] = getNativePermissions(permission, options);
    if (!perms) {
        // if (Trace.isEnabled()) {
        //     CLog(CLogTypes.warning, permission, 'is not a valid permission type on Android');
        // }
        return ['authorized', true];
    }


    const isAuthorized = await PermissionsAndroid.check(perms);
    if (isAuthorized) {
        if (getAndroidSDK() >= ANDROIDQ && permission === 'location') {
            const type = typeof options === 'string' ? options : options && options.type;
            if (type === 'always') {
                const backAuthorized = await PermissionsAndroid.check(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION);
                return (['authorized', backAuthorized]);
            }
        }
        return (['authorized', true]);
    }

    return getDidAskOnce(permission).then(didAsk => {
        if (didAsk) {
            return shouldShowRequestPermissionRationale(perms).then(shouldShow => [shouldShow ? 'denied' : 'restricted', true]);
        }

        return (['undetermined', true]);
    });
}

export function request(permission: PermissionsType | PermissionsType[] | string[], options?: RequestOptions): Promise<[Status, boolean] | { [permission: string]: Status }> {
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'request', permission, options);
    }
    let types: string[] = [];
    if (Array.isArray(permission)) {
        permission.forEach(s=>{
            if (s.startsWith('android.permission.')) {
                types.push(s);
            } else {
                types.push(...getNativePermissions(s as PermissionsType, options));
            }
        });
    } else {
        if (permission.startsWith('android.permission.')) {
            types.push(permission);
        } else {
            types = getNativePermissions(permission, options);
        }
    }
    if (types.length === 0) {
        // if (Trace.isEnabled()) {
        //     CLog(CLogTypes.warning, permission, 'is not a valid permission type on Android');
        // }
        return Promise.resolve(['authorized', true]);
    }


    const rationale = typeof options === 'string' ? undefined : options && options.rationale;
    if (types.length > 1) {
        return requestMultiplePermissions(types);
    }
    return PermissionsAndroid.request(types[0], rationale).then(result => {
        // PermissionsAndroid.request() to native module resolves to boolean
        // rather than string if running on OS version prior to Android M
        if (typeof result === 'boolean') {
            return [result ? 'authorized' : 'denied', true];
        }

        if (Array.isArray(permission)) {
            return Promise.all(permission.map(setDidAskOnce)).then(() => [result as Status, true]);
        }
        return setDidAskOnce(permission).then(() => [result as Status, true]);
    });
}

export function checkMultiple(permissions: PermissionsType[]) {
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'checkMultiple', permissions);
    }
    return Promise.all(permissions.map(permission => this.check(permission))).then(result =>
        result.reduce((acc, value, index) => {
            const name = permissions[index];
            acc[name] = value;
            return acc;
        }, {})
    );
}
