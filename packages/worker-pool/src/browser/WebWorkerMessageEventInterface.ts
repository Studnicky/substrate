/** Message data delivered by a browser Worker. */
export interface WebWorkerMessageEventInterface extends Pick<MessageEvent<unknown>, 'data'> {}
