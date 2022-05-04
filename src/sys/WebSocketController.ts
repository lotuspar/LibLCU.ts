/**
 * WebSocketController, part of LibLCU.ts
 * Classes and methods to communicate with the League Client through WebSockets
 * @author lotuspar, 2022
 * @file WebSocketController.ts
 */

import { RawData, WebSocket } from 'ws';
import CallbackHandler, { BasicCallback } from './CallbackHandler';
import Lockfile from './Lockfile';

export default class WebSocketController {
  private lockfile: Lockfile;

  private websocket: WebSocket;

  private callbacks: CallbackHandler;

  private constructor(lockfile: Lockfile, websocket: WebSocket) {
    this.lockfile = lockfile;
    this.websocket = websocket;

    this.callbacks = new CallbackHandler();
    this.callbacks.setOnEmptyKeyEvent((key) => {
      this.websocket.send(`Unsubscribe ${key}`);
    });

    this.websocket.on('message', (data) => this.receive(data));
  }

  private receive(data: RawData) {
    if (data == null || `${data}` === '') {
      return;
    }

    let json: any;
    try {
      json = JSON.parse(`${data}`);
    } catch (e) {
      throw new Error(`Failed to parse received event data. (${e})`);
    }

    Object.keys(json)?.forEach((key: string) => {
      const value = json[key];
      this.callbacks.call(key, value);
    });
  }

  public subscribe(name: string, callback: BasicCallback) {
    // Subscribe websocket client to event
    this.websocket.send(`Subscribe ${name}`);

    // Add callback
    this.callbacks.add(name, callback);
  }

  public static async initialize(lockfile: Lockfile): Promise<WebSocketController> {
    return new Promise((resolve, reject) => {
      // Create WebSocket connection
      const websocket = new WebSocket(`wss://${lockfile.host}:${lockfile.port}`, {
        origin: `https://${lockfile.host}:${lockfile.port}`,
        rejectUnauthorized: false,
        headers: {
          Authorization: lockfile.basic,
        },
      });

      // Attempt connection to the client
      websocket.on('open', () => {
        // Connection success
        resolve(new WebSocketController(lockfile, websocket));
      });

      websocket.on('error', (err) => {
        // Connection failure
        reject(err);
      });
    });
  }
}