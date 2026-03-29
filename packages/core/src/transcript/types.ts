export interface MessagePair {
  user: string;
  assistant: string;
}

export interface TranscriptAdapter {
  name: string;
  parse(source: string | Buffer): Promise<MessagePair[]>;
}
