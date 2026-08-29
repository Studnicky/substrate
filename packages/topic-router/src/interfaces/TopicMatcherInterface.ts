export interface TopicMatcherInterface {
  matches(pattern: string, topic: string): boolean;
}
