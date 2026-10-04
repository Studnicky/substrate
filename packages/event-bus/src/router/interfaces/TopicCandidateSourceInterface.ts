export interface TopicCandidateSourceInterface {
  candidates(topic: string): readonly string[];
}
