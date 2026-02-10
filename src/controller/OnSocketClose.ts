export interface OnSocketClose {
  $onSocketClose: (code: number, reason: string | Buffer) => void | Promise<void>;
}
