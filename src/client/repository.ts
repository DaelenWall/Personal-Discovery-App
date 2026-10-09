import type { Store } from "../domain/types";
import type { AIStatus } from "../server/ai-configuration";

export type DeviceSnapshot = {
  store: Store;
  aiMode: string;
  aiStatus: AIStatus;
};
const name = "commonplace-phone-v1";
let connection: Promise<IDBDatabase> | undefined;

function database() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("snapshot");
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        connection = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      connection = undefined;
      reject(
        new Error(
          "Could not open device storage. Check Safari storage settings.",
        ),
      );
    };
  });
  return connection;
}

export async function readDeviceSnapshot(): Promise<
  DeviceSnapshot | undefined
> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshot", "readonly");
    const request = transaction.objectStore("snapshot").get("current");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not read device storage."));
  });
}

export async function updateDeviceSnapshot(
  change: (snapshot: DeviceSnapshot | undefined) => DeviceSnapshot,
): Promise<DeviceSnapshot> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshot", "readwrite");
    const table = transaction.objectStore("snapshot");
    let next: DeviceSnapshot;
    const request = table.get("current");
    request.onsuccess = () => {
      try {
        next = change(request.result);
        table.put(next, "current");
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onabort = () =>
      reject(
        new Error(
          "Device storage could not save this change. Export a backup before clearing any data.",
        ),
      );
    transaction.onerror = () =>
      reject(new Error("Device storage could not save this change."));
  });
}
