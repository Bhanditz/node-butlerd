import {
  ErrorHandler,
  WarningHandler,
  Endpoint,
  RequestCreator,
  RequestError,
} from "./support";
import { Conversation } from "./conversation";
var debug = require("debug")("butlerd:client");

export type SetupFunc = (c: Conversation) => void;

export class Client {
  errorHandler: ErrorHandler = null;
  warningHandler: WarningHandler = null;
  endpoint: Endpoint;
  host: string;
  port: number;
  clientId: string;

  proxy: {
    host: string;
    port: number;
  };

  idSeed = 1;

  constructor(endpoint: Endpoint) {
    this.endpoint = endpoint;

    {
      const [host, port] = endpoint.tcp.address.split(":");
      [this.host, this.port] = [host, parseInt(port, 10)];
    }

    {
      let proxy = process.env.BUTLERD_PROXY;
      if (proxy && proxy != "") {
        const tokens = proxy.split(":");
        if (tokens && tokens.length === 2) {
          const [host, port] = tokens;
          this.proxy = {
            host: host,
            port: parseInt(port, 10),
          };
        }
      }
    }

    this.clientId = `client-${(Math.random() * 1024 * 1024).toFixed(0)}`;
    debug(`Now speaking to ${this.host}:${this.port}`);
    if (this.proxy) {
      debug(`Through proxy ${this.proxy.host}:${this.proxy.port}`);
    }
  }

  generateID(): number {
    return this.idSeed++;
  }

  warn(msg: string) {
    if (this.warningHandler) {
      try {
        this.warningHandler(msg);
        return;
      } catch (e) {}
    }
    console.warn(msg);
  }

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  onWarning(handler: WarningHandler) {
    this.warningHandler = handler;
  }

  async call<T, U>(
    rc: RequestCreator<T, U>,
    params: T,
    setup?: SetupFunc,
  ): Promise<U> {
    let conversation: Conversation;

    try {
      conversation = new Conversation(this);
      if (setup) {
        setup(conversation);
      }
      await conversation.connect();
      return await conversation.call(rc, params);
    } finally {
      conversation.close();
    }
  }
}
